//
//  MNOTileInfo.h
//  Mono
//
//  Created by Michael Wilson on 4/24/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

typedef enum MNOTileType {
    AERIAL,
    STREET
} MNOTileType;

/**
 * Metadata about map tiles that need to be stored.
 **/
@interface MNOTileInfo : NSObject

#pragma mark properties

/**
 * The x value of the map tile.
 **/
@property (strong, nonatomic) NSNumber *x;

/**
 * The y value of the map tile.
 **/
@property (strong, nonatomic) NSNumber *y;

/**
 * The zoom value of the map tile.
 **/
@property (strong, nonatomic) NSNumber *zoom;

/**
 * The type of tile this represents.
 **/
@property (nonatomic) MNOTileType tileType;

/**
 * The hash of the tile being stored.
 **/
@property (readonly, nonatomic) NSString *tileHash;

/**
 * The path to the tile data being stored.
 **/
@property (readonly, nonatomic) NSString *tilePath;

#pragma mark - constructors

/**
 * Initializes a TileInfo object.
 * @param x The tile x value.
 * @param y The tile y value.
 * @param zoom The tile zoom value.
 * @param tileType The tile type (STREET or AERIAL).
 **/
- (id) init:(int)x y:(int)y zoom:(int)zoom tileType:(MNOTileType)tileType;
    
@end
