//
//  ConnectivityProcessor.h
//  Mono
//
//  Created by Michael Wilson on 5/21/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNOAPIProcessor.h"

/**
 * The Connectivity processor. Handles connectivity status and notification calls.
 **/
@interface MNOConnectivityProcessor : NSObject <MNOAPIProcessor>

#pragma mark public methods

/**
 * ConnectivityProcessor process function.
 * Should support the following methods:
 * - isOnline: Returns true if the device is currently online, false otherwise.
 * - register: Get the current battery charging state.
 * - unregister: Registers for updates concerning the current battery state.
 * @param method The decoded "function" that will be called.  Must match one of the supported methods.
 * @param params The JSON decoded parameters passed to the function.
 * @param url The original URL.  Unused.
 * @param webView The webView associated with this call.
 * @return An APIResponse containing the success value and any additional values if needed.
 **/
- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView;

@end
