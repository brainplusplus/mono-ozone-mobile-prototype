//
//  AppDelegate.m
//  Mono2
//
//  Created by Ben Scazzero on 1/21/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOProtocolManager.h"
#import "MNONSURLCacheManager.h"
#import "MNONetworkWrapperProtocol.h"
#import "MNOReachabilityManager.h"

@implementation MNOAppDelegate

@synthesize managedObjectContext = _managedObjectContext;
@synthesize managedObjectModel = _managedObjectModel;
@synthesize persistentStoreCoordinator = _persistentStoreCoordinator;

NSMutableDictionary * callbackDataDictionary;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    /*** Set up DB classes ***/
    [self managedObjectContext];
    [NSURLProtocol registerClass:[MNONetworkWrapperProtocol class]];
    [NSURLProtocol registerClass:[MNOProtocolManager class]];
    
    [NSURLCache setSharedURLCache:[[MNONSURLCacheManager alloc] init]];
    callbackDataDictionary = [[NSMutableDictionary alloc] init];
    // Set up fetch options
    [application setMinimumBackgroundFetchInterval:UIApplicationBackgroundFetchIntervalMinimum];
    
    // Make sure that the reachability manager is started and monitoring reachability
    [MNOReachabilityManager sharedInstance];
    
    return YES;
}

- (void)applicationWillResignActive:(UIApplication *)application
{
    // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
    // Use this method to pause ongoing tasks, disable timers, and throttle down OpenGL ES frame rates. Games should use this method to pause the game.
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
    // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
    // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
}

- (void)applicationWillEnterForeground:(UIApplication *)application
{
    // Called as part of the transition from the background to the inactive state; here you can undo many of the changes made on entering the background.
}

- (void)applicationDidBecomeActive:(UIApplication *)application
{
    // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
}

- (void)applicationWillTerminate:(UIApplication *)application
{
    //Discard the current recording
    
    // Saves changes in the application's managed object context before the application terminates.
    [self saveContext];
}


- (void)application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification
{
    UIApplicationState state = [application applicationState];
    
    //Get a key for callback data
    NSInteger objectDataKey = arc4random_uniform(1000);
    [callbackDataDictionary setObject:[notification userInfo] forKey:[NSString stringWithFormat:@"%ld", (long)objectDataKey ]];
    if (state == UIApplicationStateActive) {
        UIAlertView *alert = [[UIAlertView alloc] initWithTitle:[[notification userInfo] objectForKey: @"title"]
                                                        message:notification.alertBody
                                                       delegate:self cancelButtonTitle:@"Show"
                                              otherButtonTitles:nil];
        alert.tag = objectDataKey;
        [alert show];
    }
    
    // Set icon badge number to zero
    application.applicationIconBadgeNumber = 0;
}

#pragma mark - UIAlertViewDelegate
- (void)alertView:(UIAlertView *)alertView clickedButtonAtIndex:(NSInteger)buttonIndex {
    if (buttonIndex == 0) {
            //Show Pressed
            NSString* dataKey = [NSString stringWithFormat:@"%ld", (long)[alertView tag]];
        
            //Pull the object out of the lookup
            NSDictionary* info = (NSDictionary*)[callbackDataDictionary objectForKey: dataKey];
        
            //Remove the object
            [callbackDataDictionary removeObjectForKey:dataKey];
        
            [[NSNotificationCenter defaultCenter] postNotificationName:@"widgetNotified" object:self userInfo:info];
    }
}

- (void)saveContext
{
    NSError *error = nil;
    NSManagedObjectContext *managedObjectContext = self.managedObjectContext;
    if (managedObjectContext != nil) {
        if ([managedObjectContext hasChanges] && ![managedObjectContext save:&error]) {
            NSLog(@"Unresolved error %@, %@", error, [error userInfo]);
            [[MNOUtil sharedInstance] showMessageBox:@"Unable to save data" message:@"Error saving data to the internal database.  Changes may not persist after this progrma closes."];
        }
    }
}

#pragma mark - Core Data stack

// Returns the managed object context for the application.
// If the context doesn't already exist, it is created and bound to the persistent store coordinator for the application.
- (NSManagedObjectContext *)managedObjectContext
{
    // Do this to get a MOC on a per-thread basis
    NSThread *thisThread = [NSThread currentThread];
    
    // Main thread, return main MOC
    if (thisThread == [NSThread mainThread]) {
        if(_managedObjectContext != nil) {
            return _managedObjectContext;
        }
        else {
            NSPersistentStoreCoordinator *coordinator = [self persistentStoreCoordinator];
            if (coordinator != nil) {
                _managedObjectContext = [[NSManagedObjectContext alloc] initWithConcurrencyType:NSPrivateQueueConcurrencyType];
                [_managedObjectContext setPersistentStoreCoordinator:coordinator];
            }
            
            return _managedObjectContext;
        }
    }
    // Child thread, return a thread MOC
    else {
        NSManagedObjectContext *threadMoc = [[thisThread threadDictionary] objectForKey:@"MONO_MOC"];
        if (threadMoc == nil) {
            NSPersistentStoreCoordinator *coordinator = [self persistentStoreCoordinator];
            threadMoc = [[NSManagedObjectContext alloc] initWithConcurrencyType:NSPrivateQueueConcurrencyType];
            [threadMoc setPersistentStoreCoordinator:coordinator];
            
            [[thisThread threadDictionary] setObject:threadMoc forKey:@"MONO_MOC"];
        }
        
        return threadMoc;
    }
}

// Returns the managed object model for the application.
// If the model doesn't already exist, it is created from the application's model.
- (NSManagedObjectModel *)managedObjectModel
{
    if (_managedObjectModel != nil) {
        return _managedObjectModel;
    }
    NSURL *modelURL = [[NSBundle mainBundle] URLForResource:@"Mono" withExtension:@"momd"];
    _managedObjectModel = [[NSManagedObjectModel alloc] initWithContentsOfURL:modelURL];
    return _managedObjectModel;
}

// Returns the persistent store coordinator for the application.
// If the coordinator doesn't already exist, it is created and the application's store added to it.
- (NSPersistentStoreCoordinator *)persistentStoreCoordinator
{
    if (_persistentStoreCoordinator != nil) {
        return _persistentStoreCoordinator;
    }
    
    NSURL *storeURL = [[self applicationDocumentsDirectory] URLByAppendingPathComponent:@"Mono.sqlite"];
    
    NSError *error = nil;
    _persistentStoreCoordinator = [[NSPersistentStoreCoordinator alloc] initWithManagedObjectModel:[self managedObjectModel]];
    if (![_persistentStoreCoordinator addPersistentStoreWithType:NSSQLiteStoreType configuration:nil URL:storeURL options:nil error:&error]) {
        /*
         Replace this implementation with code to handle the error appropriately.
         
         abort() causes the application to generate a crash log and terminate. You should not use this function in a shipping application, although it may be useful during development.
         
         Typical reasons for an error here include:
         * The persistent store is not accessible;
         * The schema for the persistent store is incompatible with current managed object model.
         Check the error message to determine what the actual problem was.
         
         
         If the persistent store is not accessible, there is typically something wrong with the file path. Often, a file URL is pointing into the application's resources directory instead of a writeable directory.
         
         If you encounter schema incompatibility errors during development, you can reduce their frequency by:
         * Simply deleting the existing store:
         [[NSFileManager defaultManager] removeItemAtURL:storeURL error:nil]
         
         * Performing automatic lightweight migration by passing the following dictionary as the options parameter:
         @{NSMigratePersistentStoresAutomaticallyOption:@YES, NSInferMappingModelAutomaticallyOption:@YES}
         
         Lightweight migration will only work for a limited set of schema changes; consult "Core Data Model Versioning and Data Migration Programming Guide" for details.
         
         */
        NSLog(@"Error initiating persistent store coordinator.  This is likely due to a schema change.  Deleting database and re-attempting.");

        [[NSFileManager defaultManager] removeItemAtURL:storeURL error:nil];
        
        error = nil;
        [_persistentStoreCoordinator addPersistentStoreWithType:NSSQLiteStoreType configuration:nil URL:storeURL options:nil error:&error];
        
        if(error) {
            [[MNOUtil sharedInstance] showMessageBox:@"Error instantiating backing store." message:@"Unable to store data on this device.  Cannot proceed!"];
            _persistentStoreCoordinator = nil;
            return nil;
        }
    }
    
    return _persistentStoreCoordinator;
}

#pragma mark - Application's Documents directory

// Returns the URL to the application's Documents directory.
- (NSURL *)applicationDocumentsDirectory
{
    return [[[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask] lastObject];
}

#pragma mark - fetch functions

- (void) application:(UIApplication *)application performFetchWithCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
    
}

#pragma tabBarDelegate


@end
