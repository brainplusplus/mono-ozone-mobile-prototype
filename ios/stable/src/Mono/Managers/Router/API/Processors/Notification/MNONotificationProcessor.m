//
//  MNONotificationProcessor.m
//  Mono
//
//  Created by Corey Herbert on 5/1/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNONotificationProcessor.h"
#import "MNONotificationManager.h"


@implementation MNONotificationProcessor
#pragma mark public methods
#define METHOD_NOTIFY @"notify"


- (MNOAPIResponse *) process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    
    // Parse the method and call appropriately
    if([method isEqualToString:METHOD_NOTIFY])
    {
        NSString *callbackName = [params objectForKey:@"callback"];
        NSString *title = [params objectForKey:@"title"];
        NSString *text = [params objectForKey:@"text"];
        
        if(title == nil ) {
            return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Missing input parameters!"];
        }
        else {
            
            [[MNONotificationManager sharedInstance] notify:title text:text callbackName:callbackName instanceID:webView.instanceId];
            
            return [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
        }
        
    }
    return response;
}


#pragma mark private methods

@end
