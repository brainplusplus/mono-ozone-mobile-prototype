//
//  MNOAppsMallStorefrontViewController.m
//  Mono
//
//  Created by Michael Wilson on 5/12/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAppsMallStorefrontViewController.h"

#import "MNOAppsMallManager.h"
#import "MNOContainerViewController.h"

@interface MNOAppsMallStorefrontViewController ()

/**
 * The parent scroll view that houses the table and buttons.
 **/
@property (weak, nonatomic) IBOutlet UIScrollView *parentScrollView;

/**
 * The table that displays the list of storefronts.
 **/
@property (weak, nonatomic) IBOutlet UITableView *storefrontTable;

/**
 * The text field that allows users to enter a new storefront URL.
 **/
@property (weak, nonatomic) IBOutlet UITextField *storefrontUrl;

/**
 * The text field that allows users to enter a new storefront name.
 **/
@property (weak, nonatomic) IBOutlet UITextField *storefrontName;

/**
 * The add storefront button.
 **/
@property (weak, nonatomic) IBOutlet UIButton *addStorefrontButton;

/**
 * The height of the table housing the list of storefronts.
 **/
@property (weak, nonatomic) IBOutlet NSLayoutConstraint *tableHeight;

/**
 * The distance between the bottom of the table and the bottom of the screen.
 **/
@property (weak, nonatomic) IBOutlet NSLayoutConstraint *distanceBetweenTableAndBottom;

@end

@implementation MNOAppsMallStorefrontViewController {
    int _curRow;
}

#pragma mark public methods

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
    
    [self.storefrontTable setDataSource:self];
    [self.storefrontTable setDelegate:self];
    
    self.parentScrollView.translatesAutoresizingMaskIntoConstraints = YES;
    
    self.storefrontTable.translatesAutoresizingMaskIntoConstraints = FALSE;
    self.parentScrollView.translatesAutoresizingMaskIntoConstraints = FALSE;
    
    [self reloadTable];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (IBAction)addStorefront:(id)sender {
    [[MNOAppsMallManager sharedInstance] addOrUpdateStorefront:self.storefrontUrl.text storefrontName:self.storefrontName.text success:^(MNOAppsMall *appsMall, NSArray *widgetList) {
        [self reloadTable];
        self.storefrontUrl.text = @"";
        self.storefrontName.text = @"";
    } failure:^{
        UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Error!"
                                                        message:@"Error adding storefront!  Please check your URL string and make sure you're online."
                                                       delegate:self
                                              cancelButtonTitle:@"OK"
                                              otherButtonTitles:nil];
        
        [alert show];
    }];
}

- (IBAction)doneWithThis:(id)sender {
    [[self navigationController] popViewControllerAnimated:YES];
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

#pragma mark - UITableViewDelegate methods

// Controls the styling information for table cells
- (void)tableView:(UITableView *)tableView willDisplayCell:(UITableViewCell *)cell forRowAtIndexPath:(NSIndexPath *)indexPath {
    cell.backgroundColor = [UIColor blackColor];
    cell.textLabel.textColor = [UIColor whiteColor];
    cell.selectionStyle = UITableViewCellSelectionStyleNone;
}

#pragma mark - UITableViewDataSource methods

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {
    NSArray *storefronts = [[MNOAppsMallManager sharedInstance] getStorefronts];
    UITableViewCell *cell = [[UITableViewCell alloc] init];
    
    cell.textLabel.text = ((MNOAppsMall *)[storefronts objectAtIndex:[indexPath item]]).name;
    cell.frame = CGRectMake(cell.frame.origin.x, cell.frame.origin.y, cell.frame.size.width, 44);
    
    return cell;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    NSArray *storefronts = [[MNOAppsMallManager sharedInstance] getStorefronts];
    
    return [storefronts count];
}

- (void)tableView:(UITableView *)tableView commitEditingStyle:(UITableViewCellEditingStyle)editingStyle forRowAtIndexPath:(NSIndexPath *)indexPath {
    if(editingStyle == UITableViewCellEditingStyleDelete) {
        NSString *urlToRemove = [tableView cellForRowAtIndexPath:indexPath].textLabel.text;
        
        [[MNOAppsMallManager sharedInstance] removeStorefront:urlToRemove];
        
        [UIView animateWithDuration:0.25 animations:^{
            [tableView deleteRowsAtIndexPaths:@[indexPath] withRowAnimation:UITableViewRowAnimationAutomatic];
        } completion:^(BOOL finished) {
            [self reloadTable];
        }];
    }
}

#pragma mark - private methods

- (void)reloadTable {
    //[self.storefrontTable reloadSections:[NSIndexSet indexSetWithIndex:0]
    //                    withRowAnimation:UITableViewRowAnimationNone];
    [self.storefrontTable reloadData];

    int numRows = (int)[self.storefrontTable numberOfRowsInSection:0];
    int newHeight = 0;
    
    if(numRows > 0) {
        NSIndexPath *indexPath = [NSIndexPath indexPathForRow:0 inSection:0];
        int cellHeight = [self.storefrontTable cellForRowAtIndexPath:indexPath].frame.size.height;
        newHeight = numRows * cellHeight;
    }
    
    self.tableHeight.constant = newHeight;
    //self.distanceBetweenTableAndBottom.constant = self.storefrontTable.frame.origin.y + newHeight;
    
    //[self.parentScrollView layoutIfNeeded];
}

@end
