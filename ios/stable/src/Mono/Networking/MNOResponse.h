//
//  MNOResponse.h
//  Mono
//
//  Created by Michael Wilson on 4/29/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOResponse : NSObject

/**
 * The content type of the response.
 **/
@property (strong, nonatomic) NSString *contentType;

/**
 * The etag associated with the response.
 **/
@property (strong, nonatomic) NSString *etag;

/**
 * The raw headers for this response.
 **/
@property (strong, nonatomic) NSDictionary *headers;

/**
 * The raw URL request.
 **/
@property (strong, nonatomic) NSURLRequest *rawRequest;

/**
 * The raw URL response.
 **/
@property (strong, nonatomic) NSURLResponse *rawResponse;

/**
 * The object parsed out of the response.
 **/
@property (strong, nonatomic) id responseObject;

/**
 * The raw data from the HTTP resonse.
 **/
@property (strong, nonatomic) NSData *responseData;

@end
