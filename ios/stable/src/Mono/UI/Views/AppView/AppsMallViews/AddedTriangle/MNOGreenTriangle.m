//
//  GreenTriangle.m
//  Mono2
//
//  Created by Ben Scazzero on 3/14/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOGreenTriangle.h"

@implementation MNOGreenTriangle

- (id)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:frame];
    if (self) {
        // Initialization code
    }
    return self;
}


// Only override drawRect: if you perform custom drawing.
// An empty implementation adversely affects performance during animation.
- (void)drawRect:(CGRect)rect
{
    // Drawing code
    CGRect bounds = self.bounds;
    CGFloat offset  = self.bounds.size.width; //or height
    CGContextRef ctx = UIGraphicsGetCurrentContext();
    CGContextBeginPath(ctx);
    
    CGContextMoveToPoint   (ctx, offset, CGRectGetMaxY(bounds));
    CGContextAddLineToPoint(ctx, 0,  CGRectGetMaxY(bounds));
    CGContextAddLineToPoint(ctx, 0, CGRectGetMaxY(bounds) - offset);
    
    CGContextClosePath(ctx);
    CGContextSetRGBFillColor(ctx, 0, 1, 0, 1);
    CGContextFillPath(ctx);
    
    // Drawing code
    ctx = UIGraphicsGetCurrentContext();
    CGContextBeginPath(ctx);
    
    CGContextMoveToPoint   (ctx, offset, CGRectGetMaxY(bounds));
    CGContextAddLineToPoint(ctx, offset,  CGRectGetMaxY(bounds)-offset);
    CGContextAddLineToPoint(ctx, 0, CGRectGetMaxY(bounds) - offset);  
    
    CGContextClosePath(ctx);
    CGContextSetRGBFillColor(ctx, 1, 1, 1, 1);
    CGContextFillPath(ctx);
}

@end
