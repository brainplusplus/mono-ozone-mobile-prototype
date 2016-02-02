//
//  AppsBuilderViewController.h
//  Mono2
//
//  Created by Ben Scazzero on 1/23/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOMenuViewDelegate.h"
#import "MNOCustomGridViewDelegate.h"

@interface MNOAppsBuilderViewController : UIViewController<UITextFieldDelegate,MNOMenuViewDelegate,MNOCustomGridViewDelegate>

@property (strong, nonatomic) NSMutableArray * currItems;

@end
