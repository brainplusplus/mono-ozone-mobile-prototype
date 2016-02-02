//
//  ModalEventsViewController.h
//  foo
//
//  Created by Ben Scazzero on 1/8/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "ViewController.h"

@interface ModalManager : NSObject<UIAlertViewDelegate>

/**
 Shows a modal with a Title, Message, Yes, No and Cancel Buttons. The 
 
 @param title
 The title of modal
 @param message
 The message of the modal.
 
 @return {'status':'success'} if processed correctly, otherwise {'status':'failure'}
 */
- (NSData *) showYesNoModalTitle:(NSString *)title message:(NSString *)message withParams:(NSDictionary *)params;

/**
 Shows a modal with a Title, Message, and Ok Button. The Ok button is used to dismiss the modal.
 
 @param title
 The title of modal
 @param message
 The message of the modal.
 
 @return {'status':'success'} if processed correctly, otherwise {'status':'failure'}
 */
- (NSData *) showlTitle:(NSString *)title message:(NSString *)message withParams:(NSDictionary *)params;

/**
 Modals are shown and configured through the ModalManager. ModalManager adopts a singelton design patter.
 
 @return ModalManager
 */
+(ModalManager *) sharedInstance;

@end
