//
//  UIViewController_OzoneWebViewController.h
//  Mono2
//
//  Created by Michael Wilson on 4/7/14.
//  Copyright (c) 2014 42Six Solutions. All rights reserved.
//

#import <UIKit/UIKit.h>

/**
 * An Ozone WebView controller that will figure out how
 * best to handle webview calls.
 **/
@interface MNOOzoneWebViewController : UIViewController<UIWebViewDelegate> {

UIWebView *webView;
    
}

@property (nonatomic, retain) IBOutlet UIWebView *webView;

@end
