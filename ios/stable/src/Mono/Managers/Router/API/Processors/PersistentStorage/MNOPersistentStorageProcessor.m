//
//  PersistentStorageProcessor.m
//  Mono2
//
//  Created by Michael Wilson on 4/8/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOPersistentStorageProcessor.h"

#import "MNODBManager.h"

// Methods
#define METHOD_EXEC @"exec"
#define METHOD_QUERY @"query"

@implementation MNOPersistentStorageProcessor

#pragma mark public methods

- (MNOAPIResponse *) process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView
{
    MNOAPIResponse *response = nil;
    
    // Parse the method and call appropriately
    if([method isEqualToString:METHOD_EXEC])
    {
        response = [self exec:params webView:webView];
    }
    else if([method isEqualToString:METHOD_QUERY])
    {
        response = [self query:params webView:webView];
    }
    else
    {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:[NSString stringWithFormat:@"Unrecognized method %@.", method]];
    }
    
    return response;
}

#pragma mark - private methods

// Perform an SQL execute
- (MNOAPIResponse *) exec:(NSDictionary *)params webView:(UIWebView *)webView
{
    NSString *query = [params valueForKey:@"query"];
    NSObject *bindParamsObj = [params valueForKey:@"values"];
    NSArray *bindParams = nil;
    
    // We must have a query
    if(query == nil)
    {
        return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"query not found in input JSON!"];
    }
    
    // If we have bindParams and the bindParams are of the array form, use them
    if(bindParamsObj != nil && [bindParamsObj isKindOfClass:[NSArray class]] == TRUE)
    {
        bindParams = (NSArray *)bindParamsObj;
    }
    
    // Get the database
    MNODatabase *db = [[MNODBManager sharedInstance] getDatabaseWithWidgetId:[webView widgetGuid]];
    
    // Make sure the query executed correctly
    if([db exec:query params:bindParams] == FALSE)
    {
        return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Error executing query!"];
    }
    
    return [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
}

// Perform an SQL query
- (MNOAPIResponse *) query:(NSDictionary *)params webView:(UIWebView *)webView
{
    NSString *query = [params valueForKey:@"query"];
    NSObject *bindParamsObj = [params valueForKey:@"values"];
    NSArray *bindParams = nil;
    
    // We must have a query
    if(query == nil)
    {
        return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"query not found in input JSON!"];
    }
    
    // If we have bindParams and the bindParams are of the array form, use them
    if(bindParamsObj != nil && [bindParamsObj isKindOfClass:[NSArray class]] == TRUE)
    {
        bindParams = (NSArray *)bindParamsObj;
    }
    
    // Get the database
    MNODatabase *db = [[MNODBManager sharedInstance] getDatabaseWithWidgetId:[webView widgetGuid]];
    
    // Get the results
    NSArray *results = [db query:query params:bindParams];
    
    // Error
    if(results == nil)
    {
        return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Error executing query!"];
    }
    
    // Pack them into an array to use with our response
    NSDictionary *resultsDictionary = [[NSDictionary alloc] initWithObjectsAndKeys:results, @"results", nil];
    
    // Return
    return [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS additional:resultsDictionary];
}

@end
