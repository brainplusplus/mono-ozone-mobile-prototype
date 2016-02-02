//
//  MNOModalManager.h
//  foo
//
//  Created by Ben Scazzero on 1/8/14.
//  Copyright (c) 2014 42six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "SDCAlertView.h"

#import "MNOAPIResponse.h"

@interface MNOModalManager : NSObject<SDCAlertViewDelegate>

/**
 * Modals are shown and configured through the ModalManager. ModalManager adopts a singelton design pattern.
 *
 * @return ModalManager
 */
+(MNOModalManager *) sharedInstance;

/**
 * Shows a modal rendering the specified HTML string. The Ok button is used to dismiss the modal.
 *
 * @param title The title of modal
 * @param html The HTML string to be rendered in the modal.
 * @param params Additional info for the rendering of the modal.
 * @param webView The web view that has requested the launch of the modal.
 *
 * @return {'status':'success'} if processed correctly, otherwise {'status':'failure'}
 */
- (MNOAPIResponse *)showHtmlModalwithTitle:(NSString *)title
                                withHtml:(NSString *)html
                              withParams:(NSDictionary *)params
                             withWebView:(UIWebView *)webView;

/**
 * Shows a modal with a Title, Message, and Ok Button. The Ok button is used to dismiss the modal.
 *
 * @param title The title of modal
 * @param message The message of the modal.
 * @param params Additional info for the rendering of the modal.
 *
 * @return {'status':'success'} if processed correctly, otherwise {'status':'failure'}
 */
- (MNOAPIResponse *)showMessageModalwithTitle:(NSString *)title
                                withMessage:(NSString *)message
                                 withParams:(NSDictionary *)params;

/**
 * Shows a modal rendering the website at the specifed URL. The Ok button is used to dismiss the modal.
 *
 * @param title The title of modal
 * @param urlString The URL of the website to be rendered in the modal.
 * @param params Additional info for the rendering of the modal.
 * @param webView The web view that has requested the launch of the modal.
 *
 * @return {'status':'success'} if processed correctly, otherwise {'status':'failure'}
 */
- (MNOAPIResponse *)showUrlModalwithTitle:(NSString *)title
                                withUrl:(NSString *)urlString
                             withParams:(NSDictionary *)params
                            withWebView:(UIWebView *)webView;

/**
 * Shows a modal rendering the specified widget. The Ok button is used to dismiss the modal.
 *
 * @param title The title of modal
 * @param widgetName The name of the widget to be rendered in the modal.
 * @param params Additional info for the rendering of the modal.
 * @param webView The web view that has requested the launch of the modal.
 *
 * @return {'status':'success'} if processed correctly, otherwise {'status':'failure'}
 */
- (MNOAPIResponse *)showWidgetModalwithTitle:(NSString *)title
                            withWidgetName:(NSString *)widgetName
                                withParams:(NSDictionary *)params
                               withWebView:(UIWebView *)webView;

/**
 * Shows a modal with a Title, Message; Yes, No and Cancel Buttons. The Ok button is used to dismiss the modal.
 *
 * @param title The title of modal
 * @param message The message of the modal.
 * @param params Additional info for the rendering of the modal such as 
 *          the callback function through which to send the selected button
 *          response (i.e., {'status':'success', 'outcome':'yes'}).
 * @param webView The web view that has requested the launch of the modal.
 *
 * @return {'status':'success'} if processed correctly, otherwise {'status':'failure'}
 */
- (MNOAPIResponse *)showYesNoModalwithTitle:(NSString *)title
                              withMessage:(NSString *)message
                               withParams:(NSDictionary *)params
                              withWebView:(UIWebView *)webView;

@end
