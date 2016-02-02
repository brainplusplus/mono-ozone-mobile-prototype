//
//  MNOChromeButton.h
//  Mono
//
//  Created by Michael Wilson on 5/6/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

typedef enum MNOChromeButtonIcon {
    MNOchrome_close,
    MNOchrome_minimize,
    MNOchrome_maximize,
    MNOchrome_restore,
    MNOchrome_toggle,
    MNOchrome_gear,
    MNOchrome_prev,
    MNOchrome_next,
    MNOchrome_pin,
    MNOchrome_unpin,
    MNOchrome_right,
    MNOchrome_left,
    MNOchrome_up,
    MNOchrome_down,
    MNOchrome_refresh,
    MNOchrome_plus,
    MNOchrome_minus,
    MNOchrome_search,
    MNOchrome_save,
    MNOchrome_help,
    MNOchrome_print,
    MNOchrome_expand,
    MNOchrome_collapse,
    MNOchrome_unset
} MNOChromeButtonIcon;

@interface MNOChromeButton : UIButton

#pragma mark properties

/**
 * The id of this callback.
 **/
@property (strong, nonatomic) NSString *callbackId;

#pragma mark - public methods

/**
 * Converts a string to an icon type.
 * @param iconTypeString A string that will translate to an icon type.
 * @return An icon type
 **/
+ (MNOChromeButtonIcon) stringToType:(NSString *)iconTypeString;

/**
 * Uses an icon from one of the default icons supplied within OWF.
 * @param iconType The type of icon to display.
 **/
- (void) setDefaultIcon:(MNOChromeButtonIcon)iconType;

@end
