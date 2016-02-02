//
//  AccelerometerManager.m
//  MONO
//
//  Created by Ben Scazzero on 1/1/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAccelerometerManager.h"
#import "MNOWidgetManager.h"

#import "MNOAPIResponse.h"


#define portrait @"portrait"
#define upsideDown @"upsideDown"
#define landscapeLeft @"landscapeLeft"
#define landscapeRight @"landscapeRight"
#define currTimer @"timer"
#define currRepeat @"repeat"
#define currInterval @"interval"
#define dAccX @"x"
#define dAccY @"y"
#define dAccZ @"z"
#define dYaw @"yaw"
#define dPitch @"pitch"
#define dRoll @"roll"
#define JSONError @"AccelerometerManager: Unable to Serialize Dictionary Result %@"
#define kUpdateInterval (1.0f / 60.0f)

#define successMessage @"Successfully Registered For %@ Update(s)"
#define failureMessage @"Unable to Registered For %@ Update(s)"

#define orientationValueProper(isProper) isProper ? @"Orientation":@"orientation"
#define accelerometerValueProper(isProper) isProper ? @"Acceleration" : @"acceleration"


@implementation MNOAccelerometerManager
{
    NSMutableDictionary * timersAccelerate;
    NSMutableDictionary * timersOrientation;

    NSString *accX;
    NSString *accY;
    NSString *accZ;
    NSString *yaw;
    NSString *pitch;
    NSString *roll;
    CMMotionManager *motionManager;
}

#pragma mark - singleton instance

/**
 * See declaration in MNOAccelerometerManager.h
 */
+ (MNOAccelerometerManager *)sharedInstance {
    static MNOAccelerometerManager *sharedManager = nil;
    static dispatch_once_t onceToken;
    
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

#pragma mark - constructors
/**
 * Default constructor that initializes local variables including the
 * motion manager to receive both accelerometer and gyroscope data updates
 */
- (id)init {
    self = [super init];
    
    if (self) {
        // Initialize the motion manager to to send updates every millisecond
        motionManager = [[CMMotionManager alloc] init];
        motionManager.accelerometerUpdateInterval = .2;
        motionManager.gyroUpdateInterval = .2;

        // Begin sending accelerometer data updates
        [motionManager startAccelerometerUpdatesToQueue:[NSOperationQueue mainQueue]
                                                 withHandler:^(CMAccelerometerData  *accelerometerData, NSError *error) {
                                                     [self updateAccelerationData:accelerometerData.acceleration];
                                                     if(error){
                                                         NSLog(@"%@", error);
                                                     }
                                                 }];
        
        // Begin sending gyroscope data updates
        [motionManager startGyroUpdatesToQueue:[NSOperationQueue mainQueue]
                                        withHandler:^(CMGyroData *gyroData, NSError *error) {
                                            [self updateRotationData:gyroData.rotationRate];
                                        }];
        
        // Setup listener for the dashboardSwitched custom notification center event
        timersOrientation = [[NSMutableDictionary alloc] init];
        timersAccelerate = [[NSMutableDictionary alloc] init];
        // Setup listener for the orientationChanged system notification center event
        [[NSNotificationCenter defaultCenter] addObserver:self  selector:@selector(orientationChanged:)  name:UIDeviceOrientationDidChangeNotification  object:nil];
    }
    
    return self;
}

#pragma mark - public methods

/**
 * Registers widgets for future orientation updates called from RequestRouter
 *
 * @param params Configurations concerning dashboard
 * and widget registering for orientation updates
 * @return New orientation data
 */
- (NSDictionary *)registerOrientationChangesWithParams:(NSDictionary *)params {
    NSDictionary *results = nil;
    NSString *callback = nil;
    NSString *instanceId = [params objectForKey:@"instanceId"];
    
    callback = [params objectForKey:APIcallback];
    
    MNOAPIResponse *response;
    
    if (callback != nil && instanceId != nil) {
        // Register this widget for future updates
        [self registerCallbackToDashboard:instanceId withJSAction:callback];
        
        UIInterfaceOrientation orientation = [[UIApplication sharedApplication] statusBarOrientation];
        NSString *newOrientation = [self orientationDescription:orientation];
        
        // Send back what we currently have
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS additional:@{@"orientation": newOrientation}];
        
    } else {
        // Failure
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Unable to get orientation" additional:@{@"orientation": @"Unknown"}];
    }
    
    NSString *result = [NSString stringWithFormat:@"%@('%@', %@);", monoCallbackName, callback, [response getAsString]];
    UIWebView *webview = [[MNOWidgetManager sharedManager] widgetWithInstanceId:instanceId];
    // If we are on the main UI thread then evaluate the javascript
    // on the webview otherwise get the main thread and evaluate the
    // javascript on a web view that won't be collected
    if ([[NSThread currentThread] isMainThread]) {
        [webview stringByEvaluatingJavaScriptFromString:result];
    } else {
        dispatch_sync(dispatch_get_main_queue(), ^{
            [webview stringByEvaluatingJavaScriptFromString:result];
        });
    }
    
    return results;
}

/**
 * Registers widgets for future acceleration updates called from RequestRouter
 *
 * @param params Configurations concerning dashboard
 * and widget registering for orientation updates
 * @return New accelerometer data
 */
- (MNOAPIResponse *)registerAccelerometerWithParams:(NSDictionary *)params {
    NSString *callback = nil;
    NSString *instanceId = [params objectForKey:@"instanceId"];
    NSTimeInterval interval = -1;

    callback = [params objectForKey:APIcallback];
    
    MNOAPIResponse *response;

    if([params objectForKey:APIinterval] != nil && [[params objectForKey:APIinterval] doubleValue] > 0) {
        interval = [[params objectForKey:APIinterval] doubleValue];
    } else {
        interval = 1;
    }
    
    if (callback != nil && instanceId != nil) {
        [self registerCallbackToDashboard:instanceId withJSAction:callback usingInterval:interval];
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS additional:@{@"acceleration": @{@"x": accX, @"y": accY, @"z": accZ}}];
    } else {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE additional:@{@"acceleration": @{@"x": @0, @"y": @0, @"z": @0}}];
    }
    
    NSString *result = [response getAsString];
    UIWebView *webview = [[MNOWidgetManager sharedManager] widgetWithInstanceId:instanceId];
    // If we are on the main UI thread then evaluate the javascript
    // on the webview otherwise get the main thread and evaluate the
    // javascript on a web view that won't be collected
    if ([[NSThread currentThread] isMainThread]) {
        [webview stringByEvaluatingJavaScriptFromString:result];
    } else {
        dispatch_sync(dispatch_get_main_queue(), ^{
            [webview stringByEvaluatingJavaScriptFromString:result];
        });
    }
    
    return response;
}

- (void) unregisterWidget:(NSString *)instanceId {
    NSDictionary * components = [timersAccelerate valueForKey:instanceId];
    NSTimer * timer = [components objectForKey:currTimer];
    
    if(timer != nil) {
        [timer invalidate];
        [timersAccelerate removeObjectForKey:instanceId];
    }
}

#pragma mark - private methods
#pragma mark - dashboard changed

/**
 * Gets the orientation description based on gyroscope status
 *
 * @param orientation UIInterfaceOrientation enum value
 * @return Status text
 */
- (NSString *)orientationDescription:(UIInterfaceOrientation)orientation {
    NSString *newOrientation = nil;
    
    if (orientation == UIInterfaceOrientationPortrait) {
        newOrientation  = portrait;
    } else if(orientation == UIInterfaceOrientationPortraitUpsideDown) {
        newOrientation = upsideDown;
    } else if(orientation == UIInterfaceOrientationLandscapeRight) {
        newOrientation = landscapeRight;
    } else if (orientation == UIInterfaceOrientationLandscapeLeft) {
        newOrientation = landscapeLeft;
    }
    
    return newOrientation;
}

/**
 * Handles the system message that the device's orientation has changed and sends
 * the new orientation data back to the subscribing widget in the web view
 *
 * @param notification Notification data sent from the NSNotificationCenter
 */
- (void)orientationChanged:(NSNotification *)notification {
    NSString *result = nil;
    UIInterfaceOrientation orientation = [[UIApplication sharedApplication] statusBarOrientation];
    NSString *newOrientation = [self orientationDescription:orientation];
    
    // For all widgets on this dashboard, send updates for those who registered for them
    for (NSString *instanceId in timersOrientation) {
        NSDictionary *components = [timersOrientation objectForKey:instanceId];

        if (components) {
            UIWebView *webview = [[MNOWidgetManager sharedManager] widgetWithInstanceId:instanceId];
            NSString *callback = [components objectForKey:APIcallback];
            
            if (webview && callback) {
                
                MNOAPIResponse *response;
                
                if (newOrientation == nil) {
                    response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS
                                                              message:@"Unknown Orientation Message"
                                                           additional:@{@"orientation": @"Unknown"}];
                } else {
                    response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS
                                                              message:@"Orientation message"
                                                           additional:@{@"orientation": newOrientation}];
                }
                NSString *responseString = [response getAsString];
                
                result = [NSString stringWithFormat:@"%@('%@', %@);", monoCallbackName, callback, responseString];
                
                NSLog(@"Connection Timer Start: %@", [NSDate new]);
                
                // If we are on the main UI thread then evaluate the javascript
                // on the webview otherwise get the main thread and evaluate the
                // javascript on a web view that won't be collected
                if ([[NSThread currentThread] isMainThread]) {
                    [webview stringByEvaluatingJavaScriptFromString:result];
                } else {
                    dispatch_sync(dispatch_get_main_queue(), ^{
                        [webview stringByEvaluatingJavaScriptFromString:result];
                    });
                }
                
                NSLog(@"Connection Timer Finish: %@",[NSDate new]);
            }
        }
    }
}

/**
 * Saves callback and timer info for the specified
 * dashboard widget in the timers dictionary
 *
 * @param widgetGuid The GUID of the widget subscribing
 * to accelerometer updates
 * @param action The JavaScript action
 */
- (void)registerCallbackToDashboard:(NSString *)instanceId withJSAction:(NSString *)action {
    NSMutableDictionary *components = [[NSMutableDictionary alloc] initWithObjectsAndKeys:instanceId, @"instanceId", action, APIcallback, nil];
    [timersOrientation setObject:components forKey:instanceId];
}

/**
 * Message called by timer to send accelerometer data to the subscribing widget
 *
 * @param timer The timer object that calls this message
 */
- (void)sendAccelerometerToJavascript:(NSTimer *)timer {
    NSString *instanceId = timer.userInfo;
    NSDictionary *kvPairs = [timersAccelerate objectForKey:instanceId];
    UIWebView *webview = [[MNOWidgetManager sharedManager] widgetWithInstanceId:instanceId];
    NSString *callback = [kvPairs objectForKey:APIcallback];
    
    // make sure we have valid values for accX, accY, accZ
    MNOAPIResponse *response;
    if (accX && accY && accZ) {
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS additional:@{@"acceleration": @{@"x": accX, @"y": accY, @"z": accZ}}];
    }
    else {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Unable to Retrieve Acceleration Data" additional:@{@"acceleration": @{@"x": @0, @"y": @0, @"z": @0}}];
    }
    
    NSString *responseString = [response getAsString];
    
    NSString *outcome = [NSString stringWithFormat:@"%@('%@', %@);", monoCallbackName, callback, responseString];
    
    NSLog(@"%@", outcome);
    
    if (webview != nil) {
        
        NSLog(@"%@", [NSDate date]);
        NSLog(@"Connection Timer Start: %@", [NSDate new]);
        
        if ([[NSThread currentThread] isMainThread]) {
            [webview stringByEvaluatingJavaScriptFromString:outcome];
        } else {
            dispatch_async(dispatch_get_main_queue(), ^{
                [webview stringByEvaluatingJavaScriptFromString:outcome];
            });
        }
        
        NSLog(@"Connection Timer Finish: %@", [NSDate new]);
        
    } else {
        //invalidate if the webview is available anymore
        NSLog(@"Invalidating UIWebView - Instance ID:%@", instanceId);
        [timer invalidate];
    }
}

/**
 * Saves callback and timer info for the specified
 * dashboard widget in the timers dictionary
 *
 * @param dashboardGuid The GUID of the dashboard containing
 * the widget subscribing to accelerometer updates
 * @param widgetGuid The GUID of the widget subscribing
 * to accelerometer updates
 * @param action The JavaScript action
 * @param interval The time interval in seconds in which to send updates
 */
- (void)registerCallbackToDashboard:(NSString *)instanceId
                      withJSAction:(NSString *)action
                     usingInterval:(NSTimeInterval)interval {
     BOOL repeat = interval > 0 ? YES : NO;
     NSTimer *timer = [NSTimer scheduledTimerWithTimeInterval:interval target:self
                        selector:@selector(sendAccelerometerToJavascript:) userInfo:instanceId repeats:repeat];
    
    // Can only have 1 timer per widget, make sure we don't have one running already
    if (timer && [timersAccelerate objectForKey:instanceId]) {
        NSMutableDictionary *components = [timersAccelerate objectForKey:instanceId];
        NSTimer *oldTimer = [components objectForKey:currTimer];
        [oldTimer invalidate];
        [components removeObjectForKey:instanceId];
    }
    
    if (timer && repeat) {
        NSMutableDictionary *components =
        [[NSMutableDictionary alloc] initWithObjectsAndKeys:[NSNumber numberWithDouble:interval], currInterval, instanceId, @"instanceId", action, APIcallback, timer, currTimer, [NSNumber numberWithBool:repeat], currRepeat, nil];
        
        [timersAccelerate setObject:components forKey:instanceId];
    }
    
    // Fire as soon as we register -- get an initial value
    [timer fire];
}

#pragma mark - AccelerometerDelegate/CoreMotionPolling

/**
 * Sets the acceleration instance variables
 * with the updated system accelerometer data
 *
 * @param accerlation The current system accelerometer data
 */
- (void)updateAccelerationData:(CMAcceleration)acceleration {
     accX = [NSString stringWithFormat:@"%.2f", acceleration.x];
     accY = [NSString stringWithFormat:@"%.2f", acceleration.y];
     accZ = [NSString stringWithFormat:@"%.2f", acceleration.z];
}

/**
 * Sets the orientation instance variables
 * with the updated system gyroscope data
 *
 * @param rotation The current system gyroscope data
 */
- (void)updateRotationData:(CMRotationRate)rotation {
    roll = [NSString stringWithFormat:@"%.2f", rotation.x];
    yaw = [NSString stringWithFormat:@"%.2f", rotation.y];
    pitch = [NSString stringWithFormat:@"%.2f", rotation.z];
}

/**
 * Serializes the NSDictionary into JSON data
 *
 * @param result NSDictionary to serialize to JSON
 * @return JSON data
 */
- (NSData *)serializeDictionary:(NSDictionary *)result {
    NSError *error = nil;
    NSData *JSONData = [NSJSONSerialization dataWithJSONObject:result options:0 error:&error];
    if (JSONData && !error)
        return JSONData;
    
    NSLog(JSONError, error);
    
    return nil;
}

@end
