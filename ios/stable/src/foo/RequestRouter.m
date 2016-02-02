//
//  RequestRouter.m
//  foo
//
//  Created by Ben Scazzero on 1/2/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "RequestRouter.h"
#import "GPSManager.h"
#import "AccelerometerManager.h"
#import "BatteryManager.h"
#import "DiskManager.h"
#import "MemoryCacheManager.h"
#import "ModalManager.h"
#import "ReachabilityManager.h"

#define domain @"ozone.gov"
#define gpsRequest @"location"
#define gpsTimer @"current"
#define gpsMetered @"register"

// accelerometer/orientation
#define accelerometerRequest @"accelerometer"
#define orientationRegister @"detectOrientationChange"
#define accelerometerUpdates @"register"

//battery
#define batteryRequest @"battery"
#define batteryPercentage @"/battery/percentage"
#define batteryState @"/battery/chargingState"
#define batteryRegister @"/battery/register"


//storage
#define storageRequest @"storage"
#define diskRequest @"persistent"
#define memoryRequest @"transient"
#define store @"store"
#define delete @"delete"
#define update @"update"
#define retrieve @"retrieve"

//modal
#define modalRequest @"modals"
#define modalYesNo @"yesNo"
#define modalMessage @"message"
#define messageID @"message"
#define titleId @"title"

//internet
#define connectionRequest @"connectivity"
#define connectionIsOnline @"isOnline"
#define connectionRegister @"register"

@interface RequestRouter ()

@property (copy, nonatomic) void(^block)(NSData *);

@end

@implementation RequestRouter

+ (RequestRouter *) sharedInstance
{
    static RequestRouter * sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}


- (NSDictionary *) extractParamsFromRequest:(NSURLRequest *)request
{
    NSURL * url = request.URL;
    
    NSString * params = [url query];
    NSString * method = [request HTTPMethod];
    
    if ([method isEqualToString:@"POST"] || [method isEqualToString:@"PUT"]) {
        params = [[NSString alloc] initWithData:[request HTTPBody] encoding:NSUTF8StringEncoding];
        NSLog(@"%@",params);
    }

    NSMutableDictionary * kvPairs = [[NSMutableDictionary alloc] init];
    
    if (params.length > 0) {
        if(true){
            NSError * error = nil;
            kvPairs =
            [NSJSONSerialization JSONObjectWithData: [params dataUsingEncoding:NSUTF8StringEncoding]
                                        options: NSJSONReadingMutableContainers
                                          error: &error];
            NSLog(@"%@",error);
        }
    }
    
    return kvPairs;
}


- (void) routeRequest:(NSURLRequest *)request onComplete:(void(^)(NSData *))block
{
    NSData * result = nil;
    _block = block;
    NSDictionary * params = [self  extractParamsFromRequest:request];
    NSString * requestType = [request.URL.pathComponents objectAtIndex:1];
    NSString * specificType = [request.URL.pathComponents objectAtIndex:2];

    
    //GPS!
    if ([requestType isEqualToString:gpsRequest]){
     
        if ( [specificType isEqualToString:gpsTimer]) {
            result = [[GPSManager sharedInstance] timerGPSwithParams:params];
        }else if( [specificType isEqualToString:gpsMetered]){
            result = [[GPSManager sharedInstance] registerGPSwithParams:params];
        }
    
    //accelerometer
    }else if( [requestType isEqualToString:accelerometerRequest]){
        NSString * specificType = [request.URL.pathComponents objectAtIndex:2];
        
        if([specificType isEqualToString:orientationRegister]){
            result = [[AccelerometerManager sharedInstance] registerOrientationChangesWithParams:params];
        }else if( [specificType isEqualToString:accelerometerUpdates]){
            result = [[AccelerometerManager sharedInstance] registerAccelerometerWithParams:params];
        }
       
    //battery
    }else if( [requestType isEqualToString:batteryRequest] ) {
        
        if ( [[request.URL path] isEqualToString:batteryPercentage])
            result = [[BatteryManager sharedInstance] batteryLevelWithParams:params];
        
        else if( [[request.URL path] isEqualToString:batteryState])
            result = [[BatteryManager sharedInstance] batteryStateWithParams:params];
        
        else if( [[request.URL path] isEqualToString:batteryRegister])
            result = [[BatteryManager sharedInstance] registerBatterInfoWithParams:params];
        
    //storage
    } else if( [requestType isEqualToString:storageRequest]){
        
        NSString * action = [request.URL.pathComponents objectAtIndex:3];
        
        //disk
        if ([specificType isEqualToString:diskRequest]) {
            
            if ([action isEqualToString:store]){
                id<NSCoding> obj = [params objectForKey:@"object"];
                result = [[DiskManager sharedManager] setObject:obj withParams:params];
            }
            else if([action isEqualToString:delete]){
                 id index = [params objectForKey:@"index"];
                result = [[DiskManager sharedManager] deleteObjectAtIndex:index withParams:params];
            }
            else if([action isEqualToString:retrieve]){
                id index = [params objectForKey:@"index"];
                result = [[DiskManager sharedManager] retrieveObject:index withParams:params];
            }
            else if( [action isEqualToString:update]){
                id index = [params objectForKey:@"index"];
                id<NSCoding> obj = [params objectForKey:@"object"];
                result = [[DiskManager sharedManager] updateObject:obj atIndex:index withParams:params];
            }
        }
        //in-memory
        else if([specificType isEqualToString:memoryRequest]){
            if ([action isEqualToString:store]){
                id<NSCoding> obj = [params objectForKey:@"object"];
                result = [[MemoryCacheManager sharedManager] setObject:obj withParams:params];
            }
            else if([action isEqualToString:delete]){
                id index = [params objectForKey:@"index"];
                result = [[MemoryCacheManager sharedManager] deleteObjectAtIndex:index withParams:params];
            }
            else if([action isEqualToString:retrieve]){
                id index = [params objectForKey:@"index"];
                result = [[MemoryCacheManager sharedManager] retrieveObject:index withParams:params];
            }
            else if( [action isEqualToString:update]){
                id index = [params objectForKey:@"index"];
                id<NSCoding> obj = [params objectForKey:@"object"];
                result = [[MemoryCacheManager sharedManager] updateObject:obj atIndex:index withParams:params];
            }
        }
    
    // modal
    } else if([requestType isEqualToString:modalRequest]){
        
        NSString * specificType = [request.URL.pathComponents objectAtIndex:2];
        NSString * title = [params objectForKey:titleId];
        NSString * message = [params objectForKey:messageID];
        //yesNo
        if ( [specificType isEqualToString:modalYesNo]) {
             result = [[ModalManager sharedInstance] showYesNoModalTitle:title message:message withParams:params];
        //message
        }else if( [specificType isEqualToString:modalMessage]){
            result = [[ModalManager sharedInstance] showlTitle:title message:message withParams:params];
        }
    } else if( [requestType isEqualToString:connectionRequest]){
        
        NSString * specificType = [request.URL.pathComponents objectAtIndex:2];

        //isOnline
        if ( [specificType isEqualToString:connectionIsOnline]) {
            result = [[ReachabilityManager sharedInstance] isOnlineWithParams:params];
        }
        //register
        else if( [specificType isEqualToString:connectionRegister]){
            result = [[ReachabilityManager sharedInstance] registerConnectivityChangesWithParams:params];
        }
    }
    
    if (result != nil) {
        block(result);
        _block = nil;
    }
}

+ (BOOL) isHardwareRequest:(NSURLRequest *)request
{
    NSURL *url = request.URL;

    if ([domain isEqualToString:[url host]])
        return YES;
    
    
    return NO;
}

@end
