//
//  PublishSubscribeProcessor.m
//  Mono2
//
//  Created by Michael Wilson on 4/8/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOPublishSubscribeProcessor.h"

// Methods
#define METHOD_PUBLISH @"publish"
#define METHOD_SUBSCRIBE @"subscribe"
#define METHOD_UNSUBSCRIBE @"unsubscribe"

@implementation MNOPublishSubscribeProcessor

#pragma mark public methods

// We use the NSNotificationCenter to handle pub/sub calls
// The dashboard itself does the actual processing
- (MNOAPIResponse *) process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView
{
    MNOAPIResponse *response = nil;
    if ([method isEqualToString:METHOD_PUBLISH])
    {
        [[NSNotificationCenter defaultCenter] postNotificationName:pubsubPublish object:params];
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    }
    else if([method isEqualToString:METHOD_SUBSCRIBE])
    {
        [[NSNotificationCenter defaultCenter] postNotificationName:pubsubSubscribe object:params];
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    }
    else
    {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:[NSString stringWithFormat:@"Unrecognized method %@.", method]];
    }
    
    return response;
}

@end
