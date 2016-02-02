//
//  ComponentViewController.h
//  Mono2
//
//  Created by Ben Scazzero on 3/3/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOMenuViewDelegate.h"
#import "MNOSwiperViewDelegate.h"
#import "MNOIntentGridDelegate.h"

@class MNODashboard;

@interface MNODashboardViewController : UIViewController<UIGestureRecognizerDelegate, UIWebViewDelegate, MNOMenuViewDelegate,MNOSwiperViewDelegate,MNOIntentGridDelegate>

/**
 *  Method to indicate whether the MNODashboardController should be reloaded when dismissed.
 *
 *  @return YES if the MNODashboardController should be reloaded when dismissed, NO otherwise.
 */
- (BOOL) shouldReloadViewController;
/**
 *  Returns YES if the user's dashboards should be reloaded/updated. This typically happens when the user's 
 *  dashboards are getting synced and need be updated to reflect their new state. 
 *
 *  Note: While there is a timer that runs periodicailly that handles this task, the user is currently using his dashboards 
 *  so we want them to reflect their updated state immediately.
 *
 *  @return YES to indiciate that the user's dashboards should be updated. NO otherwise
 */
- (BOOL) shouldReloadDashboards;

/**
 *  All the widgets for the active dashboard
 */
@property (strong, nonatomic) NSArray * widgets;
/**
 *  The active dashboard.
 */
@property (strong, nonatomic) MNODashboard * dashboard;

@end
