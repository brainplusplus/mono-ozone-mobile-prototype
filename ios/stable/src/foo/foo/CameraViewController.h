//
//  CameraViewController.h
//  foo
//
//  Created by Ben Scazzero on 12/17/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface CameraViewController : UIViewController<UIWebViewDelegate,UINavigationControllerDelegate, UIImagePickerControllerDelegate>

@property (strong, nonatomic) NSString * baseHTML;
@property (strong, nonatomic) IBOutlet UIWebView * webView;
@end
