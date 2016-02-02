//
//  ReachabilityManager.m
//  foo
//
//  Created by Ben Scazzero on 1/15/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOReachabilityManager.h"

#import "MNOAPIResponse.h"
#import "MNOWidgetManager.h"

#import "AFNetworkReachabilityManager.h"

#define JSONError @"ReachabilityManager: Unable to Serialize Dictionary Result: %@"
#define setupError @"ReachabilityManager: Unable to Setup Callback"

@implementation MNOReachabilityManager {
    // Private list of widgets for the reachability manager
    NSMutableDictionary *_widgets;
    
    // The block to use for status changes
    void (^_statusChangeBlock)(AFNetworkReachabilityStatus status);
    
    // Only to be used for tests
    id _reachabilityManagerMock;
}

#pragma mark constructors

- (id) init {
    self = [super init];
    if (self) {
        // Make sure the widgets directory is allocated
        _widgets = [NSMutableDictionary new];
        
        __weak NSMutableDictionary *weakWidgets = _widgets;
        __weak MNOReachabilityManager *weakSelf = self;
        
        _statusChangeBlock = ^(AFNetworkReachabilityStatus status) {
            NSMutableDictionary *strongWidgets = weakWidgets;
            // - active info
            //For all widgets on this dashboard, send updates for those who registered
            for (NSString * instanceId in strongWidgets) {
                
                UIWebView * webview = [[MNOWidgetManager sharedManager] widgetWithInstanceId:instanceId];
                NSString * callback = [strongWidgets objectForKey:instanceId];
                
                if (webview != nil && callback != nil) {
                    [weakSelf sendStatusToWebView:status callback:callback webView:webview];
                }
            }
        };
        
        [[self getReachabilityManager] setReachabilityStatusChangeBlock:_statusChangeBlock];
        
        [[self getReachabilityManager] startMonitoring];
    }
    return self;
}

#pragma mark - public methods

+ (MNOReachabilityManager *) sharedInstance
{
    static MNOReachabilityManager * sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

- (BOOL) isOnline {
    return [self getReachabilityManager].reachable;
}

- (void)registerCallback:(NSString *)instanceId withJSAction:(NSString *)callback {
    [_widgets setObject:callback forKey:instanceId];
    UIWebView * webview = [[MNOWidgetManager sharedManager] widgetWithInstanceId:instanceId];
    AFNetworkReachabilityStatus status = [[self getReachabilityManager] networkReachabilityStatus];
    
    if (webview != nil && callback != nil) {
        [self sendStatusToWebView:status callback:callback webView:webview];
    }
}

- (void) unregister:(NSString *)instanceId {
    [_widgets removeObjectForKey:instanceId];
}

#pragma mark - private methods

- (AFNetworkReachabilityManager *)getReachabilityManager {
    if(_reachabilityManagerMock == nil) {
        return [AFNetworkReachabilityManager sharedManager];
    }
    
    return _reachabilityManagerMock;
}

- (void(^)(AFNetworkReachabilityStatus status)) getBlock {
    return _statusChangeBlock;
}

- (void)useThisReachabilityManager:(id)reachabilityManager {
    _reachabilityManagerMock = reachabilityManager;
}

- (void)sendStatusToWebView:(AFNetworkReachabilityStatus)status callback:(NSString *)callback webView:(UIWebView *)webView {
    BOOL isOnline = status != AFNetworkReachabilityStatusNotReachable && status != AFNetworkReachabilityStatusUnknown;
    MNOAPIResponse *response = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS
                                                           additional:@{@"isOnline": [[NSNumber alloc] initWithBool:isOnline]}];
    NSString *responseString = [response getAsString];
    
    NSString * outcome = [NSString stringWithFormat:@"%@('%@', %@);", monoCallbackName, callback, responseString];
    if ([[NSThread currentThread] isMainThread]) {
        [webView stringByEvaluatingJavaScriptFromString:outcome];
    } else {
        dispatch_sync(dispatch_get_main_queue(), ^{
            [webView stringByEvaluatingJavaScriptFromString:outcome];
        });
    }
}

@end
