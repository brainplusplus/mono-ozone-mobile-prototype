//
//  LoginViewController.h
//  Mono
//
//  Created by Ben Scazzero on 4/29/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface MNOLoginViewController : UIViewController<UITextFieldDelegate>

/**
 *  User's Login Cert (i.e. bscazzero.p12)
 */
@property (weak, nonatomic) IBOutlet UITextField * logInName;

@end
