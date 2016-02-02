//
//  MNOTrackingEntry.h
//  Mono2
//
//  Created by Michael Wilson on 4/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 * An entry that tracks how far along a caching operation is.
 **/
@interface MNOTrackingStatus : NSObject

#pragma mark properties

/**
 * Describes the current number of tiles that have been processed.
 **/
@property (readonly, atomic) int processed;

/**
 * Describes the total number of tiles that must be processed.
 **/
@property (strong, nonatomic) NSNumber *total;

/**
 * Describes the starting time of the tile processing operation.
 **/
@property (strong, nonatomic) NSDate *startTime;

#pragma mark - constructors

/**
 * Initializes a map cache tracking entry.
 * @param total The total number of map tiles that are being processed.
 * @param processed The number of map tiles that have been processed
 * @param startTime The time when the operation began.
 **/
- (id) init:(int)processed total:(int)total startTime:(long)startTime;

#pragma mark - public methods

/**
 * Increments the number of tiles processed. (thread safe)
 **/
- (void) incrementProcessed;

/**
 * Returns true if the number of processed is equal to the total number of tiles.
 * @return True if the number of processed is equal to the total number of tiles.
 **/
- (BOOL) isComplete;

/**
 * Returns the object as a JSON dictionary.
 * @return The objected encoded into a JSON like NSDictionary.
 **/
- (NSDictionary *) asJson;

@end
