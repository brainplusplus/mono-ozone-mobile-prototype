//
//  ReachabilityManager.m
//  foo
//
//  Created by Ben Scazzero on 1/15/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "ReachabilityManager.h"
#import "Reachability.h"
#import "WidgetManager.h"

#define connected @"isConnected"
#define type @"type"
#define status @"status"

#define JSONError @"ReachabilityManager: Unable to Serialize Dictionary Result: %@"
#define setupError @"ReachabilityManager: Unable to Setup Callback"

@interface ReachabilityManager ()
@property (strong, nonatomic) NSMutableDictionary * timers;
@end

@implementation ReachabilityManager

+(ReachabilityManager *) sharedInstance
{
    static ReachabilityManager * sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

- (id) init
{
    self = [super init];
    if (self) {
        //init
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(reachabilityChanged:) name:kReachabilityChangedNotification object:nil];
        _timers = [NSMutableDictionary new];
    }
    return self;
}


/*
 * Called by Reachability whenever status changes.
 */

- (void) reachabilityChanged:(NSNotification *)note {
    NSNumber * dashGuid = [WidgetManager sharedManager].dashGuid;
    // - active info    
    //For all widgets on this dashboard, send updates for those who registered
    for (NSNumber * widgetGuid in [_timers objectForKey:dashGuid]) {
        
        UIWebView * webview = [[WidgetManager sharedManager] widgetInDashboard:dashGuid withGuid:widgetGuid];
        NSString * callback = [[_timers objectForKey:dashGuid] objectForKey:widgetGuid];
        
        if (webview != nil && callback != nil) {
            Reachability* curReach = [note object];
            NSParameterAssert([curReach isKindOfClass:[Reachability class]]);
            
            NetworkStatus netStatus = [curReach currentReachabilityStatus];
            NSDictionary * result = [self getStatus:netStatus];
          
            NSString * outcome = [NSString stringWithFormat:@"%@({'%@':%@,'%@':{'%@':%@,'%@':'%@','%@':'%@'}});", monoCallbackName,monoCallbackFn,callback, monoCallbackArgs, connected,[result objectForKey:connected],status, [result objectForKey:status],type,[result objectForKey:type]];

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

//called to register widgets for future orientation updates
- (NSData *) registerConnectivityChangesWithParams:(NSDictionary *)params
{
    NSDictionary * results = nil;
    NSString * callback = nil;
    
    NSNumber * widgetGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:widgetUDID] unsignedIntValue]],
    * dashGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:dashboardUDID] unsignedIntValue]];

    callback = [params objectForKey:APIcallback];
    
    // - active info
    if (callback != nil && dashGuid != nil && widgetGuid != nil) {
        
        // - register this widget for future updates
        [self registerCallbackToDashboard:dashGuid withWidget:widgetGuid withJSAction:callback];
        
        Reachability *reach = [Reachability reachabilityForInternetConnection];
        NetworkStatus netStatus = [reach currentReachabilityStatus];
        results = [self getStatus:netStatus];
        
    }else{
        results = @{APIstatus:APIfailure,@"message":setupError};
    }
    
    return [self serializeDictionary:results];
}

- (NSDictionary *) getStatus:(NetworkStatus) netStatus {
    
    BOOL isConnected;
    NSString * netType = nil, * callStatus = nil;
    
    switch(netStatus) {
        case NotReachable:
            // @"Not Reachable";
            isConnected = NO;
            netType = @"NotReachable";
            callStatus = APIsuccess;
            break;
        case ReachableViaWiFi:
            // @"Reachable via WiFi";
            isConnected = YES;
            netType = @"WiFi";
            callStatus = APIsuccess;
            break;
        case ReachableViaWWAN:
            // @"Reachable via WWAN";
            isConnected = YES;
            netType = @"WWAN";
            callStatus = APIsuccess;
            break;
        default:
            // @"Unknown";
            isConnected = NO;
            netType = @"Unknown";
            // unable to determine network status, so call is failed
            callStatus = APIfailure;
            break;
    }
    
    return @{status:callStatus,connected:[NSNumber numberWithBool:isConnected], type:netType};
}

- (NSData *) isOnlineWithParams:(NSDictionary *)params
{
    Reachability *reach = [Reachability reachabilityForInternetConnection];
    [[NSNotificationCenter defaultCenter] postNotificationName:kReachabilityChangedNotification object:reach];
    NetworkStatus netStatus = [reach currentReachabilityStatus];

    NSDictionary * result = [self getStatus:netStatus];
    return [self serializeDictionary:result];
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
