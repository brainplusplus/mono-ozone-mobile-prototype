//
//  SyncDashboardManager.h
//  Mono
//
//  Created by Ben Scazzero on 5/2/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOSyncDashboardManager : NSObject
/**
 *  The Sync Dashboard feature is managed by a singleton instance represented by the sharedManager.
 *
 *  @return MNOSyncDashboardManager
 */
+ (MNOSyncDashboardManager *) sharedManager;

/**
 * YES to enable dashboard syncing, NO otherwise
 *
 * @param BOOL turn on and off dashboard syncing
 **/
- (void) scheduleDashboardSync:(BOOL) enabled;
/**
 *  Called to load the user's default preference for dashboard syncing.
 */
- (void) loadDefaultPreference;
/**
 *  The amount of time, in seconds, to look for dashboard updates modifications.
 */
@property (nonatomic) NSUInteger dashboardRefreshTime;
/**
 *  BOOL to indicate the user's dashboards have been updated (proabably through the desktop) and they need to be updated on the
 *  mobile application.
 */
@property (nonatomic) BOOL dashboardsUpdated;
/**
 *  BOOL to indicate if sync dashboard feature is currently on or off.
 */
@property (readonly, nonatomic) BOOL isDashboardSyncEnabled;






@end

