//
//  WebViewManager.h
//  foo
//
//  Created by Ben Scazzero on 12/30/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>


@interface WidgetManager : NSObject

@property (readonly, nonatomic) NSNumber * dashGuid;

/**
 All widgets for this application will be managed by the WidgetManager. The WidgetManager adopts a singleton design pattern. All widgets are UIWebViews.
 
 @return An object used to access, set, and modify the widgets in this application.
 */
+(WidgetManager *) sharedManager;

/**
 Returns the widgets currently being shown to the user.
 
 @return A set of UIWebViews.
 */
- (NSSet *) activeWidgets;

/**
 Notifies the WidgetManager the a widget (widgetGuid) belonging to a given dashboard (dashGuid) will be shown/visible to the user. This method is typically done in the viewWillAppear method
 
 @param widgetGuid
 The uniquie identifer for this widget.
 @param dashGuid
 The unique identifier for this dashboard
 */
- (void) setActiveWidget:(NSNumber *)widgetGuid onDashboard:(NSNumber *)dashGuid;

/**
 When a widget is added to a dashboard and loaded with a URL, it must be registered with the WidgetManager. This is typically done in the viewDidLoad method.

 @param widget
 The UIWebView corresponding to the given widgetGuid.
 @param widgetGuid
 The uniquie identifer for this widget.
 @param dashGuid
 The unique identifier for this dashboard
 */
- (void) registerWidget:(UIWebView *)widget withGuid:(NSNumber *)widgetGuid toDashboard:(NSNumber *)dashGuid;


/**
 Retrieves a UIWebView belonging to a given dashboard (dashGuid), with identifier (widgetGuid).
 
 @param dashGuid
 The unique identifier for this dashboard
 @param widgetGuid
 The uniquie identifer for this widget.
 */
- (UIWebView *) widgetInDashboard:(NSNumber *)dashGuid withGuid:(NSNumber *)widgetGuid;


@end
