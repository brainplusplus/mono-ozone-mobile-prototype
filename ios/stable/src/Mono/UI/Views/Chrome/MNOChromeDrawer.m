//
//  MNOChromeDrawer.m
//  Mono
//
//  Created by Michael Wilson on 5/6/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOChromeDrawer.h"

#define MONO_WIDTH_PADDING 10
#define MONO_CHROME_HEIGHT 24
#define MONO_CHROME_MAX_WIDTH_PERCENTAGE 1

#define MONO_DRAWER_TOGGLE_TAG 42641053

@implementation MNOChromeDrawer {
    UIWebView *_webView;
    int _width;
    BOOL _open;
    UIButton *_openCloseButton;
    UIScrollView *_buttonScrollView;
    UIImage *_arrowUp;
    UIImage *_arrowDown;
}

#pragma mark constructors

- (id) initWithWebView:(UIWebView *)webView; {
    self = [super init];
    
    if (self) {
        // Get the arrow images
        UIImage *fullArrowUp = [UIImage imageNamed:@"arrow_up_white_@2x.png"];
        UIImage *fullArrowDown = [UIImage imageNamed:@"arrow_down_white_@2x.png"];
        
        // Resize the arrow images -- should be the same size
        CGSize oldSize = fullArrowUp.size;
        double scaleFactor = oldSize.height / oldSize.width;
        CGSize newSize = CGSizeMake(MONO_CHROME_HEIGHT / scaleFactor, MONO_CHROME_HEIGHT);
        
        // Scale arrow up
        UIGraphicsBeginImageContextWithOptions(newSize, NO, 0.0);
        [fullArrowUp drawInRect:CGRectMake(0, 0, newSize.width, newSize.height)];
        _arrowUp = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        
        // Scale arrow down
        UIGraphicsBeginImageContextWithOptions(newSize, NO, 0.0);
        [fullArrowDown drawInRect:CGRectMake(0, 0, newSize.width, newSize.height)];
        _arrowDown = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        
        // Store off the web view
        _webView = webView;
        
        [self resize];
        
        // Let's add our drawer open/close button
        _openCloseButton = [[UIButton alloc] init];
        
        // Set title button/text colors
        [_openCloseButton setTitle:@"OPTIONS" forState:UIControlStateNormal];
        
        [_openCloseButton setImage:_arrowUp forState:UIControlStateNormal];
        
        [_openCloseButton.titleLabel setFont:[UIFont systemFontOfSize:9]];
        [_openCloseButton setTitleColor:[UIColor colorWithRed:0.4 green:0.4 blue:0.4 alpha:1] forState:UIControlStateNormal];
        [_openCloseButton setContentHorizontalAlignment:UIControlContentHorizontalAlignmentRight];
        [_openCloseButton setContentEdgeInsets:UIEdgeInsetsMake(0, 12, 0, 12)];
        [_openCloseButton setAutoresizingMask:(UIViewAutoresizingFlexibleWidth)];
        
        
        // This button is a rectangle that sits on top of the chrome box
        _openCloseButton.frame = CGRectMake(0, 0,
                                 webView.frame.size.width,
                                 MONO_CHROME_HEIGHT);
        [_openCloseButton addTarget:self action:@selector(dispatchChromeButtonAction:) forControlEvents:UIControlEventTouchUpInside];
        _openCloseButton.tag = MONO_DRAWER_TOGGLE_TAG; // Special tag for later recognition
        
        // Set up the widget button housing
        _buttonScrollView = [[UIScrollView alloc] initWithFrame:CGRectMake(0, MONO_CHROME_HEIGHT, webView.frame.size.width, 0)];
        _buttonScrollView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        _buttonScrollView.scrollEnabled = TRUE;
        _buttonScrollView.contentOffset = CGPointMake(0, 0);
        [_buttonScrollView setContentInset:UIEdgeInsetsMake(0, 8, 12, 0)];
        
        [self addSubview:_openCloseButton];
        [self addSubview:_buttonScrollView];
        
        _width = self.frame.size.width;
        
        // By default, the drawer is closed
        _open = FALSE;
    }
    
    return self;
}

- (void) debug {
    NSLog(@"I'm here!");
}

#pragma mark - public methods

- (void) makeNewButton:(NSString *)callbackId label:(NSString *)label customIcon:(UIImage *)image defaultIconType:(MNOChromeButtonIcon)iconType {
    MNOChromeButton *newButton;
    
    // Look to see if we have already have the button
    for(UIButton *curButton in _buttonScrollView.subviews) {
        if([curButton isKindOfClass:[MNOChromeButton class]] == TRUE) {
            MNOChromeButton *curChromeButton = (MNOChromeButton *)curButton;
            if([curChromeButton.callbackId isEqualToString:callbackId]) {
                newButton = curChromeButton;
                break;
            }
        }
    }
    
    // Make the new button and set the callback id
    if(newButton == nil) {
        newButton = [[MNOChromeButton alloc] init];
        newButton.callbackId = callbackId;
        
        // Add the button
        [_buttonScrollView addSubview:newButton];
    }
    
    // Populate the label/image
    if (label != nil) {
        [newButton setTitle:label forState:UIControlStateNormal];
        [newButton.titleLabel setFont:[UIFont systemFontOfSize:11]];
    }
    UIImage *scaledImage = nil;
    if(image != nil) {
        // Determine a good size for the image
        CGSize oldSize = image.size;
        double scaleFactor = oldSize.height / oldSize.width;
        CGSize newSize = CGSizeMake(MONO_ICON_SIZE / scaleFactor, MONO_ICON_SIZE);
        
        // Scale the image
        UIGraphicsBeginImageContextWithOptions(newSize, NO, 0.0);
        [image drawInRect:CGRectMake(0, 0, newSize.width, newSize.height)];
        scaledImage = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        
        // Set the button's image to the scaled version of the image
        [newButton setImage:scaledImage forState:UIControlStateNormal];
    }
    else if(iconType != MNOchrome_unset) {
        [newButton setDefaultIcon:iconType];
    }
    
    if(label == nil && image == nil && iconType == MNOchrome_unset) {
        NSLog(@"No label or image set -- would be generating an unclickable button.  Returning.");
        return;
    }
    
    [newButton addTarget:self action:@selector(dispatchChromeButtonAction:) forControlEvents:UIControlEventTouchUpInside];
    
    [newButton.titleLabel setTextAlignment:NSTextAlignmentCenter];
    [newButton setContentHorizontalAlignment:UIControlContentHorizontalAlignmentCenter];
    
    // Adjust the size of the button and add padding
    [newButton sizeToFit];
    newButton.frame = CGRectMake(0, 0,
                                 newButton.frame.size.width + MONO_WIDTH_PADDING * 2,
                                 newButton.frame.size.height);
    
    // Center the content
    if(image != nil && label != nil && scaledImage != nil) {
        // Borrowed from here: http://stackoverflow.com/questions/2451223/uibutton-how-to-center-an-image-and-a-text-using-imageedgeinsets-and-titleedgei
        CGFloat spacing = 12.0;
        
        CGSize imageSize = scaledImage.size;
        newButton.titleEdgeInsets = UIEdgeInsetsMake(0.0, -imageSize.width, - (imageSize.height + spacing), 0.0);
        
        CGSize titleSize = newButton.titleLabel.frame.size;
        newButton.imageEdgeInsets = UIEdgeInsetsMake(0, 0, 0, - titleSize.width);
        
        int biggestWidth = newButton.titleLabel.frame.size.width;
        
        if(newButton.imageView.frame.size.width > biggestWidth) {
            biggestWidth = newButton.imageView.frame.size.width;
        }
    
        newButton.frame = CGRectMake(0, 0, biggestWidth + MONO_WIDTH_PADDING * 2, newButton.frame.size.height);
    }
    
    // Calculate the new width of the chrome drawer
    int newWidth = 0;
    for(UIView *view in _buttonScrollView.subviews) {
        if([[view class] isSubclassOfClass:[UIButton class]]) {
            UIButton *button = (UIButton *)view;
            button.frame = CGRectMake(newWidth, 0,
                                 button.frame.size.width, button.frame.size.height);
            newWidth += button.frame.size.width;
        }
    }
    
    // Record the new width of the chrome drawer
    _width = newWidth;
    _buttonScrollView.contentSize = CGSizeMake(newWidth, _buttonScrollView.frame.size.height);
    
    // If the drawer is already open, expand it even further
    if(_open == TRUE) {
        [self openChromeDrawer];
    }
}

- (void) resize {
    // Make sure we've got a WebView to attach to
    if (_webView == nil) {
        return;
    }
    
    // Size the view bounds properly
    CGRect viewBounds = [_webView bounds];
    self.frame = CGRectMake(0, viewBounds.size.height - MONO_CHROME_HEIGHT,
                            viewBounds.size.width, MONO_CHROME_HEIGHT);
    self.backgroundColor = [UIColor blackColor];
    self.contentMode = UIViewContentModeRight;
    
    // If the drawer is already open, expand it even further
    if(_open == TRUE) {
        [self openChromeDrawer];
    }
}

- (void) openChromeDrawer {
    // Make sure we've got a WebView to attach to
    if (_webView == nil) {
        return;
    }
    
    // Animate the drawer sliding open
    CGRect viewBounds = [_webView bounds];
    
    int newHeight = MONO_CHROME_HEIGHT * 3.5;
    [UIView animateWithDuration:.25 animations:^{
        self.frame = CGRectMake(0,
                                viewBounds.size.height - newHeight,
                                viewBounds.size.width, newHeight);
        [_openCloseButton setImage:_arrowDown forState:UIControlStateNormal];
    }];
    
    _open = TRUE;
}

- (void) closeChromeDrawer {
    // Make sure we've got a WebView to attach to
    if (_webView == nil) {
        return;
    }
    
    // Animate the drawer sliding closed
    CGRect viewBounds = [_webView bounds];
    
    int newHeight = MONO_CHROME_HEIGHT;
    [UIView animateWithDuration:.25 animations:^{
        self.frame = CGRectMake(0, viewBounds.size.height - newHeight,
                                viewBounds.size.width, newHeight);
        [_openCloseButton setImage:_arrowUp forState:UIControlStateNormal];
    }];
    
    _open = FALSE;
}

#pragma mark - private methods

- (void) dispatchChromeButtonAction:(UIButton *)button {
    // If we've got a special drawer toggle tag, open/close the drawer as needed
    int tag = (int)[button tag];
    if (tag == MONO_DRAWER_TOGGLE_TAG) {
        if (_open == TRUE) {
            [self closeChromeDrawer];
        }
        else {
            [self openChromeDrawer];
        }
    }
    // Otherwise, attempt to execute the javascript
    else {
        // Make sure the button actually has the javascript property
        if([button isKindOfClass:[MNOChromeButton class]] == TRUE) {
            MNOChromeButton *chromeButton = (MNOChromeButton *)button;
            
            // Call the javascript callback if possible
            if (chromeButton.callbackId != nil) {
                // Fire on the background queue
                NSThread *mainThread = [NSThread mainThread];

                NSString *jsScript = [NSString stringWithFormat:@"window.setTimeout(Mono.Callbacks.Callback('%@'), 0)", chromeButton.callbackId];
                [_webView performSelector:@selector(stringByEvaluatingJavaScriptFromString:) onThread:mainThread withObject:jsScript waitUntilDone:NO];
            }
            else {
                NSLog(@"No Javascript callback to implement!");
            }
        }
    }
}

@end
