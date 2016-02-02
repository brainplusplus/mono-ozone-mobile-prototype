//
//  ComponentViewController.m
//  Mono2
//
//  Created by Ben Scazzero on 3/3/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNODashboardViewController.h"
#import "MNODashboard.h"
#import "MNOWidget.h"
#import "MNOTopMenuView.h"
#import "MNOSwiperView.h"
#import "Masonry.h"
#import "MNOCustomGridView.h"
#import "UIWebView+OzoneWebView.h"
#import "MNOIntentGrid.h"
#import "MNOWidgetManager.h"
#import "MNOGridHeaderView.h"
#import "MNOAppMallView.h"
#import "MNOIntentHandler.h"

#define insetx 100
#define insety(in) in*.10
#define widgetRef @"widgetRef"

#define cardWidth 175
#define innerCardPadding 15

#define kHeaderResuableIdentifier @"header"
#define kCellResuableIdentifier @"cell"

#define labelHeight 25

#define MAX_WIDGET_COUNTER 100

@interface MNODashboardViewController ()

@property (strong, nonatomic) NSMutableArray * webViews;
@property (strong, nonatomic) MNOTopMenuView * topMenuMore;
@property (strong, nonatomic) MNOTopMenuView * topMenuComponents;
@property (strong, nonatomic) MNOSwiperView * swiper;

@property (strong, nonatomic) NSMutableDictionary * subscribers;
@property (strong, nonatomic) NSDictionary * publishers;
@property (strong, nonatomic) NSMutableArray * instanceIdList;


// Intent
@property (strong, nonatomic) UIButton * backgroundDismiss;
@property (strong, nonatomic) MNOWidget * chosenWidget;

//convience structure
@property (strong, nonatomic) NSManagedObjectContext * moc;

@property (strong, nonatomic) MNOIntentHandler * intentHandler;
@property (strong, nonatomic) NSMutableDictionary * intentMapper;

// User Allows Intents
@property (nonatomic) BOOL allowsIntents;

@end

@implementation MNODashboardViewController
{
    BOOL reload;
    BOOL refreshDashboards;
    _Atomic(int) numAttempts[MAX_WIDGET_COUNTER];
    _Atomic(int) numFailures[MAX_WIDGET_COUNTER];
}

/* Sytem Related Stuf */
- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

#pragma -mark Layout

- (void)viewDidLoad
{
    [super viewDidLoad];
    
	// Do any additional setup after loading the view.
    self.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self loadCustomWebViews];
    [self loadSwiper];
}

- (void) viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    [self initNotifs];
}

- (void) viewDidAppear:(BOOL)animated {
    if([self.dashboard.modified isEqualToNumber:@TRUE]) {
        // The dashboard has been modified.  Let the user know
        UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Warning!"
                                                        message:@"Widgets in this dashboard have been removed due to the removal of an Apps Mall storefront or by an OWF administrator. Please look for alternative widgets to replace them."
                                                       delegate:self
                                              cancelButtonTitle:@"OK"
                                              otherButtonTitles:nil];
        
        [alert show];
        
        // The user has been alerted, so set the modified flag to false
        self.dashboard.modified = [[NSNumber alloc] initWithBool:FALSE];
        
        NSManagedObjectContext *moc = [[MNOUtil sharedInstance] defaultManagedContext];
        
        // Save
        [moc performBlock:^{
            [moc save:nil];
        }];
    }
}

- (void) viewWillDisappear:(BOOL)animated
{
    [super viewWillDisappear:animated];
    [self stopNotifs];
}

- (void) loadCustomWebViews
{
    // load webviews
    int counter = 0;
    for (MNOWidget * widget in self.widgets) {
        // For each widget, init a webview
        UIWebView * webview = [[UIWebView alloc] initWithFrame:CGRectMake(0, 0, CGRectGetWidth(self.view.frame), CGRectGetHeight(self.view.frame))];
        webview.hidden = TRUE;
        
        if(widget.instanceId == nil) {
            NSString * instanceId = [[[[NSUUID alloc] init] UUIDString] lowercaseString];
            //set up another mapping from instanceId to Widget
            widget.instanceId = instanceId;
            
            //save
            NSError * error = nil;
            if (![self save])
                NSLog(@"Error Updating Widget InstanceID: %@",error);
        }
        
        [self.instanceIdList addObject:widget.instanceId];

        webview.delegate = self;
        NSURLRequest * request = [webview formatOzoneRequest:widget.url];
        [[self view] addSubview:webview];
        webview.tag = counter;
        [webview loadRequest:request];

        //autolayout
        [webview mas_makeConstraints:^(MASConstraintMaker *make) {
            make.edges.equalTo(self.view);
        }];
        
        
        // Gestures
        UISwipeGestureRecognizer * swipe = [[UISwipeGestureRecognizer alloc] initWithTarget:self action:@selector(discardWidget:)];
        swipe.direction = UISwipeGestureRecognizerDirectionRight;
        [webview addGestureRecognizer:swipe];
        [self.webViews addObject:webview];
        
        counter += 1;
    }
}

- (BOOL) save
{
    NSError * error = nil;
    if ([self.moc hasChanges] && [self.moc save:&error] && !error)
        return YES;
    else
        return NO;
}

- (void) loadSwiper
{
    //remove any previously loaded swiper
    if (self.swiper.superview) {
        [self.swiper removeFromSuperview];
        self.swiper = nil;
    }
    
    //swiper
    [self.view addSubview:self.swiper];
    [self.swiper mas_makeConstraints:^(MASConstraintMaker *make) {
        make.edges.equalTo(self.view);
    }];
    
    // Load Intents
    // [_overlay mas_makeConstraints:^(MASConstraintMaker *make) {
    //     make.edges.equalTo(self);
    // }];
    
}

-(void)viewWillLayoutSubviews
{
    [super viewWillLayoutSubviews];
}

/* Swipe Offscreen */

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
    return YES;
}

-(void)discardOverlay:(UIGestureRecognizer *)gesture
{
    CGPoint point = [gesture locationInView:self.swiper];
    
    if (point.x < 5) {
        //remove
        [[NSNotificationCenter defaultCenter] postNotificationName:dismissDashboard object:nil];
        [self performSegueWithIdentifier:dismissDashboard sender:self];
    }
}

/* Swiper Related Methods */

-(void)showSwiper
{
    //add back overlay
    CGRect frame = self.swiper.frame;
    frame.origin.x = -frame.size.width;
    self.swiper.frame = frame;
    
    [self.swiper setHidden:NO];
    //[[self view] addSubview:self.overlay];
    
    [UIView animateWithDuration:0.5 animations:^{
        CGRect frame = self.swiper.frame;
        frame.origin.x  = 0;
        self.swiper.frame = frame;
    }];
}

#pragma -mark WebViewDelegate

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
{
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
 
    UIWebView * web = [self.webViews objectAtIndex:webView.tag];
    MNOWidget * widget = [self.widgets objectAtIndex:webView.tag];
    
    [webView initPropertiesWithURL:web.request.URL.absoluteString
                          widgetId:widget.widgetId
                        instanceId:widget.instanceId];
    
    int viewTag = (int)webView.tag;
    
    if(viewTag < MAX_WIDGET_COUNTER) {
        ++numAttempts[viewTag];
    }
}

- (void)webViewDidFinishLoad:(UIWebView *)webView
{
    for(UIView *view in [webView subviews]) {
        if([view isKindOfClass:[UIActivityIndicatorView class]]) {
            [(UIActivityIndicatorView *)view stopAnimating];
        }
    }
}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error
{
    for(UIView *view in [webView subviews]) {
        if([view isKindOfClass:[UIActivityIndicatorView class]]) {
            [(UIActivityIndicatorView *)view stopAnimating];
        }
    }
    NSLog(@"%@",error);
    
    int viewTag = (int)webView.tag;
    
    if(viewTag < MAX_WIDGET_COUNTER) {
        int curAttempts = numAttempts[viewTag];
        int incrementedFailures = ++numFailures[viewTag];
        
        if(curAttempts <= incrementedFailures) {
            [webView displayErrorIfApplicable];
        }
    }
}

- (void)willRotateToInterfaceOrientation:(UIInterfaceOrientation)toInterfaceOrientation duration:(NSTimeInterval)duration {
    for(UIWebView *webView in self.webViews) {
        if([webView hasChromeDrawer]) {
            [[webView chromeDrawer] setHidden:TRUE];
        }
    }
}

- (void)didRotateFromInterfaceOrientation:(UIInterfaceOrientation)fromInterfaceOrientation {
    for(UIWebView *webView in self.webViews) {
        if([webView hasChromeDrawer]) {
            [[webView chromeDrawer] setHidden:FALSE];
            [[webView chromeDrawer] resize];
        }
    }
}

#pragma -mark NSNotifications

- (void) stopNotifs
{
    //Notify the main menu
    NSNotificationCenter * center = [NSNotificationCenter defaultCenter];
    [center removeObserver:self name:moreSelected object:nil];
    [center removeObserver:self name:componentMenuSelected object:nil];
    [center removeObserver:self name:componentMenuDropDown object:nil];
    [center removeObserver:self name:pubsubPublish object:nil];
    [center removeObserver:self name:pubsubSubscribe object:nil];
    [center removeObserver:self name:receive object:nil];
    [center removeObserver:self name:startActivity object:nil];
    [center removeObserver:self name:dashboardsUpdate object:nil];
    [center removeObserver:self name:dashboardsDeleted object:nil];
}

- (void) initNotifs
{
    //Notify the main menu
    NSNotificationCenter * center = [NSNotificationCenter defaultCenter];
    // More Menu Selected
    [center addObserver:self selector:@selector(more:) name:moreSelected object:nil];
    // Widget Names Drop Down
    [center addObserver:self selector:@selector(swiperMenu:) name:componentMenuSelected object:nil];
    
    [center addObserver:self selector:@selector(dropDownList:) name:componentMenuDropDown object:nil];
    // Pubsub
    [center addObserver:self selector:@selector(pubsub:) name:pubsubPublish object:nil];
    [center addObserver:self selector:@selector(pubsub:) name:pubsubSubscribe object:nil];
    // Intent
    [center addObserver:self selector:@selector(intent:) name:receive object:nil];
    [center addObserver:self selector:@selector(intent:) name:startActivity object:nil];
    // Sync Dashboard
    [center addObserver:self selector:@selector(updateDashboard:) name:dashboardsUpdate object:nil];
    [center addObserver:self selector:@selector(dashboardDeleted:) name:dashboardsDeleted object:nil];
}

-(void)swiperMenu:(NSNotification *)notif
{
    if (self.swiper.hidden) {
        [self showSwiper];
    }
}

-(void) more:(NSNotification *)notif
{
    [self.topMenuComponents setHidden:YES];
    
    if(self.topMenuMore.superview)
        self.topMenuMore.hidden = !self.topMenuMore.hidden;
    else
        [[self view] addSubview:self.topMenuMore];
}

-(void)dropDownList:(NSNotification *)notif
{
    [self.topMenuMore setHidden:YES];
    
    if (self.topMenuComponents.superview)
        self.topMenuComponents.hidden = !self.topMenuComponents.hidden;
    else
        [[self view] addSubview:self.topMenuComponents];
}


- (void)intent:(NSNotification *)notif
{
    //check if user allows intents
    if (!self.allowsIntents)
        return;
    
    NSString * requestType = notif.name;
    
    if ([requestType isEqualToString:startActivity]){
        
        //only display one menu on screen at a time
        if (!self.backgroundDismiss.superview) {
          
            // Sender Intent
            MNOIntentWrapper * senderIntent = [self.intentHandler retreiveIntenWrappertForNotification:notif];
            
            // has the user already set up a preference for this notification?
            if([self.intentHandler userHasIntentPreferenceSaved:notif newSender:senderIntent])
                // if so, forgot showing the intent menu
                return;
            
            // Possible Intent Endpoints (Current & New)
            NSArray * existingIntentEndpoints = [self.intentHandler retreiveExistingEnpointsForIntent:notif];
            NSMutableArray * otherWidgets = nil;
            NSArray * possibleIntentEndpoints = [self.intentHandler retreivePossibleEnpointsForIntent:notif widgetList:&otherWidgets];
           
            // if we have something to show
            if ( [existingIntentEndpoints count] > 0 || [possibleIntentEndpoints count] > 0) {
                
                // Background Screen
                [self.view addSubview:self.backgroundDismiss];
                
                // Grid and Cell Dimensions
                CGRect parent = self.view.frame;
                CGRect frame = CGRectMake(CGRectGetWidth(parent) * .10, CGRectGetHeight(parent) * .10, CGRectGetWidth(parent)*.80, CGRectGetHeight(parent)*.80);
                int side = CGRectGetWidth(frame) * .25;
                
                //Sender Widget
                UIWebView * web = [[MNOWidgetManager sharedManager] widgetWithInstanceId:senderIntent.instanceId];
                MNOWidget * senderWidget = [self.widgets objectAtIndex:web.tag];
             
                // Receiving Widgets
                NSMutableArray * widgetReceivers = [[NSMutableArray alloc] init];
                [widgetReceivers addObject:[self widgetsFromIntentArray:existingIntentEndpoints]];
                [widgetReceivers addObject:otherWidgets];
                
                // Receiving Intents
                NSMutableArray * intentReceivers = [[NSMutableArray alloc] init];
                [intentReceivers addObjectsFromArray:existingIntentEndpoints];
                [intentReceivers addObjectsFromArray:possibleIntentEndpoints];
                
                // Grid
                MNOIntentGrid * intentGrid = [[MNOIntentGrid alloc] initWithFrame:frame
                                                                          widgets:widgetReceivers
                                                                          intents:intentReceivers
                                                                     senderWidget:senderWidget
                                                                     senderIntent:senderIntent
                                                                         withSize:CGSizeMake(side, side)];
                
                // Headings for Grid
                intentGrid.gridDelegate = self;
                NSMutableArray * headings = [NSMutableArray new];
                
                if ([existingIntentEndpoints count]>0)
                    [headings addObject:@"Existing"];
                if ([possibleIntentEndpoints count]>0)
                    [headings addObject:@"New Instances"];
                
                intentGrid.headings = headings;
                intentGrid.headingSize = CGSizeMake(CGRectGetWidth(intentGrid.frame), CGRectGetHeight(intentGrid.frame)*.20);
                
                // Add Grid To Screen
                [self.backgroundDismiss addSubview:intentGrid];
                [self.backgroundDismiss mas_makeConstraints:^(MASConstraintMaker *make) {
                    make.edges.equalTo(self.view);
                }];
               // [intentGrid mas_makeConstraints:^(MASConstraintMaker *make) {
                    //make.top.equalTo(self.backgroundDismiss).offset(intentGrid.frame.origin.y);
                    //make.left.equalTo(self.backgroundDismiss).offset(intentGrid.frame.origin.x);
                    //make.size.equalTo(intentGrid);
                //}];
            }
        }
    } else if([requestType isEqualToString:receive]){
        [self.intentHandler didReceiveIntent:notif];
    }
}

- (NSMutableArray *) widgetsFromIntentArray:(NSArray *)arr
{
    NSMutableArray * result = [NSMutableArray new];
    for (MNOIntentWrapper * iw in arr) {
        UIWebView * web = [[MNOWidgetManager sharedManager] widgetWithInstanceId:iw.instanceId];
        MNOWidget * widget = [self.widgets objectAtIndex:web.tag];
        [result addObject:widget];
    }
    return result;
}

#pragma mark - PubSub

- (void) pubsub:(NSNotification *)notif
{
    NSDictionary * params = notif.object;
    NSString * requestType = notif.name;
    
    if ([requestType isEqualToString:pubsubPublish]) {
        [self parsePublisher:params];
    } else if([requestType isEqualToString:pubsubSubscribe]){
        //unsubscribe
        [self parseSubscriber:params];
    }
    
}

- (void) parsePublisher:(NSDictionary *)params
{
    NSString * channel = [params objectForKey:@"channelName"];
    NSString * data = [params objectForKey:@"data"];

    NSMutableArray * subscribers = [self.subscribers objectForKey:channel];

    NSUInteger instanceCount = self.instanceIdList.count;
    for (MNOSubscriber * sub in subscribers)
        for (int i = 0; i < instanceCount; i++){
            //find the widget the subscriber references
            NSString *instanceId = [self.instanceIdList objectAtIndex:i];
            if ([instanceId isEqualToString:sub.instanceId]) {
                //retrieve matching webview
                UIWebView * webview = [[MNOWidgetManager sharedManager] widgetWithInstanceId:instanceId];
                
                [webview notifySubscriber:sub withSender:sub.instanceId message:data];
            }
        }
    
}

- (void) parseSubscriber:(NSDictionary *)params
{
    NSString * channel = [params objectForKey:@"channelName"];
    NSString * functionCallback = [params objectForKey:@"functionCallback"];
    NSString * instanceId = [params objectForKey:@"instanceId"];
    
    if([self.subscribers objectForKey:channel] == nil)
       [self.subscribers setObject:[NSMutableArray new] forKey:channel];
    
    NSUInteger len = self.instanceIdList.count;
    int index = -1;
    for (int i = 0; i < len ; i++) {
        NSString * curInstanceId = [self.instanceIdList objectAtIndex:i];
        if([curInstanceId isEqualToString:instanceId]){
            index++;
            break;
        }
    }
    
    if(index >= 0){
        MNOSubscriber * sub = [[MNOSubscriber alloc] initWithChannel:channel callbackFunction:functionCallback subscriberGuid:instanceId];
        NSMutableArray * arr = [self.subscribers objectForKey:channel];
        [arr addObject:sub];
    }
}

#pragma -mark Intent

/* Intent Dismiss Callback */
- (void) dismissGrid:(id)sender
{
    [self.backgroundDismiss removeFromSuperview];
    self.backgroundDismiss = nil;
}

// User selected an option from the Intent Menu
- (void) selectedIntentOptionOnce:(BOOL)once forReceiver:(MNOIntentWrapper *)receiver fromSender:(MNOIntentWrapper *)sender
{
    // Remove the Intent View
    [self dismissGrid:self.backgroundDismiss];
    
    //unable to retreive all necessary information
    if(!receiver || !sender)
        return;
    
    // If the user selected a new instance, add it to dashboard.
    BOOL hasAddedWidget = [self.intentHandler processIntentWrapper:receiver];
    
    // always selected
    if (!once)
        [self.intentHandler saveIntentReceiver:receiver fromSender:sender];
    
    
    // if we're working with widget that were already added to the dashboard
    if (!hasAddedWidget){
        // Send Intent to Receiving Widget
       
        [self.intentHandler sendIntentInfoTo:receiver from:sender];
        
    }else{
        // the user selected a new dashboard to add. Don't bother
        // w/ callbacks because we're reloading all the widgets
        reload = YES;
        refreshDashboards = YES;
        [self performSegueWithIdentifier:dismissDashboard sender:self];
    }
}

- (BOOL) shouldReloadViewController
{
    return reload;
}


#pragma -mark MenuCallbacks

- (void) optionSelectedKey:(NSString *)key withValue:(id)value
{
    if ([key isEqualToString:@"Back"]) {
        if (!self.swiper.hidden) {
            [[NSNotificationCenter defaultCenter] postNotificationName:dismissDashboard object:nil];
            [self performSegueWithIdentifier:dismissDashboard sender:self];
        }else{
            [self showSwiper];
        }
        
        [self.topMenuMore setHidden:YES];

    }else{
        
        NSNumber * num = value;
        NSUInteger webviewIndex = [num intValue];
        [self selectWebviewAtIndex:webviewIndex];
       
        [self.swiper setHidden:YES];
        [self.topMenuComponents setHidden:YES];
    }
}

- (void) selectWebviewAtIndex:(NSUInteger)index
{
    for (int i = 0; i < self.webViews.count; i++) {
        if (i == index) {
            UIWebView *webView = [self.webViews objectAtIndex:i];
            [webView setHidden:NO];
            
            int viewTag = (int)webView.tag;
            
            if(viewTag < MAX_WIDGET_COUNTER) {
                int curAttempts = numAttempts[viewTag];
                int curFailures = numFailures[viewTag];
                
                if(curAttempts > 0 && curAttempts <= curFailures) {
                    [webView displayErrorIfApplicable];
                }
            }
        }else{
            [[self.webViews objectAtIndex:i] setHidden:YES];
        }
    }
}

#pragma -mark Getters/Setters

- (BOOL) allowsIntents
{
    return  _allowsIntents = [[MNOAccountManager sharedManager].user.settings.allowsIntents boolValue];
}

- (MNOIntentHandler *)intentHandler
{
    if(!_intentHandler) _intentHandler = [[MNOIntentHandler alloc] initWithWidgets:self.widgets webViews:self.webViews];
    return _intentHandler;
}

- (NSManagedObjectContext *) moc
{
    if (!_moc) {
        _moc = [[MNOUtil sharedInstance] defaultManagedContext];
    }
    return _moc;
}

-(UIButton *)backgroundDismiss
{
    if (!_backgroundDismiss) {
        _backgroundDismiss = [UIButton buttonWithType:UIButtonTypeCustom];
        _backgroundDismiss.frame = self.view.frame;
        _backgroundDismiss.backgroundColor = Rgb2UIColor(239, 239, 239);
        [_backgroundDismiss addTarget:self action:@selector(dismissGrid:) forControlEvents:UIControlEventTouchUpInside];
    }
    return _backgroundDismiss;
}

-(MNOTopMenuView *)topMenuComponents
{
    
    if(!_topMenuComponents){
        
        NSMutableDictionary * dict = [[NSMutableDictionary alloc] init];
        for (int i = 0; i < self.widgets.count; i++)
            [dict setObject:@(i)
                     forKey:((MNOWidget *)(self.widgets)[i]).name];
        
        NSUInteger minVisibileRows = dict.count <= 3 ? dict.count : 3;
        _topMenuComponents = [[MNOTopMenuView alloc] initWithSize:CGSizeMake(rowWidth, rowHeight * minVisibileRows) contents:dict alignRight:NO];
        _topMenuComponents.delegate = self;
    }
    
    return _topMenuComponents;
}


-(MNOTopMenuView *)topMenuMore
{
    if(!_topMenuMore) {
        _topMenuMore = [[MNOTopMenuView alloc] initWithSize:CGSizeMake(rowWidth, rowHeight) contents:@{@"Back": @"Back"} alignRight:YES];
                
        _topMenuMore.delegate = self;
    }
    
    return _topMenuMore;
}

-(NSMutableArray *)webViews
{
    if(!_webViews) _webViews = [[NSMutableArray alloc] init];
    
    return _webViews;
}

- (MNOSwiperView *) swiper
{
    if(!_swiper){
        
        int viewHeight = CGRectGetHeight(self.view.bounds) * .8;
        int viewWidth = CGRectGetWidth(self.view.bounds) * .8;
        
        int side = (viewHeight > viewWidth ? viewWidth : viewHeight);
        
        _swiper = [[MNOSwiperView alloc] initWithFrame:self.view.bounds usingContent:self.widgets withSize:CGSizeMake(side, side)];
        _swiper.delegate = self;
     
        // Swipe to Remove Gesture
        UISwipeGestureRecognizer * swipe = [[UISwipeGestureRecognizer alloc] initWithTarget:self action:@selector(discardOverlay:)];
        swipe.direction = UISwipeGestureRecognizerDirectionRight;
        swipe.delegate = self;
        [_swiper addGestureRecognizer:swipe];
    }
    
    return _swiper;
}

- (NSMutableDictionary *) subscribers
{
    if (!_subscribers) _subscribers = [[NSMutableDictionary alloc] init];
    
    return _subscribers;
}

- (NSMutableDictionary *) intentMapper
{
    if (!_intentMapper) _intentMapper = [[NSMutableDictionary alloc] init];
    
    return _intentMapper;
}

- (NSMutableArray *) instanceIdList
{
    if (!_instanceIdList) _instanceIdList = [[NSMutableArray alloc] init];
    
    return _instanceIdList;
}

- (void) setWidgets:(NSArray *)widgets
{
    // sort
    NSSortDescriptor * nameDescriptor = [[NSSortDescriptor alloc] initWithKey:@"name" ascending:YES];
    NSArray *sortDescriptors = @[nameDescriptor];
    _widgets = [widgets sortedArrayUsingDescriptors:sortDescriptors];
}

#pragma -mark SwiperDelegate

-(void)selectedCardWithName:(NSString *)name iconURL:(NSString *)url
{
    int index = 0;
    
    for (MNOWidget * widget in self.widgets) {
        if ([widget.name isEqualToString:name] && [widget.largeIconUrl isEqualToString:url])
            break;

        index += 1;
    }
    
    [self selectWebviewAtIndex:index];
    self.swiper.hidden = YES;
}

/* Gestures */

-(void)discardWidget:(UIGestureRecognizer *)gesture
{
    CGPoint point = [gesture locationInView:self.swiper];
    
    if (point.x < 5) {
        [self showSwiper];
    }
}

#pragma -mark ViewControllerTransitions

-(void)willMoveToParentViewController:(UIViewController *)parent
{
    [super willMoveToParentViewController:parent];
    if (parent == nil) {
        
        [[NSNotificationCenter defaultCenter] postNotificationName:dismissDashboard object:nil];
        
    }else{
        [[NSNotificationCenter defaultCenter] postNotificationName:dashboardSegue object:@{@"name":self.dashboard.name, @"count":@(self.widgets.count)}];
        
    }
}

#pragma mark - SyncDashboard

/**
 *  If the user's dashboards are updated, then a notification is received by this method.
 *  If the active/current dashboard was modified, then the MNODashboardViewController is reloaded to show the change(s).
 *
 *  @param notif NSNotification that the dashboard was modified.
 */
- (void) updateDashboard:(NSNotification*)notif
{
    //Dashboard Updated So Reload Dashboard
    NSArray * modifiedDashboards = notif.object;
    for (NSString * dashboardId in modifiedDashboards) {
        if ([self.dashboard.dashboardId isEqualToString:dashboardId]) {
            reload = YES;
            refreshDashboards = YES;
            [self performSegueWithIdentifier:dismissDashboard sender:self];
        }
    }
}

/**
 *  If the user deletes one or more dashboards then a notification is received by this method.
 *  The MNODashboardViewController is then dismissed if the current/active dashboard was deleted.
 *
 *  @param notif NSNotification that one or more dashboards were deleted.
 */
- (void) dashboardDeleted:(NSNotification*)notif
{
    // A Dashboard has been deleted. Make sure its not this one
    NSArray * deletedDashboards = notif.object;
    for (NSString * dashboardId in deletedDashboards) {
        if ([self.dashboard.dashboardId isEqualToString:dashboardId]) {
            refreshDashboards = YES;
            [self performSegueWithIdentifier:dismissDashboard sender:self];
        }
    }
}

/**
 *  See Declaration in MNODashboardViewController.h
 */
- (BOOL) shouldReloadDashboards
{
    return refreshDashboards;
}
@end
