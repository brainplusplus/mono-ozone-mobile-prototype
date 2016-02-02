//
//  AppsMallGridView.h
//  Mono2
//
//  Created by Ben Scazzero on 3/12/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOCustomGridView.h"

@interface MNOAppsMallGridView : MNOCustomGridView

@property (strong, nonatomic) NSDictionary * options;

- (id)initWithFrame:(CGRect)frame withList:(NSArray *)arr options:(NSDictionary *)options;

@end
