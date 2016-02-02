//
//  DownloadService.m
//  Mono
//
//  Created by Ben Scazzero on 4/30/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOUserDownloadService.h"
#import "MNOAppDelegate.h"
#import "MNOWidget.h"
#import "MNOUser.h"
#import "MNODashboard.h"
#import "MNOGroup.h"
#import "MNOHttpStack.h"
#import "MNOUtil.h"
#import "MNOSyncDashboardManager.h"
#import "MNOAppsMallManager.h"

#define personId @"currentId"
#define personUsername @"currentUserName"
#define personName @"currentUser"
#define personEmail @"currentEmail"

#define widgetStatus @"success"
#define widgetRows @"rows"
#define componentData @"data"

#define widgetName @"originalName"
#define widgetUrl @"url"
#define headerIcon @"headerIcon"
#define widgetImage @"image"
#define widgetSmallIconUrl @"smallIconUrl"
#define widgetLargeIconUrl @"largeIconUrl"
#define widgetDescription @"description"
#define widgetIder @"path"

// Intent Constant
#define intents @"intents"
#define intentsReceive @"receive"
#define intentsSend @"send"
#define intentDataTypes @"dataTypes"

// URLs
#define componentPath @"dashboard"
#define userPath @"userPath"
#define groupsPath @"group"

// Server URLs
#define profilePath @"prefs/person/whoami"
#define widgetListPath @"prefs/widgetList"
#define defaultSmallIconUrl @"themes/common/images/adm-tools/Widgets24.png"


@interface MNOUserDownloadService ()

@property (strong, nonatomic) NSManagedObjectContext * moc;

@end

@implementation MNOUserDownloadService
{
    int activeConnections;
}

- (id) initWithManagedObjectContext:(NSManagedObjectContext *)localMoc
{
    self = [super init];
    if (self) {
        activeConnections = 0;
        self.moc = localMoc;
    }
    return self;
}

- (id) init
{
    self = [super init];
    if (self) {
        activeConnections = 0;
    }
    return self;
}

- (NSString *) formatURL:(NSString *) path
{
    NSURL * url = [NSURL URLWithString:[MNOAccountManager sharedManager].widgetBaseUrl];
    path = [@"owf/" stringByAppendingPathComponent:path];
    NSURL * formattedUrl = [NSURL URLWithString:path relativeToURL:url];
    return formattedUrl.absoluteString;
}

/**
 *  See Declaration in MNOUserDownloadService.h
 */

- (void) loadUserWithCredentialsSuccess:(void(^)(NSString * status, int code, MNOUser * user))success
                              orFailure:(void(^)(NSError * error))failure
{
    NSString * url = [self formatURL:profilePath];

    [[MNOHttpStack sharedStack] makeAsynchronousRequest:REQUEST_JSON
                               url:url
                           success:^(MNOResponse *response) {
                               
                               NSDictionary * results = response.responseObject;
                               NSFetchRequest * request = [[NSFetchRequest alloc] initWithEntityName:[MNOUser entityName]];
                               
                               NSNumber * currentId = [results objectForKey:personId];
                               request.predicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[[NSPredicate predicateWithFormat:@"userId == %@", currentId],[NSPredicate predicateWithFormat:@"profileUrl == %@",url]]];
                               
                               NSError * err = nil;
                               NSArray * array = [self.moc executeFetchRequest:request error:&err];
                               
                               if (!err && [array count] >0 ) {
                                   
                                   MNOUser * user = [array firstObject];
                                   success(@"Loaded User from Database",LOADED_FROM_DB,user);
                                   
                               }else{
                                   NSString * currentUserName = [results objectForKey:personUsername];
                                   NSString * currentEmail = [results objectForKey:personEmail];
                                   NSString * currentName = [results objectForKey:personName];
                                   
                                   MNOUser * user = [MNOUser initWithManagedObjectContext:self.moc];
                                   user.userId = [NSString stringWithFormat:@"%d",currentId.intValue];
                                   user.username = currentUserName;
                                   user.name = currentName;
                                   user.email = currentEmail;
                                   user.settings = [MNOSettings initWithManagedObjectContext:self.moc];
                                   user.settings.allowsIntents = @YES;
                                   user.profileUrl = url;
                                   
                                   [self save];
                                   success(@"Created New User",CREATED_NEW_USER,user);
                               }
                               
                           } failure:^(MNOResponse *response, NSError *error) {
                               failure(error);
                           }];
}

/**
 *  See Declaration in MNOUserDownloadService.h
 *
 */
- (void) loadContentsForUser:(MNOUser *)user
                 withSuccess:(void(^)(NSString * status, int code))callback
{
    // Load the user's widgets via sync call
    [self loadWidgetListWithCallback:callback withUser:user widgetsOnly:NO];
}

#pragma mark - DownloadWidgetsViaUserCommand
/**
 *  See Declaration in MNOSyncDashboadOp.h
 */
- (void) refreshWidgetList:(void(^)(BOOL success))callback forUser:(MNOUser *)user
{
    [self loadWidgetListWithCallback:^(NSString *status, int code) {
        // success
        if(code == 0)
            callback(YES);
        else
            callback(NO);
        
    } withUser:user widgetsOnly:YES];
}

- (void) refreshClonedWidgetsForWidget:(MNOWidget *)otherWidget withIntents:(NSDictionary*)intentInfo forUser:(MNOUser *)currentUser
{
    
    if (currentUser != nil) {
        
        NSArray * results = [self fetchClonesForWidget:otherWidget user:currentUser];
        
        if ([results count] > 0) {
                for (MNOWidget * widget in results) {
                    // Copy Properties Over
                    widget.name = otherWidget.name;
                    //widget.descript = widget.descript;
                    widget.url = otherWidget.url;
                    widget.headerIconUrl = otherWidget.headerIconUrl;
                    widget.imageUrl = otherWidget.imageUrl;
                    widget.smallIconUrl =  otherWidget.smallIconUrl;
                    widget.largeIconUrl = otherWidget.largeIconUrl;
                    widget.mobileReady = otherWidget.mobileReady;
                    
                    // Remove Any Intents via Cascade Delete (only used for widgets that already exsisted)
                    [self clearIntentsForWidget:widget];
                    // Then Process Our New Intents
                    [self processIntents:intentInfo forWidget:widget];
            }
        }
    }
}

- (void) removeWidgets:(NSMutableArray *)widgets forUser:(MNOUser *)user
{
    if ([widgets count] > 0) {
        MNOAppsMallManager * appsManager = [MNOAppsMallManager sharedInstance];
        // For all default widgets that were deleted during "Syncing"
        for (MNOWidget * widget in widgets) {
            
            NSArray * widgetClones = [self fetchClonesForWidget:widget user:user];
            // Find all every clone and delete it from all dashboards then delete the clone itself.
            for (MNOWidget * clone in widgetClones) {
                if(clone.dashboard != nil)
                    [appsManager removeFromDashboard:clone.dashboard widget:clone inMoc:self.moc];
            }
            
        
            [self.moc deleteObject:widget];
        }
       
    }
}

- (void) removeWidget:(MNOWidget *)otherWidget from:(NSMutableArray *)currentWidgets
{
    int index = 0;
    for (MNOWidget * widget in currentWidgets) {
        if ([widget.widgetId isEqual:otherWidget.widgetId]) {
            [currentWidgets removeObjectAtIndex:index];
            break;
        }
        index++;
    }
}

#pragma mark - DownloadWidgets
/**
 *  Download, parse and create the current user's widgets
 *
 *  @param callback Used for status updates.
 *  @param user     The current user.
 */
- (void) loadWidgetListWithCallback:(void(^)(NSString * status, int code))callback
                           withUser:(MNOUser *)user
                        widgetsOnly:(BOOL)widgetsOnly
{
    // Make call to retrieve widget
    NSString * url = [self formatURL:widgetListPath];

    [[MNOHttpStack sharedStack] makeAsynchronousRequest:REQUEST_JSON url:url success:^(MNOResponse *response) {
        // Verify Response Object
        NSDictionary * responseObject = response.responseObject;
        if (![self verifyResponseObject:responseObject]) {
            callback(@"Error, Invalid Widget List",-1);
            return;
        }
        
        // Helper array to figure out which widgets were removed
        NSMutableArray * currentWidgets = nil;
        if (user != nil) {
            currentWidgets = [[[MNOAccountManager sharedManager] fetchDefaultWidgetsInContext:self.moc forUser:user] mutableCopy];
        }
        
        // Retrieve Widget List
        NSDictionary * appList = [responseObject objectForKey:widgetRows];
        
        for (NSDictionary * row in appList) {
            // Verify Widget Belong to this User
            NSString * username = [[row objectForKey:@"value"] objectForKey:@"userId"];
            NSString * name = [[row objectForKey:@"value"] objectForKey:@"userRealName"];
            
            if ([username isEqual:user.username] && [name isEqual:user.name]) {
                // Populate Widget
                MNOWidget * widget = [self populateWidgetFieldsWithInfo:row forUser:user];
                
                if (widget != nil && currentWidgets != nil){
                    // We know this widget wasn't removed, so stop tracking it
                    [self removeWidget:widget from:currentWidgets];
                }
                
            }else{
                NSLog(@"%@",row);
            }
        }
        
        // If any widgets were removed during a widget refresh, remove them everywhere for this user
        if (user != nil && currentWidgets != nil){
            [self removeWidgets:currentWidgets forUser:user];
        }
        
        // Save
        if ([self save]) {
            callback(@"Downloaded Apps", 0);
        }else{
            callback(@"Error Saving Apps",-1);
        }
        
        // Continue Downloading If Necessary
        if (!widgetsOnly) {
            activeConnections = 2;
            [self loadComponentListWithCallback:callback withUser:user];
            [self loadUserGroupDataWithCallback:callback withUser:user];
        }
        
        
    } failure:^(MNOResponse *response, NSError *error) {
        callback(error.description,-1);
    }];
}

- (MNOWidget *) populateWidgetFieldsWithInfo:(NSDictionary *)row forUser:(MNOUser *)user
{
    // Widget Info
    NSDictionary * info = [row objectForKey:appMeta];
    NSString * widgetId = [row objectForKey:widgetIder];
    
    // Create Widget if it doesn't already exist.
    MNOWidget * widget = [self fetchWidgetWithId:widgetId forUser:user];
    if(widget == nil){
        widget = [MNOWidget initWithManagedObjectContext:self.moc];
        widget.user = user;
    }
    
    // Add metadata
    widget.name = [info objectForKey:widgetName];
    widget.widgetId = widgetId;
    //widget.descript = [[info objectForKey:widgetDescription] isEqualToString:@"<null>"]? @"": [info objectForKey:widgetDescription];
    widget.url = [info objectForKey:widgetUrl];
    widget.isDefault = @YES;
    
    // Widget Images
    widget.headerIconUrl = [info objectForKey:headerIcon];
    widget.imageUrl = [info objectForKey:widgetImage];
    widget.smallIconUrl = [info objectForKey:widgetSmallIconUrl];
    widget.largeIconUrl = [info objectForKey:widgetLargeIconUrl];
    if (![[widget.smallIconUrl pathExtension] isEqualToString:@"png"])
        //default image
        widget.smallIconUrl = defaultSmallIconUrl;
    
    // Instance Id
    widget.instanceId = [[[[NSUUID alloc] init] UUIDString] lowercaseString];

    // Mobile Ready
    if([info objectForKey:@"mobileReady"] != nil)
        widget.mobileReady = [info objectForKey:@"mobileReady"];
    else
        widget.mobileReady = [NSNumber numberWithBool:NO];
    
    // Remove Any Intents via Cascade Delete (only used for widgets that already exsisted)
    [self clearIntentsForWidget:widget];
    // Then Process Our New Intents
    [self processIntents:info forWidget:widget];
    // Refresh Info for Widgets that have been Cloned (only used for widgets that already exsisted)
    [self refreshClonedWidgetsForWidget:widget withIntents:info forUser:user];
    
    return widget;
}

- (BOOL) verifyResponseObject:(NSDictionary *)responseObject
{
    NSNumber * status = [responseObject objectForKey:widgetStatus];
    if([status boolValue] == FALSE) {
        NSLog(@"Status is false");
        return NO;
    }
    return YES;
}

#pragma mark - Intents Parsing
/**
 *  Used to parse out the widget's intents
 *
 *  @param info   Dictionary containing the widget's intents
 *  @param widget The current widget we are processing
 */
- (void) processIntents:(NSDictionary *)info forWidget:(MNOWidget *)widget
{
    // Process Intents
    if([info objectForKey:intents]){
        
        NSDictionary * intent = [info objectForKey:intents];
        NSArray * receieves = [intent objectForKey:intentsReceive];
        NSArray * send = [intent objectForKey:intentsSend];
        if ([receieves count]){
            for (NSDictionary * dict in receieves)
                for (NSString * type in [dict objectForKey:intentDataTypes]) {
                    MNOIntentSubscriberSaved * ir = [MNOIntentSubscriberSaved initWithManagedObjectContext:self.moc];
                    ir.action = [dict objectForKey:intentAction];
                    ir.isReceiver = @YES;
                    ir.dataType = type;
                    [widget addIntentRegisterObject:ir];
                }
        }
        
        if ([send count]){
            for (NSDictionary * dict in send)
                for (NSString * type in [dict objectForKey:intentDataTypes]) {
                    MNOIntentSubscriberSaved * ir = [MNOIntentSubscriberSaved initWithManagedObjectContext:self.moc];
                    ir.action = [dict objectForKey:intentAction];
                    ir.isReceiver = @NO;
                    ir.dataType = type;
                    [widget addIntentRegisterObject:ir];
                    
                }
        }
        
    }
}

- (void) clearIntentsForWidget:(MNOWidget *)widget
{
    for (MNOIntentSubscriberSaved * iss in widget.intentRegister) {
        [self.moc deleteObject:iss];
    }
}

#pragma mark - DownloadDashboards
/**
 * See Declaration in MNOUserDownloadService.h
 */
- (NSMutableArray *) loadDashboardFromDictionary:(NSDictionary *)componentList withUser:(MNOUser *)user
{
    // Retrieve our current list of dashboards for this user
    NSMutableDictionary * currentDashboards = [self retrieveDashboardsFromDesktopForUser:user];
    
    // Validate and Parse Dashboard
    if (![self verifyResponseObject:componentList]) {
        return nil;
    }
    
    componentList = [componentList objectForKey:componentData];
    NSMutableArray * tempDashboard = [[NSMutableArray alloc] init];
    
    for (NSDictionary * row in componentList) {
        
        NSString * userName = [[row objectForKey:@"user"] objectForKey:@"userId"];
        if ([userName isEqualToString:user.username]) {
            
            NSString * layoutStr = [row objectForKey:@"layoutConfig"];
            
            if(layoutStr == nil) {
                NSLog(@"Couldn't find layoutConfig, skipping.");
                continue;
            }
            
            NSError * error;
            NSDictionary * layoutInfo = [NSJSONSerialization JSONObjectWithData:[layoutStr dataUsingEncoding:NSUTF8StringEncoding] options:0 error:&error];
            if(layoutInfo == nil) {
                NSLog(@"Couldn't parse layout info, skipping.");
                continue;
            }
            
            NSString * dashboardId = [row objectForKey:@"guid"];
            [currentDashboards removeObjectForKey:dashboardId];
            MNODashboard * dashboard = [self retrieveDashboard:dashboardId forUser:user];
            
            // Check to see if this dashboard has already been created
            if (dashboard) {
                // Check to see if anything about it has changed
                if ([self dashboard:dashboard hasChangedComparedTo:layoutInfo]) {
                    // Clear out any old widgets because they are going to be replaced
                    [self clearOutWidgetsForDashboard:dashboard];
                    NSLog(@"%@ has been modified",dashboard.user.name);

                }else{
                    // Skip this dashboard since it hasn't changed
                    continue;
                }
            }else{
                // otherwise create new and assign user
                dashboard = [MNODashboard initWithManagedObjectContext:self.moc];
                dashboard.wasCreatedOnDesktop = @(YES);
                dashboard.user = user;
                dashboard.dashboardId = dashboardId;
            }
            
            dashboard.name = [row objectForKey:@"name"];
            dashboard.dashboardId = [row objectForKey:@"guid"];
            
            for (NSDictionary * dashboardLayout in [layoutInfo objectForKey:@"widgets"]) {
                
                NSString *widgetGuid = [dashboardLayout objectForKey:@"widgetGuid"];
                
                if(widgetGuid == nil) {
                    NSLog(@"Couldn't parse widgetGuid.  Skipping.");
                    continue;
                }
                MNOWidget *widget = [self cloneWidgetWithId:widgetGuid user:user];
                
                if(widget == nil) {
                    NSLog(@"Couldn't make a new widget.  Skipping.");
                    continue;
                }
                
                widget.isDefault = @(NO);
                widget.user = user;
                
                [dashboard addWidgetsObject:widget];
            }
            
            for (NSDictionary *dashboardLayout in [layoutInfo objectForKey:@"items"]) {
                
                if ([dashboardLayout objectForKey:@"widgets"] && [[dashboardLayout objectForKey:@"widgets"] count] > 0) {
                    
                    NSString *widgetGuid = [[[dashboardLayout objectForKey:@"widgets"] objectAtIndex:0] objectForKey:@"widgetGuid"];
                    
                    if(widgetGuid == nil) {
                    NSLog(@"Couldn't parse widgetGuid.  Skipping.");
                    continue;
                    }
                    
                    MNOWidget *widget = [self cloneWidgetWithId:widgetGuid user:user];
                    widget.isDefault = @(NO);
                    widget.user = user;
                    if(widget){
                        [dashboard addWidgetsObject:widget];
                    }
                }
            }
            
            [tempDashboard addObject:dashboard];
        }
    }
    
    // Delete the remaining dashboards (used for syncing dashboards)
    [self updateDeletedDashboardsOnMobile:currentDashboards forUser:user];
    
    return tempDashboard;
}

/**
 *  Deletes all dashboards in the 'leftOverDashboards' dictionary.
 *
 *  @param leftOverDashboards The dashboards to delete
 *  @param user               The logged in uer.
 */
- (void) updateDeletedDashboardsOnMobile:(NSMutableDictionary *)leftOverDashboards forUser:(MNOUser*)user
{
    if([leftOverDashboards count] > 0){
        NSMutableArray * removedDashboardIds = [NSMutableArray new];
        for (NSString * dashboardId in leftOverDashboards) {
            MNODashboard * dashboardToDelete = [leftOverDashboards objectForKey:dashboardId];
            NSLog(@"Deleting Dashboard: %@",dashboardToDelete.name);
            [user removeDashboardsObject:dashboardToDelete];
            [self clearOutWidgetsForDashboard:dashboardToDelete];
            [removedDashboardIds addObject:dashboardId];
            [self.moc deleteObject:dashboardToDelete];
        }
        [MNOSyncDashboardManager sharedManager].dashboardsUpdated = YES;
        [MNOAccountManager sharedManager].dashboards = nil;
        [[NSNotificationCenter defaultCenter] postNotificationName:dashboardsDeleted object:removedDashboardIds];
        [self save];
    }
}

/**
 *  Retrieves a list of dashboards that were created by OWF Desktop
 *
 *  @param user The logged in user
 *
 *  @return Mapping of dashboardIds to MNODashboard objects. All dashboards were created through the desktop.
 */
- (NSMutableDictionary * ) retrieveDashboardsFromDesktopForUser:(MNOUser*)user
{
    NSMutableDictionary * dict = nil;

    if(user){
        NSFetchRequest * request = [[NSFetchRequest alloc] initWithEntityName:[MNODashboard entityName]];
        request.predicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[[NSPredicate predicateWithFormat:@"wasCreatedOnDesktop == %@",@(YES)],[NSPredicate predicateWithFormat:@"user == %@",user]]];
        
        NSError * error = nil;
        NSArray * results = [self.moc executeFetchRequest:request error:&error];
        dict = [NSMutableDictionary new];

        for (MNODashboard * dash in results) {
            dict[dash.dashboardId] = dash;
        }
                         
    }
    
    return dict;
}

 
/**
 *  Helper method for processing the user's Dashboards
 *
 *  @param componentList Dictionary containg the user's dashboards
 *  @param user          The current user
 *  @param callback      callback used for status updates
 */
- (void) processDashboardList:(NSDictionary*)componentList  forUser:(MNOUser*)user callback:(void(^)(NSString * status, int code))callback
{
    if(componentList == nil){//failure
        callback(@"Failed To Download Dashboards", -1);
        return;
    }
    
     NSMutableArray * tempDashboards = [self loadDashboardFromDictionary:componentList withUser:user];
    user.dashboards = [NSSet setWithArray:tempDashboards];

    [self save];
    callback(@"Downloaded Dashboards",1);
}

/**
 *  Public Method for Retrieving the User's Dashboards (used by sync dashboards). See Declaration in MNOUserDownloadService.h
 */
- (void) loadAsyncComponentListWithCallback:(void(^)(NSString * status, NSMutableArray * modDashboards))callback
                                   withUser:(MNOUser *)user
{
    // Make Connection
    NSString * url = [self formatURL:componentPath];
    
    [[MNOHttpStack sharedStack] makeAsynchronousRequest:REQUEST_JSON url:url success:^(MNOResponse *response) {
        NSDictionary * componentList = response.responseObject;
        if(componentList == nil){//failure
            callback(@"Failed To Download Dashboards", nil);
        }else{
            // Dashboards that were modified
            NSMutableArray * modifiedDashboards = [self loadDashboardFromDictionary:componentList withUser:user];
            [self save];
            callback(@"Downloaded Dashboards",modifiedDashboards);
        }
        
    } failure:^(MNOResponse *response, NSError *error) {
        callback(error.description, nil);
    }];
}

/**
 *  Download the current user's dashboards
 *
 *  @param callback Used for status updates
 *  @param user     The current user
 */
- (void) loadComponentListWithCallback:(void(^)(NSString * status, int code))callback
                              withUser:(MNOUser *)user
{
    // Make Connection
    NSString * url = [self formatURL:componentPath];

    [[MNOHttpStack sharedStack] makeAsynchronousRequest:REQUEST_JSON url:url success:^(MNOResponse *response) {
        NSDictionary * componentList = response.responseObject;
        [self processDashboardList:componentList forUser:user callback:callback];
        activeConnections--;
        if (!activeConnections)
            callback(@"Complete",5);
        
    } failure:^(MNOResponse *response, NSError *error) {
        callback(error.description,-1);
    }];
  
}

/**
 *  Retrieve a MNOWidget based on an widget guid
 *
 *  @param widgetId Id of the widget we are looking for
 *
 *  @return MNOWidget, or nil if not found
 */
- (MNOWidget *) cloneWidgetWithId:(NSString *)widgetId user:(MNOUser *)user
{
    MNOWidget * widget = [self fetchWidgetWithId:widgetId forUser:user];
    if (widget != nil) {
        return (MNOWidget *)[MNOWidget clone:widget inContext:self.moc];
    }
    
    return widget;
}

- (NSArray *) fetchClonesForWidget:(MNOWidget *)defaultWidget user:(MNOUser*)currentUser
{
    NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNOWidget entityName]];
    
    fetch.predicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[[NSPredicate predicateWithFormat:@"isDefault == %@",@(NO)],[NSPredicate predicateWithFormat:@"widgetId == %@",defaultWidget.widgetId],[NSPredicate predicateWithFormat:@"user == %@",currentUser]]];
    
    NSError * error = nil;
    NSArray * results = [self.moc executeFetchRequest:fetch error:&error];
    if (results == nil || error) {
        return nil;
    }
    return results;
}

- (MNOWidget *) fetchWidgetWithId:(NSString*)widgetId forUser:(MNOUser*)user
{
    if (user == nil) {
        return nil;
    }
    
    NSFetchRequest * request  = [[NSFetchRequest alloc] initWithEntityName:[MNOWidget entityName]];
    request.predicate =
    [NSCompoundPredicate andPredicateWithSubpredicates:@[[NSPredicate predicateWithFormat:@"widgetId==%@",widgetId],[NSPredicate predicateWithFormat:@"isDefault == %@ ",@(YES)],[NSPredicate predicateWithFormat:@"user == %@",user]]];
    
    NSError * err = nil;
    NSArray * results = [self.moc executeFetchRequest:request error:&err];
    MNOWidget * widget  = nil;

    if (!err && [results count] > 0){
        widget = [results firstObject];
    }
    
    return widget;
}


#pragma mark - Group Data Download
/**
 *  Load the User's group data
 *
 *  @param callback Used for status updates
 *  @param user     The current user
 */
- (void) loadUserGroupDataWithCallback:(void(^)(NSString * status, int code))callback
                              withUser:(MNOUser *)user
{
    // Make Connection
    NSString * url = [self formatURL:groupsPath];

    [[MNOHttpStack sharedStack] makeAsynchronousRequest:REQUEST_JSON url:url success:^(MNOResponse *response) {
        NSDictionary * temp = response.responseObject;
        NSArray * groups = [temp objectForKey:@"data"];
        // Parse Response
        for (int i = 0; i < [groups count]; i++) {
            NSDictionary * temp = [groups objectAtIndex:i];
            if(temp && [temp  objectForKey:@"displayName"]){
                MNOGroup * myGroup = [MNOGroup initWithManagedObjectContext:self.moc];
                myGroup.name = [temp  objectForKey:@"displayName"];
                [user addGroupsObject:myGroup];
            }
        }
        
        
        [self save];
        callback(@"Downloaded Group Data",4);
        activeConnections--;
        if (!activeConnections)
            callback(@"Complete",5);
        
    } failure:^(MNOResponse *response, NSError *error) {
        callback(error.description,-1);
    }];
}

#pragma mark - Getters/Setters

- (NSManagedObjectContext *) moc
{
    if (!_moc) {
        _moc = [[MNOUtil sharedInstance] defaultManagedContext];
    }
    return _moc;
}

#pragma mark - Cache

- (void) removeCachedResponses
{
    [[NSURLCache sharedURLCache] removeAllCachedResponses];
}

#pragma mark - Core Data

- (BOOL) save
{
    NSError * error;
    if ([self.moc hasChanges] && ![self.moc save:&error]) {
        NSLog(@"Unresolved error %@, %@", error, [error userInfo]);
        [[MNOUtil sharedInstance] showMessageBox:@"Error saving data" message:@"Unable to save data.  Changes may not persist after this application closes."];
        return NO;
    }
    return YES;
}

#pragma mark - Helper Fn
/**
 *  Retrieves a dashboard based on a given dashboardId
 *
 *  @param dashboardId A unique identifier for a dashboard
 *
 *  @return MNODashboard if found or nil otherwise
 */
- (MNODashboard *) retrieveDashboard:(NSString *)dashboardId forUser:(MNOUser*)user
{
    NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNODashboard entityName]];
    fetch.predicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[[NSPredicate predicateWithFormat:@"dashboardId == %@",dashboardId],[NSPredicate predicateWithFormat:@"user == %@",user]]];
    
    NSError * error = nil;
    NSArray * results = [self.moc executeFetchRequest:fetch error:&error];
    if (!error && [results count] == 1)
        return [results firstObject];
   
    return nil;
}

/**
 *  Takes a MNODashboard and compares it to a dashboard JSON object. If the MNODashboard and
 *  JSON object have the same widgets then YES is returned, NO otherwise.
 *
 *  @param dash       MNODashboard
 *  @param layoutInfo dashboard JSON object.
 *
 *  @return YES if the JSON object and the MNODashboard have the same widgets.
 */
- (BOOL) dashboard:(MNODashboard*)dash hasChangedComparedTo:(NSDictionary*)layoutInfo
{
    NSMutableDictionary * counter = [NSMutableDictionary new];
    for (NSDictionary *dashboardLayout in [layoutInfo objectForKey:@"widgets"]) {
        NSString *widgetGuid = [dashboardLayout objectForKey:@"widgetGuid"];
        if ([counter objectForKey:widgetGuid]) {
            NSNumber * count = [counter objectForKey:widgetGuid];
            int newCount = (int)[count integerValue] + 1;
            [counter setObject:@(newCount) forKey:widgetGuid];
        }else{
            [counter setObject:@(1) forKey:widgetGuid];
        }
    }
    
    for (NSDictionary *dashboardLayout in [layoutInfo objectForKey:@"items"]) {
        if ([dashboardLayout objectForKey:@"widgets"] && [[dashboardLayout objectForKey:@"widgets"] count] > 0) {
            NSString *widgetGuid = [[[dashboardLayout objectForKey:@"widgets"] objectAtIndex:0] objectForKey:@"widgetGuid"];
            if ([counter objectForKey:widgetGuid] != nil) {
                NSNumber * count = [counter objectForKey:widgetGuid];
                int newCount = (int)[count integerValue] + 1;
                [counter setObject:@(newCount) forKey:widgetGuid];
            }else{
                [counter setObject:@(1) forKey:widgetGuid];
            }
        }
    }
    
    for (MNOWidget * widget in dash.widgets){
        if ([counter objectForKey:widget.widgetId] != nil) {
            int newCount = (int)[[counter objectForKey:widget.widgetId] integerValue];
            if (--newCount == 0) {
                // Done
                [counter removeObjectForKey:widget.widgetId];
            }
        }else{
            return YES;
        }
    }
    
    return [counter count] != 0;
}


/**
 *  Removes all the widgets for this dashboard. It also deletes the widgets from Core Data.
 *
 *  @param dash MNODashboard to use.
 */
- (void) clearOutWidgetsForDashboard:(MNODashboard*)dash
{

    if(dash){
        [dash removeWidgets:dash.widgets];

        NSArray * widgets = [dash.widgets allObjects];
        int count = (int)[widgets count];
        
        while (count--) {
            MNOWidget * widget = [widgets firstObject];
            [self.moc deleteObject:widget];
        }
        
        [self save];
    }
}

@end
