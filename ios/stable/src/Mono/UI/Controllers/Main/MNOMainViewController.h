//
//  ViewController.h
//  Mono2
//
//  Created by Ben Scazzero on 1/21/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface MNOMainViewController : UIViewController<NSURLSessionDataDelegate,NSURLConnectionDelegate,NSURLConnectionDataDelegate,NSURLSessionTaskDelegate>

@property (nonatomic) BOOL signedIn;


@end
