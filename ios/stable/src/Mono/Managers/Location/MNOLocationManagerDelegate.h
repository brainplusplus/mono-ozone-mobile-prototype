//
//  MNOLocationManagerDelegate.h
//  Mono
//
//  Created by Ben Scazzero on 1/20/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>

@interface MNOLocationManagerDelegate : NSObject<CLLocationManagerDelegate>

/**
 * The widget instance ID for the widget subscribing to location data
 */
@property(readonly, strong, nonatomic) NSString *instanceId;

/**
 * The callback through which the location data is sent
 */
@property(readonly, strong, nonatomic) NSString *callback;

/**
 * The interval in seconds or meters at which to send back location data
 */
@property(readonly,strong,nonatomic) NSNumber *interval;

/**
 * Initializes MNOLocationManagerDelegate to send location updates to the subscriber based on time passed
 * 
 * @param instanceId The widget instance ID to which the specified widget belongs
 * @param usingCallback The callback through which the location data is sent
 * @param interval The time interval in seconds at which to send back location data
 * @param repeat If YES, location data will continue to be sent back after each specified time interval
 *               If NO, location data will be sent back once after the first time interval has occurred
 */
- (id)initTimeUpdatesWithInstanceId:(NSString *)instanceId
                      usingCallback:(NSString *)callback
                           interval:(NSNumber *)interval
                             repeat:(BOOL)repeat;

/**
 * Initializes MNOLocationManagerDelegate to send location updates to the subscriber based on change in distance
 *
 * @param instanceId The widget instance ID to which the specified widget belongs
 * @param usingCallback The callback through which the location data is sent
 * @param interval The distance interval in meters at which to send back location data
 */
- (id)initTimeUpdatesWithInstanceId:(NSString *)instanceId
                      usingCallback:(NSString *)callback
                           interval:(NSNumber *)interval;

/**
 * Starts the process that sends location updates to the subscriber
 */
- (void)startLocationUpdates;

/**
 * Stops the process that sends location updates to the subscriber
 */
- (void)stopLocationUpdates;

/**
 * Converts the lat long location data into a JSON string and sends the data to
 * the widget by executing a JavaScript function in the UIWebView hosting the widget
 */
- (void)sendCoordinates;

@end
