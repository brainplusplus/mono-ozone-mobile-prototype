//
//  MNOHeaderBarProcessor.h
//  Mono
//
//  Created by Michael Wilson on 5/7/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

#import "MNOAPIProcessor.h"

@interface MNOHeaderBarProcessor : NSObject <MNOAPIProcessor>

#pragma mark public methods

/**
 * HeaderBar process function.
 * Should support the following methods:
 * - initializeWithParams: Initializes the cache with the specified parameters for fetch/retrieve url, timeout, expireTimeInMinutes, etc.
 * - store: Makes an HTTP call to get, and subsequently stores the data from the specified URL
 * - retrieve: Retrieves the data from the cache and returns it.
 * @param method The decoded "function" that will be called.  Must match one of the supported methods.
 * @param params The JSON decoded parameters passed to the function.
 * @param url The original URL.  Unused.
 * @param webView The webView associated with this call.
 * @return An APIResponse containing the success value and any additional values if needed.
 **/
- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView;

@end
