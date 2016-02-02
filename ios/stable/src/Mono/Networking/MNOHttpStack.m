//
//  MNOHttpStack.m
//  Mono
//
//  Created by Michael Wilson on 4/28/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOHttpStack.h"
#import "MNOOpenAMAuthenticationManager.h"
#import "MNOWidgetManager.h"

#import "AFNetworkReachabilityManager.h"
#import "RNCachedData.h"
#import "MNOConfigurationManager.h"


#define MAX_HTTP_STACK_THREADS 10

@implementation MNOHttpStack
{
    NSOperationQueue *_opQueue;
    AFSecurityPolicy *_secPolicy;
    NSURLCredential *_credential;
    dispatch_queue_t _syncRequestQueue;
}

#pragma mark constructors

- (id) init {
    if (self = [super init]) {
        _opQueue = [[NSOperationQueue alloc] init];
        [_opQueue setMaxConcurrentOperationCount:MAX_HTTP_STACK_THREADS];
        
        _secPolicy = [[AFSecurityPolicy alloc] init];
        
        // Allow all certificates for now
        [_secPolicy setAllowInvalidCertificates: [[[MNOConfigurationManager sharedInstance] forKey:@"app_mode"]  isEqual: @"DEVELOPMENT"] ? TRUE : FALSE];
        
        _syncRequestQueue = dispatch_queue_create("syncRequest", DISPATCH_QUEUE_CONCURRENT);
        
    }
    
    return self;
}

#pragma mark - public methods

+ (MNOHttpStack *) sharedStack
{
    // Gets a singleton object of the HTTP stack
    static MNOHttpStack *sharedStack = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedStack = [[self alloc] init];
    });
    return sharedStack;
}


- (BOOL)loadCert:(NSData *)p12Data password:(NSString *)password {
    // Make a security policy to use for operations
    _secPolicy = [[AFSecurityPolicy alloc] init];
    
    if(p12Data == nil) {
        NSLog(@"Error loading cert data!");
    }
    else {
        // Set up client cert
        CFStringRef cfPassword = (__bridge CFStringRef)password;
        const void *keys[] = { kSecImportExportPassphrase };
        const void *values[] = { cfPassword };
        CFDictionaryRef optionsDictionary = CFDictionaryCreate(NULL, keys, values, 1, NULL, NULL);
        CFArrayRef p12Items;
        
        OSStatus result = SecPKCS12Import((__bridge CFDataRef)p12Data, optionsDictionary, &p12Items);
        
        CFRelease(optionsDictionary);
        
        if(result == noErr) {
            CFDictionaryRef identityDict = CFArrayGetValueAtIndex(p12Items, 0);
            SecIdentityRef identityApp =(SecIdentityRef)CFDictionaryGetValue(identityDict,kSecImportItemIdentity);
            
            SecCertificateRef certRef;
            SecIdentityCopyCertificate(identityApp, &certRef);
            
            _credential = [NSURLCredential credentialWithIdentity:identityApp certificates:nil persistence:NSURLCredentialPersistencePermanent];
            
            return TRUE;
        }
    }
    
    return FALSE;
}

- (void) makeAsynchronousRequest:(MNORequestType)type
                             url:(NSString *)url
                         success:(void(^)(MNOResponse *response))success
                         failure:(void(^)(MNOResponse *response, NSError *error))failure {
    // URL must not be nil
    if(url == nil) {
        return;
    }
    NSURLRequest *request = [[NSURLRequest alloc] initWithURL:[[NSURL alloc] initWithString:url]];
    
    [self makeAsynchronousRequest:type request:request success:success failure:failure];
}

- (void) makeAsynchronousRequest:(MNORequestType)type
                         request:(NSURLRequest *)request
                         success:(void(^)(MNOResponse *response))success
                         failure:(void(^)(MNOResponse *response, NSError *error))failure {
    
    // Make async request
    AFHTTPRequestOperation *op = [self makeRequest:type request:request success:^(AFHTTPRequestOperation *operation, id responseObject) {
        NSURLRequest *openAMRequest = [MNOOpenAMAuthenticationManager authenticateIfRequired:operation];
        MNOResponse *mnoResponse = [self convertResponse:operation];
        
        [self cacheResponse:mnoResponse];
        
        if(success && !openAMRequest) {
            success(mnoResponse);
        } else if (openAMRequest) {
            [self makeAsynchronousRequest:type request:openAMRequest success:success failure:failure];
        }
        
    } failure:^(AFHTTPRequestOperation *operation, NSError *error) {
        NSLog(@"Failure during retrieval!  Message: %@.", error);
        NSURLRequest *openAMRequest = [MNOOpenAMAuthenticationManager authenticateIfRequired:operation];
        
        // Display an error if necessary
        if(!openAMRequest) {
            // Get the referer header if you can
            NSDictionary *headers = [[operation request] allHTTPHeaderFields];
            NSString *referer = nil;
            
            for(NSString *headerKey in [headers allKeys]) {
                if([headerKey caseInsensitiveCompare:@"referer"] == NSOrderedSame) {
                    referer = [headers objectForKey:headerKey];
                }
            }
            
            // --------- Commenting this out for now -- it's far too noisy
            // If we have a referer and this is a failure, that means this could have been done with a UIWebView
            //if(referer != nil) {
                // Try to find the webview
                //UIWebView *errorView = [[MNOWidgetManager sharedManager] widgetWithUrl:referer];
                
                // If it exists, set its error flag
                //if(errorView != nil) {
                //    [errorView displayErrorIfApplicable];
                //}
            //}
        }
        
        if(failure && !openAMRequest) {
            failure([self convertResponse:operation], error);
        } else if (openAMRequest) {
            [self makeAsynchronousRequest:type request:openAMRequest success:success failure:failure];
        }
    }];
    [_opQueue addOperation:op];
}

- (id)makeSynchronousRequest:(MNORequestType)type
                         url:(NSString *)url {
    // URL must not be nil
    if(url == nil) {
        return nil;
    }
    NSURLRequest *request = [[NSURLRequest alloc] initWithURL:[[NSURL alloc] initWithString:url]];
    
    return [self makeSynchronousRequest:type request:request];
}

- (id) makeSynchronousRequest:(MNORequestType)type
                      request:(NSURLRequest *)request {
    // Finished boolean
    __block BOOL finished = FALSE;
    id finalResponse = nil;
    
    // Signal in either success or failure blocks if there is an issue
    AFHTTPRequestOperation *op = [self makeRequest:type request:request success:^(AFHTTPRequestOperation *operation, id responseObject) {
        [self cacheResponse:[self convertResponse:operation]];
        
        finished = TRUE;
    } failure:^(AFHTTPRequestOperation *operation, NSError *error) {
        NSLog(@"Failure during retrieval!  Message: %@.", error);
        
        finished = TRUE;
    }];
    
    // Add to the operation queue
    [_opQueue addOperation:op];
    
    // Busy wait with a run loop to ensure that the background processes continue to run
    dispatch_sync(_syncRequestQueue, ^{
        while([op isFinished] == false);
    });
    //[[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate date]];
    
    if(op.error) {
        NSLog(@"Error during request.  Message: %@.", op.error);
    }
    
    finalResponse = op.responseObject;
    
    id openAMResponse = [self openAMResponse:op];
    
    if (openAMResponse) {
        // Since we got a response back from the OpenAM security provider
        // let's replace the previous response with what we got back from OpenAM
        finalResponse = openAMResponse;
    }
    
    return finalResponse;
}

#pragma mark - private methods

- (id)openAMResponse:(AFHTTPRequestOperation *)operation {
    NSURLRequest *forwardRequest = [MNOOpenAMAuthenticationManager authenticateIfRequired:[[operation request] URL] withResponse:operation.responseData];
    id response = nil;
    
    if (forwardRequest) {
        // Since this failed the first time let's issue the request again as if it is an OpenAM security provider
        response = [self makeSynchronousRequest:REQUEST_RAW request:forwardRequest];
    }
    
    return response;
}

- (AFHTTPRequestOperation *) makeRequest:(MNORequestType)type
                                 request:(NSURLRequest *)request
                                 success:(void(^)(AFHTTPRequestOperation *operation, id responseObject))success
                                 failure:(void(^)(AFHTTPRequestOperation *operation, NSError *error))failure {
    NSMutableURLRequest *requestCopy = [request mutableCopy];
    
    // Add the header that states we've gone through the MNOHttpStack
    [requestCopy setValue:@"" forHTTPHeaderField:MONO_NETWORK_AUTH_WRAP];
    
    // Make a new AFHTTPRequestOperation
    AFHTTPRequestOperation *op = [[AFHTTPRequestOperation alloc] initWithRequest:requestCopy];
    [op setCompletionBlockWithSuccess:success failure:failure];
    
    // Set the serializer according to the type
    if (type == REQUEST_JSON) {
        op.responseSerializer = [AFJSONResponseSerializer serializer];
    }
    else if (type == REQUEST_IMAGE) {
        op.responseSerializer = [AFImageResponseSerializer serializer];
    }
    else if (type == REQUEST_RAW) {
        op.responseSerializer = [AFHTTPResponseSerializer serializer];
    }
    
    if(_credential != nil) {
        [op setCredential:_credential];
    }
    [op setSecurityPolicy:_secPolicy];
    [op setWillSendRequestForAuthenticationChallengeBlock:^(NSURLConnection *connection, NSURLAuthenticationChallenge *challenge) {
        if(_credential != nil) {
            [[challenge sender] useCredential:_credential forAuthenticationChallenge:challenge];
        }
        else {
            [[challenge sender] continueWithoutCredentialForAuthenticationChallenge:challenge];
        }
    }];
    
    return op;
}

- (void) cacheResponse:(MNOResponse *)response {
    NSMutableURLRequest *redirectableRequest = [response.rawRequest mutableCopy];
    // We need to remove our header so we know to handle this request and cache it.
    // There are 3 requests in flight: the outside request, which we handled, the internal request,
    // which we marked with our header, and the redirectableRequest, which we're modifying here.
    // The redirectable request will cause a new outside request from the NSURLProtocolClient, which
    // must not be marked with our header.
    [redirectableRequest setValue:nil forHTTPHeaderField:MONO_NETWORK_CACHE_WRAP];
    
    NSString *cachePath = [self cachePathForRequest:response.rawRequest];
    RNCachedData *cache = [RNCachedData new];
    [cache setResponse:response.rawResponse];
    [cache setData:response.responseData];
    //[cache setRedirectRequest:redirectableRequest];
    [NSKeyedArchiver archiveRootObject:cache toFile:cachePath];
}

- (NSString *)cachePathForRequest:(NSURLRequest *)aRequest
{
    // This stores in the Caches directory, which can be deleted when space is low, but we only use it for offline access
    NSString *cachesPath = [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) lastObject];
    return [cachesPath stringByAppendingPathComponent:[NSString stringWithFormat:@"%lx", (unsigned long)[[[aRequest URL] absoluteString] hash]]];
}

- (MNOResponse *) convertResponse:(AFHTTPRequestOperation *)operation {
    // Convert the AFHTTPRequestOperation to our custom MNOResponse
    NSDictionary *headers = [operation.response allHeaderFields];
    MNOResponse *response = [[MNOResponse alloc] init];
    
    for(NSString *headerKey in [headers allKeys]) {
        if ([headerKey caseInsensitiveCompare:@"content-type"] == NSOrderedSame) {
            response.contentType = [headers objectForKey:headerKey];
        }
        
        if ([headerKey caseInsensitiveCompare:@"etag"] == NSOrderedSame) {
            response.etag = [headers objectForKey:headerKey];
        }
    }
    
    response.rawRequest = operation.request;
    response.rawResponse = operation.response;
    response.headers = headers;
    response.responseObject = operation.responseObject;
    response.responseData = operation.responseData;
    
    return response;
}

- (void) setMaxConcurrentThreads:(NSUInteger)threads {
    [_opQueue setMaxConcurrentOperationCount:threads];
}

@end
