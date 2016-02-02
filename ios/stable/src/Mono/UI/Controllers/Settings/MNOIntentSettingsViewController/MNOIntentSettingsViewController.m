//
//  MNOIntentSettingsViewController.m
//  Mono
//
//  Created by Ben Scazzero on 5/14/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOIntentSettingsViewController.h"
#import "MNOCenterMenuView.h"

// Intents
#define defaultIntentLabel @"Allow apps to send and receive intents within Ozone"
// default button labels
#define defaultIntentDashboardMessage @"By Composite App"
#define defaultIntentWidgetMessage @"By App"
#define defaultIntentMessage @"By Intent"
// default clear messages messages
#define defaultClearMessage @"Please Make a Selection"
#define defaultClearDashboardMessage @"Clear All Intents For Dashboard"
#define defaultClearWidgetMessage @"Clear All Intents for Widget"
#define defaultClearIntentMessage @"Clear Intent"



@interface MNOIntentSettingsViewController ()

// Intents
/**
 *  Label to indicate whether the intents is turned on or off
 */
@property (weak, nonatomic) IBOutlet UILabel * intentsOnOff;
/**
 *  Switch to allows user to turn the intents on or off
 */
@property (weak, nonatomic) IBOutlet UISwitch *intentSwitch;
/**
 *  Select a Dashboard
 */
@property (weak, nonatomic) IBOutlet UIButton *intentCompositeButton;
/**
 *  Select a Widget
 */
@property (weak, nonatomic) IBOutlet UIButton *intentAppButton;
/**
 *  Select an Intent
 */
@property (weak, nonatomic) IBOutlet UIButton *intentButton;

/**
 *  Clear Intents Text Area
 */
@property (weak, nonatomic) IBOutlet UITextView *clearTextArea;
/**
 *  Clear Intents Button
 */
@property (weak, nonatomic) IBOutlet UIButton *clearButton;

/**
 *  Dashboard that the user selected
 */
@property (strong, nonatomic) MNODashboard * dash;
/**
 *  Widget that the user selected
 */
@property (strong, nonatomic) MNOWidget * widget;
/**
 *  Intent that the user selected
 */
@property (strong, nonatomic) MNOIntentSubscriberSaved * intent;

/**
 *  All Dashboard that contain at least 1 widget with a saved intent.
 */
@property (strong, nonatomic) NSMutableOrderedSet * dashboards;
/**
 *  All Widgets from a particular dashboard that contain at least 1 saved intent.
 */
@property (strong, nonatomic) NSMutableOrderedSet * widgets;

/**
 *  All Intents given the selected dashboard and widget
 */
@property (strong, nonatomic) NSMutableOrderedSet * intents;
/**
 *  The last object the user selected from either the dashboard/widgets/intents button
 */
@property (strong, nonatomic) NSManagedObject * selectedIntentObject;
/**
 *  Background Menu for the Intent Menu Popup
 */
@property (weak, nonatomic) UIControl * menuBackground;
/**
 *  Handle to our Core Data Context
 */
@property (strong, nonatomic) NSManagedObjectContext * moc;
/**
 *  The main scrollview for the controller
 */
@property (strong, nonatomic) IBOutlet UIScrollView * mainScroll;

/**
 *  Used to show and hide the intent buttons
 */
@property (weak, nonatomic) IBOutlet UIView *intentSelectionView;

@end

@implementation MNOIntentSettingsViewController

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
    [self layoutIntents];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
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


#pragma mark - Intents


/**
 *  Helper Function, Does some minor configuration updates for the views on screen
 */
- (void) layoutIntents
{
    // Style Buttons
    self.clearButton.layer.cornerRadius = 5.0f;
    self.intentCompositeButton.layer.cornerRadius = 5.0f;
    self.intentAppButton.layer.cornerRadius = 5.0f;
    self.intentButton.layer.cornerRadius = 5.0f;
    
    // init intent stuff
    [self resetButtons];
    [self retreiveIntentsData];
    if ([self.dashboards count] > 0) {
        self.intentCompositeButton.enabled = YES;
    }else{
        self.intentCompositeButton.enabled = NO;
    }
    
    // clear button & label
    self.clearTextArea.text = defaultClearMessage;
    
    // check if the user had turned off intents
    MNOUser * user = [[MNOAccountManager sharedManager] user];
    MNOSettings * settings = user.settings;
    if (![settings.allowsIntents boolValue]) {
        self.intentSwitch.on = NO;
        self.intentSelectionView.hidden = YES;
    }
}

/**
 *  Resets the text and state of the intent buttons on screen
 */
- (void) resetButtons
{
    [self.intentButton setEnabled:NO];
    [self.intentAppButton setEnabled:NO];
    
    [self.intentButton setTitle:defaultIntentMessage forState:UIControlStateNormal];
    [self.intentAppButton setTitle:defaultIntentWidgetMessage forState:UIControlStateNormal];
    [self.intentCompositeButton setTitle:defaultIntentDashboardMessage forState:UIControlStateNormal];
}

/**
 *  Retreives the intent data used to populate the dashboard, widget, and intent options on screen
 */
- (void) retreiveIntentsData
{
    // format request
    NSFetchRequest * fetch = [NSFetchRequest fetchRequestWithEntityName:[MNOIntentSubscriberSaved entityName]];
    NSPredicate * pred1 = [NSPredicate predicateWithFormat:@"autoSendIntent != nil"];
    NSPredicate * pred2 = [NSPredicate predicateWithFormat:@"widget.dashboard.user == %@",[MNOAccountManager sharedManager].user ];
    fetch.predicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[pred1,pred2]];
    
    NSError * error = nil;
    NSArray * results = [self.moc executeFetchRequest:fetch error:&error];
    
    NSMutableOrderedSet * dashboards = [[NSMutableOrderedSet alloc] init];
    NSMutableOrderedSet * widgets = [NSMutableOrderedSet orderedSet];
    NSMutableOrderedSet * intents = [NSMutableOrderedSet orderedSet];
    
    //parse results
    if (!error && [results count]) {
        for (MNOIntentSubscriberSaved * iss in results) {
            [dashboards addObject:iss.widget.dashboard];
            [widgets addObject:iss.widget];
            [intents addObject:iss];
        }
        
        NSSortDescriptor * dashboardWidgetSorter = [[NSSortDescriptor alloc] initWithKey:@"name" ascending:YES];
        NSSortDescriptor * actionSorter = [[NSSortDescriptor alloc] initWithKey:@"action" ascending:YES];
        NSSortDescriptor * dataTypeSorter = [[NSSortDescriptor alloc] initWithKey:@"dataType" ascending:YES];
        
        [dashboards sortUsingDescriptors:@[dashboardWidgetSorter]];
        [widgets sortUsingDescriptors:@[dashboardWidgetSorter]];
        [intents sortUsingDescriptors:@[actionSorter, dataTypeSorter]];
        
        self.dashboards = dashboards;
        self.widgets = widgets;
        self.intents = intents;
        
    }else{
        //TODO: unable to execute. send error message
        self.intentCompositeButton.enabled = NO;
        self.dashboards = nil;
        self.widgets = nil;
        self.intents = nil;
    }
}

/**
 *  Creats and shows a CenterMenuView using the content passed in
 *
 *  @param set Content to populat the CenterMenuView
 */
- (void) loadIntentsMenuForSet:(NSMutableOrderedSet *)set
{
    //background
    UIControl * background = [[UIControl alloc] initWithFrame:self.view.frame];
    background.backgroundColor = [UIColor grayColor];
    [background addTarget:self action:@selector(dismissMenu:) forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:background];
    self.menuBackground = background;
    
    //menu
    NSUInteger count = set.count <= 3 ? set.count : 3;
    
    NSMutableDictionary * contents = [NSMutableDictionary new];
    for (NSManagedObject * mo in set) {
        if ([mo isKindOfClass:[MNODashboard class]]){
            MNODashboard * d = (MNODashboard *)mo;
            contents[d.name] = d.objectID;
        }else if([mo isKindOfClass:[MNOWidget class]]){
            MNOWidget * w = (MNOWidget *)mo;
            contents[w.name] = w.objectID;
        }else if( [mo isKindOfClass:[MNOIntentSubscriberSaved class]]){
            MNOIntentSubscriberSaved * iss = (MNOIntentSubscriberSaved *)mo;
            NSString * key = [NSString stringWithFormat:@"%@-%@",iss.action, iss.dataType];
            contents[key] = iss.objectID;
        }
    }
    
    MNOCenterMenuView * menu = [[MNOCenterMenuView alloc] initWithSize:CGSizeMake(200, count * 80) contents:contents];
    menu.delegate = self;
    [self.menuBackground addSubview:menu];
}

/**
 *  Callback for the CenterMenu
 *
 *  @param key   Name that the user selected on the menu
 *  @param value Value associated with the name
 */
- (void) optionSelectedKey:(NSString *) key withValue:(id)value
{
    //remove menu
    [self.menuBackground removeFromSuperview];
    self.menuBackground = nil;
    //
    NSManagedObjectID * identifier = value;
    NSError * error = nil;
    id entity = [self.moc existingObjectWithID:identifier error:&error];
    if (entity && !error) {
        
        [self resetButtons];
        
        if ([identifier.entity.name isEqualToString:[MNODashboard entityName]]){
            MNODashboard * d = (MNODashboard *)entity;
            
            [self.intentCompositeButton setTitle:d.name forState:UIControlStateNormal];
            
            self.dash = d;
            
            self.selectedIntentObject = d;
            self.clearTextArea.text =  defaultClearDashboardMessage;
            
            //enable selection of the widgets button
            [self.intentCompositeButton setEnabled:YES];
            [self.intentAppButton setEnabled:YES];
            [self.intentButton setEnabled:NO];
            
        }else if([identifier.entity.name isEqualToString:[MNOWidget entityName]]){
            MNOWidget * w = (MNOWidget *)entity;
            MNODashboard * d = w.dashboard;
            
            [self.intentCompositeButton setTitle:d.name forState:UIControlStateNormal];
            [self.intentAppButton setTitle:w.name forState:UIControlStateNormal];
            
            self.widget = w;
            self.dash = d;
            
            self.selectedIntentObject = w;
            self.clearTextArea.text =  defaultClearWidgetMessage;
            
            //enable seection of the intents button
            //enable selection of the widgets button
            [self.intentCompositeButton setEnabled:YES];
            [self.intentAppButton setEnabled:YES];
            [self.intentButton setEnabled:YES];
            
        }else if([identifier.entity.name isEqualToString:[MNOIntentSubscriberSaved entityName]]) {
            MNOIntentSubscriberSaved * iss = (MNOIntentSubscriberSaved *)entity;
            MNOWidget * w = iss.widget;
            MNODashboard * d = w.dashboard;
            
            [self.intentCompositeButton setTitle:d.name forState:UIControlStateNormal];
            [self.intentAppButton setTitle:w.name forState:UIControlStateNormal];
            NSString * key = [NSString stringWithFormat:@"%@-%@",iss.action, iss.dataType];
            [self.intentButton setTitle:key forState:UIControlStateNormal];
            
            self.intent = iss;
            self.widget = w;
            self.dash = d;
            
            self.selectedIntentObject = iss;
            self.clearTextArea.text = defaultClearIntentMessage;
            //enable selection of the widgets button
            [self.intentCompositeButton setEnabled:YES];
            [self.intentAppButton setEnabled:YES];
            [self.intentButton setEnabled:YES];
        }
    }
}


/**
 *  Primarily a helper function, called when the user wants to delete all the intents for
 * a given widget or dashboard
 *
 *  @param savedIntents Set of IntentSubscriberSaved objects
 */
- (void) deleteSavedIntentsForSet:(NSSet *)savedIntents
{
    for (MNOIntentSubscriberSaved * iss in savedIntents) {
        if (iss.autoSendIntent) {
            iss.autoSendIntent = nil;
        }
    }
}


#pragma -mark IntentCallbacks

/**
 *  Called when the user selects the "clear" button on screen
 *
 *  @param sender UIButton that the user selected
 */
- (IBAction)clearIntents:(id)sender {
    if (self.selectedIntentObject) {
        if ([self.selectedIntentObject isKindOfClass:[MNODashboard class]]){
            MNODashboard * d = (MNODashboard *) self.selectedIntentObject;
            for (MNOWidget * w in d.widgets)
                [self deleteSavedIntentsForSet:w.intentRegister];
            
            
        }else if([self.selectedIntentObject isKindOfClass:[MNOWidget class]]){
            MNOWidget * w = (MNOWidget *)self.selectedIntentObject;
            [self deleteSavedIntentsForSet:w.intentRegister];
            
        }else if( [self.selectedIntentObject isKindOfClass:[MNOIntentSubscriberSaved class]]){
            MNOIntentSubscriberSaved * iss =  (MNOIntentSubscriberSaved *)self.selectedIntentObject;
            iss.autoSendIntent = nil;
        }
        
        //save
        NSError * error = nil;
        [self.moc save:&error];
        if (!error) {
            self.clearTextArea.text = defaultClearMessage;
            [self resetButtons];
            [self retreiveIntentsData];
            NSLog(@"Successfully Removed Intent");
        }
    }
}

/**
 *  Called when the user toggles the UISwitchView on screen
 *
 *  @param sender UISwitchView that the user toggles
 */
- (IBAction)intentToggle:(UISwitch *)sender {
    if(sender.on){
        self.intentsOnOff.text = @"On";
        self.intentsOnOff.textColor = Rgb2UIColor(79, 175, 54);
        //[self addViewToLayout:self.intentSelectionView];
        self.intentSelectionView.hidden = NO;
    }else{
        self.intentsOnOff.text = @"Off";
        self.intentsOnOff.textColor = [UIColor whiteColor];
        self.intentSelectionView.hidden = YES;
        //[self removeViewFromLayout:self.intentSelectionView];
    }
    
    // Save User preference
    MNOUser * user = [[MNOAccountManager sharedManager] user];
    user.settings.allowsIntents = @(sender.on);
    NSError * error = nil;
    [self.moc save:&error];
    
    if (error) {
        NSLog(@"Unable to Save User Intent Preference");
    }else{
        NSLog(@"Saved User Preference");
    }
}

/**
 *  Intent Button callback
 *
 *  @param sender UIButton
 */
- (IBAction)intentSelect:(id)sender
{
    if([self.intents count])
        [self loadIntentsMenuForSet:self.intents];
}

/**
 *  Intent Widget Button callback
 *
 *  @param sender UIButton
 */
- (IBAction)intentAppSelect:(id)sender
{
    if([self.widgets count])
        [self loadIntentsMenuForSet:self.widgets];
}

/**
 *  Intent Dashboard Button Callback
 *
 *  @param sender UIButton
 */
- (IBAction)intentCompositeSelect:(id)sender
{
    if([self.dashboards count])
        [self loadIntentsMenuForSet:self.dashboards];
}

/**
 *  Callback used to dismiss the CenterMenuView
 *
 *  @param sender UIControl
 */
- (void) dismissMenu:(id)sender
{
    [self.menuBackground removeFromSuperview];
}

#pragma -mark Setters/Getters
- (UIScrollView *)mainScroll
{
    if(!_mainScroll) _mainScroll = [[UIScrollView alloc] initWithFrame:self.view.frame];
    return _mainScroll;
}

- (NSManagedObjectContext *) moc
{
    if (!_moc) {
        _moc = [[MNOUtil sharedInstance] defaultManagedContext];
    }
    return _moc;
}

- (NSMutableOrderedSet *) dashboards
{
    if (!_dashboards) {
        _dashboards = [NSMutableOrderedSet orderedSet];
    }
    return _dashboards;
}
- (NSMutableOrderedSet *) widgets
{
    if (!_widgets) {
        _widgets = [NSMutableOrderedSet orderedSet];
    }
    return _widgets;
}
- (NSMutableOrderedSet *) intents
{
    if (!_intents) {
        _intents = [NSMutableOrderedSet orderedSet];
    }
    return _intents;
}


@end
