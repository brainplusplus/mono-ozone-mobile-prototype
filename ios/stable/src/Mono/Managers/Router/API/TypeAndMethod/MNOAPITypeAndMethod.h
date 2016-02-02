//
//  APITypeAndMethod.h
//  Mono2
//
//  Created by Michael Wilson on 4/4/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 * Encapsulates the API type and method into one object.
 **/
@interface MNOAPITypeAndMethod : NSObject

#pragma mark properties

/**
 * The parsed out api type.  String gathered from a URL.
 **/
@property (readonly, strong) NSString *apiType;

/**
 * The method being called.  Also gathered from a URL.
 **/
@property (readonly, strong) NSString *method;

#pragma mark - constructors

/**
 * Constructor that takes an apiType and a method.
 * @param apiType The API type of the method being called.
 * @param method The method that's being executed.
 **/
- (id)initWithTypeAndMethod:(NSString *)apiType method:(NSString *)method;

@end
