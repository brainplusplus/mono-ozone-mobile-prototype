//
//  MNOLocationManager.h
//  Mono
//
//  Created by Ben Scazzero on 12/30/13.
//  Copyright (c) 2013 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>

#import "MNORouteRequestManager.h"

@interface MNOLocationManager : NSObject

/**
 * Registers for location data updates based on distance traveled in meters
 *
 * @param params Data pertaining to the dashboard
 * and widget to receive the location data
 * @return Current location data
 */
- (NSData *)registerLocationDistanceUpdatesWithParams:(NSDictionary *)params;

/**
 * Registers for location data updates based on time passed in seconds
 *
 * @param params Data pertaining to the dashboard
 * and widget to receive the location data
 * @return Current location data
 */
- (NSData *)registerLocationTimeUpdatesWithParams:(NSDictionary *)params;

/**
 * Unregisters a widget from the location manager.
 * @param instanceId The instance ID to unregister.
 **/
- (void)unregisterWidget:(NSString *)instanceId;

/**
 * MNOLocationManager allows the substriber to receive location data updates
 * based on time passed or distance traveled, this is the singleton instance
 */
+ (MNOLocationManager *)sharedInstance;

@end
