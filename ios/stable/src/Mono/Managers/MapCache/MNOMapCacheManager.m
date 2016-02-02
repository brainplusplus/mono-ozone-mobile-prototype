//
//  MNOMapCacheDelegate.m
//  Mono2
//
//  Created by Michael Wilson on 4/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOMapCacheManager.h"

#import "MNOAppDelegate.h"
#import "MNOMapTile.h"
#import "MNOTileInfo.h"
#import "MNOHttpStack.h"

typedef struct MNOSlippyTile {
    int x;
    int y;
    int zoom;
} MNOSlippyTile;

@implementation MNOMapCacheManager {
    MNOTrackingStatus *_currentTracking;
    NSURL *_serviceUrl;
    NSURL *_aerialServiceUrl;
    NSOperationQueue *_connectionQueue;
    NSObject *_coreDataMutex;
    NSOperationQueue *_mapOperationQueue;
    
    // For testing
    id _mockStack;
}

#pragma mark constructors

- (id) init {
    if(self = [super init]) {
        // Retrieve our service URLs
        _serviceUrl = [[NSURL alloc] initWithString:MAP_CACHE_SERVICE_URL];
        _aerialServiceUrl = [[NSURL alloc] initWithString:MAP_CACHE_AERIAL_SERVICE_URL];
        _connectionQueue = [[NSOperationQueue alloc] init];
        _coreDataMutex = [[NSObject alloc] init];
        _mapOperationQueue = [[NSOperationQueue alloc] init];
        _currentTracking = [[MNOTrackingStatus alloc] init:0 total:0 startTime:0];
        
        [_mapOperationQueue setMaxConcurrentOperationCount:10];
    }
    
    return self;
}

#pragma mark public methods

+ (MNOMapCacheManager *) sharedInstance {
    static MNOMapCacheManager * sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[self alloc] init];
    });
    
    return sharedInstance;
}

- (void) bulkCacheTilesOperation:(id)arguments {
    NSInvocationOperation *invoke = [[NSInvocationOperation alloc] initWithTarget:self selector:@selector(bulkCacheTiles:) object:arguments];
    [_mapOperationQueue addOperation:invoke];
}

- (void) bulkCacheTiles:(NSDictionary *)arguments {
    @synchronized(self) {
        NSDictionary *dictionaryArgs = (NSDictionary *)arguments;
        
        double topLeftLon = [[dictionaryArgs objectForKey:@"topLeftLon"] doubleValue];
        double topLeftLat = [[dictionaryArgs objectForKey:@"topLeftLat"] doubleValue];
        double bottomRightLon = [[dictionaryArgs objectForKey:@"bottomRightLon"] doubleValue];
        double bottomRightLat = [[dictionaryArgs objectForKey:@"bottomRightLat"] doubleValue];
        int zoomStart = [[dictionaryArgs objectForKey:@"zoomStart"] intValue];
        int zoomEnd = [[dictionaryArgs objectForKey:@"zoomEnd"] intValue];
        
        // Tiles we want to process
        NSMutableArray *tiles = [[NSMutableArray alloc] init];
        
        for(int z=zoomStart; z<=zoomEnd; z++) {
            // Project into slippy tile space
            MNOSlippyTile topleftTile = [self getSlippyTileInfo:topLeftLon latitude:topLeftLat zoom:z];
            MNOSlippyTile bottomRightTile = [self getSlippyTileInfo:bottomRightLon latitude:bottomRightLat zoom:z];
            
            // Get min/max X and Y values
            int minX = MIN(topleftTile.x, bottomRightTile.x);
            int maxX = MAX(topleftTile.x, bottomRightTile.x);
            int minY = MIN(topleftTile.y, bottomRightTile.y);
            int maxY = MAX(topleftTile.y, bottomRightTile.y);
            
            // Generate a list of map tile hashes we want to cache
            for(int x=minX; x<=maxX; x++) {
                for(int y=minY; y<=maxY; y++) {
                    MNOTileInfo *streetTileInfo = [[MNOTileInfo alloc] init:x y:y zoom:z tileType:STREET];
                    MNOTileInfo *aerialTileInfo = [[MNOTileInfo alloc] init:x y:y zoom:z tileType:AERIAL];
                    [tiles addObject:streetTileInfo];
                    [tiles addObject:aerialTileInfo];
                }
            }
            
            
        }
            
        // Set up the current tracking info
        int numTiles = (int)[tiles count];
        _currentTracking = [[MNOTrackingStatus alloc] init:0 total:numTiles startTime:[NSDate timeIntervalSinceReferenceDate]];
        
        // Cache the tiles
        for(int i=0; i<numTiles; i++) {
            // Make the two requests
            [self cacheTile:[tiles objectAtIndex:i]];
            //[self cacheTile:[tiles objectAtIndex:i]];
        }
    }
}

- (MNOMapTile *) serveTile:(int)x y:(int)y z:(int)z cache:(BOOL)cache tileType:(MNOTileType)tileType {
    // Make a tile info object
    MNOTileInfo *tileInfo = [[MNOTileInfo alloc] init:x y:y zoom:z tileType:tileType];
    
    // Attempt to find the tile
    MNOMapTile *mapTile = [self findMapTile:tileInfo];
    
    if(mapTile == nil) {
        // Get the request
        NSURL *retrievalUrl = [self generateUrl:tileInfo.tileHash tilePath:tileInfo.tilePath tileType:tileInfo.tileType];
        
        // Make the request synchronously
        NSData *data = UIImagePNGRepresentation([[self httpStack] makeSynchronousRequest:REQUEST_IMAGE url:[retrievalUrl absoluteString]]);
        
        // Success -- store this in our cache and return the map cache object
        // Apparently objective C really doesn't have HTTP status codes #defined anywhere
        if(data != nil) {
            mapTile = [self storeTileData:tileInfo tileData:data];
        }
    }
    
    return mapTile;
}

- (MNOTrackingStatus *) getCurrentTrackingStatus {
    return _currentTracking;
}

#pragma mark - private methods

- (void) cacheTile:(MNOTileInfo *)tileInfo {
    // Get the request
    NSURL *retrievalUrl = [self generateUrl:tileInfo.tileHash tilePath:tileInfo.tilePath tileType:tileInfo.tileType];
    
    // Make the request synchronously
    [[self httpStack] makeAsynchronousRequest:REQUEST_IMAGE url:[retrievalUrl absoluteString] success:^(MNOResponse *mResponse) {
        [_currentTracking incrementProcessed];
        
        // If nothing is wrong, cache the data
        [self storeTileData:tileInfo tileData:mResponse.responseData];
    } failure:^(MNOResponse *mResponse, NSError *error) {
        [_currentTracking incrementProcessed]; // Increment processed here as well -- still want everything to complete
        NSLog(@"Error downloading %@.", tileInfo.tilePath);
    }];
}

- (NSURL *) generateUrl:(NSString *)tileHash tilePath:(NSString *)tilePath tileType:(MNOTileType)tileType {
    NSURL *tileRetrievalUrl;
    
    // Change URLs depending on tile retrieval type
    if(tileType == STREET) {
        tileRetrievalUrl = [[NSURL alloc] initWithString:tilePath relativeToURL:_serviceUrl];
    }
    else {
        tileRetrievalUrl = [[NSURL alloc] initWithString:tilePath relativeToURL:_aerialServiceUrl];
    }
    
    // Make our request
    return tileRetrievalUrl;
}

- (MNOSlippyTile) getSlippyTileInfo:(double)longitude latitude:(double)latitude zoom:(int)zoom {
    MNOSlippyTile tileInfo;
    int zoomShift = pow(2.0, zoom);
    double latRadians = latitude * M_PI / 180.0; // Convert to radians
    
    tileInfo.x = (int)(floor((longitude + 180.0) / 360.0 * zoomShift));
    tileInfo.y = (int)(floor((1.0 - log( tan(latRadians) + 1.0 / cos(latRadians)) / M_PI) / 2.0 * zoomShift));
    tileInfo.zoom = zoom;
    
    return tileInfo;
}

- (MNOMapTile *) storeTileData:(MNOTileInfo *)tileInfo tileData:(NSData *)data {
    // Synchronize so we don't run into a potential race condition with
    // multiple caches
    @synchronized(_coreDataMutex) {
        NSString *tileHash = tileInfo.tileHash;
        
        __block MNOMapTile *mapTile;
        
        // Delete the old entry
        [[self moc] performBlockAndWait:^{
            // Try to find an existing cached entry first
            MNOMapTile *oldMapTile = [self findMapTile:tileInfo];
            if(oldMapTile != nil) {
                [[self moc] deleteObject:oldMapTile];
            }
            // Create the new map tile
            mapTile = [MNOMapTile initWithManagedObjectContext:[self moc]];
            
            mapTile.tileData = data;
            mapTile.tileHash = tileHash;
            mapTile.tileType = [[NSNumber alloc] initWithInt:tileInfo.tileType];
            mapTile.cacheDate = [NSDate date];
            mapTile.x = tileInfo.x;
            mapTile.y = tileInfo.y;
            mapTile.zoom = tileInfo.zoom;
            
            @synchronized(self) {
                NSError *error;
                [[self moc] save:&error];
                
                if(error) {
                    NSLog(@"Error storing tile with hash %@.  Message: %@.", tileHash, error);
                }
            }
        }];
        
        
        
        return mapTile;
    }
}

- (MNOMapTile *) findMapTile:(MNOTileInfo *)tileInfo {
    NSString *tileHash = tileInfo.tileHash;
    
    // Set up the fetch request
    NSFetchRequest *fetchRequest = [[NSFetchRequest alloc] init];
    fetchRequest.entity = [NSEntityDescription entityForName:[MNOMapTile entityName]
                                      inManagedObjectContext:[self moc]];
    fetchRequest.predicate = [NSPredicate predicateWithFormat:@"tileHash == %@", tileHash];
    
    __block NSArray *results;
    
    [[self moc] performBlockAndWait:^{
        results = [[self moc] executeFetchRequest:fetchRequest error:nil];
    }];
    
    // Should only get one result per hash
    int numResults = (int)[results count];
    if(numResults > 1) {
        NSLog(@"There are multiple entries for this tile.  That should not happen.");
    }
    
    // If nothing here, return nil
    if(numResults == 0) {
        return nil;
    }
    
    return [results objectAtIndex:0];
}

- (NSManagedObjectContext *)moc {
    return [[MNOUtil sharedInstance] defaultManagedContext];
}

- (MNOHttpStack *)httpStack {
    if(_mockStack) {
        return _mockStack;
    }
    return [MNOHttpStack sharedStack];
}

- (void)setMockStack:(id)mockStack {
    _mockStack = mockStack;
}

@end
