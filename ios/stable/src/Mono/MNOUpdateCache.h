//
//  MNOUpdateCache.h
//  Mono
//
//  Created by Ben Scazzero on 6/24/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOUpdateCache : NSOperation

- (instancetype) initWithUser:(NSManagedObjectID*)_userId;

@end
