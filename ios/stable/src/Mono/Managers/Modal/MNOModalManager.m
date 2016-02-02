//
//  MNOModalManager.m
//  Mono
//
//  Created by Ben Scazzero on 1/8/14.
//  Copyright (c) 2014 42six, a CSC company. All rights reserved.
//

#import "SDCAlertView.h"

#import "MNOAccountManager.h"
#import "MNOModalManager.h"
#import "MNORouteRequestManager.h"
#import "MNOWidgetManager.h"

#define JSONError @"ModalManager: Unable to Serialize Dictionary Result %@"
#define setupError @"ModalManager: Unable to Create Modal"
#define setupSuccess @"ModalManager: Modal Created and Showing"

#define selection @"selection"
#define selectionError @"Unable to Retrieve User Selection!"

@interface MNOModalManager ()

@property (strong, nonatomic) NSMutableDictionary * widgetInfoByAlertViewDict;

@end

@implementation MNOModalManager

+ (MNOModalManager *)sharedInstance {
    static MNOModalManager * sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

- (id)init {
    self = [super init];
    
    if (self) {
        //init
        _widgetInfoByAlertViewDict = [NSMutableDictionary new];
    }
    
    return self;
}

#pragma -mark public methods

/**
 * See declaration in MNOModalManager.h
 */
- (MNOAPIResponse *)showHtmlModalwithTitle:(NSString *)title
                                withHtml:(NSString *)html
                              withParams:(NSDictionary *)params
                             withWebView:(UIWebView *)webView {
    __block MNOAPIResponse *response = nil;
    dispatch_async(dispatch_get_main_queue(), ^{
        //instantiate the web view
        UIWebView *modalWebView = [[UIWebView alloc] initWithFrame:[self getModalWebViewFrame:webView]];
        //make the background transparent
        [modalWebView setBackgroundColor:[UIColor clearColor]];
        //pass the string to the webview
        [modalWebView loadHTMLString:[html description] baseURL:nil];
        
        SDCAlertView *htmlAlert = [SDCAlertView alertWithTitle:title message:nil subview:modalWebView buttons:@[@"OK"]];
        if (htmlAlert) {
            response = [self buildAPIResponseWithStatus:API_SUCCESS withResult:@{APIstatus:APIsuccess}];
        } else {
            response = [self buildAPIResponseWithStatus:API_FAILURE withResult:@{APIstatus:APIfailure}];
        }
    });
    return response;
}

/**
 * See declaration in MNOModalManager.h
 */
- (MNOAPIResponse *)showMessageModalwithTitle:(NSString *)title
                                withMessage:(NSString *)message
                                 withParams:(NSDictionary *)params {
    MNOAPIResponse *response = nil;
    SDCAlertView *alert = [[SDCAlertView alloc] initWithTitle:title message:message delegate:nil cancelButtonTitle:@"Ok" otherButtonTitles:nil];
    
    if (alert) {
        response = [self buildAPIResponseWithStatus:API_SUCCESS withResult:@{APIstatus:APIsuccess}];
        [alert show];
    } else {
        response = [self buildAPIResponseWithStatus:API_FAILURE withResult:@{APIstatus:APIfailure}];
    }
    
    return response;
}

/**
 * See declaration in MNOModalManager.h
 */
- (MNOAPIResponse *)showUrlModalwithTitle:(NSString *)title
                                withUrl:(NSString *)urlString
                             withParams:(NSDictionary *)params
                            withWebView:(UIWebView *)webView {
    __block MNOAPIResponse *response = nil;
    dispatch_async(dispatch_get_main_queue(), ^{
        //instantiate the web view
        UIWebView *modalWebView = [[UIWebView alloc] initWithFrame:[self getModalWebViewFrame:webView]];
        //make the background transparent
        [modalWebView setBackgroundColor:[UIColor clearColor]];
        //pass the string to the webview
        [modalWebView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:urlString]]];
        
        SDCAlertView *htmlAlert = [SDCAlertView alertWithTitle:title message:nil subview:modalWebView buttons:@[@"OK"]];
        if (htmlAlert) {
            response = [self buildAPIResponseWithStatus:API_SUCCESS withResult:@{APIstatus:APIsuccess}];
        } else {
            response = [self buildAPIResponseWithStatus:API_FAILURE withResult:@{APIstatus:APIfailure}];
        }
    });
    return response;
}

/**
 * See declaration in MNOModalManager.h
 */
- (MNOAPIResponse *)showWidgetModalwithTitle:(NSString *)title
                            withWidgetName:(NSString *)widgetName
                                withParams:(NSDictionary *)params
                               withWebView:(UIWebView *)webView {
    __block MNOAPIResponse *response = nil;
    dispatch_async(dispatch_get_main_queue(), ^{
        // Get the widget from the name
        MNOWidget *widget = [[MNOAccountManager sharedManager] getWidgetByName:widgetName];
        SDCAlertView *htmlAlert = nil;
        
        if (widget) {
            NSString *widgetUrl = [widget url];
        
            if (widgetUrl) {
                //instantiate the web view
                UIWebView *modalWebView = [[UIWebView alloc] initWithFrame:[self getModalWebViewFrame:webView]];
                //make the background transparent
                [modalWebView setBackgroundColor:[UIColor clearColor]];
                //pass the string to the webview
                [modalWebView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:widgetUrl]]];
            
                htmlAlert = [SDCAlertView alertWithTitle:title message:nil subview:modalWebView buttons:@[@"OK"]];
            }
        }
        
        if (htmlAlert) {
            response = [self buildAPIResponseWithStatus:API_SUCCESS withResult:@{APIstatus:APIsuccess}];
        } else {
            // If the widget doesn't exist send back an error message letting the widget know
            NSString *errorMessage = widget ? @"Unable to retrieve the URL for the requested component"
                : @"Requested component is not in the user's component list";
            response = [self buildAPIResponseWithStatus:API_FAILURE withResult:@{APIstatus:APIfailure, @"message":errorMessage}];
        }
    });
    return response;
}

/**
 * See declaration in MNOModalManager.h
 */
- (MNOAPIResponse *)showYesNoModalwithTitle:(NSString *)title
                              withMessage:(NSString *)message
                               withParams:(NSDictionary *)params
                              withWebView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    NSString *callback = [params objectForKey:APIcallback];
    
    if (callback != nil && webView != nil) {
        
        SDCAlertView *alertView = [[SDCAlertView alloc] initWithTitle:title message:message delegate:self cancelButtonTitle:@"Cancel" otherButtonTitles:@"Yes",@"No", nil];
        
        // Making the alert view a non retained object so that when the alert view modal goes
        // away it won't be kept in memory because of the reference to it in the dictionary
        NSValue *alertViewKey = [NSValue valueWithNonretainedObject:alertView];
        NSDictionary *widgetInfoDict = [[NSDictionary alloc] initWithObjectsAndKeys:webView,@"webView",callback,APIcallback, nil];
        [_widgetInfoByAlertViewDict setObject:widgetInfoDict forKey:alertViewKey];
        
        if (alertView) {
            [alertView show];
            response = [self buildAPIResponseWithStatus:API_SUCCESS withResult:@{APIstatus:APIsuccess, @"message":setupSuccess}];
        }
    }
    
    if (!response) {
        response = [self buildAPIResponseWithStatus:API_FAILURE withResult:@{APIstatus:APIfailure, @"message":setupError}];
    }
    
    return response;
}

#pragma -mark private methods

/**
 * Gets the frame info for the webview displayed in the modal
 * based off of the webview making the request to launch the modal.
 *
 * @param launchingWebView The webview making the request to launch the modal.
 *
 * @return The CGRect (frame) of the webview displayed in the modal
 */
- (CGRect)getModalWebViewFrame:(UIWebView *)launchingWebView {
    CGRect modalWebViewFrame = CGRectZero;
    
    if (launchingWebView) {
       modalWebViewFrame = CGRectMake(launchingWebView.frame.origin.x,
                                      launchingWebView.frame.origin.y,
                                      launchingWebView.frame.size.width,
                                      launchingWebView.frame.size.height * .85);
    }
    
    return modalWebViewFrame;
}

- (void)sendUserResponse:(NSString *)response forAlert:(SDCAlertView *)alertView {
    NSValue *alertViewKey = [NSValue valueWithNonretainedObject:alertView];
    NSDictionary *widgetInfoDict = [_widgetInfoByAlertViewDict objectForKey:alertViewKey];
    NSString *callback = [widgetInfoDict objectForKey:APIcallback];
    
    // Web view that launched the widget which is the target of the response
    UIWebView *webview = [widgetInfoDict objectForKey:@"webView"];
    
    if (webview) {
        NSDictionary *results = nil;
        
        if (![response isEqualToString:selectionError]) {
            results = @{APIstatus:APIsuccess, selection: response};
        } else {
            results = @{APIstatus:APIfailure, selection: selectionError};
        }
        
        NSString *outcome = [NSString stringWithFormat:@"Mono.EventBus.runEvents(\"%@\",{\"%@\":\"%@\",\"outcome\":\"%@\"});", callback, APIstatus,[results objectForKey:APIstatus],[[results objectForKey:selection] lowercaseString]];
        
        NSLog(@"%@",outcome);
        
        NSLog(@"Connection Timer Start: %@",[NSDate new]);
        if ([[NSThread currentThread] isMainThread]) {
            [webview stringByEvaluatingJavaScriptFromString:outcome];
            // Removing the webview from the dictionary so we don't prevent
            // them from being cleaned up  when the web view is no longer used
            [_widgetInfoByAlertViewDict removeObjectForKey:alertViewKey];
        } else {
            dispatch_sync(dispatch_get_main_queue(), ^{
                [webview stringByEvaluatingJavaScriptFromString:outcome];
                // Removing the webview from the dictionary so we don't prevent
                // them from being cleaned up  when the web view is no longer used
                [_widgetInfoByAlertViewDict removeObjectForKey:alertViewKey];
            });
        }
        
        NSLog(@"Connection Timer Finish: %@",[NSDate new]);
    }
}

- (MNOAPIResponse *)buildAPIResponseWithStatus:(MNOAPIResponseStatus)status withResult:(NSDictionary *)result {
    return [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS additional:[result objectForKey:APIadditional]];
}

#pragma -mark SDCAlertViewDelegate

- (void)alertView:(SDCAlertView *)alertView clickedButtonAtIndex:(NSInteger)buttonIndex {
    if (buttonIndex == 1) {
        //yes
        [self sendUserResponse:@"Yes" forAlert:alertView];
    }else if(buttonIndex == 2){
        //no
        [self sendUserResponse:@"No" forAlert:alertView];
    }else if(buttonIndex == 0){
        //cancel
        [self sendUserResponse:@"Cancel" forAlert:alertView];
    }else{
        //unknown
        [self sendUserResponse:selectionError forAlert:alertView];
    }
}

@end
