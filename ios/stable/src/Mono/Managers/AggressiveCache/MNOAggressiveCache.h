//
//  MNOAggressiveCache.h
//  Mono2
//
//  Created by Ben Scazzero on 4/21/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "MNOAggressiveCacheDelegate.h"

@interface MNOAggressiveCache : NSObject

/**
 *  Cache's all widgets associated with the logged in user. Information about the process can be retreived by implementing
 * the MNOAggressiveCacheDelegate
 */
- (void) store;

/**
 *  Delegate used to retreive updates on the caching process. 
 */
@property (strong, nonatomic) id<MNOAggressiveCacheDelegate> delegate;

@end
