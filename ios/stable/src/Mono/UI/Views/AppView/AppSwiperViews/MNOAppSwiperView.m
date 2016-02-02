//
//  MNOAppSwiperView.m
//  Mono
//
//  Created by Ben Scazzero on 6/12/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAppSwiperView.h"

@implementation MNOAppSwiperView

- (id) initWithFrame:(CGRect)frame entity:(id)entity
{
    self = [super initWithFrame:frame entity:entity];
    if (self) {
        [self updateView];
    }
    return self;
}

- (void) updateView
{
    // Resize Label Frame
    CGRect labelFrame = self.nameLabel.frame;
    labelFrame.origin.x = labelFrame.size.width * .125;
    labelFrame.size.width *= .75;
    self.nameLabel.frame = labelFrame;
    self.nameLabel.textAlignment = NSTextAlignmentNatural;
    
    // Add Paragraph Style
    NSMutableAttributedString *attributedString = [[NSMutableAttributedString alloc] initWithString:self.nameLabel.text];
    NSMutableParagraphStyle *paragraphStyle = [[NSMutableParagraphStyle alloc] init];
    [paragraphStyle setLineBreakMode:NSLineBreakByWordWrapping];
    paragraphStyle.firstLineHeadIndent = 5;
    paragraphStyle.headIndent = 5;
    [attributedString setAttributes:@{NSParagraphStyleAttributeName:paragraphStyle}
                              range:NSMakeRange(0, attributedString.length)];
    self.nameLabel.attributedText  = attributedString;
    
    // Add Mobile Icon
     self.mobileReady.hidden = YES;
    [self addSubview:self.mobileReady];
}


#pragma mark - Setters/Getters

- (UIImageView *) mobileReady
{
    if (!_mobileReady) {
        _mobileReady = [[UIImageView alloc] init];
        _mobileReady.contentMode = UIViewContentModeScaleToFill;
        
        CGFloat width = self.frame.size.width * .125;
        CGFloat height = width;
        CGFloat yCoord = self.nameLabel.frame.origin.y + (self.nameLabel.frame.size.height - height)/2.0;
        _mobileReady.frame = CGRectMake(0, yCoord, width, height);
        
        UIImage * image = [UIImage imageNamed:@"icon_mobileready_.png"];
        self.mobileReady.image = image;
    }
    
    return _mobileReady;
}

@end
