//
//  MNOLocationProcessor.m
//  Mono
//
//  Created by Jason Lettman on 4/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOLocationProcessor.h"
#import "MNOLocationManager.h"

#define API_LOCATION_STATUS_TIME @"current"
#define API_LOCATION_STATUS_DISTANCE @"register"
#define API_LOCATION_STATUS_UNREGISTER @"disableUpdates"

@implementation MNOLocationProcessor

/**
 * See declaration in MNOLocationProcessor.h
 */
- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    
    if ([method isEqualToString:API_LOCATION_STATUS_TIME]) {
        NSLog(@"locationRegisterTime: %@", params);
        [[MNOLocationManager sharedInstance] registerLocationTimeUpdatesWithParams:params];
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    } else if ([method isEqualToString:API_LOCATION_STATUS_DISTANCE]) {
        NSLog(@"locationRegisterDistance: %@", params);
        [[MNOLocationManager sharedInstance] registerLocationDistanceUpdatesWithParams:params];
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    } else if ([method isEqualToString:API_LOCATION_STATUS_UNREGISTER]) {
        NSLog(@"locationUnregister: %@", params);
        [[MNOLocationManager sharedInstance] unregisterWidget:webView.instanceId];
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    } else {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:[NSString stringWithFormat:@"Unrecognized method %@.", method]];
    }
    
    return response;
}

@end
