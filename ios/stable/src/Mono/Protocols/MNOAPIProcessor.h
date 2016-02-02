//
//  APIProcessor.h
//  Mono2
//
//  Created by Michael Wilson on 4/8/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNOAPIResponse.h"
#import "UIWebView+OzoneWebView.h"

/**
 * Defines a protocol that all APIProcessors must implement to intercept requests to the native
 * hardware layer.
 **/
@protocol MNOAPIProcessor <NSObject>

#pragma mark public methods

/**
 * An APIProcessor takes in a method, a set of parameters, and a web view and uses them to
 * perform actions and propagate them down to the webview.
 * @param method The method within the API to perform.
 * @param params The parameters passed to the method.
 * @param url The original URL used to call this method.
 * @param webView The calling web view.
 * @return The response from the API call.
 **/
- (MNOAPIResponse *) process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView;

@end
