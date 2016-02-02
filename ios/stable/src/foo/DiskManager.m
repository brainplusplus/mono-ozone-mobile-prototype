//
//  CacheManager.m
//  foo
//
//  Created by Ben Scazzero on 1/2/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "DiskManager.h"
#import "TMDiskCache.h"
#import "NSURLCacheManager.h"
#import "ProtocolManager.h"

#define jsonFormatError @"DiskCacheManager: Could Not Format JSON Data"

@interface DiskManager ()

@property (readwrite, nonatomic) unsigned long index;

@end

@implementation DiskManager


+(DiskManager *) sharedManager
{
    static DiskManager * sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}


-(id)init
{
    self = [super init];
    if (self) {
        //
        _index = -1;
        NSUInteger byteLimit = 1024 * 1024 * 50;//50 mb
        [[TMDiskCache sharedCache] setByteLimit:byteLimit];
        [[TMDiskCache sharedCache] setWillRemoveObjectBlock:^(TMDiskCache *cache, NSString *key, id <NSCoding> object, NSURL *fileURL){
            // remove any media saved on disk
            NSLog(@"Checking to Remove Media from Disk: TMDiskCache");
            [self findMediaObject:object saveMedia:NO];
        }];
        
        [[TMDiskCache sharedCache] setWillAddObjectBlock:^(TMDiskCache *cache, NSString *key, id <NSCoding> object, NSURL *fileURL){
            // save the media to disk for reuse
            NSLog(@"Checking For Any Media: TMDiskCache");
            [self findMediaObject:object saveMedia:YES];
        }];
    }
    return self;
}


-(TMIndex) autoId
{
    _index += 1;
    return _index;
}

- (void) findMediaObjectInString:(id)val saveMedia:(BOOL)save
{
    //check if string
    if([[val class] isSubclassOfClass:[NSString class]] &&
       //check if valid URL
       [NSURL URLWithString:val] != nil  &&
       //check if support this call
       [ProtocolManager isSupportedImageExtension:[val pathExtension]]){
        //if all true, cache media URL
        if (save)
            [NSURLCacheManager addImageWithURL:val];
        else
            [NSURLCacheManager removeImageWithURL:val];
    }
}

- (void) findMediaObjectInArr:(NSArray *)arr saveMedia:(BOOL)save
{
    for (id val in arr) {
        
        if ([[val class] isSubclassOfClass:[NSDictionary class]]) {
            [self findMediaObjectInDict:val saveMedia:save];
        }else if([[val class] isSubclassOfClass:[NSArray class]]){
            [self findMediaObjectInArr:val saveMedia:save];
        }
        
        [self findMediaObjectInString:val saveMedia:save];
    }
}

- (void) findMediaObjectInDict:(NSDictionary *)dict saveMedia:(BOOL)save
{
    for (NSString *key in dict) {
        id val = [dict objectForKey:key];
        
        if ([[val class] isSubclassOfClass:[NSDictionary class]])
            [self findMediaObjectInDict:val saveMedia:save];
        else if([[val class] isSubclassOfClass:[NSArray class]])
            [self findMediaObjectInArr:val saveMedia:save];
        
        [self findMediaObjectInString:val saveMedia:save];
        
    }
}

- (void) findMediaObject:(id)val saveMedia:(BOOL)save
{
    if ([[val class] isSubclassOfClass:[NSDictionary class]])
        [self findMediaObjectInDict:val saveMedia:save];
    else if([[val class] isSubclassOfClass:[NSArray class]])
        [self findMediaObjectInArr:val saveMedia:save];

    [self findMediaObjectInString:val saveMedia:save];

}

- (NSData *) setObject:(id<NSCoding>)item withParams:(NSDictionary *)params
{
    TMIndex nextId = [self autoId];
    NSString * key = [NSString stringWithFormat:@"%lu",nextId];
    [[TMDiskCache sharedCache] setObject:item forKey:key];

    
    // unless an exception is thrown, we should always return success
    return [self jsonDataFromDictionary:@{@"status":@"success",@"index":key}];
}

- (NSData *) deleteObjectAtIndex:(NSString *)key withParams:(NSDictionary *)params
{
    BOOL result = [[TMDiskCache sharedCache] objectForKey:key] != nil;
    NSString * formatedResult = result ? @"true" : @"false";
    

    if(result){
        [[TMDiskCache sharedCache] removeObjectForKey:key];
    }
    
    // unless an exception is thrown, we should always return success
    return [self jsonDataFromDictionary:@{@"status":@"success",@"removed": formatedResult}];
}

- (NSData *) retrieveObject:(NSString *)key withParams:(NSDictionary *)params
{
    id<NSCoding> obj =  [[TMDiskCache sharedCache] objectForKey:key];

    NSDictionary * results = nil;
    if (obj != nil)
        results = @{@"status":@"success",@"obj": obj};
    else
        results = @{@"status":[NSString stringWithFormat:@"No Object At Index %@",key]};

    return [self jsonDataFromDictionary:results];
}

- (NSData *) updateObject:(id<NSCoding>)object atIndex:(NSString *)key withParams:(NSDictionary *)params
{
    BOOL result = [[TMDiskCache sharedCache] objectForKey:key] != nil;
    NSString * formatedResult = result ? @"true" : @"false";
    [[TMDiskCache sharedCache] setObject:object forKey:key];
    
    // unless an exception is thrown, we should always return success
    return [self jsonDataFromDictionary:@{@"status":@"success",@"updated": formatedResult}];

}

- (NSData *) jsonDataFromDictionary:(NSDictionary *)results
{
    NSError * error = nil;
    NSData * jsondata = [NSJSONSerialization dataWithJSONObject:results options:0 error:&error];
    
    if (jsondata && !error)
        return jsondata;
    
    [self logErrorMessage:jsonFormatError withError:error];

    return nil;
}

- (void) logErrorMessage:(NSString *)msg withError:(NSError *)err
{
    NSLog(@"%@: %@",msg,err);
}

@end
