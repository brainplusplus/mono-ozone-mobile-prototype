//
//  AppViewDelegate.h
//  Mono2
//
//  Created by Ben Scazzero on 3/12/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@class MNOAppView;

@protocol MNOAppViewDelegate <NSObject>

-(void)entrySelected:(id)entity;

@end
