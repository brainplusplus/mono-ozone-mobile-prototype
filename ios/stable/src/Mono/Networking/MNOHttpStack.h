//
//  MNOHttpStack.h
//  Mono
//
//  Created by Michael Wilson on 4/28/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNOResponse.h"

#import "AFNetworking.h"

typedef enum {
    REQUEST_JSON,
    REQUEST_IMAGE,
    REQUEST_RAW
} MNORequestType;

@interface MNOHttpStack : NSObject

#pragma - public methods

/**
 * Retrieves the singleton instance of the MNOHttpStack.
 **/
+ (MNOHttpStack *) sharedStack;

/**
 * Loads a specific cert for authentication.
 * @param cert The p12 data for the certificate.
 * @param password The password for the certificate.
 * @return True if the load was successful, false otherwise.
 **/
- (BOOL) loadCert:(NSData *)p12Data password:(NSString *)password;

/**
 * Makes an asynchronous request and fires off the given success and failure callbacks.
 * @param type The request type.
 * @param url The URL to access.
 * @param success The callback to execute upon successful retrieval.
 * @param failure The callback to execute upon a failed retrieval.
 **/
- (void) makeAsynchronousRequest:(MNORequestType)type
                             url:(NSString *)url
                         success:(void(^)(MNOResponse *response))success
                         failure:(void(^)(MNOResponse *response, NSError *error))failure;

/**
 * Makes an asynchronous request and fires off the given success and failure callbacks.
 * @param type The request type.
 * @param request The raw request to use
 * @param success The callback to execute upon successful retrieval.
 * @param failure The callback to execute upon a failed retrieval.
 **/
- (void) makeAsynchronousRequest:(MNORequestType)type
                         request:(NSURLRequest *)request
                         success:(void(^)(MNOResponse *response))success
                         failure:(void(^)(MNOResponse *response, NSError *error))failure;

/**
 * Makes a synchronous request and returns the value associated with the given type.
 * @param type The request type.
 * @param url The URL to access.
 * @return The response from the executed request, or nil on failure.
 **/
- (id) makeSynchronousRequest:(MNORequestType) type
                          url:(NSString *)url;

/**
 * Makes a synchronous request and returns the value associated with the given type.
 * @param type The request type.
 * @param request The raw NSURLRequest to use to connect.
 * @return The response from the executed request, or nil on failure.
 **/
- (id) makeSynchronousRequest:(MNORequestType) type
                      request:(NSURLRequest *)request;

/**
 * Sets the maximum number of threads/requests that can be executed simultaneously.
 * @param threads The new number of threads to use.
 **/
- (void) setMaxConcurrentThreads:(NSUInteger)threads;

@end
