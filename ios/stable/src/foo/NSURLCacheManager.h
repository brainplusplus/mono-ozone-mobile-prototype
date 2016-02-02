//
//  CacheManager.h
//  foo
//
//  Created by Ben Scazzero on 12/18/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface NSURLCacheManager : NSURLCache

+ (void) addImageWithURL:(NSString *)imagePath;
+ (void) removeImageWithURL:(NSString *)imagePath;

@end
