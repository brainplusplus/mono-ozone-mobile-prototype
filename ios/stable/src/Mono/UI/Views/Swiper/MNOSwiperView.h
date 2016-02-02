//
//  SwiperView.h
//  Mono2
//
//  Created by Ben Scazzero on 3/10/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOSwiperViewDelegate.h"
#import "MNOAppViewDelegate.h"

@class MNODashboard;
@class MNOAppView;
@class MNOAppSwiperView;

@interface MNOSwiperView : UIView<MNOAppViewDelegate>

@property (weak, nonatomic) id<MNOSwiperViewDelegate> delegate;
@property (strong, nonatomic) UIScrollView * scroller;

- (id) initWithFrame:(CGRect)frame usingContent:(NSArray *)widgets withSize:(CGSize)size;
- (void) showScrollView;
- (void) modifySwiperCard:(MNOAppSwiperView *)appview;


@end
