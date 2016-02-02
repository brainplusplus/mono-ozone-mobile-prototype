//
//  MNOAccelerometerProcessor.m
//  Mono
//
//  Created by Jason Lettman on 4/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAccelerometerProcessor.h"
#import "MNOAccelerometerManager.h"

#define API_ORIENTATION_REGISTER @"detectOrientationChange"
#define API_ACCELEROMETER_UPDATES @"register"
#define API_ACCELEROMETER_UNREGISTER @"unregister"

@implementation MNOAccelerometerProcessor

/**
 * See declaration in MNOAccelerometerProcessor.h
 */
- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    
    if ([method isEqualToString:API_ORIENTATION_REGISTER]) {
        NSLog(@"orientationRegister: %@", params);
        response = [[MNOAccelerometerManager sharedInstance] registerOrientationChangesWithParams:params];
    } else if ([method isEqualToString:API_ACCELEROMETER_UPDATES]) {
        NSLog(@"accelerometerUpdates: %@", params);
        response = [[MNOAccelerometerManager sharedInstance] registerAccelerometerWithParams:params];
    } else if ([method isEqualToString:API_ACCELEROMETER_UNREGISTER]) {
        NSLog(@"accelerometerUnregister: %@", params);
        [[MNOAccelerometerManager sharedInstance] unregisterWidget:webView.instanceId];
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    } else {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:[NSString stringWithFormat:@"Unrecognized method %@.", method]];
    }
    
    return response;
}

@end
