//
// Created by chris on 6/16/13.
//

#import "MNOSyncWidgetsOp.h"
#import "MNOUserDownloadService.h"
#import "MNOUtil.h"


@implementation MNOSyncWidgetsOp
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

- (id)initWithUserId:(NSManagedObjectID *)_userId
{
    self = [super init];
    if(self) {
        userId = _userId;
    }
    return self;
}

/**
 *  Called when the opeartion is added to a NSOperationQueue
 */
- (void)main
{
    // Create a NSManagedObjectContext in the current thread
    context = [[MNOUtil sharedInstance] newPrivateContext];
    context.undoManager = nil;
    // Retrieve user using current context
    user = (MNOUser *)[context objectWithID:userId];
    // Init download service with our thread-specific context
    service = [[MNOUserDownloadService alloc] initWithManagedObjectContext:context];
    // Perform Op
    [context performBlockAndWait:^
    {
        [self import];
    }];
}

/**
 *  Uses the Download Service to Update the User's Widgets
 */
- (void)import
{
    // Create/Update/Delete widgets that were modified on the server
    [service refreshWidgetList:^(BOOL success) {
        [context save:NULL];

        if (success) {
            NSLog(@"Synced Widget List");
        }else{
            NSLog(@"Couldn't Sync Widget List");
        }
        
        // Reset the User's Global Widgets and Dashboards
        [MNOAccountManager  sharedManager].dashboards = nil;
        [MNOAccountManager sharedManager].defaultWidgets = nil;
        // Callback on Main Thread
        dispatch_async(dispatch_get_main_queue(), ^{
            self.progressCallback(success);
        });
        
    } forUser:user];
}

@end