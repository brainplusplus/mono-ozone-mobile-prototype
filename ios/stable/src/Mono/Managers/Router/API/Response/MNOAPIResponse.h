//;
//  APIResponse.h
//  Mono2
//
//  Created by Michael Wilson on 4/10/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

typedef enum MNOAPIResponseStatus
{
    API_SUCCESS,
    API_FAILURE,
    API_RUNNING,
    API_COMPLETE
} MNOAPIResponseStatus;

/**
 * Object for sending responses back to the client side Javascript from iOS.
 **/
@interface MNOAPIResponse : NSObject

#pragma mark properties

/**
 * The status of response.  Should be "success" or "failure."
 **/
@property (nonatomic) MNOAPIResponseStatus status;

/**
 * The message associated with the response.  Should be blank on success, otherwise populated with the failure reason.
 **/
@property (nonatomic, copy) NSString *message;

/**
 * Additional fields associated with the response.  Will be API type and method specific.
 **/
@property (nonatomic, readonly, strong) NSDictionary *headers;

/**
 * Additional fields associated with the response.  Will be API type and method specific.
 **/
@property (nonatomic, copy) NSDictionary *additional;

#pragma mark - constructors

/**
 * Constructor that take a status and an empty message.
 * @param status The status to fill into this response
 **/
- (id)initWithStatus:(MNOAPIResponseStatus)status;

/**
 * Constructor that take a status and a message.
 * @param status The status to fill into this response
 * @param message The message to fill into this response
 **/
- (id)initWithStatus:(MNOAPIResponseStatus)status message:(NSString *)message;

/**
 * Constructor that take a status, message, and additional JSON key/value pairs.
 * @param status The status to fill into this response
 * @param message The message to fill into this response
 * @param additional Additional information to use as part of the response.
 **/
- (id)initWithStatus:(MNOAPIResponseStatus)status message:(NSString *)message additional:(NSDictionary *)additional;

/**
 * Constructor that take a status and additional JSON key/value pairs.
 * @param status The status to fill into this response
 * @param additional Additional information to use as part of the response.
 **/
- (id)initWithStatus:(MNOAPIResponseStatus)status additional:(NSDictionary *)additional;

/**
 * Constructor that take data content
 * @param data The data to send in the response
 **/
- (id)initRaw:(NSData *)data;

/**
 * Constructor that take data content
 * @param data The data to send in the response
 **/
- (id)initRaw:(NSData *)data headers:(NSDictionary *)headers;

#pragma mark - public methods

/**
 * Interprets the response of this object as a JSON string and packs it into
 * an NSData object to be used in iOS's native response mechanisms (NSURLResponse).
 * @return This response as a NSData object.
 **/
- (NSData *)getAsData;

/**
 * Interprets the response of this object as a JSON string and returns that string.
 * @return The JSON string representing this object.
 **/
- (NSString *)getAsString;

@end
