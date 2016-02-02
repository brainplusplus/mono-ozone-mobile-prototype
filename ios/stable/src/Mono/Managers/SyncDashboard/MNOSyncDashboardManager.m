//
//  SyncDashboardManager.m
//  Mono
//
//  Created by Ben Scazzero on 5/2/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOSyncDashboardManager.h"
#import "MNOHttpStack.h"
#import "MNOUserDownloadService.h"
#import "MNOSyncDashboardOp.h"

@interface MNOSyncDashboardManager ()

@property(strong, nonatomic) NSManagedObjectContext *moc;

@end

@implementation MNOSyncDashboardManager
{
    NSTimer * timer;
    MNOHttpStack * httpStack;
    MNOUserDownloadService * dlService;
    BOOL currentlySyncing;
}

+ (MNOSyncDashboardManager *) sharedManager
{
    static MNOSyncDashboardManager *sharedMyManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedMyManager = [[self alloc] init];
    });
    return sharedMyManager;
}

- (id) init
{
    self = [super init];
    if (self) {
        httpStack = [MNOHttpStack sharedStack];
        dlService = [[MNOUserDownloadService alloc] init];
        currentlySyncing = NO;
    }
    
    return self;
}

/**
 *  Uses the MNOUserDownloadService to process any changes in the user's dashboards. This only gets called if sync dashboards
 *  is enabled. The method then sends a notification to indicate that the user's dashboards have been updated.
 *
 *  @param timer Timer that runs every 'dashboardRefreshTime' seconds
 */
- (void) updateComponentList:(NSTimer *)timer
{
    // If we are actively syncing, skip this iteration of the method.
    if (currentlySyncing)
        return;
    
    // The current, logged inuser.
    MNOUser * user = [[MNOAccountManager sharedManager] user];
    if (user == nil)
        // Can't run method if no user is logged in.
        return;
    
    // Indicate that we are currently syncing
    currentlySyncing = YES;
   
    // Create new op for processing.
    MNOSyncDashboardOp * op = [[MNOSyncDashboardOp alloc] initWithUser:user.objectID];
    op.callback = ^(){
        NSLog(@"Completed Dashboard Sync");
        currentlySyncing = NO;
    };
    
    [[[MNOUtil sharedInstance] syncingQueue] addOperation:op];
}

/**
 *  See Declration in MNOSynchDashboardManager.h
 *
 */
- (void) scheduleDashboardSync:(BOOL)enabled
{
    NSLog(@"scheduleDashboardSync: %@", enabled ? @"YES" : @"NO");
    [[NSUserDefaults standardUserDefaults] setObject:@(enabled) forKey:dashboardSyncEnabled];
    [timer invalidate];
    
    if (enabled) {
        timer = [NSTimer scheduledTimerWithTimeInterval:self.dashboardRefreshTime target:self selector:@selector(updateComponentList:) userInfo:nil repeats:YES];
    }
}

/**
 *  See Declaration in MNOSyncDashboardManager.h
 */
- (void) loadDefaultPreference
{
    id pref = [[NSUserDefaults standardUserDefaults] objectForKey:dashboardSyncEnabled];
    if (pref == nil) {
        pref = [NSNumber numberWithBool:YES];
        [[NSUserDefaults standardUserDefaults] setObject:pref forKey:dashboardSyncEnabled];
    }
    
    if ([pref boolValue]) {
        [self scheduleDashboardSync:YES];
    }
}

#pragma mark - Core Data
/**
 *  Saves any changes made to the NSManagedObjectContext
 */
- (void) save
{
    NSError * error;
    if ([self.moc hasChanges] && ![self.moc save:&error]) {
        NSLog(@"Unresolved error %@, %@", error, [error userInfo]);
        [[MNOUtil sharedInstance] showMessageBox:@"Error saving data" message:@"Unable to save data.  Changes may not persist after this application closes."];
    }
}

#pragma mark - Setters/Getters
/**
 *  See Declaration in MNOSyncDashboardManager.h
 *
 */
- (NSUInteger) dashboardRefreshTime
{
    if (!_dashboardRefreshTime) {
        _dashboardRefreshTime = 1 * 60;
    }
    
    return _dashboardRefreshTime;
}

/**
 *  See Declaration in MNOSyncDashboardManager.h
 *
 */
- (BOOL) isDashboardSyncEnabled
{
   return [[[NSUserDefaults standardUserDefaults] objectForKey:dashboardSyncEnabled] boolValue];
}

@end
