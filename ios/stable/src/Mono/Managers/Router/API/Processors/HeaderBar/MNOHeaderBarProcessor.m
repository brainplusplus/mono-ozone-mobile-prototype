//
//  MNOHeaderBarProcessor.m
//  Mono
//
//  Created by Michael Wilson on 5/7/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOHeaderBarProcessor.h"

#import "MNOHttpStack.h"

@implementation MNOHeaderBarProcessor

#pragma mark public methods

- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView {

    [self parseButtons:params webView:webView];
    
    // Return success for now
    return [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
}

#pragma mark - private methods

- (void) parseButtons:(NSDictionary *)params webView:(UIWebView *)webView {
    NSDictionary *payload = [params objectForKey:@"payload"];
    
    if(payload != nil) {
        NSArray *items = [payload objectForKey:@"items"];
        
        // Go through each item
        if(items != nil) {
            for(NSDictionary *item in items) {
                // Extract the interesting parameters from the item
                NSString *text = [item objectForKey:@"text"];
                NSString *iconPath = [item objectForKey:@"icon"];
                //NSString *xtype = [item objectForKey:@"xtype"];
                NSString *type = [item objectForKey:@"type"];
                NSString *callbackGuid = [item objectForKey:@"callbackGuid"];
                
                // Nothing to add -- continue to the next item
                if(text == nil && iconPath == nil && type == nil) {
                    continue;
                }
                
                // Try to get an icon if we have one
                UIImage *icon;
                if (iconPath != nil) {
                    icon = [[MNOHttpStack sharedStack] makeSynchronousRequest:REQUEST_IMAGE url:iconPath];
                }
               
                [webView.chromeDrawer makeNewButton:callbackGuid label:text customIcon:icon defaultIconType:[MNOChromeButton stringToType:type]];
            }
        }
    }
}

@end
