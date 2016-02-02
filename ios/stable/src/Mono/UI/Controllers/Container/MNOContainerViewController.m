//
//  ContainerViewController.m
//  Mono2
//
//  Created by Ben Scazzero on 1/23/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAccountViewController.h"
#import "MNOAppLauncherViewController.h"
#import "MNOAppsBuilderViewController.h"
#import "MNOAppsMallStorefrontViewController.h"
#import "MNOContainerViewController.h"
#import "MNOCustomUnwind.h"
#import "MNOSettingsViewController.h"

@interface MNOContainerViewController ()

@property (strong, nonatomic) NSString *currentSegueIdentifier;
@property (assign, nonatomic) BOOL transitionInProgress;

//Left Menu
@property (strong, nonatomic) MNOAppLauncherViewController *appLauncherVC;
@property (strong, nonatomic) MNOAccountViewController * accountVC;
@property (strong, nonatomic) MNOSettingsViewController * settingsVC;

// Other controllers
@property (strong, nonatomic) MNOAppsMallStorefrontViewController *appsMallSettingsVC;

@end

@implementation MNOContainerViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
	// Do any additional setup after loading the view.
    
}

- (id) cachedControllerForIdentifier:(NSString *) identifier
{
    
    id controller = nil;
    
    if ([identifier isEqualToString:appLauncherVCSegue] && _appLauncherVC) {
        controller = _appLauncherVC;
    }
    else if([identifier isEqualToString:settingsVCSegue] && _settingsVC) {
        controller = _settingsVC;
    }
    else if([identifier isEqualToString:accountVCSegue] && _accountVC) {
        controller = _accountVC;
    }
    else if([identifier isEqualToString:appsMallSettingsVCSegue] && _appsMallSettingsVC) {
        controller = _appsMallSettingsVC;
    }
    
    // if we don't have a cached controller available, create a new one.
    return controller;

}

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender
{
    
    if ([segue.identifier isEqualToString:appLauncherVCSegue] && !_appLauncherVC) {
        _appLauncherVC = segue.destinationViewController;
    }
    else if([segue.identifier isEqualToString:settingsVCSegue] && !_settingsVC) {
        _settingsVC = segue.destinationViewController;
    }
    else if([segue.identifier isEqualToString:accountVCSegue] && !_accountVC) {
        _accountVC = segue.destinationViewController;
    }
    else if([segue.identifier isEqualToString:appsMallSettingsVCSegue] && !_appsMallSettingsVC) {
        _appsMallSettingsVC = segue.destinationViewController;
    }
    
    [self transferContainerTo:segue.destinationViewController];
}

-(void)transferContainerTo:(id)destinationViewController
{
    //Will always show first when burger pressed
    if (self.childViewControllers.count > 0) {
        [self swapFromViewController:[self.childViewControllers objectAtIndex:0] toViewController:destinationViewController];
    }
    else {
        [self addChildViewController:destinationViewController];
        UIView* destView = ((UIViewController *)destinationViewController).view;
        destView.frame = CGRectMake(0, 0, self.view.frame.size.width, self.view.frame.size.height);
        
        [self.view addSubview:destView];
        
        [destinationViewController didMoveToParentViewController:self];
        self.transitionInProgress = NO;
    }
}

- (void)swapFromViewController:(UIViewController *)fromViewController toViewController:(UIViewController *)toViewController
{
    toViewController.view.frame = CGRectMake(0, 0, self.view.frame.size.width, self.view.frame.size.height);
    
    [fromViewController willMoveToParentViewController:nil];
    [self addChildViewController:toViewController];
    [self transitionFromViewController:fromViewController toViewController:toViewController duration:0.5 options:UIViewAnimationOptionTransitionCrossDissolve animations:nil completion:^(BOOL finished) {
        [fromViewController removeFromParentViewController];
        [toViewController didMoveToParentViewController:self];
        
        self.transitionInProgress = NO;
    }];
}


- (void)segueVC:(NSString *)vcID
{
    // If the app launcher button is pressed, dismiss all child views
    if([vcID isEqual:appLauncherVCSegue] && _appLauncherVC) {
        [_appLauncherVC dismissChildViews];
    }
    
    if (_transitionInProgress || [vcID isEqualToString:_currentSegueIdentifier]) {
        return;
    }
    
    _transitionInProgress = YES;
    _currentSegueIdentifier = vcID;

    id controller = [self cachedControllerForIdentifier:vcID];
    
    if (controller) {
        [self transferContainerTo:controller];
    }else{
         [self performSegueWithIdentifier:_currentSegueIdentifier sender:nil];
    }
}


- (UIStoryboardSegue *)segueForUnwindingToViewController:(UIViewController *)toViewController fromViewController:(UIViewController *)fromViewController identifier:(NSString *)identifier
{
    if ([identifier isEqualToString:unwindBuilderMall]) {
        MNOCustomUnwind * custom =  [[MNOCustomUnwind alloc] initWithIdentifier:dismissController source:fromViewController destination:toViewController];
        return custom;
    }
    
    return [super segueForUnwindingToViewController:toViewController fromViewController:fromViewController identifier:identifier];
}

#pragma mark - User Signs Out

- (void) signOutUser
{
    self.appLauncherVC = nil;
    self.accountVC = nil;
    self.settingsVC = nil;
    
    if ([self.childViewControllers count] > 0) {
        UIViewController * controller = [self.childViewControllers objectAtIndex:0];
        [controller willMoveToParentViewController:nil];
        [[controller view] removeFromSuperview];
        [controller removeFromParentViewController];
    }
    
    self.currentSegueIdentifier = nil;
}

#pragma mark - System

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end
