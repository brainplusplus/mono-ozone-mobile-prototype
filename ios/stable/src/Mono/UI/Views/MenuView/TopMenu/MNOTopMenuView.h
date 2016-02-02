//
//  TopMenuView.h
//  Mono2
//
//  Created by Ben Scazzero on 3/7/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOMenuView.h"

@interface MNOTopMenuView : MNOMenuView

- (id) initWithSize:(CGSize)size contents:(NSDictionary *)contents alignRight:(BOOL)right;

@end
