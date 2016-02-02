//
//  PersistentViewController.h
//  foo
//
//  Created by Ben Scazzero on 1/14/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface PersistentViewController : UIViewController<UIWebViewDelegate>

@property (strong, nonatomic) IBOutlet UIWebView * webView;

@end
