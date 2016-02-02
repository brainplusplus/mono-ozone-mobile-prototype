//
// Created by Michael Schreiber on 4/17/14.
// Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "MNOAPIResponse.h"

@class CacheProcessor;


@interface CacheUtils : NSObject
+(CacheProcessor *) getCacheProcessor;
+(MNOAPIResponse *) initCache:(NSDictionary *) params;
@end