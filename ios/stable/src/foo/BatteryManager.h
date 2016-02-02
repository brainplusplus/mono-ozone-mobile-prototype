//
//  BatteryManager.h
//  foo
//
//  Created by Ben Scazzero on 1/3/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface BatteryManager : NSObject

/**
 Retrieve the battery state
 
 @param params
 A set of key/value objects passed by the user.
 
 @return battery state (see API for details)
 */
- (NSData *) batteryLevelWithParams:(NSDictionary *)params;

/**
 Retrieve the battery percent level
 
 @param params
 A set of key/value objects passed by the user.
 
 @return battery level (see API for details)
 */
- (NSData *) batteryStateWithParams:(NSDictionary *)params;

/**
 Register a callback to recieve Battery Level and State changes.
 
 @param params
 A set of key/value objects passed by the user.
 
 @return {'status':'success' ..} if registered correctly, otherwise {'status':'failure' ...} (see API for details)
 */
- (NSData *) registerBatterInfoWithParams:(NSDictionary *)params;

/**
 Battery information is managed by a BatterManager. BatteryManager is a singleton.

 @return BatteryManager
 */
+ (BatteryManager *) sharedInstance;

@end
