//
//  AppViewCell.m
//  Mono2
//
//  Created by Ben Scazzero on 2/4/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <QuartzCore/QuartzCore.h>
#import "MNOAppView.h"
#import "MNOHttpStack.h"
#import "TMCache.h"

@implementation MNOAppView

#pragma mark - Init
{
    NSString * imageUrl;
    NSString * name;
}

- (id) initWithFrame:(CGRect)frame image:(NSString *)_imageUrl withName:(NSString *)_name
{
    self = [super initWithFrame:frame];
    if (self) {
        imageUrl = _imageUrl;
        name = _name;
        [self setUpView];
    }
    return self;
}

- (id) initWithFrame:(CGRect)frame entity:(id)entity
{
    self.entity = entity;
    return [self initWithFrame:frame image:[entity valueForKey:@"largeIconUrl"] withName:[entity valueForKey:@"name"]];
}

#pragma mark - Standard Width/Heights

+ (CGFloat) standardWidth
{
    CGRect screenRect = [[UIScreen mainScreen] bounds];
    return  screenRect.size.width <= 320 ?  (screenRect.size.width * .25) : (screenRect.size.width * .20);
}

+ (CGFloat) standardHeight
{
    return [MNOAppView standardWidth];
}

#pragma  mark - Standard View Config
 /* 
  28-button-10-icon-10-button-28-button-10-icon-10-button
               label
 */
- (void) setUpView
{
    // Set Up Label
    self.nameLabel.textColor = [UIColor colorWithRed:88 green:88 blue:88 alpha:1.0];
    self.nameLabel.minimumScaleFactor = ([self fontSize]-7.0)/[self fontSize];
    self.nameLabel.adjustsFontSizeToFitWidth = YES;
    self.nameLabel.font = [UIFont systemFontOfSize:[self fontSize]];
    self.nameLabel.numberOfLines = 4;
    self.nameLabel.textAlignment = NSTextAlignmentCenter;
    if(name != nil && ![name isEqualToString:@""]){
        self.nameLabel.text = name;
    }else{
        self.nameLabel.text = @"N/A";
    }
    
    // Set Up Button
    [self.button addTarget:self action:@selector(widgetSelected:) forControlEvents:UIControlEventTouchUpInside];
    self.button.highlighted = YES;
    
    // Set Up Image
    if (imageUrl != nil)
        [self loadStoredImageWithUrl:imageUrl];
    
    [self addSubview:self.button];
    [self addSubview:self.nameLabel];
    [self addSubview:self.image];
}

#pragma -mark Image Related

- (void) loadStoredImageWithUrl:(NSString*)url
{
    // Check if the image is local
    UIImage * image =  [UIImage imageNamed:url];
    if (image != nil) {
        image = [self imageWithImage:image scaledToSize:self.image.frame.size];
        [self.image setImage:image];
        
    }else{
        // Otherwise try loading it from Internet
        [self loadImageWithUrl:url];
    }
}


- (BOOL) isValidURL:(NSURL *)candidateURL
{
    // WARNING > "test" is an URL according to RFCs, being just a path
    // so you still should check scheme and all other NSURL attributes you need
    
    if (candidateURL != nil &&
        candidateURL.scheme != nil &&
        candidateURL.host != nil &&
        // verify path extension
        ([candidateURL.pathExtension isEqualToString:@"jpg"] ||
         [candidateURL.pathExtension isEqualToString:@"gif"] ||
         [candidateURL.pathExtension isEqualToString:@"png"])) {
            // candidate is a well-formed url with:
            //  - a scheme (like http://)
            //  - a host (like stackoverflow.com)
            return YES;
        }
    
    return NO;
}

- (NSURL *) formatUrl:(NSString *)url
{
    NSURL * formattedUrl = [NSURL URLWithString:url];
    // Remove any Relative Paths References
    formattedUrl = [formattedUrl standardizedURL];
    
    if ([self isValidURL:formattedUrl]) {
        return formattedUrl;
    }
    
    // Url not formatted, so try to format it.
    NSURL * serverBaseURL = [NSURL URLWithString:[[MNOAccountManager sharedManager] serverBaseUrl]];
    formattedUrl = [NSURL URLWithString:url relativeToURL:serverBaseURL];
    if ([self isValidURL:formattedUrl]) {
        return formattedUrl;
    }

    return nil;
}

- (void) loadImageWithUrl:(NSString*)unformattedUrl
{
    
    NSURL * url = [self formatUrl:unformattedUrl];
  
    // Do we have a valid URL?
    if (url != nil) {
        // Check to see if we've cached this image before
        id object = [[TMCache sharedCache] objectForKey:url.absoluteString];
    
        if (object != nil && [object isKindOfClass:[UIImage class]]) {
            UIImage * image =  object;
            image = [self imageWithImage:image scaledToSize:self.image.frame.size];
            [self.image setImage:image];
            
        // Otherwise, try loading and caching it if we have a valid URL
        } else {
        
            /* Display Image When Finished */
            [[MNOHttpStack sharedStack] makeAsynchronousRequest:REQUEST_IMAGE url:url.absoluteString success:^(MNOResponse *mResponse) {
                
                id result  = mResponse.responseObject;
                if(result != nil && [result isKindOfClass:[UIImage class]]){
                    UIImage * image = [self imageWithImage:result scaledToSize:self.image.frame.size];
                    [[TMCache sharedCache] setObject:image forKey:url.absoluteString];
                    [self.image setImage:image];
                }else{
                    // Couldn't Build Image From Source, Loading Default Image
                    [self loadDefaultImage];
                }
                
            } failure:^(MNOResponse *mResponse, NSError *error) {
                // Couldn't Download Image, Loading Default Image
                [self loadDefaultImage];
            }];
        }
    }else{
        // We Don't Have a Valid Image URL, Loading Default Image
        [self loadDefaultImage];
    }
        
}

#pragma  mark - Image Related

- (void) loadDefaultImage
{
    UIImage * image =  [UIImage imageNamed:[self defaultImageName]];
    image = [self imageWithImage:image scaledToSize:self.image.frame.size];
    [self.image setImage:image];
}

- (UIImage *)imageWithImage:(UIImage *)image scaledToSize:(CGSize)newSize {
    UIGraphicsBeginImageContextWithOptions(newSize, NO, 0.0);
    [image drawInRect:CGRectMake(0, 0, newSize.width, newSize.height)];
    UIImage *newImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return newImage;
}

#pragma -mark Callback

-(void)widgetSelected:(id)button
{
    if (_delegate && [_delegate respondsToSelector:@selector(entrySelected:)]) {
        [_delegate entrySelected:self.entity];
    }
}

#pragma -mark Setters/Getters

- (void) setUserImageUrl:(NSString *)userImageUrl
{
    if (userImageUrl) {
        _userImageUrl = userImageUrl;
        [self loadStoredImageWithUrl:userImageUrl];
    }
}

- (UILabel *) nameLabel
{
    if (!_nameLabel) {
        _nameLabel = [[UILabel alloc] init];
        CGRect imageFrame = self.image.frame;
        CGFloat width =  self.frame.size.width;
        CGFloat height = self.frame.size.height - (imageFrame.origin.y + imageFrame.size.height);
        CGFloat yCoord = imageFrame.origin.y + imageFrame.size.height;
        _nameLabel.frame =  CGRectMake(self.frame.origin.x, yCoord ,width, height);
    }
    return _nameLabel;
}

- (UIButton *) button
{
    if(!_button){
        _button = [UIButton buttonWithType:UIButtonTypeCustom];
        CGFloat width =  self.frame.size.width;
        CGFloat height = self.frame.size.height;
         _button.frame = CGRectMake(self.frame.origin.x, self.frame.origin.y, width, height);
    }
    return _button;
}

- (UIImageView *) image
{
    if(!_image){
        _image = [[UIImageView alloc] init];
        CGFloat width = self.frame.size.width;
        _image.frame = CGRectMake(width * .25, 0, width * .50, width * .50);
        _image.contentMode = UIViewContentModeScaleToFill;
    }
    return _image;
}

- (NSString *)defaultImageName
{
    return  @"icon_app_";
}

#pragma mark - Fonts

- (CGFloat) fontSize
{
    // Baseline
    CGFloat width = [[UIScreen mainScreen] bounds].size.width;
    CGFloat fontSize;
    if (width <= 320) {
        fontSize = 11.0;
    }else if( width > 320 <= 768){
        fontSize = 15.0;
    }else{
        fontSize = 20.0;
    }
    
    return fontSize;
}


@end
