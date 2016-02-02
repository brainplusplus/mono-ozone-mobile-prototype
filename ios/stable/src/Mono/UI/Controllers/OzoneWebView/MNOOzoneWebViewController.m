//
//  OzoneWebViewController.m
//  Mono2
//
//  Created by Michael Wilson on 4/7/14.
//  Copyright (c) 2014 42Six Solutions. All rights reserved.
//

#import "MNOOzoneWebViewController.h"
#import "MNORouteRequestManager.h"

@implementation MNOOzoneWebViewController
{
    MNORouteRequestManager *router;
}

@synthesize webView;

/**
 * Initializes the WebViewController.
 **/
- (id) init {
    self = [super init];
    
    if(self != nil) {
        router = [MNORouteRequestManager sharedInstance];
    }
    
    return self;
}

/**
 * Make sure we set the web view's delegate to nil.
 **/
-(void) dealloc {
    [webView setDelegate:nil];
}

/**
 * See if we should load the given request.
 * @param webView The WebView to test for interception.
 * @param request The request to test.
 * @param navigationType The navigation type to test for interception.
 * @param YES if the request should be loaded as is, NO otherwise.
 **/
- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
{
    
    
    return NO;
}

@end
