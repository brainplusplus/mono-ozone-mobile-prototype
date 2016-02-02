//
//  IntentSwiperView.h
//  Mono2
//
//  Created by Ben Scazzero on 3/26/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOSwiperView.h"

@interface MNOIntentSwiperView : MNOSwiperView

- (id) initWithFrame:(CGRect)frame usingReceivers:(NSArray *)intentReceivers withSize:(CGSize)size;

@end
