//
//  MNOChromeDrawer.h
//  Mono
//
//  Created by Michael Wilson on 5/6/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

#import "MNOChromeButton.h"

@interface MNOChromeDrawer : UIScrollView

#pragma mark constructors

/**
 * Initializes the chrome drawer with an attached WebView.
 * @param webView The WebView to associate with this drawer.
 **/
- (id) initWithWebView:(UIWebView *)webView;

#pragma mark - public methods

/**
 * Adds a button to the drawer.  Can take a label, image, or button type.
 * One of them must be populated, or else the button will not be created.
 * Label can be used in conjunction with image or iconType.
 * @param callbackId The identifier for the callback to execute
 * @param label The text to display for the button.
 * @param customIcon The image to display for the button.
 * @param defaultIconType One of the default icon types to display.
 **/
- (void) makeNewButton:(NSString *)callbackId label:(NSString *)label customIcon:(UIImage *)image defaultIconType:(MNOChromeButtonIcon)iconType;

/**
 * Resize based on the current size of the associated WebView.
 **/
- (void) resize;

/**
 * Opens the chrome drawer.
 **/
- (void) openChromeDrawer;

/**
 * Closes the chrome drawer.
 **/
- (void) closeChromeDrawer;

@end
