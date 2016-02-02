//
//  GPSReaderViewController.m
//  foo
//
//  Created by Ben Scazzero on 12/16/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import "GPSReaderViewController.h"
#import "WidgetManager.h"

@interface GPSReaderViewController ()

@property (strong, nonatomic) NSNumber * widget;
@property (strong, nonatomic) NSNumber * dashGuid;

@end

@implementation GPSReaderViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    _widget = [NSNumber numberWithUnsignedLong:gpsWidget];
    _dashGuid = [NSNumber numberWithUnsignedLong:gpsDashboard];
    
	// Do any additional setup after loading the view.
    
    _webView.delegate = self;
    NSString * queryParams = [NSString stringWithFormat:@"http://10.1.11.18:80/hardware/gps.html?mobile=true&%@=%@&%@=%@",widgetUDID,_widget,dashboardUDID,_dashGuid];
    [_webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:queryParams]]];
    
    _webView.scrollView.scrollEnabled = TRUE;
    _webView.scalesPageToFit = TRUE;
    
     
    // generally called once
    // called to register the webview with our global WidgetManager
    [[WidgetManager sharedManager] registerWidget:_webView withGuid:_widget toDashboard:_dashGuid];
}

-(void) viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];

    // potentionally can be called multiple times
    // called when the widget is about to be shown
    [[WidgetManager sharedManager] setActiveWidget:_widget onDashboard:_dashGuid];
}

#pragma mark - UIWebViewDelegate

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
{
    NSLog(@"shouldStartLoadWithReqest: %@",request);
    
    return YES;
}

- (void)webViewDidFinishLoad:(UIWebView *)webView
{

}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error
{
    NSLog(@"%@",error);
}



@end
