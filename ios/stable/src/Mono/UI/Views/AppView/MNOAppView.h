//
//  AppViewCell.h
//  Mono2
//
//  Created by Ben Scazzero on 2/4/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOAppViewDelegate.h"

@class MNOWidget;
@class MNODashboard;

@interface MNOAppView : UIView

@property (weak, nonatomic) id<MNOAppViewDelegate> delegate;

/* Views */
@property (strong, nonatomic) UILabel * nameLabel;
@property (strong, nonatomic) UIButton * button;
@property (strong, nonatomic) UIImageView * image;

/* Properties */
@property (strong, nonatomic) NSString * userImageUrl;
@property (strong, nonatomic) NSString * userName;
@property (weak, nonatomic) id entity;

- (id) initWithFrame:(CGRect)frame image:(NSString *)imageUrl withName:(NSString *)name;
- (id) initWithFrame:(CGRect)frame entity:(id)entity;

- (UIImage *) imageWithImage:(UIImage *)image scaledToSize:(CGSize)newSize;
- (void) widgetSelected:(id)button;

+ (CGFloat) standardWidth;
+ (CGFloat) standardHeight;

// Default Image
- (NSString *) defaultImageName;

@end

 