//
//  DashboardView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/3/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNODashboardView.h"
#import "MNODashboard.h"

/* AppView Dimensions */
#define Rgb2UIColor(r, g, b)  [UIColor colorWithRed:((r) / 255.0) green:((g) / 255.0) blue:((b) / 255.0) alpha:1.0]


@interface MNODashboardView ()

@property (strong,nonatomic) MNODashboard * dashboard;
@property (strong,nonatomic) UILabel * numWidgets;

@end

@implementation MNODashboardView

- (id)initWithFrame:(CGRect)frame usingDashboard:(MNODashboard *)dashboard
{
    self = [super initWithFrame:frame image:@"icon_app_" withName:dashboard.name];
    if (self) {
        //
        self.entity = dashboard;
        [self createViewForDashboard:dashboard];
    }
    
    return self;
}


/*
// Only override drawRect: if you perform custom drawing.
// An empty implementation adversely affects performance during animation.
- (void)drawRect:(CGRect)rect
{
    // Drawing code
}
*/

-(void)createViewForDashboard:(MNODashboard *)dashboard
{
    // Find width/height and location of label
    CGFloat imageWidth = self.image.frame.size.width;
    CGRect imageFrame = self.image.frame;
    CGFloat yCoord = imageFrame.origin.y;
    CGFloat width = imageWidth * .35;
    CGFloat xCoord = imageFrame.origin.x+imageFrame.size.width-width;
    
    // Create
    self.numWidgets = [[UILabel alloc] init];
    [self.numWidgets.layer setCornerRadius:2.0f];
    self.numWidgets.layer.masksToBounds = YES;
    // Color
    [self.numWidgets setBackgroundColor:Rgb2UIColor(121, 175, 54)];
    [self.numWidgets setTextColor:[UIColor whiteColor]];
    // Text
    [self.numWidgets setText:[NSString stringWithFormat:@"%lu",(unsigned long)dashboard.widgets.count]];
    [self.numWidgets setTextAlignment:NSTextAlignmentCenter];
    self.numWidgets.frame = CGRectMake(xCoord, yCoord, width,width);
    self.numWidgets.adjustsFontSizeToFitWidth = YES;
    self.numWidgets.minimumScaleFactor = (self.numWidgets.font.pointSize-5.0)/self.numWidgets.font.pointSize;
    // Add
    [self addSubview:self.numWidgets];
}


@end
