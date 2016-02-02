//
//  MNOBatteryManager.h
//  Mono
//
//  Created by Ben Scazzero on 1/3/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOBatteryManager : NSObject

/**
 * Retrieve the battery state
 *
 * @param params A set of key/value objects passed by the user.
 * @return battery state (see API for details)
 */
- (NSDictionary *)batteryLevelWithParams:(NSDictionary *)params;

/**
 * Retrieve the battery percent level
 *
 * @param params A set of key/value objects passed by the user.
 * @return battery level (see API for details)
 */
- (NSDictionary *)batteryStateWithParams:(NSDictionary *)params;

/**
 * Register a callback to recieve Battery Level and State changes.
 *
 * @param params A set of key/value objects passed by the user.
 * @return {'status':'success' ..} if registered correctly, otherwise {'status':'failure' ...} (see API for details)
 */
- (NSDictionary *)registerBatterInfoWithParams:(NSDictionary *)params;

/**
 * Unregisters a widget from the battery manager.
 * @param instanceId The instance ID to unregister.
 **/
- (void)unregisterWidget:(NSString *)instanceId;

/**
 * Battery information is managed by a MNOBatterManager. MNOBatteryManager is a singleton.
 *
 * @return BatteryManager
 */
+ (MNOBatteryManager *)sharedInstance;

@end
