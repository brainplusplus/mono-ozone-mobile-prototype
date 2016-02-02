//
//  CacheManager.m
//  foo
//
//  Created by Ben Scazzero on 12/18/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import "NSURLCacheManager.h"
#import "GPSManager.h"
#import "RNCachedData.h"
#import "ProtocolManager.h"

static NSMutableSet * imageSet;
static NSMutableDictionary * imageDictCache;

@interface NSURLCacheManager ()


@end

@implementation NSURLCacheManager

+ (void) initialize {
    imageSet = [[NSMutableSet alloc] init];
    imageDictCache = [NSMutableDictionary new];
}

+ (NSString *)cachePathForImage:(NSString *)imageURL
{
    // This stores in the Caches directory, which can be deleted when space is low, but we only use it for offline access
    NSString *cachesPath = [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) lastObject];
    
    return
    [cachesPath stringByAppendingPathComponent:
     [NSString stringWithFormat:@"%x",[imageURL hash]]];
}

+ (NSString *)documentsPathWithName:(NSString *)name
{
    NSString *docPath = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) lastObject];
    
    return
     [docPath stringByAppendingPathComponent:
      [NSString stringWithFormat:@"%x",[name hash]]];
}

+ (void) addImageWithURL:(NSString *)imagePath
{
    NSString * fromFilePath = [self cachePathForImage:imagePath];
    NSString * toFilePath = [self documentsPathWithName:imagePath];
    
    NSLog(@"FromFilePath: %@",fromFilePath);
    NSLog(@"ToFilePath: %@",fromFilePath);
    NSLog(@"Path: %@",imagePath);
    
    NSFileManager * fmngr = [[NSFileManager alloc] init];
    if ([fmngr fileExistsAtPath:toFilePath]){
        //remove old image if there
        [self removeImageWithURL:imagePath];
    }
    
    NSError *error;
    //copy image from cache directory to documents directory for use later
    if(![fmngr copyItemAtPath:fromFilePath toPath:toFilePath error:&error]){
        // handle the error
        NSLog(@"Error Moving Cached Image: %@", [error description]);
    }else{
        NSLog(@"Saved File At %@",toFilePath);
        [imageSet addObject:imagePath];
    }
}

+ (void) removeImageWithURL:(NSString *)imagePath
{
    NSString * toFilePath = [self documentsPathWithName:imagePath];
    
    NSFileManager * fmngr = [[NSFileManager alloc] init];
    NSError *error;
    if(![fmngr removeItemAtPath:toFilePath error:&error]){
        // handle the error
        NSLog(@"Error Removing Cached Image: %@", [error description]);
    }else{
        NSLog(@"Remove File At %@",toFilePath);
        [imageSet removeObject:imagePath];
    }
}

+ (NSCachedURLResponse *) retrieveImageForRequest:(NSURLRequest *)request
{
    NSString * imagePath = [[request URL] absoluteString];
    RNCachedData *cache = nil;
    
    if ([imageDictCache objectForKey:imagePath] != nil)
        cache = [imageDictCache objectForKey:imagePath];
    else
        cache = [NSKeyedUnarchiver unarchiveObjectWithFile:[self documentsPathWithName:imagePath]];
    
    
    // Do we have request cached?
    if (cache != nil) {
        NSData *data = [cache data];
        NSURLResponse *response = [cache response];
        NSURLRequest * redirectRequest = [cache redirectRequest];
        NSLog(@"Response: %@",response);

        NSCachedURLResponse * cachedResponse =
        [[NSCachedURLResponse alloc] initWithResponse:response data:data];
            
        [imageDictCache setObject:cache forKey:imagePath];
        NSLog(@"Sending Cached Image Response for URL: %@",imagePath);
        
        return cachedResponse;
    }
    
    return nil;
}

- (NSCachedURLResponse *)cachedResponseForRequest:(NSURLRequest *)request;
{
    NSLog(@"Checking For Cached Response for Request: %@", request.URL);
 
    if ([ProtocolManager isSupportedImageRequest:request]) {
        id response =  [NSURLCacheManager retrieveImageForRequest:request];
        if (response != nil)
            return response;
        
    }
    
    return [super cachedResponseForRequest:request];
}

@end
