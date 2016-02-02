//
//  LoginViewController.m
//  Mono
//
//  Created by Ben Scazzero on 4/29/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#include <Foundation/Foundation.h>

#import "MNOLoginViewController.h"
#import "MNOMainViewController.h"
#import "MNOUserDownloadService.h"
#import "MNOHttpStack.h"
#import "MNOUser.h"
#import "MNOAccountManager.h"
#import "MNOConfigurationManager.h"
#import "SDCAlertView.h"

@interface MNOLoginViewController ()

/**
 *  Server URL to Hit (i.e. https://monoval.42six.com...)
 */
@property (weak, nonatomic) IBOutlet UITextField * logInURL;
/**
 *  Main View containg all the other Login Text Fields and Buttons
 */
@property (weak, nonatomic) IBOutlet UIView *mainLoginView;
/**
 *  Allows the 'mainLoginView' to scroll up and down. This is necessary primarily when the
 *  iPhone is being shown horizontally.
 */
@property (weak, nonatomic) IBOutlet UIScrollView *mainScrollView;

/**
 *  White Background of the Loading Screen
 */
@property (strong, nonatomic) UIView * loadingView;
/**
 *  Label to indicate where we are in the loading process
 */
@property (strong, nonatomic) UILabel * loadingLabel;
/**
 *  Spinning Indicator for the user
 */
@property (strong, nonatomic) UIActivityIndicatorView * loadingIndicator;
/**
 *  Gray background behind the spinner for asthetic purposes.
 */
@property (strong, nonatomic) UIView * loadingIndicatorBackground;


@end

@implementation MNOLoginViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
    }
    return self;
}

#pragma mark - View Callbacks

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    // Load any previously stored login info into the shared manager
    [[MNOAccountManager sharedManager] loadLoginInfo];
    
    // Get the server/login info from the plist
    NSString *serverPlist = [[NSBundle mainBundle] pathForResource:@"Server" ofType:@"plist"];
    NSDictionary *serverDictionary = [[NSDictionary alloc] initWithContentsOfFile:serverPlist];
    
    NSString *plistServer = [serverDictionary objectForKey:@"serverBaseUrl"];
    NSString *plistCert = [serverDictionary objectForKey:@"serverCert"];
    
    // Show the most recent logged in user in the text field
    self.logInName.text = [MNOAccountManager sharedManager].p12Name && [MNOAccountManager sharedManager].p12Data ? [MNOAccountManager sharedManager].p12Name : plistCert;
    self.logInURL.text = [MNOAccountManager sharedManager].serverBaseUrl ? [MNOAccountManager sharedManager].serverBaseUrl : plistServer;
    
    // Used to retrieve keyboard height and width
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(keyboardWasShown:)
                                                 name:UIKeyboardDidShowNotification
                                               object:nil];
    
    
    // If the p12 data is nil, attempt to read from the main bundle
    if([MNOAccountManager sharedManager].p12Data == nil) {
        if(self.logInName != nil) {
            NSString *pathToCert = [[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:self.logInName.text];
            [MNOAccountManager sharedManager].p12Data = [NSData dataWithContentsOfFile:pathToCert];
        }
    }
}

- (void) viewWillLayoutSubviews
{
    [super viewWillLayoutSubviews];
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


#pragma -mark Sign In

/**
 *  Center the loading screen (white), the loading text status, and spinner when being shown using the Auto-Layout feature.
 */
- (void) applyConstraints
{
    [self.loadingView mas_makeConstraints:^(MASConstraintMaker *make) {
        make.edges.equalTo(self.view);
    }];
    
    [self.loadingLabel mas_makeConstraints:^(MASConstraintMaker *make) {
        make.center.equalTo(self.view).centerOffset(CGPointMake(0, -self.loadingLabel.frame.size.height));
        make.width.equalTo(@(self.loadingLabel.frame.size.width));
        make.height.equalTo(@(self.loadingLabel.frame.size.height));
    }];

    [self.loadingIndicatorBackground mas_makeConstraints:^(MASConstraintMaker *make) {
        make.center.equalTo(self.view);
        make.width.equalTo(@(self.loadingIndicatorBackground.frame.size.width));
        make.height.equalTo(@(self.loadingIndicatorBackground.frame.size.height));
    }];
    
    
    [self.loadingIndicator mas_makeConstraints:^(MASConstraintMaker *make) {
        make.center.equalTo(self.loadingIndicatorBackground);
        make.width.equalTo(@(self.loadingIndicator.frame.size.width));
        make.height.equalTo(@(self.loadingIndicator.frame.size.height));
    }];
}

/**
 *  Called when the sign on process has completed. Dismisses the LoginViewController
 */
- (void) signInComplete
{
    MNOMainViewController * main =  (MNOMainViewController *)self.presentingViewController;
    main.signedIn = YES;
    
    // Save off the login info for the subsequent run
    [[MNOAccountManager sharedManager] saveLoginInfo];
    
    [self dismissViewControllerAnimated:YES completion:nil];
}

/**
 *  Called to Load the User's Dashboards, Group Data and Widgets
 *
 *  @param user    The current logged in user
 *  @param service The service used to download the user's content
 */
- (void) loadUserContent:(MNOUser *)user usingService:(MNOUserDownloadService *)service
{
    [service loadContentsForUser:user withSuccess:^(NSString *status, int code) {
        self.loadingLabel.text = status;
        if (code == LOADING_COMPLETE){
            [MNOAccountManager sharedManager].user = user;
            [self signInComplete];
        }
    }];
}

/**
 * Processes the authentication of the user. Checks to see if the server uses
 * the OpenAM security provider, if so authenticates against that and if not
 * use standard authentication methods.
 */

- (void) processSignIn {
    // Show Loading Screen
    [self.view addSubview:self.loadingView];
    [self applyConstraints];
    [self.loadingIndicator startAnimating];
    
    MNOUserDownloadService * service = [[MNOUserDownloadService alloc] init];
    // Verify User
    [service loadUserWithCredentialsSuccess:^(NSString *status, int code, MNOUser *user) {
        // Update Status
        self.loadingLabel.text = status;
        
        if (code == LOADED_FROM_DB) {
            // We have this user saved in our db
            [MNOAccountManager sharedManager].user = user;
            [self signInComplete];
        }else{
            // We need to download this user's widgets and dashboards now
            [self loadUserContent:user usingService:service];
        }
    } orFailure:^(NSError *error) {
        // Quit Program is all else fails
        [[MNOUtil sharedInstance] showMessageBox:@"Unable to sign in" message:@"Couldn't sign in!  Please check your network connection."];
        
        // Hide the loading view
        self.loadingView.hidden = TRUE;
        self.loadingView = nil;
    }];
}

/**
 *  Triggered When the User Select's the Log In button.
 *
 *  @param sender The UIButton the user selected
 */
- (IBAction)signIn:(id)sender {
    //resign the keyboard (whether it was accessed or not)
    [self.logInName resignFirstResponder];
    [self.logInURL resignFirstResponder];
    
    //Try to log in using these settings:
    NSString *userCert = self.logInName.text;
    NSString * logInUrl = self.logInURL.text;
    logInUrl = [logInUrl stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
    // Assign Global App Properties
    [MNOAccountManager sharedManager].p12Name = userCert;
    [MNOAccountManager sharedManager].serverCert = SERVER_CERT_NAME;
    [MNOAccountManager sharedManager].widgetBaseUrl = [[[NSURL URLWithString:logInUrl] URLByDeletingLastPathComponent] absoluteString];
    [MNOAccountManager sharedManager].serverBaseUrl = [self formatServerURL:self.logInURL.text];
    
    //Make sure we clear any saved properties in NSURLConnection
    [[NSURLCache sharedURLCache] removeAllCachedResponses];
   
    // Prompt for a password
    SDCAlertView *passwordPrompt = [[SDCAlertView alloc] initWithTitle:@"Certificate password"
                                                               message:@"Please enter the password to use with this certificate"
                                                              delegate:nil
                                                     cancelButtonTitle:@"Cancel"
                                                     otherButtonTitles:@"OK", nil];
    
    passwordPrompt.alertViewStyle = UIAlertViewStyleSecureTextInput;
    
    [passwordPrompt showWithDismissHandler:^(NSInteger buttonIndex) {
        if(buttonIndex == 1) {
            NSString *password = [passwordPrompt textFieldAtIndex:0].text;
            
            if([[MNOHttpStack sharedStack] loadCert:[MNOAccountManager sharedManager].p12Data password:password] == FALSE) {
                [[[SDCAlertView alloc] initWithTitle:@"Error"
                                             message:@"Unable to use the supplied password with this certificate!"
                                            delegate:nil
                                   cancelButtonTitle:@"Cancel"
                                   otherButtonTitles:nil] show];
            }
            else {
                //Verify that the cert is still valid.
                [self processSignIn];
            }
        }
    }];
    
}

- (void)selectCert:(UIGestureRecognizer *)gestureRecognizer {
    NSLog(@"Select cert!");
}
                                          
#pragma mark - Utilities
/**
 *  Appends the 'owf' path onto the base URL required for logging in.
 *
 *  @param str Input URL from user
 *
 *  @return Input URL with an '/owf' path appended to it.
 */
- (NSString *) formatServerURL:(NSString *)str
{
    //Check for "/" character at end of string
    if(! [[str substringFromIndex:[str length] - 1] isEqualToString:@"/"] ){
        str =  [str stringByAppendingString:@"/"];
    }

    return  str;
}

#pragma mark - Getters/Setters

- (UIView *) loadingView
{
    if(!_loadingView){
        _loadingView = [[UIView alloc] initWithFrame:self.view.frame];
        _loadingView.backgroundColor = [UIColor whiteColor];
        [_loadingView addSubview:self.loadingLabel];
        [_loadingView addSubview:self.loadingIndicatorBackground];
    }
    return _loadingView;
}

- (UILabel *) loadingLabel
{
    if (!_loadingLabel) {
        CGRect parentFrame = self.view.frame;
        _loadingLabel = [[UILabel alloc] initWithFrame:CGRectMake(0, 0, parentFrame.size.width * .80 , parentFrame.size.height * .10)];
        _loadingLabel.numberOfLines = 3;
        _loadingLabel.textAlignment = NSTextAlignmentCenter;
    }
    
    return _loadingLabel;
}

- (UIView *) loadingIndicatorBackground
{
    if (!_loadingIndicatorBackground) {
        CGRect loadingFrame = self.loadingIndicator.frame;
        _loadingIndicatorBackground = [[UIView alloc] initWithFrame:CGRectMake(0, 0, loadingFrame.size.width + 20, loadingFrame.size.width+20)];
        _loadingIndicatorBackground.layer.cornerRadius = 5.0f;
        _loadingIndicatorBackground.backgroundColor = [UIColor grayColor];
        [self.loadingIndicatorBackground addSubview:self.loadingIndicator];
    }
    
    return _loadingIndicatorBackground;
}

- (UIActivityIndicatorView *) loadingIndicator
{
    if (!_loadingIndicator) {
        _loadingIndicator = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleWhiteLarge];
        CGRect frame = _loadingIndicator.frame;
        frame.origin = CGPointMake(10, 10);
        _loadingIndicator.frame = frame;
    }
    
    return _loadingIndicator;
}

#pragma mark - UITextFieldDelegate

- (BOOL) textFieldShouldReturn:(UITextField *)textField
{
    [textField resignFirstResponder];
    return YES;
}

- (BOOL)textFieldShouldBeginEditing:(UITextField *)textField {
    if(textField == self.logInName) {
        [self performSegueWithIdentifier:@"certSelection" sender:self];
        return NO;
    }
    
    return YES;
}

#pragma mark - Notifications
- (void)keyboardWasShown:(NSNotification *)notification
{
    // Get the size of the keyboard.
    //CGSize keyboardSize = [[[notification userInfo] objectForKey:UIKeyboardFrameBeginUserInfoKey] CGRectValue].size;
    // Make scroll view larger by making view larger
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
