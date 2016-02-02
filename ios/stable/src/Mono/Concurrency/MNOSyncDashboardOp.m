//
//  MNOSyncDashboardOp.m
//  Mono
//
//  Created by Ben Scazzero on 6/4/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOSyncDashboardOp.h"
#import "MNOUserDownloadService.h"
#import "MNOUtil.h"
#import "MNOSyncDashboardManager.h"

@implementation MNOSyncDashboardOp
{
    /**
     *  The Current, Logged in User
     */
    NSManagedObjectID * userId;
    /**
     *  Download Service
     */
    NSManagedObjectContext * context;
    /**
     *  Thread specific Database Handle
     */
    MNOUserDownloadService * service;
    /**
     *  Current User
     */
    MNOUser * user;
}

/**
 * See Declaration in MNOSyncDashboardOp.h
 */
- (id) initWithUser:(NSManagedObjectID *)_userId
{
    self = [super init];
    if (self) {
        userId = _userId;
    }
    return self;
}

/**
 *  Run when the operation is added to a NSOperationQueue
 */
- (void) main
{
    // Create a NSManagedObjectContext in the current thread
    context = [[MNOUtil sharedInstance] newPrivateContext];
    context.undoManager = nil;
    // Retrieve our user from this context
    user = (MNOUser *)[context objectWithID:userId];
    // Create our Downloading Service with this NSManagedObjectContext
    service = [[MNOUserDownloadService alloc] initWithManagedObjectContext:context];
    // Perform Operation
    [context performBlockAndWait:^
     {
         [self import];
     }];
    
}

/**
 *  Use the UserDownloadService to update the user's dashboards.
 */
- (void) import
{
    [service loadAsyncComponentListWithCallback:^(NSString *status, NSMutableArray * modDashboards) {
        [context save:NULL];

        // modDashboards contains MNODashboards that have recently been modified.
        // Dashboard that were deleted are already deleted on the app
        if ([modDashboards count] > 0) { // Some Dashboards were modified
            NSMutableArray * arr = [[NSMutableArray alloc] init];
            for (MNODashboard * dash in modDashboards) {
                NSLog(@"We Have a Modified Dashboard: %@",dash.name );
                [arr addObject:dash.dashboardId];
            }
            
            // Rest Global Var
            [MNOAccountManager sharedManager].dashboards = nil;
            // Send out an NSNotification in case the user has an open MNODashboard that was modified.
            // The recieving code should reload the MNODashboard in that scenario
            [[NSNotificationCenter defaultCenter] postNotificationName:dashboardsUpdate object:arr];
            // Update the state of the manager to indicate that we have unsynced changes. There is a
            // timer that runs that checks for this change.
            [MNOSyncDashboardManager sharedManager].dashboardsUpdated = YES;
        }
        
        // Call callback on main thread
        dispatch_async(dispatch_get_main_queue(), ^{self.callback();});
        
    } withUser:user];
}
@end
