//
//  IntentProcessor.h
//  Mono2
//
//  Created by Michael Wilson on 4/14/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNOAPIProcessor.h"

@interface MNOIntentsProcessor : NSObject<MNOAPIProcessor>

#pragma mark public methods

/**
 * IntentProcessor process function.
 * Should support the following methods:
 * - startActivity: Starts an intent activity given a supplied action.
 * - receive: Receives a supplied intent activity.
 * @param method The decoded "function" that will be called.  Must match one of the supported methods.
 * @param params The JSON decoded parameters passed to the function.
 * @param url The original URL.  Unused.
 * @param webView The webView associated with this call.
 * @return An APIResponse containing the success value and any additional values if needed.
 **/
- (MNOAPIResponse *) process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView;

@end
