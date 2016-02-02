//
//  CustomGridViewDelegate.h
//  Mono2
//
//  Created by Ben Scazzero on 3/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol MNOCustomGridViewDelegate <NSObject>

@optional
-(void) entrySelected:(id)  chosenView;
-(void) entryRemoved:(id) chosenView;
-(void) entryLongPressed:(id) chosenView optionSelectedKey:(NSString *)option value:(id)value;
-(BOOL) entryIsRemovable:(id)entry;

@end
