//
//  MNOAppsMall.m
//  Mono
//
//  Created by Michael Wilson on 5/12/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAppsMallManager.h"

#import "MNOAccountManager.h"
#import "MNOAppsMall.h"
#import "MNOHttpStack.h"

#define MONO_APPS_MALL_WIDGET_LIST_URL @"public/serviceItem/getServiceItemsAsJSON"

@implementation MNOAppsMallManager

#pragma mark - constructors

- (id)init {
    if(self = [super init]) {
        // Do nothing
    }
    
    return self;
}

#pragma mark - public methods

/**
 * See declaration in MNOAccelerometerManager.h
 */
+ (MNOAppsMallManager *)sharedInstance {
    static MNOAppsMallManager *sharedManager = nil;
    static dispatch_once_t onceToken;
    
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

- (void) addOrUpdateStorefront:(NSString *)storefrontUrl storefrontName:(NSString *)storefrontName success:(void(^)(MNOAppsMall *appsMall, NSArray *widgetList))success failure:(void(^)(void))failure {
    NSURL *verifyUrl;
    if([storefrontUrl hasSuffix:@"/"]) {
        verifyUrl = [NSURL URLWithString:storefrontUrl];
    }
    else {
        verifyUrl = [NSURL URLWithString:[storefrontUrl stringByAppendingString:@"/"]];
    }

    // Verify that this is a valid URL
    if(verifyUrl == nil) { // URL was invalid
        return;
    }
    
    // Make the widget list URL
    NSURL *widgetListUrl = [NSURL URLWithString:MONO_APPS_MALL_WIDGET_LIST_URL relativeToURL:verifyUrl];
    
    // Verified that it isn't already present.  Grab the list of widgets from the Apps Mall.
    [[MNOHttpStack sharedStack] makeAsynchronousRequest:REQUEST_JSON url:[widgetListUrl absoluteString] success:^(MNOResponse *response) {
        // Make sure the URL exists in core data
        NSManagedObjectContext *moc = [[MNOUtil sharedInstance] defaultManagedContext];
        
        NSFetchRequest *fetch = [NSFetchRequest fetchRequestWithEntityName:[MNOAppsMall entityName]];
        fetch.predicate = [NSPredicate predicateWithFormat:@"name == %@", storefrontName];
        
        __block NSError *error;
        __block NSArray *results;
        
        [moc performBlockAndWait:^{
            results = [moc executeFetchRequest:fetch error:&error];
        }];
    
        if(error) {
            NSLog(@"Error verifying apps mall is unique.  Error: %@.", error);
            return;
        }
       
        // If it doesn't exist, create it
        __block MNOAppsMall *appsMall;
        if(results != nil && [results count] > 0) {
            // It already exists -- get this one
            appsMall = [results objectAtIndex:0];
        }
        else {
            [moc performBlockAndWait:^{
                appsMall = [MNOAppsMall initWithManagedObjectContext:[[MNOUtil sharedInstance] defaultManagedContext]];
                appsMall.name = storefrontName;
                appsMall.url = storefrontUrl;
            }];
        }
        
        // We already have the JSON, so insert these all into the widget list with isDefault == 0
        NSDictionary *appsMallJson = [response responseObject];
        NSNumber *total = [appsMallJson valueForKey:@"total"];
        
        if(total != nil) {
            int totalInt = [total intValue];
            NSLog(@"Found %d widgets in this apps mall.", totalInt);
            
            __block NSMutableArray *widgetList = [[NSMutableArray alloc] initWithCapacity:totalInt];
            NSArray *data = [appsMallJson valueForKey:@"data"];
            
            if(data != nil) {
                for(int i=0; i<totalInt; i++) {
                    // Gather the necessary info from the JSON
                    NSDictionary *item = [data objectAtIndex:i];
                    
                    // Get the absolutely required parameters
                    NSString *launchUrl = [item valueForKey:@"launchUrl"];
                    NSString *title = [item valueForKey:@"title"];
                    NSString *guid = [item valueForKey:@"uuid"];
                    
                    // If we don't have the launch URL, title, or guid, we're done
                    if(launchUrl == nil || title == nil || guid == nil) {
                        NSLog(@"Not enough information to store this widget.  Skipping.");
                        continue;
                    }
                    
                    // Append name of storefront and re-assign it to string
                    title = [NSString stringWithFormat:@"%@_%@", storefrontName, title];
                    
                    NSString *imageLargeUrl = [item valueForKey:@"imageLargeUrl"];
                    NSString *imageSmallUrl = [item valueForKey:@"imageSmallUrl"];
                    // Verify the other parameters
                    if(imageLargeUrl == nil) {
                        imageLargeUrl = @"/";
                    }
                    
                    if(imageSmallUrl == nil) {
                        imageSmallUrl = @"/";
                    }
                    
                    // Get the mobile ready boolean
                    NSDictionary *owfProperties = [item valueForKey:@"owfProperties"];
                    NSNumber *mobileReady;
                    
                    if(owfProperties != nil) {
                        mobileReady = [owfProperties valueForKey:@"mobileReady"];
                    }
                    
                    // If it doesn't exist, set it to false
                    if(mobileReady == nil) {
                        mobileReady = [[NSNumber alloc] initWithBool:FALSE];
                    }
                    
                    NSFetchRequest *widgetFetch = [NSFetchRequest fetchRequestWithEntityName:[MNOWidget entityName]];
                    widgetFetch.predicate = [NSPredicate predicateWithFormat:@"widgetId == %@ and appsMall == %@",
                                             guid, appsMall];
                    
                    // Should be ready to roll -- insert the new widget
                    [moc performBlockAndWait:^{
                        NSError *widgetError;
                        NSArray *widgetFetchResults = [moc executeFetchRequest:widgetFetch error:&widgetError];
                        MNOWidget *newWidget;
                        
                        // Error -- get out of the block
                        if(error || widgetFetchResults == nil || [widgetFetchResults count] > 1) {
                            return;
                        }
                        
                        // Update old lists if possible
                        if([widgetFetchResults count] == 1) {
                            newWidget = [widgetFetchResults objectAtIndex:0];
                        }
                        else {
                            newWidget = [MNOWidget initWithManagedObjectContext:moc];
                        }
                        
                        // Make sure the default is false at first
                        newWidget.isDefault = NO;
                        
                        // Set the rest of the fun stuff
                        newWidget.url = launchUrl;
                        newWidget.name = title;
                        newWidget.widgetId = guid;
                        
                        newWidget.largeIconUrl = imageLargeUrl;
                        newWidget.smallIconUrl = imageSmallUrl;
                        
                        newWidget.mobileReady = mobileReady;
                        
                        newWidget.appsMall = appsMall;

                        [widgetList addObject:newWidget];
                        
                        NSLog(@"Added widget with title: %@.", title);
                    }];
                }
                
                // Delete widgets that are no longer in the widget list
                NSFetchRequest *allCurrentWidgetsRequest = [NSFetchRequest fetchRequestWithEntityName:[MNOWidget entityName]];
                allCurrentWidgetsRequest.predicate = [NSPredicate predicateWithFormat:@"appsMall == %@", appsMall];
                
                [moc performBlockAndWait:^{
                    NSError *allCurrentError;
                    NSArray *allWidgets = [moc executeFetchRequest:allCurrentWidgetsRequest error:&allCurrentError];
                    int widgetListSize = (int)[widgetList count];
                    
                    if(error) {
                        NSLog(@"Error trying to delete old widgets.  Message: %@.", allCurrentError);
                    }
                    
                    // Loop through all the widgets associated with this AppsMall
                    for(MNOWidget *widget in allWidgets) {
                        BOOL found = FALSE;
                        
                        // Find everything with this widget ID.  If we find it, break
                        for(int i=0; i<widgetListSize; i++) {
                            if([widget.widgetId isEqualToString:((MNOWidget *)[widgetList objectAtIndex:i]).widgetId]) {
                                found = TRUE;
                                break;
                            }
                        }
                        
                        if(found == FALSE) {
                            [moc deleteObject:widget]; // Delete the object
                        }
                    }
                }];
                
                [moc performBlockAndWait:^{
                    [moc save:nil];
                }];
                
                success(appsMall, widgetList);
            }
            else {
                NSLog(@"No data object in the apps mall JSON!");
                failure();
            }
        }
        else {
            NSLog(@"Invalid JSON -- no total found.");
            failure();
        }
    } failure:^(MNOResponse *response, NSError *error) {
        NSLog(@"Error!  Couldn't get widget list from URL: %@.  Not inserting.", storefrontUrl);
        NSLog(@"Error message: %@.", error);
        
        failure();
    }];
}

- (void)removeStorefront:(NSString *)storefrontName {
    NSManagedObjectContext *moc = [[MNOUtil sharedInstance] defaultManagedContext];
    
    // Find the apps mall in core data
    NSFetchRequest *appsMallRequest = [NSFetchRequest fetchRequestWithEntityName:[MNOAppsMall entityName]];
    appsMallRequest.predicate = [NSPredicate predicateWithFormat:@"name == %@", storefrontName];
    __block MNOAppsMall *appsMall;
    
    [moc performBlockAndWait:^{
        NSError *error;
        NSArray *results = [moc executeFetchRequest:appsMallRequest error:&error];
        
        if(error) {
            NSLog(@"Error trying to find AppsMall by name.  Error: %@.", error);
        }
        
        if([results count] == 0) {
            NSLog(@"Couldn't find name.  Aborting.");
            return;
        }
        
        appsMall = [results objectAtIndex:0];
    }];
    
    // Couldn't find it -- return
    if(appsMall == nil) {
        return;
    }
    
    
    [moc performBlockAndWait:^{
        MNOAccountManager *accountManager = [MNOAccountManager sharedManager];
        
        NSError *error;
        // Remove all widgets associated with this AppsMall
        NSFetchRequest *allWidgetsRequest = [NSFetchRequest fetchRequestWithEntityName:[MNOWidget entityName]];
        allWidgetsRequest.predicate = [NSPredicate predicateWithFormat:@"appsMall == %@", appsMall];
        
        NSArray *results = [moc executeFetchRequest:allWidgetsRequest error:&error];
        
        if(error) {
            NSLog(@"Error trying to find AppsMall widgets.  Error: %@.", error);
            return;
        }
        
        NSFetchRequest *allDashboardsRequest = [NSFetchRequest fetchRequestWithEntityName:[MNODashboard entityName]];
        NSArray *dashboards = [moc executeFetchRequest:allDashboardsRequest error:&error];
        
        if(error) {
            NSLog(@"Error trying to find all dashboards.  Error: %@.", error);
            return;
        }
        
        BOOL dashboardWasDeleted = FALSE;
        
        for(MNOWidget *widget in results) {
            // Remove the widgets from each dashboard if necessary
            for(MNODashboard *dashboard in dashboards) {
                dashboardWasDeleted = dashboardWasDeleted || [self removeFromDashboard:dashboard widget:widget];
            }
            [moc deleteObject:widget];
        }
        
        // Remove the appsmall as well
        [moc deleteObject:appsMall];
        
        [moc save:&error];
        
        if(error) {
            NSLog(@"Error trying to save context after processing.  Error: %@.", error);
            return;
        }
        
        accountManager.defaultWidgets = nil; // Set default widgets to nil so they're reloaded next time they're called
        accountManager.dashboards = nil; // Same with dashboards
        
        if(dashboardWasDeleted) {
            [[[UIAlertView alloc] initWithTitle:@"Dashboard deleted!"
                                        message:@"One or more dashboards were deleted because all of the widgets in them were removed."
                                       delegate:nil
                              cancelButtonTitle:@"OK"
                              otherButtonTitles:nil] show];
        }
    }];
}

- (NSArray *)getStorefronts {
    __block NSArray *storefronts;
    NSManagedObjectContext *moc = [[MNOUtil sharedInstance] defaultManagedContext];
    
    [moc performBlockAndWait:^{
        NSFetchRequest *fetch = [NSFetchRequest fetchRequestWithEntityName:[MNOAppsMall entityName]];
        NSError *error;
        
        storefronts = [moc executeFetchRequest:fetch error:&error];
        
        if(error) {
            NSLog(@"Error getting apps malls!  Message: %@.", error);
        }
    }];
    
    return storefronts;
}

- (NSArray *)getWidgetsForStorefront:(MNOAppsMall *)appsMall {
    __block NSArray *widgets;
    NSManagedObjectContext *moc = [[MNOUtil sharedInstance] defaultManagedContext];
    
    [moc performBlockAndWait:^{
        NSFetchRequest *fetch = [NSFetchRequest fetchRequestWithEntityName:[MNOWidget entityName]];
        fetch.predicate = [NSPredicate predicateWithFormat:@"appsMall == %@", appsMall];
        NSError *error;
        
        widgets = [moc executeFetchRequest:fetch error:&error];
        
        if(error) {
            NSLog(@"Error getting apps malls!  Message: %@.", error);
        }
    }];
    
    return widgets;
}

- (void)installWidgets:(NSArray *)widgets {
    NSManagedObjectContext *moc = [[MNOUtil sharedInstance] defaultManagedContext];
    
    [moc performBlockAndWait:^{
        NSArray *storefronts = [self getStorefronts];
        MNOAccountManager *accountManager = [MNOAccountManager sharedManager];
        
        NSError *error;
        NSFetchRequest *allDashboardsRequest = [NSFetchRequest fetchRequestWithEntityName:[MNODashboard entityName]];
        NSArray *dashboards = [moc executeFetchRequest:allDashboardsRequest error:&error];
        
        if(error) {
            NSLog(@"Error trying to find all dashboards.  Error: %@.", error);
            return;
        }
        
        BOOL dashboardWasDeleted = FALSE;
        
        for(MNOAppsMall *appsMall in storefronts) {
            NSArray *allWidgets = [self getWidgetsForStorefront:appsMall];
            
            // From the list of all widgets associated with this mall,
            // look for any that are in the supplied list.  If they're present,
            // install them.  Otherwise, uninstall them.
            for(MNOWidget * widget in allWidgets) {
                if([widgets containsObject:widget] == TRUE) {
                    widget.isDefault = [[NSNumber alloc] initWithBool:TRUE];
                    widget.user = accountManager.user;
                }
                else {
                    widget.isDefault = [[NSNumber alloc] initWithBool:FALSE];
                    widget.user = nil;
                    
                    // Delete from dashboards if necessary
                    for(MNODashboard *dashboard in dashboards) {
                        dashboardWasDeleted = dashboardWasDeleted || [self removeFromDashboard:dashboard widget:widget];
                    }
                }
            }
        }
        
        [moc save:&error];
        
        if(error) {
            NSLog(@"Error trying to save context after processing.  Error: %@.", error);
            return;
        }
        
        accountManager.defaultWidgets = nil; // Set default widgets to nil so they're reloaded next time they're called
        accountManager.dashboards = nil; // Same with dashboards
        
        if(dashboardWasDeleted) {
            [[[UIAlertView alloc] initWithTitle:@"Dashboard deleted!"
                                        message:@"One or more dashboards were deleted because all of the widgets in them were removed."
                                       delegate:nil
                              cancelButtonTitle:@"OK"
                              otherButtonTitles:nil] show];
        }
    }];
}

#pragma mark - private methods

- (BOOL)removeFromDashboard:(MNODashboard *)dashboard widget:(MNOWidget *)widget inMoc:(NSManagedObjectContext *)moc
{
    NSMutableSet *dashWidgets = [dashboard.widgets mutableCopy];
    moc = moc == nil ?  [[MNOUtil sharedInstance] defaultManagedContext] : moc;
    
    // Search through each widget for widgets with the same guid as the widget we're trying to remove
    for(MNOWidget *dashWidget in dashboard.widgets) {
        if([dashWidget.widgetId isEqualToString:widget.widgetId] == TRUE) {
            [dashWidgets removeObject:dashWidget];
            [moc deleteObject:dashWidget];
            dashboard.modified = @TRUE;
        }
    }
    
    BOOL dashboardDeleted = FALSE;
    
    if([dashboard.modified isEqual:@TRUE]) {
        // No widgets left -- remove the dashboard
        if([dashWidgets count] == 0) {
            [moc deleteObject:dashboard];
            dashboardDeleted = TRUE;
        }
        // Otherwise, update the widget list
        else {
            dashboard.widgets = dashWidgets;
        }
    }
    
    return dashboardDeleted;
}

- (BOOL)removeFromDashboard:(MNODashboard *)dashboard widget:(MNOWidget *)widget
{
    return [self removeFromDashboard:dashboard widget:widget inMoc:nil];
}

@end
