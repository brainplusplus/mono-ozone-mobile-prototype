//
//  MNONotificationProcessor.h
//  Mono2
//
//  Created by Corey on 4/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "MNOAPIProcessor.h"
#import "MNOAPIResponse.h"

/**
 * The Notification processor.  Handles notification callbacks.
 **/
@interface MNONotificationProcessor : NSObject<MNOAPIProcessor>

#pragma mark public methods

/**
 * @param method The decoded "function" that will be called.  Must match one of the supported methods.
 * @param params The JSON decoded parameters passed to the function.
 * @param url The original URL.  Used to parse out tile information.
 * @param webView The webView associated with this call.
 * @return An APIResponse containing the success value and any additional values if needed.
 **/
- (MNOAPIResponse *) process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView;

@end
