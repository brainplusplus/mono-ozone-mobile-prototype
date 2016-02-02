//
//  GridHeaderView.m
//  Mono2
//
//  Created by Ben Scazzero on 4/6/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "MNOGridHeaderView.h"

@implementation MNOGridHeaderView

- (id)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:frame];
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

/*Getters */
-(UILabel *)header
{
    if(!_header){
        _header = [[UILabel alloc] initWithFrame:self.frame];
        _header.textColor = [UIColor whiteColor];
        _header.text = @"Header";
    }
    return _header;
}

@end
