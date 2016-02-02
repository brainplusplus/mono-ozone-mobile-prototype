//
//  DownloadService.h
//  Mono
//
//  Created by Ben Scazzero on 4/30/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOUserDownloadService : NSObject

/**
 *  Init Service With A NSManagedObject. New Users/Dashboards/Widgets will be created in this context
 *
 *  @param localMoc The NSManagedObject to create objects
 *
 *  @return MNOUserDownloadService
 */
- (id) initWithManagedObjectContext:(NSManagedObjectContext *)localMoc;

/**
 *  Standard Init Method
 *
 *  @return MNOUserDownloadService
 */
- (id) init;

/**
 *  Called To Verify the User's Login Credentials. Once verified, we return a new or exisiting user through the callback function.
 *
 *  @param success Called when we were able to successfully identify the user
 *  @param failure otherwise, failure is called.
 */
- (void) loadUserWithCredentialsSuccess:(void(^)(NSString * status, int code, MNOUser * user))success
                              orFailure:(void(^)(NSError * error))failure;

/**
 *  Load a User's Widgets, Dashboards, and Group Data.
 *
 *  @param user     The user who's information we are retrieveing
 *  @param callback Used to give updates on the current download status. A code of -1 indicates a failure occured
 */
- (void) loadContentsForUser:(MNOUser *)user
                 withSuccess:(void(^)(NSString * status, int code))callback;


/**
 *  Creates/Modifies/Deletes Widgets that were modified on the server
 *
 *  @param callback Callback when operation complete
 *  @param user     The Current, Logged in User.
 */
- (void) refreshWidgetList:(void(^)(BOOL success))callback forUser:(MNOUser *)user;

/**
 *  Asynchronously Load the Current User's Dashboards and Created them in Core Data
 *
 *  @param callback Called when the method is complete or fails. A code of -1 indicates a failure.
 *  @param user     The User who's dashboard we are retrieving
 */
- (void) loadAsyncComponentListWithCallback:(void(^)(NSString * status, NSMutableArray * modDashboards))callback
                                   withUser:(MNOUser *)user;

/**
 *  Parses out the dashboard JSON and looks for delta(s) in the passed in user.
 *
 *  Scenario: If the user deletes a dashboard, the dashboard is deleted automatically by the MNOUserDownloadService. A notification is sent out (by MNOUserDownloadService)
 *  to indicate the user's dashboard list has been updated. No Deleted Dashboard are returned from the call.
 *
 *  Scenario: If the user modifies/adds a dashboard, the dashboard is modified/created by the service (MNOUserDownloadService). A list of modified/created dashboards is
 *  returned.
 
 *  @param componentList Dictionary containg dashboard information
 *  @param user          The current user we are processing the dashboard for.
 *
 *  @return An Array of New or Modified Dashboards
 */
- (NSMutableArray *) loadDashboardFromDictionary:(NSDictionary *)componentList withUser:(MNOUser *)user;

@end
