//
//  AppsMallViewController.m
//  Mono2
//
//  Created by Ben Scazzero on 1/23/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAppsMallViewController.h"

#import "MNOAppMallView.h"
#import "MNOAppsMallManager.h"
#import "MNOContainerViewController.h"
#import "MNOMainViewController.h"
#import "MNOUser.h"
#import "MNOAppsMallGridView.h"
#import "MNOWidget.h"
#import "MNOTopMenuView.h"

#define viewAll @"View All"
#define viewMobileReady @"Mobile Ready"

#define doneButtonHeight(x) x * .050
#define doneButtonWidth(x) x * .30
#define doneButtonOffset(x) x * .025

#define labelWidth(x) x * .50


@interface MNOAppsMallViewController ()

@property (weak, nonatomic) IBOutlet UIButton * dButton;
@property (weak, nonatomic) IBOutlet UILabel * addedLabel;
@property (strong, nonatomic) IBOutlet MNOAppsMallGridView * amgv;
@property (strong, nonatomic) NSMutableDictionary * selectedItems;
@property (strong, nonatomic) NSUserDefaults * userDefaults;
@property (strong, nonatomic) MNOTopMenuView * topMenuMore;

@property (nonatomic) NSUInteger count;

@end

@implementation MNOAppsMallViewController {
    BOOL _appsMallStorefronts;
}

@synthesize currItems = _currItems;

#pragma mark - System Warnings

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

#pragma mark - View Methods

- (void)viewDidLoad
{
    [super viewDidLoad];
	// Do any additional setup after loading the view.
    self.view.backgroundColor = [UIColor colorWithPatternImage: [UIImage imageNamed:@"bkg_stripe_light.png"]];
    self.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
}

- (void)viewDidAppear:(BOOL)animated {
    UIViewController *parentController = self.parentViewController;
    _appsMallStorefronts = [parentController isKindOfClass:[MNOContainerViewController class]];
    
    [self loadDefault];
}

- (void) viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    [self registerNotif];
}

- (void) viewWillDisappear:(BOOL)animated
{
    [super viewWillDisappear:animated];
    [self unregisterNotif];
}

- (void) loadDefault
{
    NSArray *widgetList = [self widgetInfo];
    NSDictionary * opts;
    
    self.amgv.topSpacing = 25;
    self.amgv.minColSpacing = 5;
    self.amgv.rowSpacing = 25;
    self.amgv.size = CGSizeMake([MNOAppMallView standardWidth], [MNOAppMallView standardHeight]);
    
    opts = [self calculateOptions:widgetList];
    self.amgv.options = opts;
    
    [self.amgv replaceCurrentViewsWithList:widgetList];
    [self.amgv layoutIfNeeded];
    self.amgv.gridDelegate = self;
    [self formatLabelText];
    
    if ([self.userDefaults boolForKey:viewAll]) {
        [self displayAll];
    }else{
        [self displayMobileOnly];
    }
}

#pragma mark - Notifications

- (void) registerNotif
{
    // Sync Widget Notifications
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(more:) name:moreSelected object:nil];
}

- (void) unregisterNotif
{
    [[NSNotificationCenter defaultCenter] removeObserver:self name:moreSelected object:nil];
}

- (void) more:(NSNotification *)notif
{
    if (self.topMenuMore.superview == nil){
        [self.view addSubview:self.topMenuMore];
    }else{
        [self.topMenuMore removeFromSuperview];
    }
}


#pragma -mark AppViewDelegate

- (void) entrySelected:(NSManagedObject *)chosenView
{
    NSString * widgetId = [chosenView valueForKey:@"widgetId"];
   
    if(widgetId){
        if(self.selectedItems[widgetId]){
            //remove item
            [self.selectedItems removeObjectForKey:widgetId];
            self.count--;
            
            [self.amgv.options setValue:@NO forKeyPath:widgetId];
            
        }else{
            [self.selectedItems setObject:chosenView forKey:widgetId];
            self.count++;
            [self.amgv.options setValue:@YES forKeyPath:widgetId];
        }
        
        [self formatLabelText];
    }
}

- (IBAction)doneSelecting:(id)sender
{
    //self.dButton addTarget:self action:nil forControlEvents:UIControlEvent
    if(_appsMallStorefronts == TRUE) {
        MNOContainerViewController *container = (MNOContainerViewController *)self.parentViewController;
        
        // Install the new items and uninstall the unselected items
        [[MNOAppsMallManager sharedInstance] installWidgets:self.currItems];
        
        [container segueVC:appLauncherVCSegue];
    
    }else {
        [self performSegueWithIdentifier:unwindBuilderMall sender:self];
    }
}

#pragma -mark HelperFn(s)

/**
 *  Format UILabel based on number of widgets selected
 */
- (void) formatLabelText
{
    if (self.count == 0) {
        self.addedLabel.text = @"";
    }else if(self.count == 1){
        self.addedLabel.text = [NSString stringWithFormat:@"1 Widget Added"];
    }else{
        self.addedLabel.text = [NSString stringWithFormat:@"%lu Widgets Added",(unsigned long)self.count];
    }
}

/**
 *  Display all widgets
 */
- (void)displayAll {
    NSArray *widgetList = [self widgetInfo];
    [self.amgv replaceCurrentViewsWithList:widgetList];
}

/**
 *  Only display widgets that are mobile ready.
 */
- (void)displayMobileOnly {
    
   NSMutableArray *newList = [[NSMutableArray alloc] init];
   NSArray *widgetList = [self widgetInfo];
    
    for(MNOWidget* widget in widgetList) {
        if([widget.mobileReady isEqualToNumber:[NSNumber numberWithBool:YES]]) {
            [newList addObject:widget];
        }
    }
    
    [self.amgv replaceCurrentViewsWithList:newList];
}

- (NSDictionary *)calculateOptions:(NSArray *)widgetList {
    NSMutableDictionary *opts = [[NSMutableDictionary alloc] init];
    self.count = 0;
    
    if(_appsMallStorefronts) {
        for (MNOWidget * widget in widgetList) {
            if ([widget.isDefault isEqual:@TRUE]) {
                [opts setValue:@(YES) forKey:widget.widgetId];
                [self.selectedItems setValue:widget forKey:widget.widgetId];
                self.count++;
            }
            else {
                [opts setValue:@(NO) forKey:widget.widgetId];
            }
        }
   
    }else {
        for (MNOWidget * widget in widgetList) {
            if ([self.selectedItems objectForKey:widget.widgetId]) {
                [opts setValue:@(YES) forKey:widget.widgetId];
                self.count++;
            }
            else {
                [opts setValue:@(NO) forKey:widget.widgetId];
            }
        }
    }
    
    return opts;
}

#pragma mark - Top Menu Callback

- (void)optionSelectedKey:(NSString *)key withValue:(id)value
{
    // Show All Widgets
   if([key isEqualToString:viewAll]){
        BOOL isShowingAll = [self.userDefaults boolForKey:viewAll];
        if (!isShowingAll) {
            [self.userDefaults setObject:@(YES) forKey:viewAll];
            [self.userDefaults synchronize];
            [self displayAll];
        }
        
        // Show Mobile Only
    }else if([key isEqualToString:viewMobileReady]){
        BOOL isShowingAll = [self.userDefaults boolForKey:viewAll];
        if (isShowingAll) {
            [self.userDefaults setObject:@(NO) forKey:viewAll];
            [self.userDefaults synchronize];
            [self displayMobileOnly];
        }
    }
    
    // Close Menu
    [self.topMenuMore removeFromSuperview];
}

#pragma mark - Setters/Getters

- (void) setCurrItems:(NSArray *)items
{
    for (MNOWidget * widget in items) {
        [self.selectedItems setObject:widget forKey:widget.widgetId];
    }
    
    self.count = [items count];
    _currItems = items;
}

-(NSArray *) widgetInfo
{
    MNOAppsMallManager *appsMallManager = [MNOAppsMallManager sharedInstance];
    // If we come from the container view, then we're trying to install apps mall widgets
    if(_appsMallStorefronts == TRUE) {
        NSArray *storefronts = [[MNOAppsMallManager sharedInstance] getStorefronts];
        NSMutableArray *widgets = [[NSMutableArray alloc] init];
        
        for(MNOAppsMall *appsMall in storefronts) {
            [widgets addObjectsFromArray:[appsMallManager getWidgetsForStorefront:appsMall]];
        }
        
        return widgets;
    }
    else {
        return [MNOAccountManager sharedManager].defaultWidgets;
    }
}

- (NSMutableDictionary *)selectedItems
{
    if(!_selectedItems)
        _selectedItems = [[NSMutableDictionary alloc] init];
    
    return _selectedItems;
}

- (NSArray *) currItems
{
    
    NSMutableArray * arr =  [[NSMutableArray alloc] init];
    for (id obj in self.selectedItems) {
        [arr addObject:[self.selectedItems objectForKey:obj]];
    }
    
    _currItems = [NSArray arrayWithArray:arr];
    
    
    return _currItems;
}


- (MNOTopMenuView *) topMenuMore
{
    if(!_topMenuMore) {
        
        _topMenuMore = [[MNOTopMenuView alloc] initWithSize:CGSizeMake(rowWidth, 3*rowHeight)
                                                   contents:@{viewAll:viewAll,viewMobileReady:viewMobileReady}
                                                 alignRight:YES];
        _topMenuMore.toggleOptions = @[viewAll,viewMobileReady];
        _topMenuMore.delegate = self;
        
        BOOL showAllWidgets = [self.userDefaults boolForKey:viewAll];
        if (showAllWidgets) {
            _topMenuMore.enableKey = viewAll;
        }else{
            _topMenuMore.enableKey = viewMobileReady;
        }
    }
    
    return _topMenuMore;
}

- (NSUserDefaults *) userDefaults
{
    if (!_userDefaults) {
        _userDefaults = [NSUserDefaults standardUserDefaults];
        if([_userDefaults objectForKey:viewAll] == nil){
            [_userDefaults setObject:@(YES) forKey:viewAll];
            [_userDefaults synchronize];
        }
    }
    return _userDefaults;
}

@end
