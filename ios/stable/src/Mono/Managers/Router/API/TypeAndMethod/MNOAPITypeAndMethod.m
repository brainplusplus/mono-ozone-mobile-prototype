//
//  APITypeAndMethod.m
//  Mono2
//
//  Created by Michael Wilson on 4/4/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAPITypeAndMethod.h"

@interface MNOAPITypeAndMethod()

#pragma mark overloaded properties

// This is used so that we can write to the apiType/method locally.
// This allows us to do so without allowing users to do the same
@property (readwrite, strong) NSString *apiType;
@property (readwrite, strong) NSString *method;

@end

@implementation MNOAPITypeAndMethod

#pragma mark constructors

// We don't need anything more than a constructor here
// Basically just a fancy struct we can use more conveniently
- (id)initWithTypeAndMethod:(NSString *)apiType method:(NSString *)method
{
    if(self = [super init])
    {
        [self setApiType:apiType];
        [self setMethod:method];
        
        return self;
    }
    
    return nil;
}

@end
