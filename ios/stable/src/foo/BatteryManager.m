//
//  BatteryManager.m
//  foo
//
//  Created by Ben Scazzero on 1/3/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "BatteryManager.h"
#import "RequestRouter.h"
#import "WidgetManager.h"

#define statusUnknown @"Unknown"
#define statusCharged @"Charged"
#define statusCharging @"Charging"
#define statusDischarging @"Discharging"

#define dbatteryLevel @"batteryLevel"
#define dbatteryState @"batteryState"

#define JSONError @"BatteryManager: Unable to Serialize Dictionary Result %@"

@interface BatteryManager ()

@property (readwrite, nonatomic) NSNumber * batteryLevel;
@property (readwrite, nonatomic) NSString * batteryState;

@property (strong, nonatomic) NSMutableDictionary * timers;

@end

@implementation BatteryManager

+(BatteryManager *) sharedInstance
{
    static BatteryManager * sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

-(id)init
{
    self = [super init];
    if (self) {
        //init
        _timers = [NSMutableDictionary new];
        [
         UIDevice currentDevice].batteryMonitoringEnabled = YES;
        _batteryLevel = [NSNumber numberWithFloat:[[UIDevice currentDevice] batteryLevel]*100];
        _batteryState = [self chargingState:[UIDevice currentDevice].batteryState];
        
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


//both functions below are called by OS
- (void)batteryLevelChanged:(NSNotification *)notification
{
    // format battery level to percent type
    _batteryLevel = [NSNumber numberWithFloat:[UIDevice currentDevice].batteryLevel * 100];
    [self sendUpdates];
}

- (void)batteryStateChanged:(NSNotification *)notification

{
    // format battery level to percent type
    _batteryLevel = [NSNumber numberWithFloat:[UIDevice currentDevice].batteryLevel * 100];
    _batteryState = [self chargingState:[UIDevice currentDevice].batteryState];
    [self sendUpdates];
}

// Format battery state to human readable form
- (NSString *) chargingState:(UIDeviceBatteryState)state
{
    NSString * result = nil;
    
    switch (state)
    {
        case UIDeviceBatteryStateUnplugged:
        {
            result = statusDischarging;
            break;
        }
        case UIDeviceBatteryStateCharging:
        {
            result = statusCharging;
            break;
        }
        case UIDeviceBatteryStateFull:
        {
            result = statusCharged;
            break;
        }
        default:
        {
            result = statusUnknown;
            break;
        }
    }
    
    return result;
}

//called to retrieve battery level
- (NSData *) batteryLevelWithParams:(NSDictionary *)params;
{
    NSDictionary * results = nil;
    
    if ( _batteryLevel == nil || [_batteryLevel floatValue] < 0) {
        results = @{APIstatus:APIfailure,dbatteryLevel:statusUnknown};
    }else{
        results = @{APIstatus:APIsuccess, dbatteryLevel:_batteryLevel};
    }
    
    return [self serializeDictionary:results];
}

//called to retrieve battery state
- (NSData *) batteryStateWithParams:(NSDictionary *)params;
{
    NSDictionary * results = nil;
    
    
    if ( [_batteryState isEqualToString:statusUnknown]) {
        results = @{APIstatus:APIfailure, dbatteryState: statusUnknown};
    }else{
        results = @{APIstatus:APIsuccess, dbatteryState: _batteryState};
    }
    
    return [self serializeDictionary:results];
}

// send updates to those who registered
- (void) sendUpdates
{
    NSNumber * dashGuid = [WidgetManager sharedManager].dashGuid;
    
    //For all widgets on this dashboard, send updates for those who registered
    for (NSNumber * widgetGuid in [_timers objectForKey:dashGuid]) {
       
        UIWebView * webview = [[WidgetManager sharedManager] widgetInDashboard:dashGuid withGuid:widgetGuid];
        NSString * callback = [[_timers objectForKey:dashGuid] objectForKey:widgetGuid];
        
        if (webview != nil && callback != nil) {
            NSLog(@"%@",[NSDate date]);
            
            NSString * outcome = nil;
            if ( [_batteryState isEqualToString:statusUnknown] || _batteryLevel  < 0) {
                outcome = [NSString stringWithFormat:@"%@({'%@':%@,'%@':{'%@':'%@','%@':'%@','%@':'%@'}})", monoCallbackName,monoCallbackFn,callback, monoCallbackArgs, APIstatus,APIfailure,dbatteryState,_batteryState,dbatteryLevel,_batteryLevel];
            }else{
                outcome = [NSString stringWithFormat:@"%@({'%@':%@,'%@':{'%@':'%@','%@':'%@','%@':'%@'}})", monoCallbackName,monoCallbackFn,callback, monoCallbackArgs, APIstatus,APIsuccess,dbatteryState,_batteryState,dbatteryLevel,_batteryLevel];
            }
 
            
            NSLog(@"Connection Timer Start: %@",[NSDate new]);
            if ([[NSThread currentThread] isMainThread]) {
                [webview stringByEvaluatingJavaScriptFromString:outcome];
            } else {
                __strong UIWebView * strongWebView = webview;
                dispatch_sync(dispatch_get_main_queue(), ^{
                    [strongWebView stringByEvaluatingJavaScriptFromString:outcome];
                });
            }
            NSLog(@"Connection Timer Finish: %@",[NSDate new]);
        }
    }
}

//save callback info
-(void)registerCallbackToDashboard:(NSNumber *)dashboardGuid withWidget:(NSNumber *)widgetGuid withJSAction:(NSString *)action
{
    NSMutableDictionary * dict = nil;
    if ([_timers objectForKey:dashboardGuid] == nil) {
        dict = [NSMutableDictionary new];
        [_timers setObject:dict forKey:dashboardGuid];
    }else
        dict = [_timers objectForKey:dashboardGuid];
    
    [dict setObject:action forKey:widgetGuid];
}

//called to register widgets for future battery updates
- (NSData *) registerBatterInfoWithParams:(NSDictionary *)params;
{
    NSDictionary * results = nil;
    NSString * callback = [params objectForKey:APIcallback];

    NSNumber * widgetGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:widgetUDID] unsignedIntValue]],
    * dashGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:dashboardUDID] unsignedIntValue]];
    
    if (callback != nil && dashGuid != nil && widgetGuid != nil) {
        
        // - register this widget for future updates
        [self registerCallbackToDashboard:dashGuid withWidget:widgetGuid withJSAction:callback];
        
        // - will be success unless above call throws an error
        // - send back what we currently have
        results = @{APIstatus:APIsuccess, dbatteryLevel:_batteryLevel, dbatteryLevel: _batteryState};
        
    }else{
        results = @{APIstatus:APIfailure};
    }
    
    return [self serializeDictionary:results];
}


#pragma -mark JSON
- (NSData *) serializeDictionary:(NSDictionary *)result
{
    NSError * error = nil;
    NSData * jsondata = [NSJSONSerialization dataWithJSONObject:result options:0 error:&error];
    if (jsondata && !error)
        return jsondata;
    
    NSLog(JSONError,error);
    return nil;
}


@end
