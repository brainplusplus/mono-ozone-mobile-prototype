//
//  GPSReaderViewController.h
//  foo
//
//  Created by Ben Scazzero on 12/16/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import <UIKit/UIKit.h>
 

@interface GPSReaderViewController : UIViewController<UIWebViewDelegate>

@property (strong, nonatomic) IBOutlet UIWebView * webView;

@end
