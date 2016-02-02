//
//  MemoryCacheManager.m
//  Mono2

#import "MNOMemoryCacheManager.h"
#import "TMMemoryCache.h"
#import "MNONSURLCacheManager.h"
#import "MNOProtocolManager.h"

#define jsonFormatError @"DiskCacheManager: Could Not Format JSON Data"

@interface MemoryCacheManager ()

@property(readwrite, nonatomic) unsigned long index;

@end

@implementation MemoryCacheManager

+ (MemoryCacheManager *)sharedManager {
    static MemoryCacheManager *sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });

    return sharedManager;
}

- (id)init {
    self = [super init];
    if (self) {
        //
        _index = -1;

        [[TMMemoryCache sharedCache] setWillRemoveObjectBlock:^(TMMemoryCache *cache, NSString *key, id object) {
            // remove any media saved on disk
            NSLog(@"Checking to Remove Media from Disk: TMMemoryCache");
            [self findMediaObject:object saveMedia:NO];
        }];

        [[TMMemoryCache sharedCache] setWillAddObjectBlock:^(TMMemoryCache *cache, NSString *key, id object) {
            // save the media to disk for reuse
            NSLog(@"Checking For Any Media: TMMemoryCache");
            [self findMediaObject:object saveMedia:YES];
        }];
    }
    return self;
}


- (TMIndex)autoId {
    _index += 1;
    return _index;
}

- (void)findMediaObjectInString:(id)val saveMedia:(BOOL)save {
    //check if string
    if ([[val class] isSubclassOfClass:[NSString class]] &&
            //check if valid URL
            [NSURL URLWithString:val] != nil  &&
            //check if support this call
            [MNOProtocolManager isSupportedImageExtension:[val pathExtension]]) {
        //if all true, cache media URL
        if (save)
            [MNONSURLCacheManager addImageWithURL:val];
        else
            [MNONSURLCacheManager removeImageWithURL:val];
    }
}

- (void)findMediaObjectInArr:(NSArray *)arr saveMedia:(BOOL)save {
    for (id val in arr) {

        if ([[val class] isSubclassOfClass:[NSDictionary class]]) {
            [self findMediaObjectInDict:val saveMedia:save];
        } else if ([[val class] isSubclassOfClass:[NSArray class]]) {
            [self findMediaObjectInArr:val saveMedia:save];
        }

        [self findMediaObjectInString:val saveMedia:save];
    }
}

- (void)findMediaObjectInDict:(NSDictionary *)dict saveMedia:(BOOL)save {
    for (NSString *key in dict) {
        id val = [dict objectForKey:key];

        if ([[val class] isSubclassOfClass:[NSDictionary class]])
            [self findMediaObjectInDict:val saveMedia:save];
        else if ([[val class] isSubclassOfClass:[NSArray class]])
            [self findMediaObjectInArr:val saveMedia:save];

        [self findMediaObjectInString:val saveMedia:save];

    }
}

- (void)findMediaObject:(id)val saveMedia:(BOOL)save {
    if ([[val class] isSubclassOfClass:[NSDictionary class]])
        [self findMediaObjectInDict:val saveMedia:save];
    else if ([[val class] isSubclassOfClass:[NSArray class]])
        [self findMediaObjectInArr:val saveMedia:save];

    [self findMediaObjectInString:val saveMedia:save];

}

- (NSData *)setObject:(id <NSCoding>)item withParams:(NSDictionary *)params {
    TMIndex nextId = [self autoId];
    NSString *key = [NSString stringWithFormat:@"%lu", nextId];

    [[TMMemoryCache sharedCache] setObject:item forKey:key];

    // unless an exception is thrown, we should always return success
    return [self jsonDataFromDictionary:@{@"status" : @"success", @"index" : key}];
}

- (NSData *)deleteObjectAtIndex:(NSString *)key withParams:(NSDictionary *)params {
    BOOL result = [[TMMemoryCache sharedCache] objectForKey:key] != nil;
    NSString *formatedResult = result ? @"true" : @"false";


    if (result) {
        [[TMMemoryCache sharedCache] removeObjectForKey:key];
    }

    // unless an exception is thrown, we should always return success
    return [self jsonDataFromDictionary:@{@"status" : @"success", @"removed" : formatedResult}];
}

- (NSData *)retrieveObject:(NSString *)key withParams:(NSDictionary *)params {
    id <NSCoding> obj = [[TMMemoryCache sharedCache] objectForKey:key];

    NSDictionary *results = nil;
    if (obj != nil)
        results = @{@"status" : @"success", @"obj" : obj};
    else
        results = @{@"status" : [NSString stringWithFormat:@"No Object At Index %@", key]};

    return [self jsonDataFromDictionary:results];
}

- (NSData *)updateObject:(id <NSCoding>)object atIndex:(NSString *)key withParams:(NSDictionary *)params {
    BOOL result = [[TMMemoryCache sharedCache] objectForKey:key] != nil;
    NSString *formatedResult = result ? @"true" : @"false";
    //remove
    [[TMMemoryCache sharedCache] removeObjectForKey:key];
    //set new val
    [[TMMemoryCache sharedCache] setObject:object forKey:key];

    // unless an exception is thrown, we should always return success
    return [self jsonDataFromDictionary:@{@"status" : @"success", @"updated" : formatedResult}];
}

- (NSData *)jsonDataFromDictionary:(NSDictionary *)results {
    NSError *error = nil;
    NSData *jsondata = [NSJSONSerialization dataWithJSONObject:results options:0 error:&error];

    if (jsondata && !error)
        return jsondata;

    [self logErrorMessage:jsonFormatError withError:error];

    return nil;
}

- (void)logErrorMessage:(NSString *)msg withError:(NSError *)err {
    NSLog(@"%@: %@", msg, err);
}


@end
