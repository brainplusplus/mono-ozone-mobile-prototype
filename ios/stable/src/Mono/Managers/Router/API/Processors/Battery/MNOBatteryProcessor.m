//
//  MNOBatteryProcessor.m
//  Mono
//
//  Created by Jason Lettman on 4/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOBatteryProcessor.h"
#import "MNOBatteryManager.h"

#define API_BATTERY_PERCENTAGE @"percentage"
#define API_BATTERY_STATE @"chargingState"
#define API_BATTERY_REGISTER @"register"

@implementation MNOBatteryProcessor

/**
 * See declaration in MNOBatteryProcessor.h
 */
- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    
    if ([method isEqualToString:API_BATTERY_PERCENTAGE]) {
        NSLog(@"batteryPercentage: %@", params);
        NSDictionary *result = [[MNOBatteryManager sharedInstance] batteryLevelWithParams:params];
        MNOAPIResponseStatus status = [[result objectForKey:APIstatus] isEqualToString:APIsuccess] ? API_SUCCESS : API_FAILURE;
        response = [[MNOAPIResponse alloc] initWithStatus:status additional:[result objectForKey:APIadditional]];
    } else if ([method isEqualToString:API_BATTERY_STATE]) {
        NSLog(@"batteryState: %@", params);
        NSDictionary *result = [[MNOBatteryManager sharedInstance] batteryStateWithParams:params];
        MNOAPIResponseStatus status = [[result objectForKey:APIstatus] isEqualToString:APIsuccess] ? API_SUCCESS : API_FAILURE;
        response = [[MNOAPIResponse alloc] initWithStatus:status additional:[result objectForKey:APIadditional]];
    } else if ([method isEqualToString:API_BATTERY_REGISTER]) {
        NSLog(@"batteryRegister: %@", params);
        NSDictionary *result = [[MNOBatteryManager sharedInstance] registerBatterInfoWithParams:params];
        MNOAPIResponseStatus status = [[result objectForKey:APIstatus] isEqualToString:APIsuccess] ? API_SUCCESS : API_FAILURE;
        response = [[MNOAPIResponse alloc] initWithStatus:status additional:[result objectForKey:APIadditional]];
    } else {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:[NSString stringWithFormat:@"Unrecognized method %@.", method]];
    }
    
    return response;
}

@end
