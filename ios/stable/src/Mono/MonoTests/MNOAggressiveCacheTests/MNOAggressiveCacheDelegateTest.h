//
//  AggressiveCacheDelegate.h
//  Mono2
//
//  Created by Ben Scazzero on 4/28/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "MNOAggressiveCacheDelegate.h"

@interface MNOAggressiveCacheDelegateTest : NSObject<MNOAggressiveCacheDelegate>

- (void) startAggressiveCache:(void(^)(BOOL success))callback;

@end
