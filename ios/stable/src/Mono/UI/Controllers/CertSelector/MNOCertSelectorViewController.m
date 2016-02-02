//
//  CertSelectorViewController.m
//  Mono
//
//  Created by Michael Wilson on 5/28/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOCertSelectorViewController.h"

#import "MNOAccountManager.h"
#import "MNOLoginViewController.h"

#define MNO_UP_DIRECTORY @".."
#define MNO_EMPTY @"---- Empty ----"
#define MNO_BUILT_IN_ASSETS @"-- Built in"

@interface MNOCertSelectorViewController ()

@property (weak, nonatomic) IBOutlet UITableView *tableView;

@end

@implementation MNOCertSelectorViewController {
    NSString *documentPath;
    NSString *currentPath;
    NSMutableArray *currentFiles;
    NSString *currentlySelectedFile;
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

    // Set this class to be the data source and delegate for this view
    [self.tableView setDataSource:self];
    [self.tableView setDelegate:self];
    
    // Append a clear footer to the end of the table view
    UIView *footer = [[UIView alloc] initWithFrame:CGRectZero];
    footer.backgroundColor = [UIColor clearColor];
    
    self.tableView.tableFooterView = footer;
    
    // Get the user's document path -- we want to display this
    documentPath = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) lastObject];
    
    currentFiles = [[NSMutableArray alloc] init];
    
    [self loadPath:documentPath];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (IBAction)done {
    MNOLoginViewController *loginVC = (MNOLoginViewController *)self.presentingViewController;
    
    // If no file is selected, show an error
    if(currentlySelectedFile == nil) {
        [[MNOUtil sharedInstance] showMessageBox:@"Error" message:@"No file selected!"];
    }
    // Otherwise, read it in and dismiss this modal
    else {
        NSString *certPath = [currentPath stringByAppendingPathComponent:currentlySelectedFile];
        NSData *certData =[NSData dataWithContentsOfFile:certPath];
        
        loginVC.logInName.text = currentlySelectedFile;
        [MNOAccountManager sharedManager].p12Name = currentlySelectedFile;
        [MNOAccountManager sharedManager].p12Data = certData;
        
        [self dismissViewControllerAnimated:TRUE completion:nil];
    }
}

- (IBAction)cancel {
    // Dismiss the modal
    [self dismissViewControllerAnimated:TRUE completion:nil];
}

#pragma mark - UITableViewDelegate methods

- (void)tableView:(UITableView *)tableView willDisplayCell:(UITableViewCell *)cell forRowAtIndexPath:(NSIndexPath *)indexPath {
    long row = indexPath.row;
    
    // The file file path to the cert
    NSString *filePath = [currentPath stringByAppendingPathComponent:[currentFiles objectAtIndex:row]];
    
    cell.backgroundColor = [UIColor clearColor];
    
    // Empty directories are shown in red and are not selectable
    if([cell.textLabel.text isEqualToString:MNO_EMPTY] == TRUE) {
        cell.selectionStyle = UITableViewCellSelectionStyleNone;
        cell.textLabel.textColor = [UIColor redColor];
        cell.detailTextLabel.textColor = [UIColor redColor];
    }
    // Built in assets are shown in green
    else if([cell.textLabel.text isEqualToString:MNO_BUILT_IN_ASSETS] == TRUE) {
        cell.textLabel.textColor = [UIColor greenColor];
        cell.detailTextLabel.textColor = [UIColor greenColor];
    }
    // Directories are shown in blue
    else if([self isDirectory:filePath]) {
        cell.textLabel.textColor = [UIColor blueColor];
        cell.detailTextLabel.textColor = [UIColor blueColor];
    }
    // Everything else is white
    else {
        cell.textLabel.textColor = [UIColor whiteColor];
        cell.detailTextLabel.textColor = [UIColor whiteColor];
    }
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath {
    // Every time we select a file, assign it to "currentlySelectedFile"
    NSString *file = [tableView cellForRowAtIndexPath:indexPath].textLabel.text;
    currentlySelectedFile = file;
}

- (NSIndexPath *)tableView:(UITableView *)tableView willSelectRowAtIndexPath:(NSIndexPath *)indexPath {
    NSString *label = [tableView cellForRowAtIndexPath:indexPath].textLabel.text;
    NSString *fullPath = [currentPath stringByAppendingPathComponent:label];
    
    // This is a special empty tag.  Don't highlight this
    if([label isEqualToString:MNO_EMPTY]) {
        return nil;
    }
    // If the user tries to go up a directory
    else if([label isEqualToString:MNO_UP_DIRECTORY]) {
        NSString *newPath;
        
        // If we were not previously looking at built in assets
        if([currentPath isEqualToString:[[NSBundle mainBundle] resourcePath]] == FALSE) {
            // Get the path without the most recent directory
            newPath = [currentPath stringByDeletingLastPathComponent];
            
            // If we can't find the documentPath in the newPath, we may have gone up too far
            // Set the newPath equal to the document path
            if([documentPath rangeOfString:newPath].location == NSNotFound) {
                newPath = documentPath;
            }
        }
        // If we were previously looking at built in assets, just load the root again
        else {
            newPath = documentPath;
        }
        
        [self loadPath:newPath];
        return nil;
    }
    // Load the special built in certs
    else if([label isEqualToString:MNO_BUILT_IN_ASSETS]) {
        [self loadBuiltInAssets];
        return nil;
    }
    // If the user selects a directory, descend into it
    else if ([self isDirectory:fullPath]) {
        [self loadPath:fullPath];
        return nil;
    }
    
    return indexPath;
}

#pragma mark - UITableViewDataSource methods

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {
    // Read from the currentFiles array as a data source
    UITableViewCell *newCell = [[UITableViewCell alloc] init];
    long row = indexPath.row;
    
    newCell.textLabel.text = [currentFiles objectAtIndex:row];
    
    return newCell;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    // Number of current files == the number of rows
    return [currentFiles count];
}

#pragma mark - private methods

- (void)loadPath:(NSString *)path {
    NSArray *directoryFiles = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:path error:nil];
    
    // Remove all current files and assign this path to be our current path
    [currentFiles removeAllObjects];
    
    currentPath = path;
    
    // Display the up directory string and/or the built in assets string if needed
    if([path isEqualToString:documentPath] == false) {
        [currentFiles addObject:MNO_UP_DIRECTORY];
    }
    else {
        [currentFiles addObject:MNO_BUILT_IN_ASSETS];
    }
    
    BOOL hasFiles = FALSE;
    
    // Look for all p12s
    for(NSString *file in directoryFiles) {
        if([[file lowercaseString] hasSuffix:@".p12"] || [self isDirectory:file]) {
            [currentFiles addObject:file];
            hasFiles = TRUE;
        }
    }
    
    // If we found no p12s, display the empty string
    if(hasFiles == FALSE) {
        [currentFiles addObject:MNO_EMPTY];
    }
    
    // Make sure the data is refreshed
    [self.tableView reloadData];
}

- (void)loadBuiltInAssets {
    [currentFiles removeAllObjects];
    
    // Use the main bundle resource path as current to load the assets from
    currentPath = [[NSBundle mainBundle] resourcePath];
    
    // Always show the up directory
    [currentFiles addObject:MNO_UP_DIRECTORY];
    
    BOOL hasFiles = FALSE;
    
    // Read all files in the resource path
    NSArray *directoryFiles = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:currentPath error:nil];
    
    // Look for all p12s
    for(NSString *file in directoryFiles) {
        if([[file lowercaseString] hasSuffix:@".p12"]) {
            [currentFiles addObject:file];
            hasFiles = TRUE;
        }
    }
    
    // If we found no p12s, display the empty string
    if(hasFiles == FALSE) {
        [currentFiles addObject:MNO_EMPTY];
    }
    
    // Make sure the data is refreshed
    [self.tableView reloadData];
}

- (BOOL)isDirectory:(NSString *)path {
    // Return true if the path is a directory, false otherwise
    BOOL isDirectory = FALSE;
    [[NSFileManager defaultManager] fileExistsAtPath:path isDirectory:&isDirectory];
    
    return isDirectory;
}

@end
