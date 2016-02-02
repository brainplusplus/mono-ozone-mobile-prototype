//
//  MNOBatteryManager.m
//  Mono
//
//  Created by Ben Scazzero on 1/3/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOBatteryManager.h"
#import "MNORouteRequestManager.h"
#import "MNOWidgetManager.h"
#import "MNOAPIResponse.h"

#define statusUnknown @"Unknown"
#define statusCharged @"Charged"
#define statusCharging @"Charging"
#define statusDischarging @"Discharging"

#define dbatteryLevel @"batteryLevel"
#define dbatteryState @"batteryState"

#define JSONError @"BatteryManager: Unable to Serialize Dictionary Result %@"

@implementation MNOBatteryManager
{
    NSNumber *batteryLevel;
    NSString *batteryState;
    NSMutableDictionary *timers;
}

#pragma mark - singleton instance

/**
 * See declaration in MNOBatteryManager.h
 */
+ (MNOBatteryManager *)sharedInstance {
    static MNOBatteryManager *sharedManager = nil;
    static dispatch_once_t onceToken;
    
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

#pragma mark - constructors

/**
 * Default constructor for MNOBatteryManager
 */
- (id)init {
    self = [super init];
    
    if (self) {
        timers = [NSMutableDictionary new];
        [UIDevice currentDevice].batteryMonitoringEnabled = YES;
        batteryLevel = [NSNumber numberWithFloat:[[UIDevice currentDevice] batteryLevel] * 100];
        batteryState = [self chargingState:[UIDevice currentDevice].batteryState];
        
        // Register for battery level and state change notifications.
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(batteryLevelChanged:)
                                                     name:UIDeviceBatteryLevelDidChangeNotification object:nil];
        
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(batteryStateChanged:)
                                                     name:UIDeviceBatteryStateDidChangeNotification object:nil];
    }
    
    return self;
}

#pragma mark - public methods

/**
 * See declaration in MNOBatteryManager.h
 */
- (NSDictionary *)batteryLevelWithParams:(NSDictionary *)params {
    NSDictionary * results = nil;
    
    if (batteryLevel == nil || [batteryLevel floatValue] < 0) {
        results = @{APIstatus:APIfailure, APIadditional:@{dbatteryLevel:statusUnknown}};
    } else {
        results = @{APIstatus:APIsuccess, APIadditional:@{dbatteryLevel:batteryLevel}};
    }
    
    return results;
}

/**
 * See declaration in MNOBatteryManager.h
 */
- (NSDictionary *)batteryStateWithParams:(NSDictionary *)params {
    NSDictionary *results = nil;
    
    if ([batteryState isEqualToString:statusUnknown]) {
        results = @{APIstatus:APIfailure, APIadditional:@{dbatteryState:statusUnknown}};
    } else {
        results = @{APIstatus:APIsuccess, APIadditional:@{dbatteryState:batteryState}};
    }
    
    return results;
}

/**
 * See declaration in MNOBatteryManager.h
 */
- (NSDictionary *)registerBatterInfoWithParams:(NSDictionary *)params {
    NSDictionary *results = nil;
    NSString *callback = [params objectForKey:APIcallback];
    NSString *instanceId = [params objectForKey:@"instanceId"];
    
    if (callback != nil && instanceId != nil) {
        // Register this widget for future updates
        [self registerCallbackToDashboard:instanceId withJSAction:callback];
        
        // Will be success unless above call throws an error
        // Send back current battery level and state
        results = @{APIstatus:APIsuccess, APIadditional:@{dbatteryLevel:batteryLevel, dbatteryState:batteryState}};
    } else {
        results = @{APIstatus:APIfailure};
    }
    
    return results;
}

- (void)unregisterWidget:(NSString *)instanceId {
    [timers removeObjectForKey:instanceId];
}

#pragma mark - private methods

/**
 * Called by the NSNotificationCenter to provide UIDeviceBatteryLevelDidChangeNotification
 * information when the battery level changes with which the instance variable is updated
 *
 * @param notifcation System notification
 */
- (void)batteryLevelChanged:(NSNotification *)notification {
    // format battery level to percent type
    batteryLevel = [NSNumber numberWithFloat:[UIDevice currentDevice].batteryLevel * 100];
    [self sendUpdates];
}

/**
 * Called by the NSNotificationCenter to provide UIDeviceBatteryStateDidChangeNotification
 * information when the battery state changes with which the instance variables are updated
 *
 * @param notifcation System notification
 */
- (void)batteryStateChanged:(NSNotification *)notification {
    // format battery level to percent type
    batteryLevel = [NSNumber numberWithFloat:[UIDevice currentDevice].batteryLevel * 100];
    batteryState = [self chargingState:[UIDevice currentDevice].batteryState];
    [self sendUpdates];
}

/**
 * Format battery state to human readable form
 *
 * @param state The current battery state
 * @return The battery state as a human readable string
 */
- (NSString *)chargingState:(UIDeviceBatteryState)state {
    NSString *result = nil;
    
    switch (state) {
        case UIDeviceBatteryStateUnplugged: {
            result = statusDischarging;
            break;
        }
        case UIDeviceBatteryStateCharging: {
            result = statusCharging;
            break;
        }
        case UIDeviceBatteryStateFull: {
            result = statusCharged;
            break;
        }
        default: {
            result = statusUnknown;
            break;
        }
    }
    
    return result;
}

- (void)sendUpdates {
    [self sendUpdates:nil];
}

/**
 * Send updates to widgets that are subscribed to receive battery information
 */
- (void)sendUpdates:(NSString *)onlyRunThisInstanceId {
    //For all widgets on this dashboard, send updates for those who registered
    for (NSString *instanceId in timers) {
        
        // If onlyRunThisInstanceId is set, only run that instance id -- skip the rest
        if(onlyRunThisInstanceId != nil) {
            if([instanceId isEqualToString:onlyRunThisInstanceId] == false) {
                continue;
            }
        }
        UIWebView *webview = [[MNOWidgetManager sharedManager] widgetWithInstanceId:instanceId];
        NSString *callback = [timers  objectForKey:instanceId];
        
        if (webview != nil && callback != nil) {
            
            MNOAPIResponse *response;
            NSString *outcome = nil;
            MNOAPIResponseStatus status = API_SUCCESS;
            if ([batteryState isEqualToString:statusUnknown] || batteryLevel < 0) {
                status = API_FAILURE;
            }
            
            response = [[MNOAPIResponse alloc] initWithStatus:status
                                                   additional:@{dbatteryState: batteryState, dbatteryLevel: batteryLevel}];
            
            NSString *responseString = [response getAsString];
            outcome = [NSString stringWithFormat:@"%@('%@', %@)", monoCallbackName, callback, responseString];
            
            NSLog(@"%@",outcome);
            NSLog(@"Connection Timer Start: %@",[NSDate new]);
            
            if ([[NSThread currentThread] isMainThread]) {
                [webview stringByEvaluatingJavaScriptFromString:outcome];
            } else {
                dispatch_sync(dispatch_get_main_queue(), ^{
                    [webview stringByEvaluatingJavaScriptFromString:outcome];
                });
            }
            
            NSLog(@"Connection Timer Finish: %@",[NSDate new]);
        }
    }
}

/**
 * Save callback info for the dashboard widget that
 * has registered to receive battery status information
 *
 * @param instanceId The instance ID for the widget registering.
 * @param action The JavaScript action
 */
- (void)registerCallbackToDashboard:(NSString *)instanceId
                       withJSAction:(NSString *)action {
    [timers setObject:action forKey:instanceId];
    
    [self sendUpdates:instanceId];
}

@end
