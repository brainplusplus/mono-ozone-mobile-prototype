//
//  NSURLRequest+NSURLRequestSSLY.m
//  Mono
//
//  Created by Corey Herbert on 5/15/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "NSURLRequest+NSURLRequestSSLY.h"
#import "MNOConfigurationManager.h"

@implementation NSURLRequest (NSURLRequestSSLY)
+(BOOL)allowsAnyHTTPSCertificateForHost:(NSString*)host
{
    return [[[MNOConfigurationManager sharedInstance] forKey:@"app_mode"]  isEqual: @"DEVELOPMENT"] ? YES : NO;
}

@end