//
//  MNOChromeButton.m
//  Mono
//
//  Created by Michael Wilson on 5/6/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOChromeButton.h"

// Helper function to get images from the sprite sheet
static UIImage *getImage(MNOChromeButtonIcon iconType) {
    // Static spritesheet to use
    static dispatch_once_t spriteSheetOnce;
    static UIImage *spriteSheet;
    static int iconSize;
    dispatch_once(&spriteSheetOnce, ^{
        spriteSheet = [UIImage imageNamed:@"sprite_icons_320x320_@2x.png"];
        iconSize = spriteSheet.size.width / 2;
    });
    
    if (iconType == MNOchrome_unset) {
        return nil;
    }
    
    // Get the row of the icon in the spritesheet
    int row = (int)iconType;
    
    // Create the sub image
    CGRect spriteIconBounds = CGRectMake(0, iconSize * row, iconSize, iconSize);
    CGImageRef spriteIconRef = CGImageCreateWithImageInRect(spriteSheet.CGImage, spriteIconBounds);
    
    UIImage *spriteIcon = [UIImage imageWithCGImage:spriteIconRef];
    
    CGImageRelease(spriteIconRef);
    
    // Return the sub image
    return spriteIcon;
}

@implementation MNOChromeButton

#pragma mark public methods

+ (MNOChromeButtonIcon) stringToType:(NSString *)iconTypeString {
    if(iconTypeString == nil) {
        return MNOchrome_unset;
    }
    else if([iconTypeString caseInsensitiveCompare:@"close"] == NSOrderedSame) {
        return MNOchrome_close;
    }
    else if([iconTypeString caseInsensitiveCompare:@"minimize"] == NSOrderedSame) {
        return MNOchrome_minimize;
    }
    else if([iconTypeString caseInsensitiveCompare:@"maximize"] == NSOrderedSame) {
        return MNOchrome_maximize;
    }
    else if([iconTypeString caseInsensitiveCompare:@"restore"] == NSOrderedSame) {
        return MNOchrome_restore;
    }
    else if([iconTypeString caseInsensitiveCompare:@"gear"] == NSOrderedSame) {
        return MNOchrome_gear;
    }
    else if([iconTypeString caseInsensitiveCompare:@"toggle"] == NSOrderedSame) {
        return MNOchrome_toggle;
    }
    else if([iconTypeString caseInsensitiveCompare:@"prev"] == NSOrderedSame) {
        return MNOchrome_prev;
    }
    else if([iconTypeString caseInsensitiveCompare:@"next"] == NSOrderedSame) {
        return MNOchrome_next;
    }
    else if([iconTypeString caseInsensitiveCompare:@"pin"] == NSOrderedSame) {
        return MNOchrome_pin;
    }
    else if([iconTypeString caseInsensitiveCompare:@"unpin"] == NSOrderedSame) {
        return MNOchrome_unpin;
    }
    else if([iconTypeString caseInsensitiveCompare:@"right"] == NSOrderedSame) {
        return MNOchrome_right;
    }
    else if([iconTypeString caseInsensitiveCompare:@"left"] == NSOrderedSame) {
        return MNOchrome_left;
    }
    else if([iconTypeString caseInsensitiveCompare:@"up"] == NSOrderedSame) {
        return MNOchrome_up;
    }
    else if([iconTypeString caseInsensitiveCompare:@"down"] == NSOrderedSame) {
        return MNOchrome_down;
    }
    else if([iconTypeString caseInsensitiveCompare:@"refresh"] == NSOrderedSame) {
        return MNOchrome_refresh;
    }
    else if([iconTypeString caseInsensitiveCompare:@"plus"] == NSOrderedSame) {
        return MNOchrome_plus;
    }
    else if([iconTypeString caseInsensitiveCompare:@"minus"] == NSOrderedSame) {
        return MNOchrome_minus;
    }
    else if([iconTypeString caseInsensitiveCompare:@"search"] == NSOrderedSame) {
        return MNOchrome_search;
    }
    else if([iconTypeString caseInsensitiveCompare:@"save"] == NSOrderedSame) {
        return MNOchrome_save;
    }
    else if([iconTypeString caseInsensitiveCompare:@"help"] == NSOrderedSame) {
        return MNOchrome_help;
    }
    else if([iconTypeString caseInsensitiveCompare:@"print"] == NSOrderedSame) {
        return MNOchrome_print;
    }
    else if([iconTypeString caseInsensitiveCompare:@"expand"] == NSOrderedSame) {
        return MNOchrome_expand;
    }
    else if([iconTypeString caseInsensitiveCompare:@"collapse"] == NSOrderedSame) {
        return MNOchrome_collapse;
    }
    else {
        return MNOchrome_unset;
    }
}

- (void) setDefaultIcon:(MNOChromeButtonIcon)iconType {
    UIImage *icon = getImage(iconType);

    // Scale the image to the current height of the button -- should be a square,
    // so use the height for both bounds
    CGSize newSize = CGSizeMake(MONO_ICON_SIZE, MONO_ICON_SIZE);

    UIGraphicsBeginImageContextWithOptions(newSize, NO, 0.0);
    [icon drawInRect:CGRectMake(0, 0, newSize.width, newSize.height)];
    UIImage *scaledIcon = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();

    [self setImage:scaledIcon forState:UIControlStateNormal];
}

@end
