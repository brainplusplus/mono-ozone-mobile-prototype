//
//  WebViewManager.h
//  foo
//
//  Created by Ben Scazzero on 12/30/13.
//  Copyright (c) 2013 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>


@interface MNOWidgetManager : NSObject

#pragma public methods

/**
 * All widgets for this application will be managed by the WidgetManager. The WidgetManager adopts a singleton design pattern. All widgets are UIWebViews.
 * @return An object used to access, set, and modify the widgets in this application.
 */
+(MNOWidgetManager *) sharedManager;

/**
 * When a widget is added to a dashboard and loaded with a URL, it must be registered with the WidgetManager. This is typically done in the viewDidLoad method.
 * @param widget The UIWebView corresponding to the given instance ID.
 * @param instanceId The uniquie identifer for this widget.
 */
- (void) registerWidget:(UIWebView *)widget withInstanceId:(NSString *)instanceId;

/**
 * Unregisters a widget from the widget manager.
 * @param instanceId The instance ID to remove from the widget manager.
 **/
- (void) unregisterWidget:(NSString *)instanceId;

/**
 * Retrieves a UIWebView with identifier (instanceId).
 * @param instanceId The uniquie identifer for this widget instance.
 */
- (UIWebView *) widgetWithInstanceId:(NSString *)instanceId;

/**
 * Retrieves a UIWebView that is currently hosting the URL specified.
 * @param url The URL the look up a web view by.
 **/
- (UIWebView *) widgetWithUrl:(NSString *)url;

/**
 * Retrieves all web views currently registered to the manager.
 **/
- (NSArray *) allWebViews;

@end
