//
// Created by Michael Schreiber on 4/17/14.
// Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "CacheUtils.h"
#import "MNOCacheProcessor.h"


@implementation CacheUtils

+(MNOCacheProcessor *) getCacheProcessor {
    MNOCacheProcessor *cacheProcessor = [[MNOCacheProcessor alloc] init];
    return cacheProcessor;
}

+(NSDictionary *) defaultParams {
    // Make the web view
    UIWebView *webView = [[UIWebView alloc] init];

    NSString *saveUrl = @"http://www.42six.com";
    NSString *retrieveUrl = @"http://www.42six.com";
    NSString *cacheType = @"WRITE_THROUGH";
    NSNumber *timeOut = [NSNumber numberWithInt:200];
    NSNumber *expirationInMinutes = [NSNumber numberWithInt:86400];

    NSDictionary *testParams = @{
            @"backingStore" : @{
                    @"saveUrl": saveUrl,
                    @"retrieveUrl" : retrieveUrl
            },
            @"cacheType": cacheType,
            @"timeOut": timeOut,
            @"expirationInMinutes": expirationInMinutes
    };

    NSDictionary *defaultParams = @{
        @"webView" : webView,
        @"testParams" : testParams
    };

    return defaultParams;
}

+(MNOAPIResponse *) initCache:(NSDictionary *) params {
    NSDictionary *defaultParams = [self defaultParams];

    MNOCacheProcessor *cacheProcessor = [params objectForKey:@"cacheProcessor"] != nil ? [params objectForKey:@"cacheProcessor"] : [self getCacheProcessor];
    UIWebView *webView = [params objectForKey:@"webView"] != nil ? [params objectForKey:@"webView"] : [defaultParams objectForKey:@"webView"];
    NSDictionary *testParams = [params objectForKey:@"testParams"] != nil ? [params objectForKey:@"testParams"] : [defaultParams objectForKey:@"testParams"];

    return [cacheProcessor process:@"init" params:testParams url:nil webView:webView];
}
@end