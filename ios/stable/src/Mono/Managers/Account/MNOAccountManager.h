//
//  MNOAccountManager.h
//  Mono
//
//  Created by Ben Scazzero on 2/18/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNOWidget.h"

@class MNOUser;

@interface MNOAccountManager : NSObject

#pragma mark properties

/**
 * The name of the p12 certificate being used to log in.
 **/
@property (strong, nonatomic) NSString * p12Name;

/**
 * The p12Data associated with the p12 certificate.
 **/
@property (strong, nonatomic) NSData * p12Data;

/**
 * The certificate for the server.
 * TODO: Should probably remove this
 **/
@property (strong, nonatomic) NSString * serverCert;

/**
 * The base URL for all widgets.
 **/
@property (strong, nonatomic) NSString * widgetBaseUrl;

/**
 * The base URL for the server. Same as the widgetBaseUrl but has an /owf path appended to it
 **/
@property (strong, nonatomic) NSString * serverBaseUrl;

/**
 * The widgets for the current, logged in user.
 **/
@property (strong, nonatomic) NSArray * defaultWidgets;

/**
 * The dashboards for the current, logged in user.
 **/
@property (strong, nonatomic) NSArray * dashboards;

/**
 * User information obtained from OWF.
 **/
@property (strong, nonatomic) MNOUser * user;


#pragma mark - public methods

/**
 *  MNOAccountManager is a singleton. Use call to access the current instance
 *
 *  @return MNOAccountManager for the application
 */
+(MNOAccountManager *)sharedManager;

/**
 * Gets the specified widget by name.
 *
 * @param widgetName The name of the widget to get
 * @return MNOWidget object of the widget with the specified name
 */
- (MNOWidget *)getWidgetByName:widgetName;

/**
 * Saves off the currently stored login information.
 **/
- (void)saveLoginInfo;

/**
 * Loads the previously stored login information.
 **/
- (void)loadLoginInfo;

- (NSArray *) fetchDefaultWidgetsInContext:(NSManagedObjectContext *)moc;
- (NSArray *) fetchDefaultWidgetsInContext:(NSManagedObjectContext *)moc forUser:(MNOUser *)user;

@end
