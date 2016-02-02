//
//  AppMallView.h
//  Mono2
//
//  Created by Ben Scazzero on 3/12/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOAppView.h"

@interface MNOAppMallView : MNOAppView

- (id) initWithFrame:(CGRect)frame entity:(id)entity selected:(BOOL)selected;
/**
 *  Indicates whether the view is selected or not.
 */
@property (nonatomic) BOOL selected;

- (NSString *) defaultImageName;

@end
