//
//  ConnectivityProcessor.m
//  Mono
//
//  Created by Michael Wilson on 5/21/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOConnectivityProcessor.h"

#import "MNOReachabilityManager.h"

// Methods
#define METHOD_IS_ONLINE @"isOnline"
#define METHOD_REGISTER @"register"
#define METHOD_UNREGISTER @"unregister"

@implementation MNOConnectivityProcessor

#pragma mark public methods

- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    
    // Parse the method and call appropriately
    if([method isEqualToString:METHOD_IS_ONLINE])
    {
        response = [self isOnline:params webView:webView];
    }
    else if([method isEqualToString:METHOD_REGISTER])
    {
        response = [self register:params webView:webView];
    }
    else if([method isEqualToString:METHOD_UNREGISTER])
    {
        response = [self unregister:params webView:webView];
    }
    else
    {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:[NSString stringWithFormat:@"Unrecognized method %@.", method]];
    }
    
    return response;
}

#pragma mark - private methods

- (MNOAPIResponse *)isOnline:(NSDictionary *)params webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    
    // Ask the reachability manager if we're online and return the info
    NSNumber *isOnline = [[NSNumber alloc] initWithBool:[[MNOReachabilityManager sharedInstance] isOnline]];
    response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS additional:@{@"isOnline": isOnline}];
    
    return response;
}

- (MNOAPIResponse *)register:(NSDictionary *)params webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    NSString *callbackId = [params valueForKey:@"callback"];
    
    // If we've got a callback ID, register with the reachability manager
    if(callbackId != nil) {
        [[MNOReachabilityManager sharedInstance] registerCallback:webView.instanceId withJSAction:callbackId];
        
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    }
    // Otherwise, return a failure
    else {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Callback ID not present."];
    }
    
    return response;
}

- (MNOAPIResponse *)unregister:(NSDictionary *)params webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    
    // Unregister with the reachability manager
    [[MNOReachabilityManager sharedInstance] unregister:webView.instanceId];
    response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    
    return response;
}

@end
