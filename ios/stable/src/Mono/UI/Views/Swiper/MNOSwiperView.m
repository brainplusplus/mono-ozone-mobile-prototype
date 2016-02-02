//
//  SwiperView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/10/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOSwiperView.h"
#import "Masonry.h"
#import "MNOWidget.h"
#import "MNOAppSwiperView.h"

#define insetx (0)
#define innerCardPadding (0)

@interface MNOSwiperView ()

@property (strong, nonatomic) NSArray * widgets;


@end

@implementation MNOSwiperView
{
    CGSize size;
    CGRect prevFrame;
    CGFloat aspectRatioHeight;
    CGFloat aspectRatioWidth;
}

#pragma mark - Init

-(id)initWithFrame:(CGRect)frame usingContent:(NSArray *)widgets withSize:(CGSize)_size
{
    self = [super initWithFrame:frame];
    
    if (self) {
        size = _size;
        aspectRatioHeight = (size.height / self.bounds.size.height) * .95;
        aspectRatioWidth =  (size.width / self.bounds.size.width) * .95;
        self.backgroundColor = [UIColor blackColor];
        self.widgets = widgets;
        [self showScrollView];
    }
    
    return self;
}

#pragma mark - View Methods

-(void)layoutSubviews
{
    [super layoutSubviews];
    [self relayout];
}

#pragma mark - Scroll View

- (void)showScrollView
{
    CGRect parent = self.bounds;
    
    // Set Up ScrollView
    [self.scroller setBackgroundColor:[UIColor clearColor]];
    [self addSubview:self.scroller];
    
    // Figure Out Dimensions and Positions for Each View
    long count = [self.widgets count];
    CGFloat cardHeight = aspectRatioHeight * parent.size.height;
    CGFloat cardWidth = aspectRatioWidth * parent.size.width;
    CGFloat yinset = (parent.size.height - cardHeight)/2.0;
    
    int i = 0;
    for(MNOWidget * widget in self.widgets){
        
        //  Build Card
        MNOAppSwiperView * appview = [[MNOAppSwiperView alloc] initWithFrame:CGRectMake(insetx+(i*(cardWidth+innerCardPadding)), yinset, cardWidth, cardHeight)
                                                    entity:widget];
        
        appview.tag = i;
        appview.delegate = self;
        
        [self.scroller addSubview:appview];
        [self modifySwiperCard:appview];
       
        if ([widget.mobileReady boolValue])
            appview.mobileReady.hidden = NO;
        
        i += 1;
    }
    
    // Set Scrolling Size
    CGFloat contentWidth;
    if (count == 1)
        contentWidth = insetx + count*(cardWidth) + insetx;
    else
        contentWidth = insetx + (count*cardWidth+((count-1)*innerCardPadding)) + insetx;
    
    CGFloat contentHeight = yinset + cardHeight + yinset;
    [self.scroller setContentSize:CGSizeMake(contentWidth, contentHeight)];
    
    prevFrame = parent;
}

/**
 *  Typically Implemented By a Subclass, Used to Modify Swiper Views when Created.
 *
 *  @param appview MNOAppSwiperView
 */
- (void) modifySwiperCard:(MNOAppSwiperView *)appview
{

}

/**
 *  Adjusts the Size of the Tile Cards when the Screen Rotates
 */
- (void) relayout
{
    CGRect parent = self.bounds;
    
    // Update Our Scroll View Size
    [self.scroller setFrame:parent];
    
    // Calculate New Sizes and Positions for Each Card
    long count = [self.widgets count];
    CGFloat cardHeight = aspectRatioHeight * parent.size.height;
    CGFloat cardWidth = aspectRatioWidth * parent.size.width;
    CGFloat yinset = (parent.size.height - cardHeight)/2.0;

    // Adjust Width/Hieght based on Screen Orientation
    CGFloat side =  cardHeight*.70;
    CGFloat frameSide = (cardHeight > cardWidth ? cardWidth : cardHeight);
    
    // Apply Changes to Each Card
    int i = 0;
    for(UIView * view in self.scroller.subviews){
        
        if ([view isKindOfClass:[MNOAppSwiperView class]]) {
           
            MNOAppSwiperView * card = (MNOAppSwiperView *)view;
            card.frame = CGRectMake(insetx+(i*(frameSide+innerCardPadding)), yinset, frameSide, frameSide);
            CGRect frame = card.bounds;
            
            // Update Button Frame
            card.button.frame = frame;
            
            // Update Image Frame
            card.image.frame = CGRectMake((frame.size.width-side)/2.0, frame.origin.y, side, side);
            
            CGFloat mobileWidth = 0;
            CGFloat mobileHeight = 0;
            CGFloat mobileInsetX = card.image.frame.origin.x;
            
            if (!card.mobileReady.hidden) {
                // Update Mobile Ready Icon
                mobileWidth = frame.size.width * [self mobileIconScale];
                mobileHeight = mobileWidth;
                mobileInsetX = card.image.frame.origin.x;
                CGFloat iconYCoord = card.image.frame.origin.y+card.image.frame.size.height + ((card.frame.size.height - (card.image.frame.origin.y + card.image.frame.size.height)) - mobileHeight) / 2.0;
                card.mobileReady.frame = CGRectMake(mobileInsetX, iconYCoord, mobileWidth, mobileHeight);
            }
            
            // Update Name Label
            CGFloat labelYCoord = card.image.frame.origin.y+card.image.frame.size.height;
            CGFloat labelHeight = frame.size.height-labelYCoord;
            CGFloat labelWidth = card.image.bounds.size.width - mobileWidth;
            CGFloat labelInsetX = mobileInsetX + mobileWidth;
            card.nameLabel.frame = CGRectMake(labelInsetX, labelYCoord, labelWidth, labelHeight);
            
            i++;
        }
    }
    
    // Readjust Scroll View Size
    CGFloat contentWidth;
    if (count == 1)
        contentWidth = insetx + count*(frameSide) + insetx;
    else
        contentWidth = insetx + (count*frameSide+((count-1)*innerCardPadding)) + insetx;
    
    CGFloat contentHeight = yinset + cardHeight + yinset;
    [self.scroller setContentSize:CGSizeMake(contentWidth, contentHeight)];
}

#pragma -mark AppViewDelegate

-(void)entrySelected:(MNOWidget *)widget
{
    if ([self.delegate respondsToSelector:@selector(selectedCardWithName:iconURL:)])
        [self.delegate selectedCardWithName:widget.name iconURL:widget.largeIconUrl];
}

#pragma Getters/Setters

- (UIScrollView *) scroller
{
    if (!_scroller){
        _scroller =  [[UIScrollView alloc] initWithFrame:self.bounds];
    }
    
    return _scroller;
}

#pragma Font Sizer

- (CGFloat) mobileIconScale
{
    // Baseline
    CGFloat width = [[UIScreen mainScreen] bounds].size.width;
    CGFloat iconSize;
    
    if (width <= 320) {
        UIInterfaceOrientation orientation = [UIApplication sharedApplication].statusBarOrientation;
        if (UIDeviceOrientationIsLandscape(orientation))
        {
            iconSize = .18;
        }else{
            iconSize = .10;
        }
    }else{
        iconSize = .07;
    }
    
    return iconSize;
    
}

- (CGFloat) fontSize
{
    // Baseline
    CGFloat width = [[UIScreen mainScreen] bounds].size.width;
    CGFloat fontSize;
    
    if (width <= 320) {
        fontSize = 13.0;
    }else if( width > 320 <= 768){
        fontSize = 19.0;
    }else{
        fontSize = 24.0;
    }
    
    return fontSize;
}

@end
