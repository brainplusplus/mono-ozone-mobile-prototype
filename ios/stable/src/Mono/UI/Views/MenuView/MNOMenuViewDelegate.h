//
//  MenuViewDelegate.h
//  Mono2
//
//  Created by Ben Scazzero on 3/16/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol MNOMenuViewDelegate <NSObject>

- (void) optionSelectedKey:(NSString *) key withValue:(id)value;

@end
