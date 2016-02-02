//
//  CacheManager.h
//  foo
//
//  Created by Ben Scazzero on 1/2/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "TMCache.h"

@interface DiskManager : NSObject


- (NSData *) setObject:(id<NSCoding>)item withParams:(NSDictionary *)params;
- (NSData *) deleteObjectAtIndex:(NSString *)index withParams:(NSDictionary *)params;
- (NSData *) retrieveObject:(NSString *)index withParams:(NSDictionary *)params;
- (NSData *) updateObject:(id<NSCoding>)object atIndex:(NSString *)index withParams:(NSDictionary *)params;

+(DiskManager *) sharedManager;

@end
