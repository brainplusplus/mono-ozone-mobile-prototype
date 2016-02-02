//
//  AppsMallViewController.h
//  Mono2
//
//  Created by Ben Scazzero on 1/23/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOCustomGridViewDelegate.h"
#import "MNOMenuViewDelegate.h"

@interface MNOAppsMallViewController : UIViewController<MNOCustomGridViewDelegate,MNOMenuViewDelegate>

@property (strong, nonatomic) NSArray * currItems;

@end
