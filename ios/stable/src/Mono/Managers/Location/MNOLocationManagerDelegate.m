//
//  MNOLocationManagerDelegate.m
//  Mono2
//
//  Created by Ben Scazzero on 1/20/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOLocationManagerDelegate.h"
#import "MNOWidgetManager.h"

#import "MNOAPIResponse.h"

@interface MNOLocationManagerDelegate ()

@property (nonatomic, strong) CLLocationManager *locationManager;
@property (strong,nonatomic) NSNumber * dashGuid;
@property (strong,nonatomic) NSNumber * widgetGuid;
@property (strong,nonatomic) NSString * callback;
@property (strong,nonatomic) NSNumber * interval;
@property (strong, nonatomic) NSTimer * timer;
@property (readwrite, nonatomic) CLLocationDegrees lat;
@property (readwrite, nonatomic) CLLocationDegrees lon;
@property (readwrite,nonatomic) BOOL repeat;
@property (readwrite, nonatomic) BOOL isDistanceUpdate;

@end

@implementation MNOLocationManagerDelegate
{
    NSString *_instanceId;
    
    CLLocationManager *_locationManager;
    NSString * _callback;
    NSNumber * _interval;
    NSTimer * _timer;
    CLLocationDegrees _lat;
    CLLocationDegrees _lon;
    BOOL _repeat;
    BOOL _isDistanceUpdate;
}

#pragma mark - constructors

/**
 * The default constructor for class MNOLocationManagerDelegate
 */
- (id)init {
    self = [super init];
    
    if (self) {
    }
    
    return self;
}

/**
 * See constructor declaration in MNOLocationManagerDelegate.h
 */
- (id)initTimeUpdatesWithInstanceId:(NSString *)instanceId usingCallback:(NSString *)callback interval:(NSNumber *)interval repeat:(BOOL)repeat {
    self = [self init];
    
    if (self) {
        _lat = 0;
        _lon = 0;
        _instanceId = instanceId;
        _callback = callback;
        _interval = interval;
        _repeat = repeat;

        //start tracking, must call this before startLocationUpdates!
        [self trackCurrentLocationInSeconds];
        //schedule timer
        [self startLocationUpdates];
    }
    
    return self;
}

/**
 * See constructor declaration in MNOLocationManagerDelegate.h
 */
- (id)initTimeUpdatesWithInstanceId:(NSString *)instanceId usingCallback:(NSString *)callback interval:(NSNumber *)interval {
    self = [self init];
    
    if (self) {
        //init
        _lat = 0;
        _lon = 0;
        _instanceId = instanceId;
        _callback = callback;
        _interval = interval;
        _isDistanceUpdate = YES;
        
        //start tracking
        [self trackCurrentLocationInMeters];
        //schedule timer
        [self startLocationUpdates];
    }
    
    return self;
}

#pragma mark - public methods

/**
 * Starts the location updates. If it is a time based interval for location
 * updates then the old timer is invalidated and a new one is created
 */
- (void)startLocationUpdates {
    // if this is a time based location update then
    // stop the old timer and start a new one
    if (!self.isDistanceUpdate) {
        //stop the old timer
        [self stopLocationUpdates];
        //start the new timer
        if (self.repeat) // TODO: WHY DO WE HAVE THIS CHECK? EVEN IF IT'S FALSE SHOULDN'T WE STILL START?**********************
           self.timer = [NSTimer scheduledTimerWithTimeInterval:self.interval.integerValue target:self selector:@selector(timerFiredSendLocationToJavascript:) userInfo:nil repeats:self.repeat];
    }
    
    [self.locationManager startUpdatingLocation];
    
    // Populate with the most recent location
    CLLocation *location = self.locationManager.location;
    
    if(location != nil) {
        self.lat = location.coordinate.latitude;
        self.lon = location.coordinate.longitude;
    }
}

/**
 * Stops the location updates. If it is a time based
 * interval for location updates then the timer is invalidated
 */
- (void)stopLocationUpdates {
    // If this is a time based location
    // update then stop the timer
    if (!self.isDistanceUpdate) {
        if (self.timer) {
            [self.timer invalidate];
            self.timer = nil;
        }
    }
    
    [self.locationManager stopUpdatingLocation];
}

/**
 * Converts the lat long location data into a JSON string and sends the data to
 * the widget by executing a JavaScript function in the UIWebView hosting the widget
 */
- (void)sendCoordinates {
    UIWebView *webview = [[MNOWidgetManager sharedManager] widgetWithInstanceId:_instanceId];
    
    if (webview != nil) {
        
        MNOAPIResponse *response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS
                                                               additional:@{@"coords":
                                                                                @{@"lat": [NSNumber numberWithDouble:self.lat],
                                                                                  @"lon": [NSNumber numberWithDouble:self.lon]}}];
        
        // Build the JavaScript function containing the location data as JSON to be executed on the UIWebView
        NSString *responseString = [response getAsString];
        NSString *outcome = [NSString stringWithFormat:@"%@('%@', %@)", monoCallbackName, self.callback, responseString];
        
        NSLog(@"%@: %@",[NSDate date],outcome);
        NSLog(@"Connection Timer Start: %@", [NSDate new]);
      
        // Execute the JavaScript function in the UIWebView
        if ([[NSThread currentThread] isMainThread]) {
            [webview stringByEvaluatingJavaScriptFromString:outcome];
        } else {
            dispatch_sync(dispatch_get_main_queue(), ^{
                [webview stringByEvaluatingJavaScriptFromString:outcome];
            });
        }
      
        NSLog(@"Connection Timer Finish: %@", [NSDate new]);
        
    } else {
        // Invalidate the location updates if the UIWebView is no longer available
        NSLog(@"Invalidating UIWebView - WidgetGuid:%@, DashGuid:%@", self.widgetGuid, self.dashGuid);
        
        [self stopLocationUpdates];
    }
}

#pragma mark - private methods

/**
 * The selector message passed to the timer
 * that is called when the timer fires and
 * sends location data to the subscribing widget
 *
 * @param timer The timer instance that was
 * initiated with the following selector message
 */
- (void)timerFiredSendLocationToJavascript:(NSTimer *)timer {
    [self sendCoordinates];
}

/**
 * The method invoked when the configured distance
 * has been traveled that sends location data to
 * the subscribing widget
 */
- (void)sendDistanceLocationDataToJavascript {
    [self sendCoordinates];
}

/**
 * Initializes the private locationManager to update the
 * location data based on the distance traveled in meters
 */
- (void)trackCurrentLocationInMeters {
    self.locationManager = [[CLLocationManager alloc] init];
    self.locationManager.delegate = self;
    self.locationManager.desiredAccuracy = kCLLocationAccuracyBest;
    self.locationManager.distanceFilter = self.interval.doubleValue;
    
    [self.locationManager startUpdatingLocation];
}

/**
 * Initializes the private locationManager to update
 * the location data based on time giving most accurate results
 */
- (void)trackCurrentLocationInSeconds {
    self.locationManager = [[CLLocationManager alloc] init];
    self.locationManager.delegate = self;
    self.locationManager.desiredAccuracy = kCLLocationAccuracyBest;
    
    [self.locationManager startUpdatingLocation];
}

/**
 * Message sent by the CLLocationManager when the system location update failed with error
 *
 * @param manager The location manager instance that failed to update
 * @param error The error that occurred during location update
 */
- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error {
    UIAlertView *errorAlert = [[UIAlertView alloc]
                               initWithTitle:@"Error"
                                     message:@"Failed to Get Your Location"
                                    delegate:nil
                           cancelButtonTitle:@"OK"
                           otherButtonTitles:nil];
    [errorAlert show];
}

/**
 * Message sent by the CLLocationManager when the system location data successfully updates
 *
 * @param manager The location manager instance that updated successfully
 * @param locations The new location data
 */
- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray *)locations {
    if (locations != nil && [locations lastObject] != nil) {
        CLLocation *location = [locations lastObject];
        self.lat = location.coordinate.latitude;
        self.lon = location.coordinate.longitude;
        
        if (self.isDistanceUpdate) {
            [self sendDistanceLocationDataToJavascript];
        }
    }
}

@end
