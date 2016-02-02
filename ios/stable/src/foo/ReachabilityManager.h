//
//  ReachabilityManager.h
//  foo
//
//  Created by Ben Scazzero on 1/15/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface ReachabilityManager : NSObject

/**
 To recieve information about current and future connectivity states, all widgets must go through the ReachabilityManager. The ReachabilityManager adopts a singleton design pattern.
 
 @return ReachabilityManager
 */
+(ReachabilityManager *) sharedInstance;

/**
 Check whether a file at a given URL has a newer timestamp than a given file.
 Example usage:
 
 @param params
 A set of key/value objects passed by the user.
 
 @return information about the connectivity level
 
 */
- (NSData *) isOnlineWithParams:(NSDictionary *)params;

/**
 Register callback to receive connection updates.
 
 @param params
 A set of key/value objects passed by the user.
 
 @return NSData object to be returned to the user.
 
 */
- (NSData *) registerConnectivityChangesWithParams:(NSDictionary *)params;

@end
