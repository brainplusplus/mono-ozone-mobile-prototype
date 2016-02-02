//
//  MNOMapTile.h
//  Mono2
//
//  Created by Michael Wilson on 4/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@interface MNOMapTile : NSManagedObject

@property (nonatomic, retain) NSNumber * tileType;
@property (nonatomic, retain) NSString * tileHash;
@property (nonatomic, retain) NSData * tileData;
@property (nonatomic, retain) NSDate * cacheDate;
@property (nonatomic, retain) NSNumber * x;
@property (nonatomic, retain) NSNumber * y;
@property (nonatomic, retain) NSNumber * zoom;

@end