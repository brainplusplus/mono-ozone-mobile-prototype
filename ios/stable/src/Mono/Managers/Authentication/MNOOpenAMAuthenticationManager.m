//
//  MNOOpenAMAuthenticationManager.m
//  Mono
//
//  Created by Jason Lettman on 4/30/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "TFHpple.h"

#import "NSString+MNOAdditions.h"

#import "MNOOpenAMAuthenticationManager.h"

@implementation MNOOpenAMAuthenticationManager

+ (NSURLRequest *)authenticateIfRequired:(NSURL *)originalRequestURL withResponse:(NSData *)originalRequestResponse {
    NSMutableURLRequest *request;
    
    if(originalRequestURL && originalRequestResponse) {
        NSString *responseString = [[NSString alloc] initWithData:originalRequestResponse encoding:NSUTF8StringEncoding];
    
        // If the response is html with the title 'Access rights validated' then we think we are
        // connecting to an OpenAM server and requires additional steps for full authentication
        if (responseString && !([responseString rangeOfString:@"<title>Access rights validated</title>"].location == NSNotFound)) {
            // Need to parse the access rights validated page returned by the server to build the request
            NSMutableDictionary *nextRequestData = [self parseAccesRightsValidatedPage:originalRequestResponse];
            // Pull out the forward url from the data that was parsed out of the access rights validated page
            NSString *forwardURL = [nextRequestData objectForKey:@"forwardURL"];
            // Remove the forward url from the dictionary as the rest of the data are POST paramterers
            [nextRequestData removeObjectForKey:@"forwardURL"];
            request = [self buildPOSTRequest:originalRequestURL withForwardURL:forwardURL withPOSTParameters:nextRequestData];
        }
    }
    
    return request;
}

+ (NSURLRequest *)authenticateIfRequired:(AFHTTPRequestOperation *)operation {
    if(operation) {
        return [self authenticateIfRequired:[[operation request] URL] withResponse:operation.responseData];
    }
    
    return nil;
}

+ (NSMutableURLRequest *)buildPOSTRequest:(NSURL *)originalRequestURL withForwardURL:(NSString *)forwardURL withPOSTParameters:(NSMutableDictionary *)postParameters {
    NSMutableURLRequest *postRequest = [[NSMutableURLRequest alloc] init];
    NSURL *newRequestURL = [NSURL URLWithString:forwardURL relativeToURL:originalRequestURL];
    NSMutableString *postRequestParameters = [[NSMutableString alloc] init];
    
    for (NSString *key in postParameters) {
        NSMutableString *value = [[postParameters objectForKey:key] mutableCopy];
        
        [postRequestParameters appendFormat:@"%@=%@&", [key mno_urlEncodedString], [value mno_urlEncodedString]];
    }

    NSData *postBodyData = [NSData dataWithBytes:[postRequestParameters UTF8String] length:[postRequestParameters length]];

    [postRequest setURL:newRequestURL];
    [postRequest setHTTPMethod:@"POST"];
    [postRequest setValue:@"application/x-www-form-urlencoded" forHTTPHeaderField:@"Content-Type"];
    [postRequest setHTTPBody:postBodyData];
    
    return postRequest;
}

+ (NSMutableDictionary *)parseAccesRightsValidatedPage:(NSData *)data {
    NSMutableDictionary *parameters = [[NSMutableDictionary alloc] init];
    NSString *response = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    NSLog(@"%@", response);
    
    // If the response is html with the title 'Access rights validated' then we think we are
    // connecting to an OpenAM server and requires additional steps for full authentication
    if (!([response rangeOfString:@"<title>Access rights validated</title>"].location == NSNotFound)) {
        // Parse the entire html document
        TFHpple *htmlDoc = [TFHpple hppleWithHTMLData:data];
        
        // Get all of the form elements in the document
        NSString *XpathQueryStringTitle = @"//form";
        NSString *XpathQueryStringFormInput = @"//form/input";
        NSArray *formNodes = [htmlDoc searchWithXPathQuery:XpathQueryStringTitle];
        NSArray *inputNodes = [htmlDoc searchWithXPathQuery:XpathQueryStringFormInput];
        
        // Get the action attribute of the first form element in the document
        TFHppleElement *formNode = [formNodes objectAtIndex:0];
        NSString *forwardUrl = [formNode objectForKey:@"action"];
        [parameters setObject:forwardUrl forKey:@"forwardURL"];
        
        // Loop through the input elements in the html that do not have a 'type'
        // attribute with a value of 'submit' and build the array of parameters
        // from the values of the 'name' and 'value' attributes to go in the POST body
        for (TFHppleElement *inputNode in inputNodes) {
            if (![[inputNode objectForKey:@"type"] isEqualToString:@"submit"]) {
                NSString *value = [inputNode objectForKey:@"value"];
                NSString *key = [inputNode objectForKey:@"name"];
                
                [parameters setObject:value forKey:key];
            }
        }
    }

    return parameters;
}

@end
