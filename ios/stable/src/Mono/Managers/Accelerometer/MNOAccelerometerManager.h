//
//  AccelerometerManager.h
//  Mono
//
//  Created by Ben Scazzero on 1/1/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreMotion/CoreMotion.h>

#import "MNOAPIResponse.h"
#import "MNORouteRequestManager.h"

@interface MNOAccelerometerManager : NSObject<UIAccelerometerDelegate>

#pragma mark - singleton instance

/**
 * Singleton AccelermoeterManager instance
 */
+ (MNOAccelerometerManager *)sharedInstance;

#pragma mark - public methods

/**
 * Registers to receive accelerometer (acceleration) data updates
 *
 * @param params Parameters specifying update specifics
 */
- (MNOAPIResponse *)registerAccelerometerWithParams:(NSDictionary *)params;

/**
 * Registers to receive gyroscope (rotation) data updates
 *
 * @param params Parameters specifying update specifics
 */
- (MNOAPIResponse *)registerOrientationChangesWithParams:(NSDictionary *)params;


/**
 * Unreigsters a widget from the accelerometer manager.
 * @param instanceId The instanceId to unregister.
 **/
- (void)unregisterWidget:(NSString *)instanceId;

@end
