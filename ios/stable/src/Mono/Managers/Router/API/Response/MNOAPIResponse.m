//
//  APIResponse.m
//  Mono2
//
//  Created by Michael Wilson on 4/10/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAPIResponse.h"

@implementation MNOAPIResponse
{
    NSData *_data;
    NSDictionary *_headers;
}

#pragma mark constructors

// Constructors allow for instantiation with various fields filled out
- (id) initWithStatus:(MNOAPIResponseStatus)status
{
    if(self = [super init])
    {
        [self setStatus:status];
        [self setMessage:@""];
        [self setAdditional:[[NSDictionary alloc] init]];
    }
    
    return self;
}

- (id) initWithStatus:(MNOAPIResponseStatus)status message:(NSString *)message
{
    if(self = [super init])
    {
        [self setStatus:status];
        [self setMessage:message];
        [self setAdditional:[[NSDictionary alloc] init]];
    }
    
    return self;
}

- (id) initWithStatus:(MNOAPIResponseStatus)status message:(NSString *)message additional:(NSDictionary *)additional
{
    if(self = [super init])
    {
        [self setStatus:status];
        [self setMessage:message];
        [self setAdditional:additional];
    }
    
    return self;
}

- (id) initWithStatus:(MNOAPIResponseStatus)status additional:(NSDictionary *)additional;
{
    if(self = [super init])
    {
        [self setStatus:status];
        [self setMessage:@""];
        [self setAdditional:additional];
    }
    
    return self;
}

- (id) initRaw:(NSData *)data;
{
    if(self = [super init])
    {
        _data = data;
    }
    
    return self;
}

- (id) initRaw:(NSData *)data headers:(NSDictionary *)headers;
{
    if(self = [super init])
    {
        _data = data;
        _headers = headers;
    }
    return self;
}

#pragma mark - public methods

// Return as NSData for use in NSURLResponses
- (NSData *)getAsData {
    if (_data != nil)
    {
        return _data;
    }

    NSDictionary *jsonDictionary = [self convertToDictionary];

    // Serialize the json, pack it into a data object
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:jsonDictionary options:0 error:&error];

    if(error)
    {
        NSLog(@"Error converting JSON to NSData.\nMessage: %@.", error.domain);
        return nil;
    }

    // Return the JSON data
    return jsonData;
}

- (NSString *)getAsString {
    if (_data != nil)
    {
        return [[NSString alloc] initWithData:_data encoding:NSUTF8StringEncoding];
    }
    
    NSError *error;
    
    NSDictionary *jsonDictionary = [self convertToDictionary];
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:jsonDictionary options:0 error:&error];
    
    if(error) {
        NSLog(@"Error serializing JSON!  Message: %@.", error);
        return @"";
    }
    
    return [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
}

#pragma mark - private methods

// Converts this object to a dictionary
- (NSDictionary *)convertToDictionary {
    // Make a JSON starting with the additional fields
    NSMutableDictionary *jsonDictionary = [[NSMutableDictionary alloc] initWithDictionary:self.additional];

    // Add the status to it
    [jsonDictionary setValue:[self statusToString:self.status] forKey:@"status"];

    // Add the message to it
    [jsonDictionary setValue:_message forKey:@"message"];
    
    return jsonDictionary;
}

// Converts status to strings
- (NSString *)statusToString:(MNOAPIResponseStatus)status {
    if(self.status == API_SUCCESS)
    {
        return @"success";
    }
    else if(self.status == API_RUNNING)
    {
        return @"running";
    }
    else if(self.status == API_COMPLETE)
    {
        return @"complete";
    }
    
    return @"failure";
}

@end
