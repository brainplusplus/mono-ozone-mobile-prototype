//
//  MNOSyncDashboardOp.h
//  Mono
//
//  Created by Ben Scazzero on 6/4/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 *  Handles Dashboard Syncing
 */
@interface MNOSyncDashboardOp : NSOperation

/**
 *  Init with the current, logged in user.
 *
 *  @param userId of logged in user.
 *
 *  @return MNOSyncDashboardOp
 */
-(id)initWithUser:(NSManagedObjectID*)userId;

/**
 *  Callback, when syncing is complete.
 */
@property (strong,nonatomic) void(^callback)();


@end
