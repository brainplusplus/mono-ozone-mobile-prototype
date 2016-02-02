//
//  MNONotificationManager.h
//  Mono
//
//  Created by Corey Herbert on 5/1/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNONotificationManager : NSObject

/**
 * Returns the singleton instane of the notification manager.
 **/
+ (MNONotificationManager *) sharedInstance;

/**
 * uses local notifications to push out an alert
 * @param title - The title of the notiofication as it will appear
 * @param text - The text of the notiofication
 * @param callbackName - The name of the js function to execute
 **/
- (void) notify:(NSString*)title text:(NSString*)text callbackName:(NSString*)callbackName instanceID: (NSString*) instanceID;
@end
