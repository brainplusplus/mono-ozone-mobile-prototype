//
//  ProtocolManagerViewController.h
//  foo
//
//  Created by Ben Scazzero on 12/18/13.
//  Copyright (c) 2013 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface MNOProtocolManager : NSURLProtocol

+ (BOOL) isSupportedImageRequest:(NSURLRequest *)request;
+ (BOOL) isSupportedImageExtension:(NSString *)extension;

@end
