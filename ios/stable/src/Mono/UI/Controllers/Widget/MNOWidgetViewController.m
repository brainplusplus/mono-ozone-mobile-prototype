//
//  WidgetViewController.m
//  Mono2
//
//  Created by Ben Scazzero on 2/6/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOWidgetViewController.h"
#import "MNOWidget.h"
#import "MNOTopMenuView.h"
#import "UIWebView+OzoneWebView.h"

@interface MNOWidgetViewController ()

@property (weak, nonatomic) IBOutlet UIWebView * webview;
@property (weak, nonatomic) MNOTopMenuView * topMenuMore;
@property (strong, nonatomic) NSManagedObjectContext * moc;

@end

@implementation MNOWidgetViewController {
    NSObject *lock;
    BOOL errorDisplayed;
    _Atomic(int) numAttempts;
    _Atomic(int) numFailures;
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    // Do any additional setup after loading the view.
    self.view.autoresizingMask = UIViewAutoresizingFlexibleHeight | UIViewAutoresizingFlexibleWidth;
    
    if(self.widget.instanceId == nil) {
        NSString * instanceId = [[[[NSUUID alloc] init] UUIDString] lowercaseString];
        //set up another mapping from instanceId to Widget
        self.widget.instanceId = instanceId;
        
        //save
        NSError * error = nil;
        if (![self.moc save:&error] && !error)
            NSLog(@"Error Updating Widget InstanceID: %@",error);
    }
    
    [self.webview setDelegate:self];
    [self.webview loadRequest:[_webview formatOzoneRequest:self.widget.url]];
    

    UISwipeGestureRecognizer * swipe = [[UISwipeGestureRecognizer alloc] initWithTarget:self action:@selector(discardWidget:)];
    swipe.direction = UISwipeGestureRecognizerDirectionRight;
    [self.webview addGestureRecognizer:swipe];
    
    numAttempts = 0;
    numFailures = 0;
}


- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}


- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
{
    lock = [[NSObject alloc] init];
    errorDisplayed = FALSE;

    
    UIActivityIndicatorView *loadingIndicator;
    if([[webView subviews] count] < 2) {
        loadingIndicator = [[UIActivityIndicatorView alloc] init];
        [loadingIndicator setActivityIndicatorViewStyle:UIActivityIndicatorViewStyleGray];
        [loadingIndicator setHidesWhenStopped:TRUE];
        loadingIndicator.userInteractionEnabled = FALSE;
        loadingIndicator.transform = CGAffineTransformMakeScale(2, 2);
        
        [webView addSubview:loadingIndicator];
        
        [loadingIndicator mas_makeConstraints:^(MASConstraintMaker *make) {
            make.center.equalTo(webView);
            make.width.equalTo(@(webView.frame.size.width));
            make.height.equalTo(@(webView.frame.size.height));
        }];
    }
    else {
        loadingIndicator = [[webView subviews] objectAtIndex:1];
    }
    
    loadingIndicator.hidden = FALSE;
    [loadingIndicator startAnimating];
    
    return YES;
}

- (void)webViewDidStartLoad:(UIWebView *)webView
{
    NSLog(@"Loading WebView");
    ++numAttempts;
    [webView initPropertiesWithURL:self.widget.url widgetId:self.widget.widgetId instanceId:self.widget.instanceId];
}

- (void)webViewDidFinishLoad:(UIWebView *)webView
{
    for(UIView *view in [webView subviews]) {
        if([view isKindOfClass:[UIActivityIndicatorView class]]) {
            [(UIActivityIndicatorView *)view stopAnimating];
        }
    }
    NSLog(@"Finished WebView");
}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error
{
    for(UIView *view in [webView subviews]) {
        if([view isKindOfClass:[UIActivityIndicatorView class]]) {
            [(UIActivityIndicatorView *)view stopAnimating];
        }
    }
    
    int curAttempts = numAttempts;
    int incrementedFailures = ++numFailures;
    
    if(curAttempts <= incrementedFailures) {
        [webView displayErrorIfApplicable];
    }
    NSLog(@"%@",error);
}

- (void)willRotateToInterfaceOrientation:(UIInterfaceOrientation)toInterfaceOrientation duration:(NSTimeInterval)duration {
    if([self.webview hasChromeDrawer]) {
        [[self.webview chromeDrawer] setHidden:TRUE];
    }
}

- (void)didRotateFromInterfaceOrientation:(UIInterfaceOrientation)fromInterfaceOrientation {
    if([self.webview hasChromeDrawer]) {
        [[self.webview chromeDrawer] setHidden:FALSE];
        [[self.webview chromeDrawer] resize];
    }
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
    return YES;
}

-(void)discardWidget:(UIGestureRecognizer *)gesture
{
    CGPoint point = [gesture locationInView:_webview];
    
    if (point.x < 5) {
        //remove
        [[NSNotificationCenter defaultCenter] postNotificationName:dismissController object:self.widget.name];
        [self performSegueWithIdentifier:dismissController sender:self];
    }
}

-(void)more:(NSNotification *)notif
{
    self.topMenuMore.hidden = !self.topMenuMore.hidden;
}

-(MNOTopMenuView *)topMenuMore
{
    if(!_topMenuMore) {
        
        MNOTopMenuView * view = [[MNOTopMenuView alloc] initWithSize:CGSizeMake(rowWidth, rowHeight) contents:@{@"Back": @"Back"} alignRight:YES];
        [[self view] addSubview:view];
        _topMenuMore = view;
        _topMenuMore.delegate = self;
        _topMenuMore.hidden = YES;
    }
    
    return _topMenuMore;
}

- (void) optionSelectedKey:(NSString *)key withValue:(id)value
{
    [self.topMenuMore removeFromSuperview];
    [[NSNotificationCenter defaultCenter] postNotificationName:dismissController object:self.widget.name];
    [self performSegueWithIdentifier:dismissController sender:self];    
}


-(void)willMoveToParentViewController:(UIViewController *)parent
{
    [super willMoveToParentViewController:parent];
    if (parent == nil) {
        [[NSNotificationCenter defaultCenter] postNotificationName:dismissController object:nil];
        [[NSNotificationCenter defaultCenter] removeObserver:self];
    }else{
        [[NSNotificationCenter defaultCenter] postNotificationName:widgetSegue object:self.widget.name];
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(more:) name:moreSelected object:nil];
    }
}

#pragma mark - Getters/Setters
- (NSManagedObjectContext *) moc
{
    if (!_moc) {
        _moc = [[MNOUtil sharedInstance] defaultManagedContext];
    }
    return _moc;
}

@end
