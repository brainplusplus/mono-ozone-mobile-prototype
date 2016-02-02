//
//  AppLauncherViewController.m
//  Mono2
//
//  Created by Ben Scazzero on 1/23/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAppLauncherViewController.h"
#import <math.h>
#import "MNOWidgetViewController.h"
#import "MNODashboardViewController.h"
#import "MNOWidgetSegue.h"
#import "MNOAppLauncherDashboardView.h"
#import "MNOAppLauncherWidgetView.h"
#import "MNOWidget.h"
#import "MNODashboard.h"
#import "MNOAppDelegate.h"
#import "MNOUser.h"
#import "MNOSyncDashboardManager.h"
#import "MNOAccountManager.h"
#import "MNOTopMenuView.h"
#import "MNOSyncWidgetsOp.h"
#import "MBProgressHUD.h"


#define viewAll @"View All"
#define viewMobileReady @"Mobile Ready"
#define refreshApps @"Refresh Apps"

@interface MNOAppLauncherViewController ()

@property (strong, nonatomic) IBOutlet UIButton * appsButton;
@property (strong, nonatomic) IBOutlet UIButton * compositeButton;

@property (strong, nonatomic) NSUserDefaults * userDefaults;
// Widget Grid
@property (weak, nonatomic) MNOAppLauncherWidgetView * widgetGrid;
// Dashboard Grid
@property (weak, nonatomic) MNOAppLauncherDashboardView * dashboardGrid;
// DB Handle
@property (strong, nonatomic) NSManagedObjectContext * moc;
// More Button
@property (strong, nonatomic) MNOTopMenuView * topMenuMore;

@property (nonatomic) BOOL isInApplication;


@end

@implementation MNOAppLauncherViewController
{
    NSTimer * timer;
    MNOAppLauncherWidgetView *_appLauncherView;
}

#pragma mark - Mobile Ready Logic

- (void)updateViews:(BOOL)showAll
{
    // New Dashboard and Widget Lists
    NSMutableArray * newWidgetList = [[NSMutableArray alloc] init];
    NSMutableArray * newDashboardList = [[NSMutableArray alloc] init];
    
    if(showAll){
        [newWidgetList addObjectsFromArray:[MNOAccountManager sharedManager].defaultWidgets];
        [newDashboardList addObjectsFromArray:[self filterDashboards:NO]];
    }else{
         for(MNOWidget* widget in [[MNOAccountManager sharedManager] defaultWidgets])
            if([widget.mobileReady isEqualToNumber:@(YES)])
                [newWidgetList addObject:widget];
        
        [newDashboardList addObjectsFromArray:[self filterDashboards:YES]];
    }
    
    [self populateApps:newWidgetList];
    [self populateComponents:newDashboardList];
}

- (NSArray *) filterDashboards:(bool)mobileOnly{
   
    NSArray * oldDashboards = [[MNOAccountManager sharedManager] dashboards];
    NSMutableArray * newDashboards = [[NSMutableArray alloc] init];

    // Only Show Dashboards that Have at Least 1 Mobile Widget in them
    if(mobileOnly){
        for (MNODashboard* dashboard in oldDashboards)
            for (MNOWidget* widget in dashboard.widgets)
                if([widget.mobileReady boolValue]){
                    [newDashboards addObject:dashboard];
                    break;
                }
    }else{
        // Otherwise Show all of the User's Dashboards
        [newDashboards addObjectsFromArray:oldDashboards];
    }
    
    return newDashboards;
}

#pragma mark - public methods

- (void)dismissChildViews {
    
    // There Should Only be 1 Child View Controller
    UIViewController *viewController = [[self childViewControllers] firstObject];
  
    if([viewController isKindOfClass:[MNOWidgetViewController class]]) {
        [[NSNotificationCenter defaultCenter] postNotificationName:dismissController object:nil];
        [viewController performSegueWithIdentifier:dismissController sender:viewController];
    }else if([viewController isKindOfClass:[MNODashboardViewController class]]) {
        [[NSNotificationCenter defaultCenter] postNotificationName:dismissDashboard object:nil];
        [viewController performSegueWithIdentifier:dismissDashboard sender:viewController];
    }
}

#pragma mark - View Methods

- (void)viewDidLoad
{
    [super viewDidLoad];
	// Do any additional setup after loading the view.
    self.view.backgroundColor = [UIColor colorWithPatternImage: [UIImage imageNamed:@"bkg_stripe_dark.png"]];
    self.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    
    self.appsButton.selected = YES;
    self.compositeButton.selected = NO;
    [self updateButtonViews];
}


- (void) viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    [self registerTimer];
    [self registerNotif];
}

- (void) viewWillDisappear:(BOOL)animated
{
    [super viewWillDisappear:animated];
    [self unregisterTimer];
    [self unregisterNotif];
}

#pragma UIButton Mods


- (void) updateButtonViews
{
    self.appsButton.layer.borderWidth = 1.0f;
    self.appsButton.layer.borderColor = [UIColor colorWithRed:255 green:255 blue:255 alpha:.1f].CGColor;
    self.compositeButton.layer.borderWidth = 1.0f;
    self.compositeButton.layer.borderColor = [UIColor colorWithRed:255 green:255 blue:255 alpha:.1f].CGColor;
}

#pragma mark - System Methods

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

#pragma mark - Timers

- (void) registerTimer
{
    // Make sure we don't have a timer running
    [self unregisterTimer];
    
    // Create and Start a New Timer
    NSTimeInterval interval = [MNOSyncDashboardManager sharedManager].dashboardRefreshTime;
    timer = [NSTimer scheduledTimerWithTimeInterval:interval
                                             target:self
                                           selector:@selector(refreshDashboard:)
                                           userInfo:nil
                                            repeats:YES];
}

- (void) unregisterTimer
{
    [timer invalidate];
    timer = nil;
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

#pragma mark - Menu Callback

- (void)optionSelectedKey:(NSString *)key withValue:(id)value
{
    // Sync Widgets
    if ([key isEqual:refreshApps]) {
        __block MBProgressHUD *hud = [MBProgressHUD showHUDAddedTo:self.view animated:YES];
        hud.labelText = @"Refreshing...";
        hud.mode = MBProgressHUDModeText;
        
        hud.yOffset = (self.view.frame.size.height * .25);
        
        NSManagedObjectID * userId = [[[MNOAccountManager sharedManager] user] objectID];
        // Create new operation for this request
        MNOSyncWidgetsOp * newOp = [[MNOSyncWidgetsOp alloc] initWithUserId:userId];
        // Add callback, run on main thread
        newOp.progressCallback = ^(BOOL result){
                // Code is executed on main thread
                if (result) {
                    [self updateViews:[self.userDefaults boolForKey:viewAll]];
                    hud.labelText = @"Success";
                }else{
                    hud.labelText = @"Update Failed";
                }
            
             [hud hide:YES afterDelay:1.0];
        };
        
        // Start operation
        [[[MNOUtil sharedInstance] syncingQueue] addOperation:newOp];
    
    // Show All Widgets
    }else if([key isEqualToString:viewAll]){
        BOOL isShowingAll = [self.userDefaults boolForKey:viewAll];
        if (!isShowingAll) {
            [self.userDefaults setObject:@(YES) forKey:viewAll];
            [self.userDefaults synchronize];
            [self updateViews:YES];
        }
        
    // Show Mobile Only
    }else if([key isEqualToString:viewMobileReady]){
        BOOL isShowingAll = [self.userDefaults boolForKey:viewAll];
        if (isShowingAll) {
            [self.userDefaults setObject:@(NO) forKey:viewAll];
            [self.userDefaults synchronize];
            [self updateViews:NO];
        }
    }
    
    // Close Menu
    [self.topMenuMore removeFromSuperview];
}

- (void) more:(NSNotification *)notif
{
    if (self.topMenuMore.superview == nil){
        [self.view addSubview:self.topMenuMore];
    }else{
        [self.topMenuMore removeFromSuperview];
    }
}

#pragma mark - SyncDashboard
/**
 *  Periodically checks to see if any of the user's dashboards have been updated and updates them if necessary.
 *
 *  @param timer NSTimer that invokes the method.
 */
- (void) refreshDashboard:(NSTimer *)timer
{
    if([MNOSyncDashboardManager sharedManager].dashboardsUpdated){
        [self refreshDashboardManual];
        [MNOSyncDashboardManager sharedManager].dashboardsUpdated = NO;
    }
}

- (void) refreshDashboardManual
{
    NSArray * newDashboards = [MNOAccountManager sharedManager].dashboards;
    [self.dashboardGrid replaceCurrentViewsWithList:newDashboards];
}

#pragma mark - Dashboard Grid

- (void) populateComponents:(NSArray *)dashboards
{
    if (dashboards == nil) {
        dashboards = [[MNOAccountManager sharedManager].dashboards mutableCopy];
    }
    
    if(self.dashboardGrid != nil) {
        [self.dashboardGrid replaceCurrentViewsWithList:dashboards];
        return;
    }
    
    MNOAppLauncherDashboardView * view = [[MNOAppLauncherDashboardView alloc] initWithFrame:CGRectMake(0, 0, 0, 0)
                                                                                   withList:dashboards];
    view.translatesAutoresizingMaskIntoConstraints = NO;
    
    view.gridDelegate = self;
    view.minColSpacing = 5;
    view.rowSpacing = 25;
    view.hidden = YES;
    
    [self.view addSubview:view];
    self.dashboardGrid = view;
    [self.dashboardGrid setCenterMenuContents:@{@"Delete":@"Delete",@"Close":@"Close"}];
    
    [view mas_makeConstraints:^(MASConstraintMaker *make) {
        make.bottom.equalTo(self.view);
        make.left.equalTo(self.view);
        make.right.equalTo(self.view);
        make.top.equalTo(self.view).offset(CGRectGetMinY(self.appsButton.frame)+ CGRectGetHeight(self.appsButton.frame) * 1.5);
    }];
}


#pragma mark - Widget Grid

- (void) populateApps:(NSArray *)apps
{
    if (apps == nil) {
        apps = [MNOAccountManager sharedManager].defaultWidgets;
    }
    
    if(self.widgetGrid != nil) {
        [self.widgetGrid replaceCurrentViewsWithList:apps];
        return;
    }
    
    MNOAppLauncherWidgetView * view = [[MNOAppLauncherWidgetView alloc] initWithFrame:CGRectMake(0,0,0,0)
                                                                             withList:apps];
 
    view.translatesAutoresizingMaskIntoConstraints = NO;
    view.gridDelegate = self;
    view.topSpacing = 25;
    view.minColSpacing = 5;
    view.rowSpacing = 25;
    
    [self.view addSubview:view];
    self.widgetGrid  = view;
    
    [view mas_makeConstraints:^(MASConstraintMaker *make) {
        make.bottom.equalTo(self.view);
        make.left.equalTo(self.view);
        make.right.equalTo(self.view);
        make.top.equalTo(self.view).offset(CGRectGetMinY(self.appsButton.frame)+ CGRectGetHeight(self.appsButton.frame) * 1.5);
    }];
    
    _appLauncherView = view;
}

#pragma mark - Button Callbacks

/**
 *  Callback for when Widget Button is Selected
 *
 *  @param sender UIButton
 */
- (IBAction)appSelected:(id)sender
{
    self.dashboardGrid.hidden = YES;
    self.widgetGrid.hidden = NO;
    self.appsButton.selected = YES;
    self.compositeButton.selected = NO;
}

/**
 *  Callback for when Dashboard Button is Selected
 *
 *  @param sender UIButton
 */
- (IBAction)compositeSelected:(id)sender {
    
    self.widgetGrid.hidden = YES;
    self.dashboardGrid.hidden = NO;
    self.appsButton.selected = NO;
    self.compositeButton.selected = YES;
}

#pragma AppViewDelegate

/**
 *  Triggered When a Widget Icon or Dashboard Icon is Selected
 *
 *  @param chosenView MNOWidget/MNODashboard that was selected
 */
- (void)entrySelected:(id)chosenView
{
    // Ensure we don't load a app or dashboard twice
    if (!self.isInApplication){
        self.isInApplication = YES;

        //Load Selected Widget
        if ([chosenView isKindOfClass:[MNOWidget class]]) {
            [self performSegueWithIdentifier:widgetSegue sender:chosenView];
        }else if([chosenView isKindOfClass:[MNODashboard class]]){
            [self performSegueWithIdentifier:dashboardSegue sender:chosenView];
        }
    }
}

-(void)entryRemoved:(id)chosenView
{
    if([chosenView isKindOfClass:[MNODashboard class]]){
        [self.moc deleteObject:chosenView];
        [self save];
    }
    
}

-(void) entryLongPressed:(id) chosenView optionSelectedKey:(NSString *)key value:(id)value
{
    NSLog(@"%@",key);
}

- (void) save
{
    NSError * error;
    if ([self.moc hasChanges] && ![self.moc save:&error]) {
        NSLog(@"Unresolved error %@, %@", error, [error userInfo]);
        [[MNOUtil sharedInstance] showMessageBox:@"Error saving data" message:@"Unable to save data.  Changes may not persist after this application closes."];
    }
}

#pragma mark - Segues

-(void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    
    if ([segue.identifier isEqualToString:widgetSegue]) {
        MNOWidget * widget = sender;
        MNOWidgetViewController * wvc = segue.destinationViewController;
        [wvc setWidget:widget];
        
    }else if([segue.identifier isEqualToString:dashboardSegue]){
        MNODashboard * dash = sender;
        ((MNOWidgetSegue  *)segue).data = dash;
    }
    
}

-(void)swipeVCoffscreen:(UIViewController *)vc fromIdentifier:(NSString*)identifier
{
    CGRect frame = vc.view.bounds;
    [UIView animateWithDuration:0.5 animations:^{
        
        [vc.view setFrame:CGRectMake(frame.size.width, frame.origin.y, frame.size.width,frame.size.height)];
        
    } completion:^(BOOL finished) {
        [vc willMoveToParentViewController:nil];
        [vc.view removeFromSuperview];
        [vc removeFromParentViewController];
        
        if( [identifier isEqualToString:dismissDashboard] ){
            MNODashboardViewController * dvc = (MNODashboardViewController *)vc;
           
            if([dvc shouldReloadDashboards])
                [self refreshDashboardManual];
            
            if ([dvc shouldReloadViewController])
                [self performSegueWithIdentifier:dashboardSegue sender:dvc.dashboard];
        }
    
        [self displayAppropriateGrid];
    }];
}

/**
 *  Called when a Widget or Dashboard is Removed from the Window.
 *
 *  @param unwindSegue UIStoryboardSegue
 */
- (IBAction)unwindToThisViewController:(UIStoryboardSegue *)unwindSegue
{
    [self swipeVCoffscreen:unwindSegue.sourceViewController fromIdentifier:unwindSegue.identifier];
    self.isInApplication = NO;
}


-(void)willMoveToParentViewController:(UIViewController *)parent
{
    [super willMoveToParentViewController:parent];
    
    if (parent == nil) {
        [self dismissChildViews];
    }else {
        // Update Mobile Only Option
        self.topMenuMore.enableKey = [self.userDefaults boolForKey:viewAll] ? viewAll : viewMobileReady;	
        // everytime we navigate away, repopulate apps and dashboards
        [self updateViews:[self.userDefaults boolForKey:viewAll]]; // Make sure we're showing the correct widgets
    }
}

#pragma mark - private methods

- (void)displayAppropriateGrid {
    
    if(self.isInApplication == NO) {
        if(self.appsButton.selected == YES) {
            self.widgetGrid.hidden = NO;
            self.dashboardGrid.hidden = YES;
        }
        else {
            self.widgetGrid.hidden = YES;
            self.dashboardGrid.hidden = NO;
        }
    }
    else {
        self.widgetGrid.hidden = YES;
        self.dashboardGrid.hidden = YES;
    }
}

#pragma mark - Setters/Getters

- (NSManagedObjectContext *) moc
{
    if (!_moc) {
        _moc = [[MNOUtil sharedInstance] defaultManagedContext];
    }
    
    return _moc;
}

- (MNOTopMenuView *) topMenuMore
{
    if(!_topMenuMore) {
        
        _topMenuMore = [[MNOTopMenuView alloc] initWithSize:CGSizeMake(rowWidth, 3*rowHeight)
                                                   contents:@{viewAll:viewAll,viewMobileReady:viewMobileReady,refreshApps:refreshApps}
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

/**
 *  If a Widget or Dashboard is Currently Loaded, this variable is true, false otherwise.
 *
 *  @param isInApplication BOOL
 */
- (void) setIsInApplication:(BOOL)isInApplication
{
    _isInApplication = isInApplication;
    
    if (!_isInApplication) {
        [self registerNotif];
        [self registerTimer];
    }else{
        [self unregisterNotif];
        [self unregisterTimer];
    }
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
