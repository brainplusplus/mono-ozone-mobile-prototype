//
//  TopMenuView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/7/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOTopMenuView.h"
#import "Masonry.h"

@interface MNOTopMenuView ()
@property (nonatomic) BOOL alignRight;
@end

@implementation MNOTopMenuView

- (id) initWithSize:(CGSize)size contents:(NSDictionary *)contents alignRight:(BOOL)right
{
    self = [super initWithFrame:CGRectMake(0, 0, size.width, size.height) contents:contents];
    if (self) {
        self.alignRight = right;
        self.backgroundColor = [UIColor colorWithRed:50 green:50 blue:50 alpha:1.0];
    }
    
    return self;
}

- (void) didMoveToSuperview
{
    [super didMoveToSuperview];
    if (self.superview != nil) {
        [self applyConstraints];
    }
}

- (UIButton *) createButtonForKey:(NSString *)key
{
    UIButton * button = [super createButtonForKey:key];
    button.layer.cornerRadius = 0.0;
    return button;
}

- (void) applyConstraints
{
    if (self.superview) {    
        if (!self.alignRight) {
            [self mas_makeConstraints:^(MASConstraintMaker *make) {
                make.top.equalTo(self.superview);
                make.left.equalTo(self.superview);
                make.width.equalTo(@(self.frame.size.width));
                make.height.equalTo(@(self.frame.size.height));
            }];
        }else{
            [self mas_makeConstraints:^(MASConstraintMaker *make) {
                make.top.equalTo(self.superview);
                make.right.equalTo(self.superview);
                make.width.equalTo(@(self.frame.size.width));
                make.height.equalTo(@(self.frame.size.height));
            }];
        }
    }
}


@end
