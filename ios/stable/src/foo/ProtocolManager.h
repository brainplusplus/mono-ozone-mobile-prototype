//
//  ProtocolManagerViewController.h
//  foo
//
//  Created by Ben Scazzero on 12/18/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface ProtocolManager : NSURLProtocol

+ (BOOL) isSupportedImageRequest:(NSURLRequest *)request;
+ (BOOL) isSupportedImageExtension:(NSString *)extension;

 
@end
