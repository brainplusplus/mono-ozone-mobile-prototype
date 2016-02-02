//
//  MenuView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/16/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOMenuView.h"


#define labelInset 10
#define borderWidth 1

@implementation MNOMenuView

- (id)initWithFrame:(CGRect)frame contents:(NSDictionary *)contents
{
    if (contents && contents.count > 0) {
        
        self = [super initWithFrame:frame];
        if (self) {
            self.contents = contents;
            [self displayMenu];
        }
        
    }else
        self = nil;
    
    return self;
}


- (void) displayMenu
{
    UIScrollView * scrollview = [[UIScrollView alloc] initWithFrame:self.bounds];
    scrollview.bounces = NO;
    CGFloat width = rowWidth;
    CGFloat height = rowHeight * self.contents.count;
    [scrollview setContentSize:CGSizeMake(width, height)];
    
    [self addSubview:scrollview];
    [self loadRowsInScrollView:scrollview];
}

-(void)loadRowsInScrollView:(UIScrollView *)scroll
{
    int counter = 0;
    NSArray * keys = [self.contents allKeys];
    
    for (NSString * value in keys) {
        
        UIView * view = [[UIView alloc] initWithFrame:CGRectMake(0, counter*rowHeight, rowWidth, rowHeight)];
        [view setBackgroundColor:[UIColor grayColor]];
        
        UIButton * button = [self createButtonForKey:value];
        [view addSubview:button];
        
        UILabel * label = [[UILabel alloc] initWithFrame:CGRectMake(labelInset, 0, rowWidth-labelInset, rowHeight)];
        label.text = value;
        label.font = [UIFont systemFontOfSize:14.0];
        [label setTextColor:[UIColor whiteColor]];
        [view addSubview:label];
        
        
        UIImageView * imageView = [[UIImageView alloc] initWithFrame:[self toggleButtonFrameForView:view]];
        imageView.image = [UIImage imageNamed:[self untoggleImageName]];
        imageView.contentMode = UIViewContentModeScaleAspectFit;
        imageView.hidden = YES;
        [self.contentView setObject:imageView forKey:value];
        [view addSubview:imageView];
        
        view.tag = counter;
        [scroll addSubview:view];
        counter++;
    }
}

- (UIButton *) createButtonForKey:(NSString *)key
{
    UIButton * button = [UIButton buttonWithType:UIButtonTypeCustom];
    [button setBackgroundColor:[UIColor blackColor]];
    button.frame = CGRectMake(0, 0, rowWidth, rowHeight-borderWidth);
    [button addTarget:self action:@selector(selectedRow:) forControlEvents:UIControlEventTouchUpInside];
    
    button.layer.cornerRadius = 5.0f;
    
    return button;
}

#pragma mark - Toggling

/**
 *  Ensure that our toggle options are all unique and match up to
 *  an actual entry in our menu.
 *
 *  @param toggleOptions menu options to add a toggle button
 *
 *  @return YES if all values are unique and match to an entry in our menu, NO otherwise
 */
- (BOOL) validateToggleOptions:(NSArray *)toggleOptions
{
    NSMutableSet * set = [[NSMutableSet alloc] init];
    for (NSString * potentialKey in toggleOptions) {
        id obj = [self.contents objectForKey:potentialKey];
        if (obj == nil || [set containsObject:potentialKey]) {
            return NO;
        }else{
            [set addObject:potentialKey];
        }
    }
    return YES;
}

- (void) applyRadioOptions
{
    for (NSString * key in self.toggleOptions) {
        UIImageView * imageView = [self.contentView objectForKey:key];
        imageView.hidden = NO;
        imageView.image = [UIImage imageNamed:[self untoggleImageName]];
    }
}

- (NSString *) untoggleImageName
{
    return @"radio_off_.png";
}

- (NSString *) toggleImageName
{
    return @"radio_on_.png";
}

- (CGRect) toggleButtonFrameForView:(UIView *)view
{
    CGFloat parentWidth = CGRectGetWidth(view.frame);
    
    CGFloat width = .10 * parentWidth;
    CGFloat height = width;
    
    CGFloat xCoord = view.bounds.size.width - width - (.08 * parentWidth);
    CGFloat yCoord = (view.bounds.size.height - height)/2.0;
    
    return CGRectMake(xCoord, yCoord, width, height);
}

- (void) markSelectedView:(UIImageView *)view
{
    [self applyRadioOptions];
    view.image = [UIImage imageNamed:[self toggleImageName]];
}

#pragma  mark - Button Callbacks

-(void)selectedRow:(id)sender
{
    if(self.delegate && [self.delegate respondsToSelector:@selector(optionSelectedKey:withValue:)]){
        
        UIView * row = [sender superview];
        NSString * value = nil;
        UIImageView * imageView = nil;
        BOOL usesToggleOptions = (self.toggleOptions != nil);
        
        for (UIView * view in [row subviews]) {
            if([view isKindOfClass:[UILabel class]]){
                UILabel * temp = (UILabel *)view;
                value = temp.text;
            }else if(usesToggleOptions && [view isKindOfClass:[UIImageView class]]){
                imageView = (UIImageView *)view;
            }
        }
        
        if (usesToggleOptions && imageView != nil && !imageView.hidden)
            [self markSelectedView:imageView];
        
        [sender setBackgroundColor:[UIColor blackColor]];
        [self.delegate optionSelectedKey:value withValue:[self.contents objectForKey:value]];
    }
}

/* Default Sizes */

#pragma mark - Setters/Getters

- (NSMutableDictionary *) contentView
{
    if (!_contentView) {
        _contentView = [[NSMutableDictionary alloc] init];
    }
    return _contentView;
}

- (void) setToggleOptions:(NSArray *)toggleOptions
{
    if([self validateToggleOptions:toggleOptions]){
        _toggleOptions = toggleOptions;
        [self applyRadioOptions];
    }else{
        _toggleOptions = nil;
    }
}

- (void) setEnableKey:(NSString *)enableKey
{
    _enableKey = nil;
    
    if ([self validateToggleOptions:self.toggleOptions]) {
        for (NSString * key in self.toggleOptions) {
            if ([key isEqualToString:enableKey]) {
                _enableKey = enableKey;
                UIImageView * view = [self.contentView objectForKey:_enableKey];
                [self markSelectedView:view];
            }
        }
    }
}

@end
