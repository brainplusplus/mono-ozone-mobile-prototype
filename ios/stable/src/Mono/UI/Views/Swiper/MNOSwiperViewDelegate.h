//
//  SwiperViewDelegate.h
//  Mono2
//
//  Created by Ben Scazzero on 3/18/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol MNOSwiperViewDelegate <NSObject>

- (void) selectedCardWithName:(NSString *)name iconURL:(NSString *)url;

@end
