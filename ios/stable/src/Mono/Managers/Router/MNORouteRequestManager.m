//
//  MNORequestRouter.m
//  Mono
//
//  Created by Ben Scazzero on 1/2/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNORouteRequestManager.h"
#import "MNOAPITypeAndMethod.h"
#import "MNOWidgetManager.h"
#import "MNOLocationManager.h"
#import "MNOAccelerometerManager.h"
#import "MNOBatteryManager.h"

// processors
#import "MNOAccelerometerProcessor.h"
#import "MNOAPIProcessor.h"
#import "MNOBatteryProcessor.h"
#import "MNOCacheProcessor.h"
#import "MNOConnectivityProcessor.h"
#import "MNOHeaderBarProcessor.h"
#import "MNOIntentsProcessor.h"
#import "MNOLocationProcessor.h"
#import "MNOMapCacheProcessor.h"
#import "MNOModalProcessor.h"
#import "MNONotificationProcessor.h"
#import "MNOPersistentStorageProcessor.h"
#import "MNOPublishSubscribeProcessor.h"


#define MONO_DOMAIN @"ozone.gov"

// API calls
#define API_ACCELEROMETER @"accelerometer"
#define API_BATTERY @"battery"
#define API_CACHE @"caching"
#define API_CONNECTIVITY @"connectivity"
#define API_HEADERBAR @"headerbar"
#define API_INTENTS @"intents"
#define API_LOCATION @"location"
#define API_MAPCACHE @"mapcache"
#define API_MODALS @"modals"
#define API_NOTIFICATION @"notifications"
#define API_PUBSUB @"pubsub"
#define API_STORAGE_PERSISTENT @"storage/persistent"
#define API_STORAGE_TRANSIENT @"storage/transient"

//storage
#define diskRequest @"persistent"
#define memoryRequest @"transient"
#define store @"store"
#define delete @"delete"
#define update @"update"
#define retrieve @"retrieve"

//modal
#define modalYesNo @"yesNo"
#define modalMessage @"message"
#define messageID @"message"
#define titleId @"title"

//internet
#define connectionIsOnline @"isOnline"
#define connectionRegister @"register"

// pubsub

@implementation MNORouteRequestManager {
    // Private widget manager
    MNOWidgetManager *_widgetManager;
}

#pragma mark public methods

+ (MNORouteRequestManager *)sharedInstance {
    static MNORouteRequestManager *sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });

    return sharedManager;
}

/**
 * Returns true if the URL can be routed.
 * @return True if the URL can be routed, false otherwise.
 **/
+ (BOOL) canRoute:(NSURLRequest *)request {
    // Parse out the request API type
    NSURL *url = [request URL];
    NSString *host = [url host];

    // If the host is nil, we can't continue
    if(host == nil) {
        return FALSE;
    }

    NSMutableArray *pathComponents = [[NSMutableArray alloc] initWithArray:[url pathComponents]];
    [pathComponents insertObject:host atIndex:0];

    // Make sure errant slashes are removed
    [pathComponents removeObject:@"/"];
    
    NSUInteger arraySize = [pathComponents count];
    
    for(int i=0; i<arraySize; i++) {
        if([(NSString *)[pathComponents objectAtIndex:i] isEqualToString:MONO_DOMAIN] == TRUE) {
            return YES;
        }
    }

    return NO;
}

/**
 * See declaration in MNORouteRequestManager.h
 */
- (NSData *)routeRequest:(NSURLRequest *)request {
    NSDictionary *params = [self  extractParamsFromRequest:request];
    NSData *response = nil;

    // Parse the API type and method
    MNOAPITypeAndMethod *apiTypeAndMethod = [self parseAPICall:request];
    
    // This spot for a processor
    NSObject<MNOAPIProcessor> *apiProcessor = nil;
    
    // No API type to speak of, so just return
    if(apiTypeAndMethod == nil) {
        // Do nothing, just skip this
    }
    // Accelerometer processing
    else if([apiTypeAndMethod.apiType isEqualToString:API_ACCELEROMETER]){
        apiProcessor = [[MNOAccelerometerProcessor alloc] init];
    }
    // Battery hardware api processing
    else if([apiTypeAndMethod.apiType isEqualToString:API_BATTERY]) {
        apiProcessor = [[MNOBatteryProcessor alloc] init];
    }
    // Cache store
    else if([apiTypeAndMethod.apiType isEqualToString:API_CACHE]) {
        apiProcessor = [[MNOCacheProcessor alloc] init];
    }
    // Connectivity processor
    else if([apiTypeAndMethod.apiType isEqualToString:API_CONNECTIVITY]) {
        apiProcessor = [[MNOConnectivityProcessor alloc] init];
    }
    // Chrome API processor
    else if([apiTypeAndMethod.apiType isEqualToString:API_HEADERBAR]) {
        apiProcessor = [[MNOHeaderBarProcessor alloc] init];
    }
    // Intent processing
    else if([apiTypeAndMethod.apiType isEqualToString:API_INTENTS]) {
        apiProcessor = [[MNOIntentsProcessor alloc] init];
    }
    // Location hardware api processing
    else if([apiTypeAndMethod.apiType isEqualToString:API_LOCATION]) {
        apiProcessor = [[MNOLocationProcessor alloc] init];
    }
    // Map cache processing
    else if([apiTypeAndMethod.apiType isEqualToString:API_MAPCACHE]) {
        apiProcessor = [[MNOMapCacheProcessor alloc] init];
    }
    // Notification api processing
    else if([apiTypeAndMethod.apiType isEqualToString:API_NOTIFICATION]) {
        apiProcessor = [[MNONotificationProcessor alloc] init];
    }
    // Publish/Subscribe processing
    else if([apiTypeAndMethod.apiType isEqualToString:API_PUBSUB]) {
        apiProcessor = [[MNOPublishSubscribeProcessor alloc] init];
    }
    // Persistent storage processing
    else if([apiTypeAndMethod.apiType isEqualToString:API_STORAGE_PERSISTENT]) {
        apiProcessor = [[MNOPersistentStorageProcessor alloc] init];
    }
    // Modal API processor
    else if([apiTypeAndMethod.apiType isEqualToString:API_MODALS]) {
        apiProcessor = [[MNOModalProcessor alloc] init];
    }
    
    // Process the action/method
    if(apiProcessor != nil) {
        NSString *instanceId = [params objectForKey:@"instanceId"];
        UIWebView *webView = [_widgetManager widgetWithInstanceId:instanceId];
        MNOAPIResponse *result;
        
        // If the api method is equal to map cache, we don't need a webview
        if(webView != nil || [apiTypeAndMethod.apiType isEqualToString:API_MAPCACHE]) {
            result = [apiProcessor process:apiTypeAndMethod.method params:params url:[request URL] webView:webView];
        }
        else {
            result = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Unable to associate a webview with this request."];
        }
     
        if(result.status == API_FAILURE) {
            NSLog(@"Error during API type: %@, and method: %@", apiTypeAndMethod.apiType, apiTypeAndMethod.method);
        }

        response = [result getAsData];
    }
    // No processor set, so allocate an empty response
    else {
        MNOAPIResponse *result = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"No processor defined for this yet."];
        response = [result getAsData];
    }

    return response;
}

#pragma mark - private methods

/**
 * A method that will take a URL request and return the API type that
 * was supplied and the method from that API to call.
 * @param request The URL request to parse from.
 * @return The appropriate API call and method filled into a struct, or an 
 * empty struct if nothing was found.
 **/
- (MNOAPITypeAndMethod *)parseAPICall:(NSURLRequest *) request {
    // Parse out the request API type
    NSURL *url = [request URL];
    NSString *host = [url host];
    NSMutableArray *pathComponents = [[NSMutableArray alloc] initWithArray:[url pathComponents]];
    [pathComponents insertObject:host atIndex:0];

    // Make sure errant slashes are removed
    [pathComponents removeObject:@"/"];
    
    NSUInteger arraySize = [pathComponents count];
    
    for(NSUInteger i=0; i<arraySize; i++) {
        if([(NSString *)[pathComponents objectAtIndex:i] caseInsensitiveCompare:MONO_DOMAIN] == NSOrderedSame) {
            NSUInteger nextElement = i + 1;
            
            if (nextElement < arraySize) {
                NSUInteger lastElement = arraySize - 1;
                
                // Make a range for the arguments after the domain until the end of the
                // path save for the last element, which is the method
                NSRange range = {nextElement, lastElement - i - 1};

                // Make sure we don't throw an exception and return the API type and method
                if(range.length > 0) {
                    NSString *apiType;
                    NSString *method;
                    
                    // Mapcache is weird -- we have to handle these separately
                    if([[pathComponents objectAtIndex:nextElement] isEqualToString:API_MAPCACHE]) {
                        apiType = API_MAPCACHE;
                        method = [pathComponents objectAtIndex:nextElement + 1];
                    }
                    // Otherwise, process normally
                    else {
                        apiType = [[[pathComponents subarrayWithRange:range] componentsJoinedByString:@"/"] lowercaseString];
                        method = [pathComponents objectAtIndex:lastElement];
                    }
                    
                    MNOAPITypeAndMethod *apiTypeAndMethod = [[MNOAPITypeAndMethod alloc] initWithTypeAndMethod:apiType method:method];
                    
                    return apiTypeAndMethod;
                }
            }
        }
    }

    // Found nothing, so return nil
    return nil;
}

- (NSDictionary *)extractParamsFromRequest:(NSURLRequest *)request {
    NSURL *url = request.URL;
    NSString *params = [url query];
    NSString *method = [request HTTPMethod];

    if ([method isEqualToString:@"POST"] || [method isEqualToString:@"PUT"]) {
        params = [[NSString alloc] initWithData:[request HTTPBody] encoding:NSUTF8StringEncoding];
    }

    NSMutableDictionary *kvPairs;
    
    params = [params stringByReplacingOccurrencesOfString:@"+" withString:@" "];
    params = [params stringByReplacingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
    
    NSArray *paramComponents = [params componentsSeparatedByString:@"&"];

    if (params.length > 0) {
        NSError *error = nil;
        kvPairs =
        [NSJSONSerialization JSONObjectWithData: [params dataUsingEncoding:NSUTF8StringEncoding]
                                                options: NSJSONReadingMutableContainers
                                                  error: &error];
        if (error || !kvPairs) {
            NSLog(@"Couldn't decode JSON, trying for standard get/value pairs.");
            kvPairs = [[NSMutableDictionary alloc] init];
            // Couldn't decode query string as JSON -- attempt to extract more conventional query variables
            int numComponents = (int)[paramComponents count];
            
            for(int i=0; i<numComponents; i++) {
                NSArray *thisParam = [[paramComponents objectAtIndex:i] componentsSeparatedByString:@"="];
                
                // We should have a key/value pair
                if([thisParam count] == 2) {
                    [kvPairs setValue:[thisParam objectAtIndex:1] forKey:[thisParam objectAtIndex:0]];
                }
            }
        }
    }

    return kvPairs;
}

#pragma mark - constructors

- (id)init {
    if (self = [super init]) {
        _widgetManager = [MNOWidgetManager sharedManager];
    }

    return self;
}

@end
