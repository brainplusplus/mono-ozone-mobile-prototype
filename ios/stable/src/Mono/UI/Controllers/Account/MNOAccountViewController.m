//
//  AccountViewController.m
//  Mono2
//
//  Created by Ben Scazzero on 1/23/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAccountViewController.h"
#import "MNOUser.h"
#import "MNOGroup.h"

@interface MNOAccountViewController ()

@property (strong, nonatomic) IBOutlet UILabel * userName;

@property (strong, nonatomic) IBOutlet UILabel * email;
@property (strong, nonatomic) IBOutlet UILabel * groups;

@property (strong, nonatomic) IBOutlet NSDictionary * accountInfo;

@end

@implementation MNOAccountViewController

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
    self.view.backgroundColor = [UIColor colorWithPatternImage: [UIImage imageNamed:@"bkg_stripe_dark.png"]];
    self.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    MNOUser * user = [[MNOAccountManager sharedManager] user];
    [self populateUserInfoGroups:user];
    [self populateAccountInfo:user];
}

- (void) viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
}

- (void) populateAccountInfo:(MNOUser *)user
{
    //user name
    if(user.username)
        [_userName setText:user.username];
        
    //email
    if(user.email)
        [_email setText:user.email];
}

- (void) populateUserInfoGroups:(MNOUser *)user
{
    if (user) {
        
        NSArray * groups = [user.groups allObjects];
        NSString * groupList = @"";
        
        for (NSUInteger i = 0; i < [groups count];  i++ ) {

            MNOGroup * group = [groups objectAtIndex:i];
            NSString * groupname =  group.name;
            
            if (i + 1 == [groups count]) {
                //last element
                groupList = [groupList stringByAppendingString:groupname];
            }else{
                groupList = [groupList stringByAppendingString:groupname];
                groupList = [groupList stringByAppendingString:@", "];
            }
        }
        
        if ([groupList isEqualToString:@""]) {
            groupList = @"N/A";
        }
        
        [self.groups setText:groupList];
    }
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end
