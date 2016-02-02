//
//  IntentHandler.h
//  Mono2
//
//  Created by Ben Scazzero on 4/11/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 *  Designed to facilate Intent Management for the current Dashboard. The primary purpose of the class is
 *  to help managed all the Intents from an open/active Dashboard.
 *
 *
 * Note: All current and possible widgets that can receive an Intent Notification are represented by an IntentWrapper.
 * Terms: Intent Notification: An NSNotification object that is triggered by an Intent.
 *        IntentWrapper: Wrapper for an Intent Notification, contains information about 
 *         the intent's source (i.e widget) and other
 *        information related to the intent such as it's handler/callback function.
 */
@interface MNOIntentHandler : NSObject


/**
 *
 *  Init with the current widgets, and corresponding webviews.
 *
 *  @param widgets  Widgets of the open Dashboard
 *  @param webViews Corresponding Webviews for each Widget
 *
 *  @return IntentHandler
 */
-(id)initWithWidgets:(NSArray*)widgets webViews:(NSArray *)webViews;

/**
 *  Called to store an Intent Notification.
 *
 *  @param notif Intent Notification
 */
- (void) didReceiveIntent:(NSNotification *)notif;

/**
 *  Determines whether the given Intent Notification already has designated endpoint. In other words,
 *  it determines whether the user has a saved preference for this Intent Notification.
 *
 *  @param is Intent Notification
 *  @param sender The sender to use if the preferences match.
 *
 *  @return YES/NO
 */
- (BOOL) userHasIntentPreferenceSaved:(NSNotification *)notif newSender:(MNOIntentWrapper *)sender;

/**
 *  Called when the user selects an endpoint/destination for an intent. If the current
 *  dashboard does not contain the selected widget, it is added and YES is returned. Otherwise
 *  the dashboard isn't modifed and NO is returned. 
 *
 *  @param iw Selected Endpoint for an Intent Notification
 *
 *  @return YES/NO
 */
- (BOOL) processIntentWrapper:(MNOIntentWrapper *)iw;

/**
 *  Saves a given Intent preference.
 *
 *  @param receiver Intent Receiver
 *  @param sender   Intent Sender
 *
 *  @return YES/NO depending on whether the save was successful
 */
- (BOOL) saveIntentReceiver:(MNOIntentWrapper *)receiver fromSender:(MNOIntentWrapper *)sender;


/**
 *  For a given Intent Notification, this returns an array of IntentWrappers representing all the widgets
 *  that can handle this Intent. Scope is limited to the current/open dashboard.
 *
 *  @param notif Intent Notification
 *
 *  @return Array of IntentWrappers
 */
- (NSMutableArray *) retreiveExistingEnpointsForIntent:(NSNotification *)notif;

/**
 * For a given Intent Notification, this returns an array of IntentWrappers representing all the widgets
 * that can handle this Intent. Scope is limited to the current user, but excludes widgets that weren't originally added
 * to the dashboard.
 *
 *  @param notif Intent Notification
 *  @param endPoints An array of widgets corresponding to each returned IntentWrapper. Widget at index 0 corresponds to the
 *  "receiving intent" at index 0 in the method's returned array
 *
 *  @return Array of IntentWrappers
 */
- (NSMutableArray *) retreivePossibleEnpointsForIntent:(NSNotification *)notif widgetList:(NSArray **)endpoints;

/**
 *  Wraps the current Intent Notification in an IntentWrapper.
 *
 *  @param notif Intent Notification
 *
 *  @return IntentWrapper
 */
- (MNOIntentWrapper *) retreiveIntenWrappertForNotification:(NSNotification *)notif;

/**
 *  Sends an given IntentWrapper to another IntentWrapper
 *
 *  @param receiver Receiving IntentWrapper
 *  @param sender   Sending IntentWrapper
 */
- (void) sendIntentInfoTo:(MNOIntentWrapper *)receiver from:(MNOIntentWrapper *)sender;

@end
