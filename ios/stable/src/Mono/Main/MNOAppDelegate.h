//
//  AppDelegate.h
//  Mono2
//
//  Created by Ben Scazzero on 1/21/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface MNOAppDelegate : UIResponder <UIApplicationDelegate>

@property (strong, nonatomic) UIWindow *window;
@property (strong, nonatomic) NSManagedObjectContext *managedObjectContext; // Readwrite for testing reasons
@property (readonly, strong, nonatomic) NSManagedObjectModel *managedObjectModel;
@property (strong, nonatomic) NSPersistentStoreCoordinator *persistentStoreCoordinator; // Readwrite for testing reasons

@end
