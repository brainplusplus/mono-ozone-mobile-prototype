//
//  AccelerometerViewController.h
//  foo
//
//  Created by Ben Scazzero on 12/17/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface AccelerometerViewController : UIViewController<UIAccelerometerDelegate, UIWebViewDelegate>

@property (strong, nonatomic) IBOutlet UIWebView * webView;

@end
