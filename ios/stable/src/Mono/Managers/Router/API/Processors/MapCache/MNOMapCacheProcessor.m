//
//  MNOMapCacheProcessor.m
//  Mono2
//
//  Created by Michael Wilson on 4/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOMapCacheProcessor.h"

#import "MNOMapCacheManager.h"

// Methods
#define METHOD_SERVE @"serve"
#define METHOD_SAT @"sat"
#define METHOD_CACHE @"cache"
#define METHOD_STATUS @"status"

@implementation MNOMapCacheProcessor

#pragma mark public methods

- (MNOAPIResponse *) process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    
    // Parse the method and call appropriately
    if([method isEqualToString:METHOD_SAT])
    {
        response = [self retrieveTile:url tileType:AERIAL];
    }
    else if([method isEqualToString:METHOD_CACHE])
    {
        response = [self cache:params];
    }
    else if([method isEqualToString:METHOD_STATUS])
    {
        response = [self status:params];
    }
    // Method can be empty -- we still want to try to get a tile in this case
    else
    {
        response = [self retrieveTile:url tileType:STREET];
    }
    
    return response;
}

#pragma mark - private methods

- (MNOAPIResponse *) retrieveTile:(NSURL *)url tileType:(MNOTileType)tileType {
    MNOMapCacheManager *manager = [MNOMapCacheManager sharedInstance];
    
    // Grab the slippy tile info from the URL
    NSArray *pathComponents = [url pathComponents];
    int numComponents = (int)[pathComponents count];
    
    if(numComponents <= 3) {
        return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"The path is not parseable by the mapcache interceptor."];
    }
    
    int x = [[pathComponents objectAtIndex:numComponents - 2] intValue];
    int y = [[pathComponents objectAtIndex:numComponents - 1] intValue];
    int zoom = [[pathComponents objectAtIndex:numComponents - 3] intValue];
    
    // Retrieve the tile from the map manager using the aforementioned values
    MNOMapTile *mapTile = [manager serveTile:x y:y z:zoom cache:TRUE tileType:tileType];
    
    return [[MNOAPIResponse alloc] initRaw:mapTile.tileData];
}

- (MNOAPIResponse *) cache:(NSDictionary *)params {
    NSMutableDictionary *opParams = [[NSMutableDictionary alloc] init];
    
    // Verify that the correct parameters are present
    NSString *tlLonStr = [params objectForKey:@"tllon"];
    NSString *tlLatStr = [params objectForKey:@"tllat"];
    NSString *brLonStr = [params objectForKey:@"brlon"];
    NSString *brLatStr = [params objectForKey:@"brlat"];
    NSString *zoomMinStr = [params objectForKey:@"zoommin"];
    NSString *zoomMaxStr = [params objectForKey:@"zoommax"];
    
    if(tlLonStr == nil || tlLatStr == nil ||
       brLonStr == nil || brLatStr == nil ||
       zoomMinStr == nil || zoomMaxStr == nil) {
        return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Missing input parameters!"];
    }

    // Convert everything to NSNumbers
    NSNumber *tlLon = [[NSNumber alloc] initWithDouble:[tlLonStr doubleValue]];
    NSNumber *tlLat = [[NSNumber alloc] initWithDouble:[tlLatStr doubleValue]];
    NSNumber *brLon = [[NSNumber alloc] initWithDouble:[brLonStr doubleValue]];
    NSNumber *brLat = [[NSNumber alloc] initWithDouble:[brLatStr doubleValue]];
    NSNumber *zoomMin = [[NSNumber alloc] initWithDouble:[zoomMinStr intValue]];
    NSNumber *zoomMax = [[NSNumber alloc] initWithDouble:[zoomMaxStr intValue]];
    
    // Pop everything into a set of parameters that can be passed to the map manager
    [opParams setValue:tlLon forKey:@"topLeftLon"];
    [opParams setValue:tlLat forKey:@"topLeftLat"];
    [opParams setValue:brLon forKey:@"bottomRightLon"];
    [opParams setValue:brLat forKey:@"bottomRightLat"];
    [opParams setValue:zoomMin forKey:@"zoomStart"];
    [opParams setValue:zoomMax forKey:@"zoomEnd"];
    
    // Kick off the bulk caching operation
    [[MNOMapCacheManager sharedInstance] bulkCacheTilesOperation:opParams];
    
    return [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
}

- (MNOAPIResponse *) status:(NSDictionary *)params {
    MNOTrackingStatus *status = [[MNOMapCacheManager sharedInstance] getCurrentTrackingStatus];
    
    // Return a complete message if we're done
    if([status isComplete]) {
        return [[MNOAPIResponse alloc] initWithStatus:API_COMPLETE];
    }
    
    // Otherwise, return running and some information
    NSDictionary *trackingJson = [[[MNOMapCacheManager sharedInstance] getCurrentTrackingStatus] asJson];
    
    return [[MNOAPIResponse alloc] initWithStatus:API_RUNNING additional:trackingJson];
}

@end
