//
//  IntentProcessor.m
//  Mono2
//
//  Created by Michael Wilson on 4/14/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOIntentsProcessor.h"

@implementation MNOIntentsProcessor

// We use the NSNotificationCenter to handle pub/sub calls
// The dashboard itself does the actual processing
- (MNOAPIResponse *) process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView
{
    MNOAPIResponse *response = nil;
    if ([method isEqualToString:startActivity])
    {
        NSLog(@"startActivity: %@",params);
        [[NSNotificationCenter defaultCenter] postNotificationName:startActivity object:params];
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    }
    else if([method isEqualToString:receive])
    {
        NSLog(@"receive: %@",params);
        [[NSNotificationCenter defaultCenter] postNotificationName:receive object:params];
        response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    }
    else
    {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:[NSString stringWithFormat:@"Unrecognized method %@.", method]];
    }
    
    return response;
}

@end
