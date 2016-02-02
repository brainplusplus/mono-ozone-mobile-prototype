//
//  CacheManager.h
//  foo
//
//  Created by Ben Scazzero on 12/18/13.
//  Copyright (c) 2013 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNONSURLCacheManager : NSURLCache

+ (void) addImageWithURL:(NSString *)imagePath;
+ (void) removeImageWithURL:(NSString *)imagePath;

@end
