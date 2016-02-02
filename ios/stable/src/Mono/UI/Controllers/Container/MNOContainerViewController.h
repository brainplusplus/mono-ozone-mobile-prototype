//
//  ContainerViewController.h
//  Mono2
//
//  Created by Ben Scazzero on 1/23/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface MNOContainerViewController : UIViewController

@property (readonly, nonatomic) BOOL transitionInProgress;
@property (strong,readonly, nonatomic) NSString * currentSegueIdentifier;

- (void) segueVC:(NSString *)vcID;
- (void) signOutUser;
 
@end
