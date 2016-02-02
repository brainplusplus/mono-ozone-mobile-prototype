//
//  MNOModalProcessor.h
//  Mono
//
//  Created by Jason Lettman on 5/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

#import "MNOAPIProcessor.h"

/**
 * The common modal processor. Handles calls to launch a modal from the native app.
 **/
@interface MNOModalProcessor : NSObject<MNOAPIProcessor>

/**
 * ModalProcessor process function.
 * Should support the following methods:
 * - message: Launches a native app modal specifying the message text for the modal.
 * - yesNo: Launches a native app modal allowing the user to provide a Yes or No response.
 * - widget: Launches a native app modal containing another widget.
 * @param method The decoded "function" that will be called.  Must match one of the supported methods.
 * @param params The JSON decoded parameters passed to the function.
 * @param url The original URL.  Unused.
 * @param webView The webView associated with this call.
 * @return An APIResponse containing the success value and any additional values if needed.
 **/
- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView;

@end
