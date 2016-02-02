//
//  MNOMapCacheDelegate.h
//  Mono2
//
//  Created by Michael Wilson on 4/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNOMapTile.h"
#import "MNOTileInfo.h"
#import "MNOTrackingStatus.h"

@interface MNOMapCacheManager : NSObject

#pragma mark public methods

/**
 * Returns the singleton instance of the map cache manager.
 **/
+ (MNOMapCacheManager *) sharedInstance;

/**
 * Uses an internal operation queue to thread the bulkCache Tiles
 * @param arguments A dictionary of arguments that will be decoded and pushed into bulkCacheTiles.
 **/
- (void) bulkCacheTilesOperation:(id)arguments;

/**
 * Caches all tiles between the specified zoom levels and lat/lon coordinates.
 * @param arguments A set of arguments encoded into an NSDictionary object.  It should consist of:
 * (NSNumber *) topLeftLon The top left longitude coordinate.
 * (NSNumber *) topLeftLat The top left latitude coordinate.
 * (NSNumber *) bottomRightLon The bottom right longitude coordinate.
 * (NSNumber *) bottomRightLat The bottom right latitude coordinate.
 * (NSNumber *) zoomStart The starting zoom level.  This is the least detailed zoom level.
 * (NSNumber *) zoomEnd The ending zoom level.  This is the most detailed zoom level.
 **/
- (void) bulkCacheTiles:(NSDictionary *)arguments;

/**
 * Retrieves a tile from the cache, or retrieves it from the web and stores it.
 * @param x The x coordiante of the tile to retrieve.
 * @param y The y coordiante of the tile to retrieve.
 * @param z The zoom level of the coordinate to retrieve.
 * @param cache True if the tile should be cached.
 * @param tileType The type of tile that should be retrieved.  Either STREET or AERIAL.
 * @return A MNOMapTile, or nil on failure.
 **/
- (MNOMapTile *) serveTile:(int)x y:(int)y z:(int)z cache:(BOOL)cache tileType:(MNOTileType)tileType;

/**
 * Gets the current status of most recent bulk cache operation.
 * @return The current status of the most recent bulk cache operation.
 **/
- (MNOTrackingStatus *) getCurrentTrackingStatus;

@end
