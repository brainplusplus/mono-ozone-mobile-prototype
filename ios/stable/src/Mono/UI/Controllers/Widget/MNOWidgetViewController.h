//
//  WidgetViewController.h
//  Mono2
//
//  Created by Ben Scazzero on 2/6/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOMenuViewDelegate.h"

@class MNOWidget;

@interface MNOWidgetViewController : UIViewController<UIWebViewDelegate, UIGestureRecognizerDelegate,MNOMenuViewDelegate>

@property (strong,nonatomic) id delegate;
@property (strong, nonatomic) MNOWidget * widget;
@end
