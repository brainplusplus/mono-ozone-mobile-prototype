//
//  MNOLocationProcessor.h
//  Mono
//
//  Created by Jason Lettman on 4/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNOAPIProcessor.h"

/**
 * The Location processor.  Handles location status calls.
 **/
@interface MNOLocationProcessor : NSObject<MNOAPIProcessor>

/**
 * LocationProcessor process function.
 * Should support the following methods:
 * - location: Gets the location as lat / lon coordinates.
 * - register: Registers for updates based on time elapsed or distance traveled.
 * - disableUpdates: Disables updates of location data.
 * @param method The decoded "function" that will be called.  Must match one of the supported methods.
 * @param params The JSON decoded parameters passed to the function.
 * @param url The original URL.  Unused.
 * @param webView The webView associated with this call.
 * @return An APIResponse containing the success value and any additional values if needed.
 **/
- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView;

@end
