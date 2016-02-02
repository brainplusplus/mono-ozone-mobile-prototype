//
//  MenuView.h
//  Mono2
//
//  Created by Ben Scazzero on 3/16/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOMenuViewDelegate.h"

@interface MNOMenuView : UIView

@property (strong, nonatomic) NSDictionary * contents;
@property (strong, nonatomic) NSMutableDictionary * contentView;
@property (strong, nonatomic) NSArray * toggleOptions;
@property (weak, nonatomic) id<MNOMenuViewDelegate> delegate;
@property (strong, nonatomic) NSString * enableKey;

- (id) initWithFrame:(CGRect)frame contents:(NSDictionary *)contents;
- (UIButton *) createButtonForKey:(NSString *)key;


@end
