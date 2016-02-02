//
//  ViewController.m
//  Mono2
//
//  Created by Ben Scazzero on 1/21/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "AFNetworking.h"
#import "TFHpple.h"

#import "MNOAuthenticationHandler.h"
#import "MNOCenterMenuView.h"
#import "MNOContainerViewController.h"
#import "MNOCustomUnwind.h"
#import "MNODashboard.h"
#import "MNOHttpStack.h"
#import "MNOMainViewController.h"
#import "MNOOpenAMAuthenticationManager.h"
#import "MNOSyncDashboardManager.h"
#import "MNOUtil.h"

#define logIn @"login"
#define embedContainerSegue @"embedContainer"

#define leftMenuHiddenLeftConstraint -self.leftMenu.frame.size.width
#define leftMenuShowLeftConstraint 0

#define containerLeftContraintExpandTopMenu 0
#define containerLeftContraintShrinkTopMenu self.leftMenu.frame.size.width

#define mainMenuHiddenTopConstraint _mainView.bounds.size.height + 0 //
#define mainMenuShowTopConstraint 0

@interface MNOMainViewController ()

@property(strong, nonatomic) MNOContainerViewController *containerVC;

/* Menus */
@property(weak, nonatomic) IBOutlet UIScrollView *leftMenu;

// Top Menu
@property(weak, nonatomic) IBOutlet UIView *topMenu;
@property(weak, nonatomic) IBOutlet UIImageView *topMenuLogo;
@property(weak, nonatomic) UILabel *activeTitle;
@property(weak, nonatomic) UIButton *activeDashboard;

@property(weak, nonatomic) IBOutlet UILabel *componentCountLabel;
@property(weak, nonatomic) IBOutlet UIButton *componentButton;
@property(weak, nonatomic) IBOutlet UIImageView *componentImage;
@property(weak, nonatomic) IBOutlet UIImageView *appBuilderIcon;
@property(strong, nonatomic) IBOutlet UIButton *appsBuilder;

// Menu Icons/Buttons
@property(strong, nonatomic) IBOutlet UIButton *burger;
@property(weak, nonatomic) IBOutlet UIButton *appsMallButton;
@property(weak, nonatomic) IBOutlet UIImageView *appsMallImage;
@property(strong, nonatomic) IBOutlet UIButton *more;

@property(strong, nonatomic) IBOutlet UIButton *appLauncher;
@property(strong, nonatomic) IBOutlet UIImageView *appLauncherIcon;
@property (weak, nonatomic) IBOutlet UILabel *appLauncherLabel;

@property(strong, nonatomic) IBOutlet UIButton *settings;
@property(strong, nonatomic) IBOutlet UIImageView *settingsIcon;
@property (weak, nonatomic) IBOutlet UILabel *settingLabel;

@property(strong, nonatomic) IBOutlet UIButton *account;
@property(weak, nonatomic) IBOutlet UIImageView *accountIcon;
@property (weak, nonatomic) IBOutlet UILabel *accountLabel;

// Transparent View for Left Side Menu
@property (strong, nonatomic) IBOutlet UIView *menuViewHelper;
@property (strong, nonatomic) IBOutlet UIView *menuViewHelperBottom;
// Left Side Menu Constraint
@property (strong, nonatomic) IBOutlet NSLayoutConstraint *letMenuLeftSideConstraint;
@property (strong, nonatomic) IBOutlet NSLayoutConstraint *leftMenuBottomConstraint;

// Loading Views
@property(strong, nonatomic) IBOutlet UIView *loadingView;
@property(strong, nonatomic) IBOutlet UILabel *loadingLabel;
@property(strong, nonatomic) IBOutlet UIActivityIndicatorView *loadingIndicator;


@end

@implementation MNOMainViewController {
    // Global, Singleton Managers
    MNOUtil * utilManager;
    MNOAccountManager *accountManager;
    MNOSyncDashboardManager * syncDashboardManager;
}

#pragma mark - Init

- (id)initWithCoder:(NSCoder *)aDecoder {
    self = [super initWithCoder:aDecoder];
    if (self) {
        [self setUp];
    }
    return self;
}

- (void) setUp
{
    syncDashboardManager = [MNOSyncDashboardManager sharedManager];
    [syncDashboardManager loadDefaultPreference];
    
    utilManager = [MNOUtil sharedInstance];
    accountManager = [MNOAccountManager sharedManager];
}

#pragma mark - View Callbacks

- (void) viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    [self addNotifications];
    if(self.signedIn) {
        [self signUserIn];
    }
}

- (void) viewDidAppear:(BOOL)animated
{
    [super viewDidAppear:animated];
 
    if(!self.signedIn){
        [self signUserOut];
        [MNOAccountManager sharedManager].user = nil;
    }
}

- (void) viewWillDisappear:(BOOL)animated
{
    [super viewWillDisappear:animated];
    [self removeNotifications];
}

#pragma mark - Low Memory Warning

- (void)didReceiveMemoryWarning {
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

#pragma mark - Segues

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    if ([segue.identifier isEqualToString:embedContainerSegue]) {
        self.containerVC = segue.destinationViewController;
    }
}

- (IBAction)unwindToThisViewController:(UIStoryboardSegue *)unwindSegue {
    if ([unwindSegue.identifier isEqualToString:dismissAppsBuilder]) {
        
    }
}
#pragma mark - Top Menu Callbacks
/**
 *  Sends a NSNotication when the 'more' button is selected. The view controller that is being
 *  displayed can handle the notification if they choose to.
 *
 *  @param sender UIButton that was selected
 */
- (IBAction) more:(UIButton *) sender
{
    [[NSNotificationCenter defaultCenter] postNotificationName:moreSelected object:nil];
}
/**
 *  When a dashboard is displayed, this button will be clickable. It will display the number of 
 *  widgets in this dashboard.
 *
 *  @param sender UIButton that was selected
 */
- (IBAction) componentsMenuOptions:(UIButton *)sender
{
    [[NSNotificationCenter defaultCenter] postNotificationName:componentMenuSelected object:nil];
}

- (IBAction) dropDownMenu:(id)sender {
    [[NSNotificationCenter defaultCenter] postNotificationName:componentMenuDropDown object:nil];
}

- (IBAction)burgerSelected:(id)sender {
    [self toggleDrawer:TRUE];
}

- (IBAction)appsMallSelected:(id)sender {
    if (![self transitionInProgress]) {
        // Make sure left menu is hidden
        [self showLeftMenu:NO];
        [self.containerVC segueVC:appsMallVCSegue];
    }
}

- (IBAction)appsBuilderSelected:(id)sender {
    if (![self transitionInProgress]) {
        // Make sure left menu is hidden
        [self showLeftMenu:NO];
        [self.containerVC segueVC:appsBuilderVCSegue];
    }
}

#pragma mark - Left Menu Callbacks

- (IBAction)accountSelected:(id)sender {
    if (![self transitionInProgress]) {
        [self updateMenuTransitionTo:accountVCSegue];
        // Update Menu
        [self.accountIcon setAlpha:1.0f];
        [self.accountLabel setAlpha:1.0f];
    }
}


- (IBAction)settingsSelected:(id)sender {
    if (![self transitionInProgress]) {
        [self updateMenuTransitionTo:settingsVCSegue];
        // Update Menu
        [self.settingsIcon setAlpha:1.0f];
        [self.settingLabel setAlpha:1.0f];
    }
}

- (IBAction)appLauncherSelected:(id)sender {
    if (![self transitionInProgress]) {
        [self updateMenuTransitionTo:appLauncherVCSegue];
        // Update Menu
        [self.appLauncherIcon setAlpha:1.0f];
        [self.appLauncherLabel setAlpha:1.0f];
    }
}

#pragma mark - Container

- (BOOL) transitionInProgress
{
    return self.containerVC.transitionInProgress;
}

- (void) updateMenuTransitionTo:(NSString*)segue
{
    // Reset Icons
    [self deselectIcons];
    // Hide Slide Out Menu
    [self toggleDrawer:TRUE];
    // Show The App Launcher View Controller
    [self.containerVC segueVC:segue];
}

#pragma mark - Menu Toggle Logic

- (void) showLeftMenu:(BOOL)show
{
    // Check where the left menu is currently
    if (show && self.leftMenu.frame.origin.x == leftMenuShowLeftConstraint) {
       // Left Menu Showing, Do Nothing
    }else if(show && self.leftMenu.frame.origin.x == leftMenuHiddenLeftConstraint){
       // Make Menu Show
        [self toggleDrawer:YES];
    }else if(!show && self.leftMenu.frame.origin.x == leftMenuHiddenLeftConstraint){
        // Menu Hidden, Do Nothing
    }else if(!show && self.leftMenu.frame.origin.x == leftMenuShowLeftConstraint ){
        // Hide Menu
        [self toggleDrawer:YES];
    }
   
}

- (void)toggleDrawer:(BOOL)animate {
    if (![self transitionInProgress]) {
      
        CGFloat animationDuration = 0.50f;
        if(animate == FALSE)
            animationDuration = 0;
        
        BOOL hideHelperMenu = NO;
        
        // Check where the left menu is currently
        CGFloat xcoord = leftMenuShowLeftConstraint;
        if (self.leftMenu.frame.origin.x == 0){
            xcoord = leftMenuHiddenLeftConstraint;
            hideHelperMenu = YES;
        }
        
        if (hideHelperMenu) {
            self.menuViewHelper.alpha = 0.4f;
            self.menuViewHelperBottom.alpha = 1.0f;
        }else{
            if (self.menuViewHelper.superview == nil) {
                [[self view] addSubview:self.menuViewHelper];
                [[self view] addSubview:self.menuViewHelperBottom];
                [self.menuViewHelper mas_makeConstraints:^(MASConstraintMaker *make) {
                    make.top.equalTo([self.topMenu mas_bottom]);
                    make.right.equalTo(self.view);
                    make.bottom.equalTo(self.view);
                    make.leading.equalTo([self.leftMenu mas_trailing]);
                }];
                [self.menuViewHelperBottom mas_makeConstraints:^(MASConstraintMaker *make) {
                    make.top.equalTo([self.leftMenu mas_bottom]).priorityLow();
                    make.bottom.equalTo(self.view);
                    make.right.equalTo([self.menuViewHelper mas_leading]);
                    make.left.equalTo(self.view);
                }];
            }
            self.menuViewHelper.alpha = 0.0f;
            self.menuViewHelperBottom.alpha = 0.0f;
        }
        
        
        [self.view layoutIfNeeded];

        [UIView animateWithDuration:animationDuration
                              delay:0
                            options:0
                         animations:^{
                             // Left Menu In/Out
                             [self.letMenuLeftSideConstraint setConstant:xcoord];
                             if (hideHelperMenu) {
                                 self.menuViewHelper.alpha = 0.0f;
                                 self.menuViewHelperBottom.alpha = 0.0f;
                             }else{
                                 self.menuViewHelper.alpha = 0.4f;
                                 self.menuViewHelperBottom.alpha = 1.0f;
                             }
                             
                             [self adjustLeftMenuBottomBasedOnOrientation];
                             [self.view layoutIfNeeded];
                         }
                        completion:^(BOOL finish) {
                            if (hideHelperMenu) {
                                [self.menuViewHelper removeFromSuperview];
                                [self.menuViewHelperBottom removeFromSuperview];
                            }
                        }];
        
    }
}

/**
 *  Reset all the icons and label to a non-selected state
 */
- (void)deselectIcons {
    [self.appLauncherLabel setAlpha:0.4f];
    [self.appLauncherIcon setAlpha:0.4f];
    
    [self.accountLabel setAlpha:0.4f];
    [self.accountIcon setAlpha:0.4f];
    
    [self.settingsIcon setAlpha:0.4f];
    [self.settingLabel setAlpha:0.4f];
}


#pragma mark - Sign In
/**
 *  Sign the user in and presents the default view controller
 */
- (void) signUserIn
{
    [self showLeftMenu:NO];
    // Show Default View Controller
    [self.appLauncherIcon setAlpha:1.0f];
    [self.appLauncherLabel setAlpha:1.0f];
    [self.containerVC segueVC:appLauncherVCSegue];
}

#pragma mark - Hide Menu

- (IBAction)hideMenu:(id)sender
{
    [self showLeftMenu:NO];
}

#pragma mark - Sign Out

/**
 *  Callback for the Sign Out Button
 *
 *  @param sender UIButton, sign out button
 */
- (IBAction)signOut:(id)sender
{
    [self signUserOut];
}

/**
 *  Signs the user out
 */
- (void) signUserOut
{
    if (![self transitionInProgress]) {
        self.signedIn = NO;
        [self.containerVC signOutUser];
        [self showLeftMenu:NO];
        [self deselectIcons];
        [self performSegueWithIdentifier:logIn sender:self];
    }
}

#pragma mark - Orientation

/**
 *  Detects Orientation Change
 *
 *  @param notif NSNotifcation
 */
- (void) orientationChange:(NSNotification*)notif
{
    [self adjustLeftMenuBottomBasedOnOrientation];
}

- (void) adjustLeftMenuBottomBasedOnOrientation
{
    if(UIDeviceOrientationIsLandscape([UIDevice currentDevice].orientation)){
        self.leftMenuBottomConstraint.constant  = 0;
    }else{
        self.leftMenuBottomConstraint.constant = self.menuViewHelperBottom.frame.size.height;
    }
}

#pragma mark - Notifications

/**
 *  Add Notifications to View Controller
 */
- (void) addNotifications
{
    NSNotificationCenter * center = [NSNotificationCenter defaultCenter];
    [center addObserver:self selector:@selector(dashboardNotifications:) name:dashboardSegue object:nil];
    [center addObserver:self selector:@selector(dashboardNotifications:) name:dismissDashboard object:nil];
    [center addObserver:self selector:@selector(widgetNotifications:) name:widgetSegue object:nil];
    [center addObserver:self selector:@selector(widgetNotifications:) name:dismissController object:nil];
    [center addObserver:self  selector:@selector(orientationChange:) name:UIDeviceOrientationDidChangeNotification object:[UIDevice currentDevice]];
}

/**
 *  Remove Notifications from View Controller
 */
- (void) removeNotifications
{
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}


- (void)dashboardNotifications:(NSNotification *)notif {
    if ([[notif name] isEqualToString:dashboardSegue]) {
        CGRect frame = self.topMenuLogo.frame;
        NSDictionary *stuff = notif.object;
        
        //show component name
        CGFloat nextButtonPos = self.appsBuilder.frame.origin.x;
        CGFloat addedHorizontalSpace = nextButtonPos - (frame.origin.x + frame.size.width);
        UIButton *button = [UIButton buttonWithType:UIButtonTypeCustom];
        [button setFrame:CGRectMake(frame.origin.x, frame.origin.y, frame.size.width+addedHorizontalSpace, frame.size.height)];
        [button setTitle:[stuff objectForKey:@"name"] forState:UIControlStateNormal];
        [button setTitleColor:[UIColor whiteColor] forState:UIControlStateNormal];
        [button addTarget:self action:@selector(dropDownMenu:) forControlEvents:UIControlEventTouchUpInside];
       
        [self.topMenu addSubview:button];
        self.activeDashboard = button;
        self.topMenuLogo.hidden = YES;
        
        //hide apps mall button
        self.appsMallImage.hidden = YES;
        self.appsMallButton.enabled = NO;
        
        //component related views
        self.componentButton.enabled = YES;
        self.componentImage.hidden = NO;
        NSNumber *num = [stuff objectForKey:@"count"];
        self.componentCountLabel.text = [NSString stringWithFormat:@"%ul", num.intValue];
        self.componentCountLabel.hidden = NO;
        
        self.appBuilderIcon.hidden = YES;
        self.appsBuilder.enabled = NO;
        
        [button mas_makeConstraints:^(MASConstraintMaker *make) {
            make.height.equalTo(@(button.frame.size.height));
            make.leading.equalTo([self.burger mas_trailing]);
            make.trailing.equalTo([self.appsBuilder mas_leading]);
            make.top.equalTo(self.topMenu).offset(button.frame.origin.y);
        }];
    } else if ([[notif name] isEqualToString:dismissDashboard]) {
        //hide component label
        [self.activeDashboard removeFromSuperview];
        self.topMenuLogo.hidden = NO;
        
        //show apps mall button
        self.appsMallButton.enabled = YES;
        self.appsMallImage.hidden = NO;
        
        self.componentButton.enabled = NO;
        self.componentImage.hidden = YES;
        self.componentCountLabel.hidden = YES;
        
        self.appBuilderIcon.hidden = NO;
        self.appsBuilder.enabled = YES;
    }
}


- (void)widgetNotifications:(NSNotification *)notif {
    if ([[notif name] isEqualToString:widgetSegue]) {
        CGRect frame = self.topMenuLogo.frame;
        CGFloat nextButtonPos = self.appsBuilder.frame.origin.x;
        CGFloat addedHorizontalSpace = nextButtonPos - (frame.origin.x + frame.size.width);
        UILabel *label = [[UILabel alloc] initWithFrame:CGRectMake(frame.origin.x, frame.origin.y, frame.size.width+addedHorizontalSpace, frame.size.height)];
        NSString *name = notif.object;
        
        [label setText:name];
        [label setTextColor:[UIColor whiteColor]];
        label.textAlignment = NSTextAlignmentCenter;
        label.adjustsFontSizeToFitWidth = YES;
        label.minimumScaleFactor =  (label.font.pointSize-8.5)/label.font.pointSize;
        
        self.topMenuLogo.hidden = YES;
        //remove the activeTitle if it is currently being displaed
        if (self.activeTitle)
            [self.activeTitle removeFromSuperview];
        
        self.activeTitle = label;
        [self.topMenu addSubview:self.activeTitle];
        
        self.appsMallImage.hidden = YES;
        self.appsMallButton.enabled = NO;
        
        [label mas_makeConstraints:^(MASConstraintMaker *make) {
            make.height.equalTo(@(label.frame.size.height));
            make.leading.equalTo([self.burger mas_trailing]);
            make.trailing.equalTo([self.appsBuilder mas_leading]);
            make.top.equalTo(self.topMenu).offset(label.frame.origin.y);
        }];
        
    } else if ([[notif name] isEqualToString:dismissController]) {
        
        [self.activeTitle removeFromSuperview];
        self.topMenuLogo.hidden = NO;
        
        //show apps mall button
        self.appsMallButton.enabled = YES;
        self.appsMallImage.hidden = NO;
    }
}

@end
