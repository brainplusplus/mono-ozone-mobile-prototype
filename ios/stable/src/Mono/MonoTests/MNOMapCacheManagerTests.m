//
//  CacheManagerTests.m
//  Mono2
//
//  Created by Michael Wilson on 4/23/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>

#import "MNOMapCacheManager.h"
#import "MNOUtil.h"
#import "TestUtils.h"

#import "MNONetworkWrapperProtocol.h"
#import "MNOProtocolManager.h"

#import "MNOHttpStack.h"

@interface MNOMapCacheManagerTests : XCTestCase

@end

@interface MNOMapCacheManager (TestExtensions)

- (void) cacheTile:(MNOTileInfo *)tileInfo;

- (MNOMapTile *) findMapTile:(MNOTileInfo *)tileInfo;

- (void) setMockStack:(id)mockStack;

@end

@implementation MNOMapCacheManagerTests {
    UIImage *testImage;
}

- (void)setUp
{
    [super setUp];
    
    [TestUtils initTestPersistentStore];
    
    // Need some test image for mock responses -- doesn't need to be a real map tile
    testImage = [UIImage imageNamed:@"bkg_stripe_dark.png"];
    
    id mockStack = [TestUtils mockResponseFromHttpStack:testImage contentType:@"image/png" requestType:REQUEST_IMAGE];
    
    [[MNOMapCacheManager sharedInstance] setMockStack:mockStack];
}

- (void)tearDown
{
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}

- (void)testTileRetrieval
{
    MNOMapCacheManager *mapCache = [MNOMapCacheManager sharedInstance];
    NSManagedObjectContext *moc = [[MNOUtil sharedInstance] defaultManagedContext];
    
    // Tile vars
    int x = 0;
    int y = 1;
    int zoom = 2;
    MNOTileInfo *tileInfo = [[MNOTileInfo alloc] init:x y:y zoom:zoom tileType:STREET];
    
    NSString *tileHash = [tileInfo tileHash];

    [mapCache cacheTile:tileInfo];
    
    BOOL cacheSuccess = FALSE;
    
    double curTime = [NSDate timeIntervalSinceReferenceDate];
    
    while(cacheSuccess == FALSE && ([NSDate timeIntervalSinceReferenceDate] - curTime) < 15) {
        //sleep(5); // Wait 5 seconds
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate date]];
        
        __block MNOMapTile *foundTile;
        
        [moc performBlockAndWait:^{
            foundTile = [self findTile:tileHash];
        }];
        
        // Success!
        if(foundTile) {
            cacheSuccess = TRUE;
            break;
        }
    }
    
    XCTAssertTrue(cacheSuccess, @"Did not find the tile in the cache!");
}

- (void)testServeTile
{
    MNOMapCacheManager *mapCache = [MNOMapCacheManager sharedInstance];
    
    // Tile vars
    MNOTileInfo *tileInfo1 = [[MNOTileInfo alloc] init:1 y:1 zoom:3 tileType:STREET];
    MNOTileInfo *tileInfo2 = [[MNOTileInfo alloc] init:1 y:1 zoom:3 tileType:AERIAL];
    MNOTileInfo *tileInfo3 = [[MNOTileInfo alloc] init:2 y:1 zoom:3 tileType:STREET];
    MNOTileInfo *tileInfo4 = [[MNOTileInfo alloc] init:3 y:1 zoom:3 tileType:AERIAL];
    
    // Serve two of the four tiles
    MNOMapTile *mapTile1 = [mapCache serveTile:[tileInfo1.x intValue]
                                             y:[tileInfo1.y intValue]
                                             z:[tileInfo1.zoom intValue]
                                         cache:TRUE
                                      tileType:STREET];
    
    MNOMapTile *mapTile3 = [mapCache serveTile:[tileInfo3.x intValue]
                                             y:[tileInfo3.y intValue]
                                             z:[tileInfo3.zoom intValue]
                                         cache:TRUE
                                      tileType:STREET];
    
    // Make sure the two retrieved tiles are not nil
    XCTAssert(mapTile1 != nil, @"Map tile 1 should not be null.");
    XCTAssert(mapTile3 != nil, @"Map tile 3 should not be null.");
    
    // Tile results
    MNOMapTile *result1 = [self findTile:[tileInfo1 tileHash]];
    MNOMapTile *result2 = [self findTile:[tileInfo2 tileHash]];
    MNOMapTile *result3 = [self findTile:[tileInfo3 tileHash]];
    MNOMapTile *result4 = [self findTile:[tileInfo4 tileHash]];
    
    XCTAssert(result1 != nil, @"Map tile 1 should be cached!");
    XCTAssert(result2 == nil, @"Map tile 2 should NOT be cached!");
    XCTAssert(result3 != nil, @"Map tile 3 should be cached!");
    XCTAssert(result4 == nil, @"Map tile 4 should NOT be cached!");
}

- (void) testBulkCache {
    // Box around Lake Elkhorn in Columbia
    double tlLatitude = 39.184961;
    double tlLongitude = -76.847494;
    double brLatitude = 39.181618;
    double brLongitude = -76.831121;
    
    // Get the map cache
    MNOMapCacheManager *mapCache = [MNOMapCacheManager sharedInstance];
    
    NSDictionary *arguments =
    @{
      @"topLeftLon": [[NSNumber alloc] initWithDouble:tlLongitude],
      @"topLeftLat": [[NSNumber alloc] initWithDouble:tlLatitude],
      @"bottomRightLon": [[NSNumber alloc] initWithDouble:brLongitude],
      @"bottomRightLat": [[NSNumber alloc] initWithDouble:brLatitude],
      @"zoomStart": @1,
      @"zoomEnd": @2
    };
    
    [mapCache bulkCacheTilesOperation:arguments];
    
    MNOTrackingStatus *status;
    while([(status = [mapCache getCurrentTrackingStatus]) isComplete] == TRUE) {
        // Do nothing -- keep trying to get it
    }
    
    XCTAssertEqual([status.total intValue], 4, @"Expected to see 4 tiles to cache.");

    long startTime = [[NSDate date] timeIntervalSinceReferenceDate];
    while([mapCache getCurrentTrackingStatus].processed != 4 &&
          ([[NSDate date] timeIntervalSinceReferenceDate] - startTime) < 60) {
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate date]];
    }
    
    XCTAssertEqual(4, [mapCache getCurrentTrackingStatus].processed, @"Bulk caching did not process the correct number of tiles!");
}

- (MNOMapTile *) findTile:(NSString *)tileHash {
    // Search for the tile
    NSFetchRequest *fetchRequest = [[NSFetchRequest alloc] init];
    fetchRequest.entity = [NSEntityDescription entityForName:[MNOMapTile entityName]
                                      inManagedObjectContext:[self moc]];
    fetchRequest.predicate = [NSPredicate predicateWithFormat:@"tileHash == %@", tileHash];
    
    __block NSError *error;
    __block NSArray *results;
    
    [self.moc performBlockAndWait:^{
        results = [self.moc executeFetchRequest:fetchRequest error:&error];
    }];
    
    if(error) {
        NSLog(@"Error trying to fetch cached entity.  Error: %@.", error);
        return nil;
    }
    
    int numResults = (int)[results count];
    if(numResults > 1) {
        XCTFail(@"More than one tile found with this hash!");
        return nil;
    }
    else if(numResults == 0) {
        return nil;
    }
    
    return [results objectAtIndex:0];
}

- (NSManagedObjectContext *) moc {
    return [(MNOAppDelegate *)[[UIApplication sharedApplication] delegate] managedObjectContext];
}

@end
