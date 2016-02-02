//
//  AppsBuilderViewController.m
//  Mono2
//
//  Created by Ben Scazzero on 1/23/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAppsBuilderViewController.h"
#import "MNOCustomGridView.h"
#import "MNOAppsMallViewController.h"
#import "MNODashboard.h"
#import "MNOUser.h"
#import "MNOAppDelegate.h"
#import "MNOTopMenuView.h"
#import "MNOCustomUnwind.h"
#import "MNOWidget.h"
#import "MNOAppView.h"

@interface MNOAppsBuilderViewController ()

/* Popup Stuff */
@property (weak, nonatomic) IBOutlet UILabel * errorLabel;
@property (weak, nonatomic) IBOutlet UIView *popUpView;
@property (weak, nonatomic) IBOutlet UIButton *popUpOk;
@property (weak, nonatomic) IBOutlet UITextField *popUpName;
@property (weak, nonatomic) IBOutlet UIView *popUpBackground;

/* Add Tile */
@property (strong, nonatomic) NSManagedObject * defaultTile;
/* Grid */
@property (strong, nonatomic) MNOCustomGridView * cgv;
@property (strong, nonatomic) MNODashboard * dashboard;
@property (strong, nonatomic) NSManagedObjectContext * moc;
/* Top Menu */
@property (strong, nonatomic) MNOTopMenuView * topMenuMore;
/* Keyboard */
@property (nonatomic, getter = isKeyboardShowing) BOOL keyboardShowing;

@end

@implementation MNOAppsBuilderViewController

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
    self.view.backgroundColor = [UIColor colorWithPatternImage: [UIImage imageNamed:@"bkg_stripe_dark.png"]];
    self.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

    [self loadDefault];
}

-(void)viewDidLayoutSubviews
{
    [super viewDidLayoutSubviews];
}

- (void) viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    [self initNotifs];
}

- (void) viewWillDisappear:(BOOL)animated
{
    [super viewWillDisappear:animated];
    [self uninitNotifs];
}

#pragma mark - Notifications

- (void) initNotifs
{
    NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
    [center addObserver:self selector:@selector(more:) name:moreSelected object:nil];
    [center addObserver:self selector:@selector(noticeShowKeyboard:) name:UIKeyboardDidShowNotification object:nil];
    [center addObserver:self selector:@selector(noticeHideKeyboard:) name:UIKeyboardWillHideNotification object:nil];
}

- (void) uninitNotifs
{
    NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
    [center removeObserver:self name:moreSelected object:nil];
    [center removeObserver:self name:UIKeyboardDidShowNotification object:nil];
    [center removeObserver:self name:UIKeyboardWillHideNotification object:nil];
}


- (void) loadDefault
{
    CGRect frame = self.view.frame;

    MNOCustomGridView * cgv = [[MNOCustomGridView alloc] initWithFrame:CGRectMake(0, 0, frame.size.width, frame.size.height)
                                                        withList:@[self.defaultTile]
                                                        withSize:CGSizeMake([MNOAppView standardWidth],[MNOAppView standardHeight])];
    
    cgv.topSpacing = 35;
    cgv.minColSpacing = 15;
    cgv.rowSpacing = 15;
    cgv.gridDelegate = self;
    self.popUpView.layer.cornerRadius = 5.0f;
    
    [[self view] addSubview:cgv];
    self.cgv = cgv;
    [self.cgv setHidden:YES];
    [self.cgv setCenterMenuContents:@{@"Remove": @"Remove",@"Close":@"Close"}];
    
    [cgv mas_makeConstraints:^(MASConstraintMaker *make) {
        make.edges.equalTo(self.view);
    }];
}

#pragma -mark AppViewDelegate

-(BOOL) entryIsRemovable:(id)entry
{
    MNOWidget * widget = entry;
    return [widget.widgetId intValue] >= 0;
}

-(void)entrySelected:(NSManagedObject *)chosenView
{
    if([[chosenView valueForKey:@"widgetId"] intValue] == -1){
        //hide menu if its currently showing
        [self.topMenuMore setHidden:YES];
        //Add Button Pressed
        [self performSegueWithIdentifier:widgetSegue sender:nil];
    }
}

-(void)entryRemoved:(id)entry
{
    MNOWidget * widget = entry;
    NSString * widgetId = widget.widgetId;
    
    int counter = 0;
    for (MNOWidget  * matchingWidget in self.currItems) {
        if ([matchingWidget.widgetId isEqualToString:widgetId]) {
            [self.currItems removeObjectAtIndex:counter];
            [self validityCheck];
            break;
        }
        
        counter++;
    }
}

/* Menus */

-(void)more:(NSNotification *)notif
{
    if(self.topMenuMore.superview)
        self.topMenuMore.hidden = !self.topMenuMore.hidden;
    else{
        [[self view] addSubview:self.topMenuMore];
        self.topMenuMore.hidden = NO;
    }
}

- (void) optionSelectedKey:(NSString *)name withValue:(id)value
{
    if ([name isEqualToString:@"Rename"]) {
        [self.popUpBackground setHidden:NO];
        [self.cgv setHidden:YES];
    }else if([name isEqualToString:@"Delete"]){
        [self.popUpBackground setHidden:NO];
        [self.cgv setHidden:YES];
        [self deleteCurrentDashboard];
    }else if( [name isEqualToString:@"New"]){
        [self.popUpBackground setHidden:NO];
        [self.cgv setHidden:YES];
        [self startNewDashboard];
    }
    
    self.topMenuMore.hidden = YES;
}

- (void) startNewDashboard
{
    //save if we have sufficent data
    [self validityCheck];
    //reset our dashboard
    self.dashboard = nil;
    
    [self.currItems removeAllObjects];
    [self.cgv replaceCurrentViewsWithList:@[self.defaultTile]];
    self.popUpName.text = @"";
    [[NSNotificationCenter defaultCenter] postNotificationName:dismissController object:nil];
}

- (void) deleteCurrentDashboard
{
    if(self.dashboard){
        [self.moc deleteObject:self.dashboard];
        self.dashboard = nil;
        [self save];
    }
    
    [self.currItems removeAllObjects];
    [self.cgv replaceCurrentViewsWithList:@[self.defaultTile]];
    self.popUpName.text = @"";
    [[NSNotificationCenter defaultCenter] postNotificationName:dismissController object:nil];
}

/* Pop Up Controls */
- (BOOL) textFieldShouldReturn:(UITextField *)textField
{
    [textField resignFirstResponder];
    [self popUpOk:self.popUpOk];
    return NO;
}

- (IBAction)popUpOk:(id)sender {
    
    if([self nameCheck]){
        //update the name in the top menu bar with notification
        [[NSNotificationCenter defaultCenter] postNotificationName:widgetSegue object:self.popUpName.text];

        [self.errorLabel setHidden:YES];
        [self.popUpBackground setHidden:YES];
        //[self.popUpBackground setBackgroundColor:[UIColor blueColor]];
        [self.popUpName resignFirstResponder];
        [self.cgv setHidden:NO];
        
        //if user buids dashboard but renames it, make sure the new name get set;
        [self validityCheck];
        
    }else{
        [self.errorLabel setHidden:NO];
    }
}


/* Segues */

-(void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender
{
    // Unregister Notifications
    [self uninitNotifs];
    
    if ([segue.identifier isEqualToString:widgetSegue]) {
        //prepare
        MNOAppsMallViewController * apvc = segue.destinationViewController;
        [apvc setCurrItems:self.currItems];
    }
}


- (IBAction)unwindToThisViewController:(UIStoryboardSegue *)unwindSegue
{
    if([unwindSegue.identifier isEqualToString:dismissController]){
        [self initNotifs];
        
        MNOAppsMallViewController * apvc = unwindSegue.sourceViewController;
       
        self.currItems  = [NSMutableArray arrayWithArray:apvc.currItems];
        //save new dashboard
        [self validityCheck];

        //show new widgets
        [self.cgv replaceCurrentViewsWithList:self.currItems];
        [self.cgv addNewObjects:@[self.defaultTile]];
    }
}

/* Validitiy Check */

- (BOOL) validityCheck
{
    //if we've added at least 1 element, make sure we have a title before exiting/saving
   if(self.currItems.count > 0){
       
       if (!self.dashboard) {
           MNOUser * user = [[MNOAccountManager sharedManager] user];
           MNODashboard * dashboard = [MNODashboard initWithManagedObjectContext:self.moc];
           [user addDashboardsObject:dashboard];
           self.dashboard = dashboard;
       }
       
        //remove all the previous widgets
       [self.dashboard removeWidgets:self.dashboard.widgets];
       
       for (MNOWidget * widget in self.currItems) {
            MNOWidget * newWidget = (MNOWidget *)[MNOWidget clone:widget inContext:self.moc];
            newWidget.user =  [MNOAccountManager sharedManager].user;
            newWidget.original = @YES;
            newWidget.isDefault = @NO;
            newWidget.instanceId =  [[[[NSUUID alloc] init] UUIDString] lowercaseString];

            [self.dashboard addWidgetsObject:newWidget];
        }
        
       self.dashboard.name = self.popUpName.text;
       self.dashboard.dashboardId = [[[[NSUUID alloc] init] UUIDString] lowercaseString];

       [self save];
       
        return YES;
   
   } else {
       //if the user added widgets to a dashboard, then removed them, make sure we've
       //removed the dashboard from memory (the user can naviate away at any time).
       if(self.dashboard){
           [self.moc deleteObject:self.dashboard];
           self.dashboard = nil;
           [self save];
       }
   }
    
    return  NO;
}

- (BOOL) nameCheck
{
    NSString * name = self.popUpName.text;
    if (name.length > 0) {
        NSRegularExpression *regex = [[NSRegularExpression alloc]
                                       initWithPattern:@"[a-zA-Z0-9]" options:0 error:NULL];
        
        // Assuming you have some NSString `myString`.
        NSUInteger matches = [regex numberOfMatchesInString:name options:0
                                                      range:NSMakeRange(0, [name length])];
        
        return matches > 0;
    }
    
    return NO;
}

- (MNOWidget *) widgetWithId:(NSString *)widgetId
{
    NSFetchRequest * request  = [[NSFetchRequest alloc] init];
    [request setEntity:[NSEntityDescription entityForName:[MNOWidget entityName] inManagedObjectContext:self.moc]];
    [request setPredicate:[NSPredicate predicateWithFormat:@"widgetId==%@",widgetId]];
    
    NSError * err;
    NSArray * results = [self.moc executeFetchRequest:request error:&err];
    MNOWidget * widget  = nil;
    
    if (!err && [results count] == 1) {
        widget = [results objectAtIndex:0];
    }
    
    return widget;
}

- (NSManagedObjectContext *) moc
{
    return [[MNOUtil sharedInstance] defaultManagedContext];
}

- (void) save
{
    NSError * error;
    
    // Force a dashboard reload
    if([self.moc hasChanges]) {
        [MNOAccountManager sharedManager].dashboards = nil;
    }
    
    if ([self.moc hasChanges] && ![self.moc save:&error]) {
        NSLog(@"Unresolved error %@, %@", error, [error userInfo]);
        [[MNOUtil sharedInstance] showMessageBox:@"Error saving data" message:@"Unable to save data.  Changes may not persist after this application closes."];
    }
}

/* Rotations */

-(void)willAnimateRotationToInterfaceOrientation:(UIInterfaceOrientation)toInterfaceOrientation duration:(NSTimeInterval)duration
{
    //special case, if the popup is still showing, we have to move it so the user can still
    //see what he's typing.
    if (UIInterfaceOrientationIsLandscape(toInterfaceOrientation)){
        if (!self.popUpBackground.hidden) {
            CGRect frame = self.popUpView.frame;
            CGRect superFrame = self.view.frame;
            frame.origin.x = (superFrame.size.width-frame.size.width)/2.0;
            if (self.keyboardShowing) {
                //frame.origin.y -= 60;
            }
            self.popUpView.frame = frame;
        }
    }else{//portrait
        if (!self.popUpBackground.hidden) {
            CGRect frame = self.popUpView.frame;
            CGRect superFrame = self.view.frame;
            frame.origin.x = (superFrame.size.width-frame.size.width)/2.0;
            if (self.keyboardShowing) {
                //frame.origin.y += 60;
            }
            self.popUpView.frame = frame;
        }
    }
}


/* Keyboard */

-(void) noticeShowKeyboard:(NSNotification *)inNotification {
	self.keyboardShowing = YES;
}

-(void) noticeHideKeyboard:(NSNotification *)inNotification {
    self.keyboardShowing = NO;
}

/* View Controller Transitions */

-(void)willMoveToParentViewController:(UIViewController *)parent
{
    [super willMoveToParentViewController:parent];
    if (parent == nil) {
        [[NSNotificationCenter defaultCenter] postNotificationName:dismissController object:nil];
        
    }
}

#pragma mark - Setters/Getters

- (MNOTopMenuView *) topMenuMore
{
    if(!_topMenuMore){
        
        MNOTopMenuView * menu = [[MNOTopMenuView alloc] initWithSize:CGSizeMake(rowWidth, 3*rowHeight)
                                                            contents:@{@"New": @"New", @"Rename": @"Rename",@"Delete":@"Delete"}
                                                          alignRight:YES];
        
        _topMenuMore = menu;
        _topMenuMore.delegate = self;
    }
    
    return _topMenuMore;
}


- (NSManagedObject *) defaultTile
{
    if (!_defaultTile) {
        NSEntityDescription *entity = [NSEntityDescription entityForName:[MNOWidget entityName] inManagedObjectContext:self.moc];
        NSManagedObject * mo  = [[NSManagedObject alloc] initWithEntity:entity insertIntoManagedObjectContext:nil];
 
        [mo setValue:@"Add" forKey:@"name"];
        [mo setValue:@"icon_appbuilder_" forKey:@"largeIconUrl"];
        [mo setValue:@"-1" forKey:@"widgetId"];
        _defaultTile = mo;
    }
    
    return _defaultTile;
}
@end
