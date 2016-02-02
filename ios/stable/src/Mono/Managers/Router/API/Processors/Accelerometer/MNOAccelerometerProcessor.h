//
//  MNOAccelerometerProcessor.h
//  Mono
//
//  Created by Jason Lettman on 4/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNOAPIProcessor.h"

/**
 * The Accelerometer processor.  Handles accelerometer calls.
 **/
@interface MNOAccelerometerProcessor : NSObject<MNOAPIProcessor>

/**
 * AccelerometerProcessor process function.
 * Should support the following methods:
 * - detectOrientationChange: Gets accelerometer data of when the device orientation has changed.
 * - register: Registers for accelerometer data updates from the device.
 * - unregister: Disables accelerometer data updates from the device.
 * @param method The decoded "function" that will be called.  Must match one of the supported methods.
 * @param params The JSON decoded parameters passed to the function.
 * @param url The original URL.  Unused.
 * @param webView The webView associated with this call.
 * @return An APIResponse containing the success value and any additional values if needed.
 **/
- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView;

@end
