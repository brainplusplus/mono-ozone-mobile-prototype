//
//  MNOOpenAMAuthenticationManager.h
//  Mono
//
//  Created by Jason Lettman on 4/30/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOOpenAMAuthenticationManager : NSObject

/**
 * Determines if the original request response indicates connecting to an
 * OpenAM server and if so returns back the NSURLRequest needed for the 
 * additional authentication step that is needed for connecting to OpenAM.
 *
 * @param originalRequestURL The URL used in the inital request to the OWF server.
 * @param originalRequestResponse The response received from the server after the inital request.
 * @return NSURLRequest with request data for the additional authentication
 *          step needed for connecting to OpenAM or nil otherwise
 */
+ (NSURLRequest *)authenticateIfRequired:(NSURL *)originalRequestURL withResponse:(NSData *)originalRequestResponse;

/**
 * Determines if the original request response indicates connecting to an
 * OpenAM server and if so returns back the NSURLRequest needed for the
 * additional authentication step that is needed for connecting to OpenAM.
 *
 * @param operation The original http request object with which to derive the URL used in the inital request
 *          to the OWF server and the response received from the server after the inital request.
 * @return NSURLRequest with request data for the additional authentication
 *          step needed for connecting to OpenAM or nil otherwise
 */
+ (NSURLRequest *)authenticateIfRequired:(AFHTTPRequestOperation *)operation;

@end
