//
//  MNOModalProcessor.m
//  Mono
//
//  Created by Jason Lettman on 5/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOModalProcessor.h"
#import "MNOModalManager.h"

#define API_MODALS_HTML @"html"
#define API_MODALS_MESSAGE @"message"
#define API_MODALS_URL @"url"
#define API_MODALS_WIDGET @"widget"
#define API_MODALS_YESNO @"yesNo"

@implementation MNOModalProcessor

/**
 * See declaration in MNOModalProcessor.h
 */
- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    
    NSString *title = [params objectForKey:@"title"];
    NSString *message = [params objectForKey:@"message"];
    
    if ([method isEqualToString:API_MODALS_MESSAGE]) {
        NSLog(@"message modal: %@", params);
        response = [[MNOModalManager sharedInstance] showMessageModalwithTitle:title withMessage:message withParams:params];
    } else if ([method isEqualToString:API_MODALS_YESNO]) {
        NSLog(@"yes no modal: %@", params);
        response = [[MNOModalManager sharedInstance] showYesNoModalwithTitle:title withMessage:message withParams:params withWebView:webView];
    } else if ([method isEqualToString:API_MODALS_WIDGET]) {
        NSLog(@"widget modal: %@", params);
        NSString *widgetName = [params objectForKey:@"widgetName"];
        response = [[MNOModalManager sharedInstance] showWidgetModalwithTitle:title withWidgetName:widgetName withParams:params withWebView:webView];
    } else if ([method isEqualToString:API_MODALS_HTML]) {
        NSLog(@"html modal: %@", params);
        NSString *html = [params objectForKey:@"html"];
        response = [[MNOModalManager sharedInstance] showHtmlModalwithTitle:title withHtml:html withParams:params withWebView:webView];
    } else if ([method isEqualToString:API_MODALS_URL]) {
        NSLog(@"html modal: %@", params);
        NSString *urlParam = [params objectForKey:@"url"];
        response = [[MNOModalManager sharedInstance] showUrlModalwithTitle:title withUrl:urlParam withParams:params withWebView:webView];
    } else {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:[NSString stringWithFormat:@"Unrecognized method %@.", method]];
    }
    
    return response;
}

@end
