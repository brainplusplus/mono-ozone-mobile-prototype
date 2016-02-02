//
//  GPSManager.m
//  Mono
//
//  Created by Ben Scazzero on 12/30/13.
//  Copyright (c) 2013 42Six, a CSC company. All rights reserved.
//

#import "MNOLocationManager.h"
#import "MNOLocationManagerDelegate.h"
#import "MNOWidgetManager.h"

#define dInterval @"interval"

#define JSONError @"BatteryManager: Unable to Serialize Dictionary Result %@"

@implementation MNOLocationManager
{
    NSMutableDictionary *timers;
    NSMutableDictionary *meters;
}

#pragma mark - singleton instance

/**
 * See declaration in MNOLocationManager.h
 */
+ (MNOLocationManager *)sharedInstance {
    static MNOLocationManager * sharedManager = nil;
    static dispatch_once_t onceToken;
    
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

#pragma mark - constructors

/**
 * Default constructor
 */
- (id)init {
    self = [super init];
    
    if (self) {
        //init
        timers = [[NSMutableDictionary alloc] init];
        meters = [[NSMutableDictionary alloc] init];
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(dashboardSwitch:) name:dashboardSwitched object:nil];
    }
    
    return self;
}

#pragma mark - public methods

/**
 * See declaration in MNOLocationManager.h
 */
- (NSData *)registerLocationDistanceUpdatesWithParams:(NSDictionary *)params {
    return [self registerLocationUpdatesWithParams:params target:self selector:@selector(timerCallbackToWidget:withJSAction:usingInterval:)];
}

/**
 * See declaration in MNOLocationManager.h
 */
- (NSData *)registerLocationTimeUpdatesWithParams:(NSDictionary *)params {
    return [self registerLocationUpdatesWithParams:params target:self selector:@selector(timerCallbackToWidget:withJSAction:usingInterval:)];
}

- (void)unregisterWidget:(NSString *)instanceId {
    [timers removeObjectForKey:instanceId];
}

#pragma mark - private methods

/**
 * See declaration in MNOLocationManager.h
 */
- (NSData *)registerLocationUpdatesWithParams:(NSDictionary *)params target:(id)target selector:(SEL)selector {
    NSString *callback = nil;
    NSNumber *interval = nil;
    NSString *instanceId = [params objectForKey:@"instanceId"];
    
    callback = [params objectForKey:APIcallback];
    
    if([params objectForKey:dInterval] != nil && [[params objectForKey:dInterval] integerValue] > 0) {
        interval = [NSNumber numberWithInteger:[[params objectForKey:dInterval] integerValue]];
    } else {
        interval = 0;
    }
    
    NSDictionary * results = nil;
    
    if (callback != nil && instanceId != nil) {
        // Use NSInvocation to call the function passed in as an argument
        NSInvocation *inv = [NSInvocation invocationWithMethodSignature:[self methodSignatureForSelector:selector]];
        [inv setSelector:selector];
        [inv setTarget:self];
        //arguments 0 and 1 are self and _cmd respectively, automatically set by NSInvocation
        [inv setArgument:&(instanceId) atIndex:2];
        [inv setArgument:&(callback) atIndex:3];
        [inv setArgument:&(interval) atIndex:4];
        [inv invoke];
        
        results = @{APIsetup:APIsuccess};
        
    } else {
        results = @{APIsetup:APIfailure};
    }
    
    return [self serializeDictionary:results];
}

/**
 * Hanldes the NSNotificaitonCenter customer dashboard switched event by
 * invalidating all of the timers that are initiated for widgets in the
 * old dashbaord and instanting timers for widgets in the new dashboard
 *
 * @param notif System notification information
 */
- (void)dashboardSwitch:(NSNotification *)notif {
    NSDictionary *userInfo = [notif userInfo];
    NSNumber *dashboardGuid = [userInfo objectForKey:dashboardUDIDPrev];
    MNOLocationManagerDelegate *oldTimer = [timers objectForKey:dashboardGuid];
    
    if (oldTimer) {
        [oldTimer stopLocationUpdates];
    }
    
    dashboardGuid = [userInfo objectForKey:dashboardUDIDNew];
    MNOLocationManagerDelegate *newTimer = [timers objectForKey:dashboardGuid];
    
    if (newTimer) {
       [newTimer startLocationUpdates];
    }
}

/**
 * Set up location updates to the specified widget based on distance traveled in meters
 *
 * @param dashboardGuid The GUID of the dashboard containing the registering widget
 * @param widgetGuid The GUID of the widget registering for location updates
 * @param action The JavaScript action
 * @param interval The number of meters traveled to receive each location update
 */
- (void)distanceCallbackToWidget:(NSString *)instanceId
                    withJSAction:(NSString *)action
                   usingInterval:(NSNumber *)interval {
    [self registerUpdateCallbackToWidget:instanceId withJSAction:action usingInterval:interval locationDelegates:meters];
}

/**
 * Set up location updates to the specified widget based on elapsed number of seconds
 *
 * @param dashboardGuid The GUID of the dashboard containing the registering widget
 * @param widgetGuid The GUID of the widget registering for location updates
 * @param action The JavaScript action
 * @param interval The number of seconds to elapse for each location update
 */
- (void)timerCallbackToWidget:(NSString *)instanceId
                  withJSAction:(NSString *)action
                 usingInterval:(NSNumber *)interval {
    [self registerUpdateCallbackToWidget:instanceId withJSAction:action usingInterval:interval locationDelegates:timers];
}

/**
 * Set up location updates to the specified widget based on the specified interval
 *
 * @param dashboardGuid The GUID of the dashboard containing the registering widget
 * @param widgetGuid The GUID of the widget registering for location updates
 * @param action The JavaScript action
 * @param interval The time / distance interval for each location update
 * @param locationDelegates The location delegates to add the newly setup location tracker to
 */
- (void)registerUpdateCallbackToWidget:(NSString *)instanceId
                    withJSAction:(NSString *)action
                      usingInterval:(NSNumber *)interval
                  locationDelegates:(NSMutableDictionary *)locationDelegates {
    
    BOOL repeat = interval > 0 ? YES : NO;
    
    MNOLocationManagerDelegate *gpsTracker = [[MNOLocationManagerDelegate alloc] initTimeUpdatesWithInstanceId:instanceId usingCallback:action interval:interval repeat:repeat];
    
    //can only have 1 gps tracker per widget, make sure we don't have one running already
    if (gpsTracker && [locationDelegates objectForKey:instanceId])
    {
        MNOLocationManagerDelegate *gpsTrackerOld = [locationDelegates objectForKey:instanceId];
        
        // invalidate timer
        [gpsTrackerOld stopLocationUpdates];
        // remove old timer
        [locationDelegates removeObjectForKey:instanceId];
    }
    
    // set new timer
    if (repeat) {
        if(gpsTracker != nil) {
            [locationDelegates setObject:gpsTracker forKey:instanceId];
        }
    }
    
    [gpsTracker sendCoordinates];
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
    
    if (JSONData && !error) {
        return JSONData;
    }
    
    NSLog(JSONError, error);
    
    return nil;
}

@end
