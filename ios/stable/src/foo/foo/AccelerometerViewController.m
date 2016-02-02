//
//  AccelerometerViewController.m
//  foo
//
//  Created by Ben Scazzero on 12/17/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import "AccelerometerViewController.h"
#import "WidgetManager.h"

@interface AccelerometerViewController ()

@property (strong, nonatomic) NSNumber * widget;
@property (strong, nonatomic) NSNumber * dashGuid;

@end

@implementation AccelerometerViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    _widget = [NSNumber numberWithUnsignedLong:accelerometerWidget];
    _dashGuid = [NSNumber numberWithUnsignedLong:accelerometerDashboard];
    
	// Do any additional setup after loading the view.
    _webView.delegate = self;
    NSString * queryParams = [NSString stringWithFormat:@"http://10.1.11.18:80/hardware/acc.html?mobile=true&%@=%@&%@=%@",widgetUDID,_widget,dashboardUDID,_dashGuid];
    [_webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:queryParams]]];

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

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

#pragma mark - UIWebViewDelegate

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
{
    NSLog(@"NSURLRequest webview: %@",request);
    return YES;
}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error
{
    NSLog(@"%@",error);
}


- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation {
    
    if (interfaceOrientation==UIInterfaceOrientationPortrait) {
        // do some sh!t
        
    }
    
    return YES;
}

@end
