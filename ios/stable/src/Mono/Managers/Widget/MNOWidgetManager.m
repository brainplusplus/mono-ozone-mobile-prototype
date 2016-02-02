//
//  WebViewManager.m
//  foo
//
//  Created by Ben Scazzero on 12/30/13.
//  Copyright (c) 2013 42Six, a CSC company. All rights reserved.
//

#import "MNOWidgetManager.h"

@implementation MNOWidgetManager
{
    NSMutableDictionary *_master;
}

#pragma constructors

-(id)init
{
    self = [super init];
    if (self) {
        //init
      
    }
    return self;
}

#pragma public methods

// Singleton instance
+(MNOWidgetManager *) sharedManager
{
    static MNOWidgetManager * sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

// Registers the webView to our local master dictioanry
- (void) registerWidget:(UIWebView *)widget withInstanceId:(NSString *)instanceId
{
    if (_master == nil) {
        _master = [[NSMutableDictionary alloc] init];
    }
    
    // Synchronize to make sure we don't clobber the dictionary when inserting/removing
    @synchronized(self)
    {
        [_master setObject:widget forKey:instanceId];
    }
    
}

// Removes the instance ID from our local master dictionary
- (void) unregisterWidget:(NSString *)instanceId
{
    if (_master == nil)
    {
        return;
    }
    
    // Synchronize to make sure we don't clobber the dictionary when inserting/removing
    @synchronized(self)
    {
        [_master removeObjectForKey:instanceId];
    }
}

// Returns the webView with the corresponding instanceId
- (UIWebView *) widgetWithInstanceId:(NSString *)instanceId
{
    if (_master != nil) {
        UIWebView * widget = [_master objectForKey:instanceId];
        return widget;
    }
    return nil;
}

// Returns the webView with the corresponding URL
- (UIWebView *) widgetWithUrl:(NSString *)url {
    for(UIWebView *webView in self.allWebViews) {
        if([webView.widgetUrl isEqualToString:url]) {
            return webView;
        }
    }
    
    return nil;
}

- (NSArray *) allWebViews {
    if(_master != nil) {
        return [_master allValues];
    }
    return nil;
}

@end
