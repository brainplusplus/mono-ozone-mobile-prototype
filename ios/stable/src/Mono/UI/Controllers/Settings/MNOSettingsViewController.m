//
//  SettingsViewController.m
//  Mono2
//
//  Created by Ben Scazzero on 1/23/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOSettingsViewController.h"

#import "MNOCenterMenuView.h"
#import "MNOContainerViewController.h"
#import "MNOSyncDashboardManager.h"


@interface MNOSettingsViewController ()


@end

@implementation MNOSettingsViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    
	// Do any additional setup after loading the view.
    self.view.backgroundColor = [UIColor colorWithPatternImage: [UIImage imageNamed:@"bkg_stripe_dark.png"]];
    self.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
}

- (void) viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    // intents
}

- (void) viewDidLayoutSubviews
{
    [super viewDidLayoutSubviews];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

-(void)viewDidAppear:(BOOL)animated
{
    [super viewDidAppear:animated];
}

// Bug in interface builder
- (void)tableView:(UITableView *)tableView
  willDisplayCell:(UITableViewCell *)cell
forRowAtIndexPath:(NSIndexPath *)indexPath
{
    [cell setBackgroundColor:[UIColor clearColor]];
}

@end

