//
//  ReachabilityManager.h
//  foo
//
//  Created by Ben Scazzero on 1/15/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOReachabilityManager : NSObject

#pragma mark public methods 

/**
 To recieve information about current and future connectivity states, all widgets must go through the ReachabilityManager. The ReachabilityManager adopts a singleton design pattern.
 
 @return ReachabilityManager
 */
+(MNOReachabilityManager *) sharedInstance;

/**
 * Check if the device is currently connected to the internet.
 * @return information about the connectivity level
 **/
- (BOOL) isOnline;

/**
 * Register callback to receive connection updates.
 * @param params The instance ID to register.
 * @param action The callback to register.
 * @return True is the registration was successful, false otherwise.
 **/
- (void)registerCallback:(NSString *)instanceId withJSAction:(NSString *)callback;

/**
 * Unregisters an instance ID from the reachability manager.
 * @param The instanceId to remove.
 **/
- (void) unregister:(NSString *)instanceId;

@end
