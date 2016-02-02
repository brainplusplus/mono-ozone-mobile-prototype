//
//  UIWebView+OzoneWebView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/11/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <objc/runtime.h>

#import "UIWebView+OzoneWebView.h"

#import "NSString+MNOAdditions.h"

#import "MNOAccelerometerManager.h"
#import "MNOBatteryManager.h"
#import "MNOChromeDrawer.h"
#import "MNOLocationManager.h"
#import "MNOReachabilityManager.h"
#import "MNOSubscriber.h"
#import "MNOWidget.h"
#import "MNOWidgetManager.h"

#define MONO_WIDGET_QUERY_STRING @"?mobile=true&usePrefix=false"

// For the associated object instance ID and widget GUID
static void *instanceIdKey = &instanceIdKey;
static void *widgetGuidKey = &widgetGuidKey;
static void *widgetUrlKey = &widgetUrlKey;
static void *errorFlagKey = &errorFlagKey;

@interface UIWebView (OzoneWebViewPrivate)

@property (nonatomic, strong) NSNumber *errorFlag;

@end

@implementation UIWebView (OzoneWebView)

#pragma mark public methods

// Init and make an arbitrary instance ID
-(void)initPropertiesWithURL:(NSString *)url widgetId:(NSString *)widgetId
{
    NSString *instanceId = nil;
    if(self.instanceId == nil)
    {
        instanceId = [[[[NSUUID alloc] init] UUIDString] lowercaseString];
    }
    
    [self initPropertiesWithURL:url widgetId:widgetId instanceId:instanceId];
}

// Use a specific instance ID
-(void)initPropertiesWithURL:(NSString *)url widgetId:(NSString *)widgetId instanceId:(NSString *)instanceId
{
    NSURL *widgetBaseUrl = [[NSURL alloc] initWithString:[MNOAccountManager sharedManager].widgetBaseUrl];
    NSString *rpcRelayString = [[[NSURL alloc] initWithString:@"/owf/js/eventing/rpc_relay.uncompressed.html" relativeToURL:widgetBaseUrl] absoluteString];
    NSString *prefLocation = [[[NSURL alloc] initWithString:@"/owf/prefs" relativeToURL:widgetBaseUrl] absoluteString];
    
    // If it's already set, don't set it again
    if(self.instanceId == nil) {
        [self setInstanceId:instanceId];
        [self setWidgetGuid:widgetId];
        [[MNOWidgetManager sharedManager] registerWidget:self withInstanceId:instanceId];
    }
    
    NSDictionary *windowConfig =
    @{
      @"containerVersion"   : @"7.1.0-GA",
      @"webContextPath"     : @"/owf",
      @"locked"             : @false,
      @"version"            : @1,
      @"id"                 : self.instanceId,
      @"url"                : url,
      @"layout"             : @"tabbed",
      @"owf"                : @true,
      @"currentTheme"       : @{ @"themeName"  : @"a_default", @"themeContrast" : @"standard", @"themeFontSize" : @12 },
      @"guid"               : widgetId,
      @"lang"               : @"en_US",
      @"relayUrl"           : rpcRelayString,
      @"preferenceLocation" : prefLocation
      };
    NSString *windowConfigJSONString = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:windowConfig options:0 error:nil]
                                                             encoding:NSUTF8StringEncoding];
    
    [self stringByEvaluatingJavaScriptFromString:[NSString stringWithFormat:@"window.name=JSON.stringify(%@)", windowConfigJSONString]];
    
    self.widgetUrl = [[self formatOzoneRequest:url].URL absoluteString];
}


- (NSURLRequest *) formatOzoneRequest:(NSString *)urlStr
{
    NSURL *serverBaseUrl = [[NSURL alloc] initWithString:[MNOAccountManager sharedManager].serverBaseUrl];

    //format string (relative refernce)
    urlStr = [urlStr stringByReplacingOccurrencesOfString:@".." withString:@""];
    if (![urlStr hasPrefix:@"https:"] && ![urlStr hasPrefix:@"http:"]) {
        urlStr = [[[NSURL alloc] initWithString:urlStr relativeToURL:serverBaseUrl] absoluteString];
    }
    
    //make sure its mobilized
    NSLog(@"%@",[[urlStr pathComponents] lastObject]);
    
    urlStr = [urlStr stringByAppendingString:MONO_WIDGET_QUERY_STRING];
    
    NSURLRequest * request = [NSURLRequest requestWithURL:[NSURL URLWithString:urlStr]];
    
    return request;
}

- (void) notifySubscriber:(MNOSubscriber *)sub withSender:(NSString *)sender message:(NSString *)message
{
    NSString * result = [NSString stringWithFormat:@"Mono.Callbacks.Callback('%@', '%@', \"%@\");",sub.function,sender, [message mno_escapeJson]];
    NSLog(@"%@",result);
    
    //run in main thread
    dispatch_async(dispatch_get_main_queue(), ^{
        //Your code goes in here
        [self stringByEvaluatingJavaScriptFromString:result];

    });
}

- (void) notifyStartActivity:(MNOIntentWrapper *)receiver fromSender:(MNOIntentWrapper *)sender
{
    NSString * intent = nil;
    
    if(sender.action && sender.dataType){
        NSError * error;
        NSData * temp = [NSJSONSerialization dataWithJSONObject:@{@"action":sender.action,@"dataType":sender.dataType}
                                                        options:0
                                                          error:&error];
        
        intent = [[NSString alloc] initWithData:temp encoding:NSUTF8StringEncoding];
    }
    
    NSDictionary *instanceIdJson = @{@"id": receiver.instanceId};
    NSString *instanceIdJsonString = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:instanceIdJson options:0 error:nil]
                                                           encoding:NSUTF8StringEncoding];
    
    NSArray *jsonArg =
    @[@{@"id": instanceIdJsonString, @"isReady": @false, @"callbacks": @{}}];
    
    NSString *argToHandler = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:jsonArg options:0 error:nil]
                                                   encoding:NSUTF8StringEncoding];
    
    //TODO: Error Checking
    NSString * result = [NSString stringWithFormat:@"Mono.Callbacks.Callback('%@', %@);",sender.function, argToHandler];
  
    NSLog(@"%@",result);
    
    //run in main thread
    dispatch_async(dispatch_get_main_queue(), ^{
        //Your code goes in here
        [self stringByEvaluatingJavaScriptFromString:result];
        
    });
}

- (void) notifyReciever:(MNOIntentWrapper *)receiver fromSender:(MNOIntentWrapper *)sender
{
    NSString * intent = nil;
    
    if(sender.action && sender.dataType){
        NSError * error;
        NSData * temp = [NSJSONSerialization dataWithJSONObject:@{@"action":sender.action,@"dataType":sender.dataType}
                                                        options:0
                                                          error:&error];
        
        intent = [[NSString alloc] initWithData:temp encoding:NSUTF8StringEncoding];
    }
    
    NSDictionary *instanceIdJson = @{@"id": sender.instanceId};
    NSString *instanceIdJsonString = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:instanceIdJson options:0 error:nil]
                                                           encoding:NSUTF8StringEncoding];
    
    //TODO: Error Checking
    NSString * result = [NSString stringWithFormat:@"Mono.Callbacks.Callback('%@', %@, %@, %@);",receiver.function, instanceIdJsonString, intent, sender.data];
  
    NSLog(@"%@",result);
    
    //run in main thread
    dispatch_async(dispatch_get_main_queue(), ^{
        //Your code goes in here
        [self stringByEvaluatingJavaScriptFromString:result];
        
    });
}

// Overloaded to make sure this cleans up after itself when it's done
- (void) willMoveToSuperview:(UIView *)newSuperview
{
    NSLog(@"Cleaning up UI web views.");
    // We have been removed
    if(newSuperview == nil)
    {
        [self cleanup];
    }
}

- (BOOL) hasChromeDrawer {
    if ([[self subviews] count] == 2) {
        return NO;
    }
    
    return YES;
}

- (void) displayErrorIfApplicable {
    // If the flag is false, display an error
    
    @synchronized(self.errorFlag) {
        // TODO: Determine if this view is visible
        if([self.errorFlag boolValue] == FALSE && [self isHidden] == FALSE) {
            [[MNOUtil sharedInstance] showMessageBox:@"Error loading resources." message:@"Page may not render correctly. Please check the log for details."];
            
            // Make sure it can only display once
            [self setErrorFlag:@true];
        }
    }
}

#pragma mark - private methods

- (void) cleanup
{
    NSString *instanceId = [self instanceId];
    
    if(instanceId != nil)
    {
        // Remove from widget manager, reachability manager
        [[MNOWidgetManager sharedManager] unregisterWidget:instanceId];
        [[MNOReachabilityManager sharedInstance] unregister:instanceId];
        [[MNOAccelerometerManager sharedInstance] unregisterWidget:instanceId];
        [[MNOLocationManager sharedInstance] unregisterWidget:instanceId];
        [[MNOBatteryManager sharedInstance] unregisterWidget:instanceId];
        
        [self setInstanceId:nil];
        [self setWidgetGuid:nil];
    }
}

#pragma mark - properties

// Using associated objects here -- can't make new instance variables in a category
- (NSString *)instanceId
{
    NSString *assocObj = objc_getAssociatedObject(self, &instanceIdKey);
    
    if(assocObj == nil)
    {
        return nil;
    }
    
    return assocObj;
}

- (void)setInstanceId:(NSString *)instanceId
{
    objc_setAssociatedObject(self, &instanceIdKey, instanceId, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

- (NSString *)widgetGuid
{
    NSString *assocObj = objc_getAssociatedObject(self, &widgetGuidKey);
    
    if(assocObj == nil)
    {
        return nil;
    }
    
    return assocObj;
}

- (void)setWidgetGuid:(NSString *)widgetGuid
{
    objc_setAssociatedObject(self, &widgetGuidKey, widgetGuid, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

- (NSString *)widgetUrl
{
    NSString *assocObj = objc_getAssociatedObject(self, &widgetUrlKey);
    
    if(assocObj == nil)
    {
        return nil;
    }
    
    return assocObj;
}

- (void)setWidgetUrl:(NSString *)widgetUrl
{
    objc_setAssociatedObject(self, &widgetUrlKey, widgetUrl, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

- (NSNumber *)errorFlag
{
    NSNumber *assocObj = objc_getAssociatedObject(self, &errorFlagKey);
    
    if(assocObj == nil) {
        assocObj = @false;
        [self setErrorFlag:assocObj];
    }
    
    return assocObj;
}

- (void)setErrorFlag:(NSNumber *)errorFlag
{
    objc_setAssociatedObject(self, &errorFlagKey, errorFlag, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

- (MNOChromeDrawer *) chromeDrawer {
    // Create the proper scroll view if we need to
    MNOChromeDrawer *chromeDrawer;

    if ([[self subviews] count] == 2) {
        // No chrome buttons here -- let's make the drawer
        chromeDrawer = [[MNOChromeDrawer alloc] initWithWebView:self];

        // Add the chrome buttons to the web view
        [self addSubview:chromeDrawer];

        // Defaults to closed
        [chromeDrawer closeChromeDrawer];
    }
    else {
        chromeDrawer = (MNOChromeDrawer *)[[self subviews] objectAtIndex:2];
    }

    return chromeDrawer;
}

@end
