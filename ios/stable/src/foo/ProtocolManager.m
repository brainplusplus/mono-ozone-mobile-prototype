//
//  ProtocolManagerViewController.m
//  foo
//
//  Created by Ben Scazzero on 12/18/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import "ProtocolManager.h"
#import "GPSManager.h"
#import "AccelerometerManager.h"
#import "RequestRouter.h"
#import "Reachability.h"
#import "RNCachedData.h"

#define jpg @"jpg"
#define png @"png"

// thanks to https://github.com/rnapier/RNCachingURLProtocol for providing code to make this possible

#define WORKAROUND_MUTABLE_COPY_LEAK 1

#if WORKAROUND_MUTABLE_COPY_LEAK
// required to workaround http://openradar.appspot.com/11596316
@interface NSURLRequest(MutableCopyWorkaround)

- (id) mutableCopyWorkaround;

@end
#endif

static NSSet * supportedImages;
static NSSet * processingRequests;
static NSString *RNCachingURLHeader = @"X-RNCache";
static RequestRouter * requestRouter;


@interface ProtocolManager ()
@property (nonatomic, readwrite, strong) NSURLConnection *connection;
@property (nonatomic, readwrite, strong) NSMutableData *data;
@property (nonatomic, readwrite, strong) NSURLResponse *response;
- (void) sendResponseWith:(NSURLRequest *)request response:(NSData *)data;
- (void)appendData:(NSData *)newData;
@end

@implementation ProtocolManager
// Custom initialization

+ (void) initialize {
    supportedImages = [[NSSet alloc] initWithArray:@[jpg,png]];
    processingRequests = [[NSSet alloc] init];
    requestRouter = [RequestRouter sharedInstance];
}

- (void) sendResponseWith:(NSURLRequest *)request response:(NSData *)data
{
    id client = [self client];
    
    NSDictionary *headers = @{@"Access-Control-Allow-Origin" : @"*", @"Access-Control-Allow-Headers" : @"Content-Type"};
    NSHTTPURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:request.URL statusCode:200 HTTPVersion:@"1.1" headerFields:headers];
    
    [client URLProtocol:self didReceiveResponse:response
     cacheStoragePolicy:NSURLCacheStorageAllowed];
    [client URLProtocol:self didLoadData:data];
    [client URLProtocolDidFinishLoading:self];
}

+ (BOOL) isSupportedImageRequest:(NSURLRequest *)request
{

    NSURL * url = request.URL;
    if ([supportedImages containsObject:[[url path] pathExtension]]) {
        
        return YES;
    }
    
    return NO;
}

+ (BOOL) isSupportedImageExtension:(NSString *)extension
{
    if ([supportedImages containsObject:extension])
        return YES;
    
    return NO;
}

+ (BOOL)canInitWithRequest:(NSURLRequest *)request
{
    if ([RequestRouter isHardwareRequest:request]) {
        NSLog(@"canInitWithRequest:YES: %@",request.URL);
        return YES;
    
    // only handle http requests we haven't marked with our header.
    }else if( [self isSupportedImageRequest:request] &&
             ([request valueForHTTPHeaderField:RNCachingURLHeader] == nil)){
        NSLog(@"canInitWithRequest:YES: %@",request.URL);
        return YES;
    }
    
    return NO;
}

+ (NSURLRequest *) canonicalRequestForRequest:(NSURLRequest *)request
{
    return request;
}

- (NSString *)cachePathForRequest:(NSURLRequest *)aRequest
{
    // This stores in the Caches directory, which can be deleted when space is low, but we only use it for offline access
    NSString *cachesPath = [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) lastObject];
    
    return
    [cachesPath stringByAppendingPathComponent:
     [NSString stringWithFormat:@"%x",[[[aRequest URL] absoluteString] hash]]];
}

- (void) startLoading
{
    NSLog(@"startLoading");

    NSURLRequest * request = [self request];

    if ([RequestRouter isHardwareRequest:request]) {
        [requestRouter routeRequest:request onComplete:^(NSData * result){
            
            [self sendResponseWith:request response:result];
        }];
    }else if([ProtocolManager isSupportedImageRequest:request]){
        
        if (![self useCache]) { //if online,
            NSMutableURLRequest *connectionRequest =
            #if WORKAROUND_MUTABLE_COPY_LEAK
            [[self request] mutableCopyWorkaround];
            #else
            [[self request] mutableCopy];
            #endif
            
            // we need to mark this request with our header so we know not to handle it in +[NSURLProtocol canInitWithRequest:].
            [connectionRequest setValue:@"" forHTTPHeaderField:RNCachingURLHeader];
            NSURLConnection *connection = [NSURLConnection connectionWithRequest:connectionRequest delegate:self];
            
            [self setConnection:connection];
            
        }  else { //if offline
            RNCachedData *cache = [NSKeyedUnarchiver unarchiveObjectWithFile:[self cachePathForRequest:[self request]]];
            
            if (cache != nil) {
                NSData *data = [cache data];
                NSURLResponse *response = [cache response];
                NSURLRequest *redirectRequest = [cache redirectRequest];
                if (redirectRequest) {
                    [[self client] URLProtocol:self wasRedirectedToRequest:redirectRequest redirectResponse:response];
                } else {
                    
                    [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed]; // we handle caching ourselves.
                    [[self client] URLProtocol:self didLoadData:data];
                    [[self client] URLProtocolDidFinishLoading:self];
                }
            }else { // if nothing in cache availble, send error
                [[self client] URLProtocol:self didFailWithError:[NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorCannotConnectToHost userInfo:nil]];
            }
        }
        
    }
}

- (void) stopLoading
{
    NSLog(@"stopLoading");
}

// NSURLConnection delegates (generally we pass these on to our client)

- (NSURLRequest *)connection:(NSURLConnection *)connection willSendRequest:(NSURLRequest *)request redirectResponse:(NSURLResponse *)response
{
    // Thanks to Nick Dowell https://gist.github.com/1885821
    if (response != nil) {
        NSMutableURLRequest *redirectableRequest =
        #if WORKAROUND_MUTABLE_COPY_LEAK
        [request mutableCopyWorkaround];
        #else
        [request mutableCopy];
        #endif
        // We need to remove our header so we know to handle this request and cache it.
        // There are 3 requests in flight: the outside request, which we handled, the internal request,
        // which we marked with our header, and the redirectableRequest, which we're modifying here.
        // The redirectable request will cause a new outside request from the NSURLProtocolClient, which
        // must not be marked with our header.
        [redirectableRequest setValue:nil forHTTPHeaderField:RNCachingURLHeader];
        
        NSString *cachePath = [self cachePathForRequest:[self request]];
        RNCachedData *cache = [RNCachedData new];
        [cache setResponse:response];
        [cache setData:[self data]];
        [cache setRedirectRequest:redirectableRequest];
        [NSKeyedArchiver archiveRootObject:cache toFile:cachePath];
        [[self client] URLProtocol:self wasRedirectedToRequest:redirectableRequest redirectResponse:response];
        
        return redirectableRequest;
        
    } else {
        return request;
    }
}

- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data
{
    [[self client] URLProtocol:self didLoadData:data];
    [self appendData:data];
}

- (void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error
{
    [[self client] URLProtocol:self didFailWithError:error];
    [self setConnection:nil];
    [self setData:nil];
    [self setResponse:nil];
}

- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response
{
    NSLog(@"Response: %@",response);
    [self setResponse:response];
    [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];  // We cache ourselves.
}

- (void)connectionDidFinishLoading:(NSURLConnection *)connection
{
    [[self client] URLProtocolDidFinishLoading:self];
    
    NSString *cachePath = [self cachePathForRequest:[self request]];
    RNCachedData *cache = [RNCachedData new];
    [cache setResponse:[self response]];
    [cache setData:[self data]];
    NSLog(@"connectionDidFinishLoading URL %@", [[self request].URL absoluteString]);
    NSLog(@"connectionDidFinishLoading Cache Path: %@",cachePath);
    [NSKeyedArchiver archiveRootObject:cache toFile:cachePath];
    
    [self setConnection:nil];
    [self setData:nil];
    [self setResponse:nil];
}

- (BOOL) useCache
{
    BOOL reachable = (BOOL) [[Reachability reachabilityWithHostName:[[[self request] URL] host]] currentReachabilityStatus] != NotReachable;
    return !reachable;
}

- (void)appendData:(NSData *)newData
{
    if ([self data] == nil) {
        [self setData:[newData mutableCopy]];
    }
    else {
        [[self data] appendData:newData];
    }
}

- (void) URLProtocol:(NSURLProtocol *)protocol didFailWithError:(NSError *)error
{
    NSLog(@"%@",error);
}

@end



