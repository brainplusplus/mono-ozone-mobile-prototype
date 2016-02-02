//
//  MNONetworkWrapperProtocol.m
//  Mono
//
//  Created by Michael Wilson on 4/30/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNONetworkWrapperProtocol.h"
#import "MNOHttpStack.h"
#import "MNOReachabilityManager.h"

#import "RNCachedData.h"

@implementation MNONetworkWrapperProtocol

+ (BOOL) canInitWithRequest:(NSURLRequest *)request {
    BOOL online = [[MNOReachabilityManager sharedInstance] isOnline];
    
    if([request.allHTTPHeaderFields objectForKeyedSubscript:MONO_NETWORK_AUTH_WRAP] == nil &&
       online) {
        return TRUE;
    }
    else if(online == FALSE && [request.allHTTPHeaderFields objectForKeyedSubscript:MONO_NETWORK_CACHE_WRAP] == nil) {
        return TRUE;
    }
    
    return FALSE;
}

+ (NSURLRequest *) canonicalRequestForRequest:(NSURLRequest *)request
{
    return request;
}

- (void) startLoading {
    NSMutableURLRequest *request = [[self request] mutableCopy];
    
    [request setValue:@"" forHTTPHeaderField:MONO_NETWORK_CACHE_WRAP];
    
    if([self useCache] == false) {
        // Make an asynchronous request to return the proper value when needed
        [[MNOHttpStack sharedStack] makeAsynchronousRequest:REQUEST_RAW request:request success:^(MNOResponse *response) {
            [self sendResponseWith:response.rawRequest response:response];
        } failure:^(MNOResponse *response, NSError *error) {
            [[self client] URLProtocol:self didFailWithError:[NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorCannotConnectToHost userInfo:nil]];
        }];
    }
    else {
        // access/getConfig is always provided with a cache killer
        // In order to avoid errors while offline, we take off the query string
        NSURL *requestUrl = [request URL];
        if([[requestUrl lastPathComponent] isEqualToString:@"getConfig"]) {
            NSString *requestUrlString = [requestUrl absoluteString];
            NSRange range = [requestUrlString rangeOfString:@"?"];
            
            if(range.location != NSNotFound) {
                NSURL *noCacheKiller = [NSURL URLWithString:[[requestUrl absoluteString] substringToIndex:range.location]];
                [request setURL:noCacheKiller];
            }
        }
        
        RNCachedData *cache = [NSKeyedUnarchiver unarchiveObjectWithFile:[self cachePathForRequest:request]];
        if (cache) {
            NSData *data = [cache data];
            NSURLResponse *response = [cache response];
            
            // Send back the request
            [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed]; // we handle caching ourselves.
            [[self client] URLProtocol:self didLoadData:data];
            [[self client] URLProtocolDidFinishLoading:self];
        }
        else {
            [[self client] URLProtocol:self didFailWithError:[NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorCannotConnectToHost userInfo:nil]];
        }
    }
}

- (void) stopLoading {
    // Do nothing
}

- (void) sendResponseWith:(NSURLRequest *)request response:(MNOResponse *)response
{
    id client = [self client];
    
    NSMutableDictionary *headers = [response.headers mutableCopy];
    [headers setObject:@"*" forKey:@"Access-Control-Allow-Origin"];
    [headers setObject:@"Content-Type" forKey:@"Access-Control-Allow-Headers"];
    NSHTTPURLResponse *newResponse = [[NSHTTPURLResponse alloc] initWithURL:request.URL statusCode:200 HTTPVersion:@"1.1" headerFields:headers];
    
    [client URLProtocol:self didReceiveResponse:newResponse
    cacheStoragePolicy:NSURLCacheStorageAllowed];
    [client URLProtocol:self didLoadData:response.responseData];
    [client URLProtocolDidFinishLoading:self];
}

- (NSString *)cachePathForRequest:(NSURLRequest *)aRequest
{
    // This stores in the Caches directory, which can be deleted when space is low, but we only use it for offline access
    NSString *cachesPath = [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) lastObject];
    return [cachesPath stringByAppendingPathComponent:[NSString stringWithFormat:@"%lx", (unsigned long)[[[aRequest URL] absoluteString] hash]]];
}

- (BOOL) useCache
{
    BOOL reachable = [[MNOReachabilityManager sharedInstance] isOnline];
    return !reachable;
}

@end
