//
//  AggressiveCacheDelegate.m
//  Mono2
//
//  Created by Ben Scazzero on 4/28/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAggressiveCacheDelegateTest.h"
#import "MNOAggressiveCache.h"
#import "MNOAggressiveCacheDelegate.h"

@implementation MNOAggressiveCacheDelegateTest
{
    // Monitor the delegate
    int willStart;
    int didStart;
    int didComplete;
    int didFail;
    
    unsigned long remainingComponents;
    
    BOOL intermError;
    void(^callback)(BOOL success);
}

- (void) startAggressiveCache:(void(^)(BOOL success))mycallback
{
    callback = mycallback;
    MNOAggressiveCache * cache = [[MNOAggressiveCache alloc] init];
    cache.delegate = self;

    intermError = NO;
    [cache store];
}

- (void) willStartDownloadingContentsForWidget:(NSString*)widgetName
{
    willStart++;
}

- (void) didStartDownloadingContentsForWidget:(NSString *)widgetName
{
    //Started the widget download
    didStart++;
}

- (void) totalComponents:(NSUInteger)total forWidget:(NSString *)widgetName
{

}

- (void) downloadedComponents:(NSUInteger)complete invalidComponents:(NSUInteger)invalid remainingComponents:(NSUInteger)remaining forWidget:(NSString *)widgetName
{
    remainingComponents = remaining;
}

- (void) didFailToDownload:(NSString*)widgetName
{
    if (remainingComponents!=0)
        intermError = YES;
    
    didFail++;
}

- (void) didCompleteDownloadForWidget:(NSString*)widgetName
{
    if (remainingComponents!=0)
        intermError = YES;
    
    didComplete++;
}

- (void) didFinishCaching
{
    BOOL success = YES;
    NSArray * defaultWidgets = [MNOAccountManager sharedManager].defaultWidgets;
    
    if (! ((willStart == didStart) && (willStart == [defaultWidgets count])) )
        success = NO;
    
    if (! ((didFail+didComplete) == [defaultWidgets count]) )
        success = NO;
    
    if (didComplete != 1)
        success = NO;
    
    if (intermError)
        success = NO;
    
    // notify via callback
    callback(success);
}

@end
