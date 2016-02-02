//
//  NSURLRequest+NSURLRequestSSLY.h
//  Mono
//
//  Created by Corey Herbert on 5/15/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface NSURLRequest (NSURLRequestSSLY)
+(BOOL)allowsAnyHTTPSCertificateForHost:(NSString*)host;

@end
