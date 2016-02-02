//
//  UIWebView+OzoneWebView.h
//  Mono2
//
//  Created by Ben Scazzero on 3/11/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

#import "MNOChromeDrawer.h"

@class MNOWidget;
@class MNOSubscriber;
@class MNOIntentSubscriber;

@interface UIWebView (OzoneWebView)

#pragma mark properties

/**
 * The instance guid associated with this web view.
 **/
@property (nonatomic, strong) NSString *instanceId;

/**
 * The widget guid associated with this web view.
 **/
@property (nonatomic, strong) NSString *widgetGuid;

/**
 * The widget URL loaded after initialization.
 **/
@property (nonatomic, strong) NSString *widgetUrl;

/** 
 * The chrome drawer for this webview.
 **/    
@property (nonatomic, readonly, strong) MNOChromeDrawer *chromeDrawer;

#pragma mark - public methods

/**
 * Initializes an existing web view with a widgetId and URL.
 * @param url The Url to initialize with.
 * @param widgetId The identifier for the widget.
 **/
-(void)initPropertiesWithURL:(NSString *)url widgetId:(NSString *)widgetId;

/**
 * Initializes an existing web view with a widgetId and URL.
 * @param url The Url to initialize with.
 * @param widgetId The identifier for the widget.
 * @param instanceId The identifier for the instance.
 **/
-(void)initPropertiesWithURL:(NSString *)url widgetId:(NSString *)widgetId instanceId:(NSString *)instanceId;

/**
 * Generates an NSURLRequest designed to be intercepted by our interception layer.
 * @param urlStr The URL string to use -- modifies it as necessary to be intercepted properly.
 * @return An NSURLRequest generated from the supplied urlStr;
 **/
- (NSURLRequest *) formatOzoneRequest:(NSString *)urlStr;

/**
 * Publish subscribe functionality -- used for notifying a subscriber of a published message.
 * @param sub A subscriber to a channel.
 * @param instanceId The instance ID of the sender.
 * @param message The message being sent.
 **/
- (void) notifySubscriber:(MNOSubscriber *)sub withSender:(NSString *)sender message:(NSString *)message;

/**
 * Intent functionality -- used for notifying an intent start activity handler of a published intent.
 * @param receiver The receiver of the start activity event.
 * @param sender The sender of the start activity event.
 **/
- (void) notifyStartActivity:(MNOIntentWrapper *)receiver fromSender:(MNOIntentWrapper *)sender;

/**
 * Intent functionality -- used for notifying an intent receiver of a published intent.
 * @param receiver The receiver for the intent.
 * @param sender The sender of the intent message.
 **/
- (void) notifyReciever:(MNOIntentWrapper *)receiver fromSender:(MNOIntentWrapper *)sender;

/**
 * Returns true if there is currently a chrome drawer present in this web view, false otherwise.
 **/
- (BOOL) hasChromeDrawer;

/**
 * Displays an error message if it can be displayed.  Will only display once.
 **/
- (void) displayErrorIfApplicable;

@end
