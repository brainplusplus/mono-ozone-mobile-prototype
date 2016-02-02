//
//  AppMallView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/12/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAppMallView.h"
#import "MNOGreenTriangle.h"

@interface MNOAppMallView ()

@property (weak, nonatomic) MNOGreenTriangle * marker;

@end

@implementation MNOAppMallView

#pragma mark - Init;

- (id) initWithFrame:(CGRect)frame entity:(id)entity selected:(BOOL)selected
{
    self = [super initWithFrame:frame entity:entity];
    if (self) {
        self.selected = selected;
        [self setUp];
    }
    return self;
}

/**
 *  Initialize the View with App Mall Specific Changes
 */
- (void) setUp
{
    // Create Marker
    MNOGreenTriangle * gt = [[MNOGreenTriangle alloc] init];
    [self addSubview:gt];
     self.marker =  gt;
    
    // Set Marking Status
    if (self.selected)
        [self.marker setHidden:NO];
    else
        [self.marker setHidden:YES];
    
    // Modify Other Views
    [self modifyViews];
}

/**
 *  Further Customizations to the View
 */
- (void) modifyViews
{
    // Change Colors
    self.button.backgroundColor = [UIColor whiteColor];
    self.nameLabel.textColor = [UIColor blackColor];

    // Add marker by reducing the size of the image and label
    double offset = self.frame.size.height * .10;
    CGRect labelFrame = self.nameLabel.frame;
    labelFrame.size.height -= offset;
    self.nameLabel.frame = labelFrame;
    self.marker.frame = CGRectMake(0,CGRectGetHeight(self.bounds)-offset, offset, offset);
}

- (NSString *) defaultImageName
{
    return @"app_mall_default_";
}

- (void)widgetSelected:(id)button
{
    [self tileSelected:button];
    [super widgetSelected:button];
}

/* Tile Selected Callback */

- (void)tileSelected:(UIButton *)button
{
    self.selected = !self.selected;
}

-(void)setSelected:(BOOL)selected
{
    _selected = selected;
    if (_selected)
        self.marker.hidden = NO;
    else
        self.marker.hidden = YES;
}

@end
