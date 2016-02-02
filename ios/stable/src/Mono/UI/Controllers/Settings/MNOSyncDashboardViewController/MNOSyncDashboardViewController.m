//
//  MNOSyncDashboardViewController.m
//  Mono
//
//  Created by Ben Scazzero on 5/14/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOSyncDashboardViewController.h"
#import "MNOSyncDashboardManager.h"

@interface MNOSyncDashboardViewController ()

/**
 *   The UI toggle switch for syncing apps on the dashboard
 */
@property (weak, nonatomic) IBOutlet UILabel *syncAppsStatus;
@property (weak, nonatomic) IBOutlet UISwitch *syncApps;


@end

@implementation MNOSyncDashboardViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
    }
    return self;
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    // Do any additional setup after loading the view.
    // Sync Dashboard
    self.syncApps.on = [MNOSyncDashboardManager sharedManager].isDashboardSyncEnabled;
    if(self.syncApps.on)
        self.syncAppsStatus.text = @"YES";
    else
        self.syncAppsStatus.text = @"NO";
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

#pragma mark - Dashboard Sync

- (IBAction)syncAppToggle:(UISwitch *)uiSwitch {
    [[MNOSyncDashboardManager sharedManager] scheduleDashboardSync:uiSwitch.on];
    if(uiSwitch.on){
        self.syncAppsStatus.text = @"On";
    } else {
        self.syncAppsStatus.text = @"Off";
    }
}

/*
#pragma mark - Navigation

// In a storyboard-based application, you will often want to do a little preparation before navigation
- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender
{
    // Get the new view controller using [segue destinationViewController].
    // Pass the selected object to the new view controller.
}
*/

@end
