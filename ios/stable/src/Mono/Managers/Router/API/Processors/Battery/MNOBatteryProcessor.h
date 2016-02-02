//
//  MNOBatteryProcessor.h
//  Mono
//
//  Created by Jason Lettman on 4/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNOAPIProcessor.h"

/**
 * The Battery processor. Handles battery hardware status calls.
 **/
@interface MNOBatteryProcessor : NSObject<MNOAPIProcessor>

/**
 * BatteryProcessor process function.
 * Should support the following methods:
 * - percentage: Gets the current battery percentage.
 * - chargingState: Get the current battery charging state.
 * - register: Registers for updates concerning the current battery state.
 * @param method The decoded "function" that will be called.  Must match one of the supported methods.
 * @param params The JSON decoded parameters passed to the function.
 * @param url The original URL.  Unused.
 * @param webView The webView associated with this call.
 * @return An APIResponse containing the success value and any additional values if needed.
 **/
- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView;

@end
