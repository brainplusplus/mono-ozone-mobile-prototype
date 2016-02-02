//
//  CenterMenuView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/16/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOCenterMenuView.h"

@implementation MNOCenterMenuView

- (id)initWithFrame:(CGRect)frame
{
    return nil;
}

- (id) initWithSize:(CGSize)size contents:(NSDictionary *)contents
{
    self = [super initWithFrame:CGRectMake(0, 0, size.width, size.height) contents:contents];
    if (self) {
        // Initialization code
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

- (void) layoutSubviews{
    [super layoutSubviews];
    [self centerMenu];
}

- (void) centerMenu
{
    CGRect frame = self.superview.frame;
    frame.origin.x = (frame.size.width-self.frame.size.width)/2.0;
    frame.origin.y = (frame.size.height-self.frame.size.width)/2.0;
    self.frame = frame;
}


@end
