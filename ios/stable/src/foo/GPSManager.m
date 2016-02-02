//
//  GPSManager.m
//  foo
//
//  Created by Ben Scazzero on 12/30/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import "GPSManager.h"
#import "WidgetManager.h"
#import "MonoGPS.h"

#define dInterval @"interval"

#define JSONError @"BatteryManager: Unable to Serialize Dictionary Result %@"


@interface GPSManager ()

@property (strong, nonatomic) NSMutableDictionary * timers;
@property (strong, nonatomic) NSMutableDictionary * meters;

@end

@implementation GPSManager


+(GPSManager *) sharedInstance
{
    static GPSManager * sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

-(id) init
{
    self = [super init];
    if (self) {
        //init
        _timers = [[NSMutableDictionary alloc] init];
        _meters = [[NSMutableDictionary alloc] init];
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(dashboardSwitch:) name:dashboardSwitched object:nil];
    }
    return self;
}

- (void) dashboardSwitch:(NSNotification *)notif
{
    NSDictionary * userInfo = [notif userInfo];
    NSNumber * dashboardGuid = [userInfo objectForKey:dashboardUDIDPrev];
    
    MonoGPS * oldTimer = [_timers objectForKey:dashboardGuid];
    if (oldTimer)
        [oldTimer stop];
    
    dashboardGuid = [userInfo objectForKey:dashboardUDIDNew];
    MonoGPS * newTimer = [_timers objectForKey:dashboardGuid];
    if (newTimer){
       [newTimer start];
    }
}

- (NSData * ) registerGPSwithParams:(NSDictionary *)params
{
    NSString * callback = nil;
    NSNumber * interval = nil;
    
    NSNumber * widgetGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:widgetUDID] unsignedIntValue]],
    * dashGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:dashboardUDID] unsignedIntValue]];
    
    callback = [params objectForKey:APIcallback];
    if([params objectForKey:dInterval] != nil && [[params objectForKey:dInterval] integerValue] > 0)
        interval = [NSNumber numberWithInteger:[[params objectForKey:dInterval] integerValue]];
    else
        interval = 0;
    
    //check params
    NSDictionary * results = nil;
    if (callback != nil && dashGuid != nil && widgetGuid != nil) {
        
        [self meteredCallbackToDashboard:dashGuid withWidget:widgetGuid withJSAction:callback usingInterval:interval];
        results = @{APIsetup:APIsuccess};
        
    }else{
        results = @{APIsetup:APIfailure};
    }
    
    return [self serializeDictionary:results];
}

-(void) meteredCallbackToDashboard:(NSNumber *)dashboardGuid withWidget:(NSNumber *)widgetGuid withJSAction:(NSString *)action
                   usingInterval:(NSNumber *)interval
{
    
    BOOL repeat = interval > 0 ? YES : NO;
    
    MonoGPS * gpsTracker = [[MonoGPS alloc] initRegisterWithDashGuid:dashboardGuid widgetGuid:widgetGuid usingCallback:action interval:interval repeat:repeat];
    
    //can only have 1 gps tracker per widget, make sure we don't have one running already
    if (gpsTracker &&
        [_meters objectForKey:dashboardGuid] &&
        [[_meters objectForKey:dashboardGuid] objectForKey:widgetGuid]){
        
        MonoGPS * gpsTrackerOld = [[_meters objectForKey:dashboardGuid] objectForKey:widgetGuid];
        // invalidate timer
        [gpsTrackerOld stop];
        // remove old timer
        [[_meters objectForKey:dashboardGuid] removeObjectForKey:widgetGuid];
    }
    
    // set new timer
    if (repeat) {
        NSMutableDictionary * dict = nil;
        if ([_meters objectForKey:dashboardGuid] == nil) {
            dict = [NSMutableDictionary new];
            [_meters setObject:dict forKey:dashboardGuid];
        }else
            dict = [_meters objectForKey:dashboardGuid];
        
        [[_meters objectForKey:dashboardGuid] setObject:gpsTracker forKey:widgetGuid];
    }
}


-(void) timerCallbackToDashboard:(NSNumber *)dashboardGuid withWidget:(NSNumber *)widgetGuid withJSAction:(NSString *)action
                     usingInterval:(NSNumber *)interval
{
    
    BOOL repeat = interval > 0 ? YES : NO;
    
    MonoGPS * gpsTracker = [[MonoGPS alloc] initScheduleWithDashGuid:dashboardGuid widgetGuid:widgetGuid usingCallback:action interval:interval repeat:repeat];
    
    //can only have 1 gps tracker per widget, make sure we don't have one running already
    if (gpsTracker &&
        [_timers objectForKey:dashboardGuid] &&
        [[_timers objectForKey:dashboardGuid] objectForKey:widgetGuid]){
    
        MonoGPS * gpsTrackerOld = [[_timers objectForKey:dashboardGuid] objectForKey:widgetGuid];
        // invalidate timer
        [gpsTrackerOld stop];
        // remove old timer
        [[_timers objectForKey:dashboardGuid] removeObjectForKey:widgetGuid];
    }

    // set new timer
    if (repeat) {
        NSMutableDictionary * dict = nil;
        if ([_timers objectForKey:dashboardGuid] == nil) {
            dict = [NSMutableDictionary new];
            [_timers setObject:dict forKey:dashboardGuid];
        }else
            dict = [_timers objectForKey:dashboardGuid];
        
        [[_timers objectForKey:dashboardGuid] setObject:gpsTracker forKey:widgetGuid];
    }
}

- (NSData * ) timerGPSwithParams:(NSDictionary *)params
{
    NSString * callback = nil;
    NSNumber * interval = nil;
    
    NSNumber * widgetGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:widgetUDID] unsignedIntValue]],
    * dashGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:dashboardUDID] unsignedIntValue]];
   
    callback = [params objectForKey:APIcallback];
    if([params objectForKey:dInterval] != nil && [[params objectForKey:dInterval] integerValue] > 0)
        interval = [NSNumber numberWithInteger:[[params objectForKey:dInterval] integerValue]];
    else
       interval = 0;
    
    //check params
    NSDictionary * results = nil;
    if (callback != nil && dashGuid != nil && widgetGuid != nil) {
        
        [self timerCallbackToDashboard:dashGuid withWidget:widgetGuid withJSAction:callback usingInterval:interval];
        results = @{APIsetup:APIsuccess};
    
    }else{
        results = @{APIsetup:APIfailure};
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
