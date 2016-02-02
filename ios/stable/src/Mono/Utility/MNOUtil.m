//
//  Util.m
//  Mono2
//
//  Created by Ben Scazzero on 4/11/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "MNOUtil.h"
#import <CommonCrypto/CommonDigest.h>
#import "MNOUpdateCache.h"

@interface MNOUtil ()

@end

@implementation MNOUtil
{
    MNOUpdateCache * prevCache;
    NSTimer * cacheTimer;
}

#pragma mark public methods

+ (MNOUtil *)sharedInstance {
    static MNOUtil *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[self alloc] init];
    });
    return sharedInstance;
}

#pragma mark - Init

- (id) init
{
    self = [super init];
    if (self) {
        [self setupSaveNotification];
        
        // Caching Updates
        prevCache = nil;
        [self registerTimer];
    }
    return self;
}

- (NSString *)decodeBase64String:(NSString *)base64String {
    if (base64String) {
        NSData *decodedData = [[NSData alloc] initWithBase64EncodedString:base64String options:0];
        NSString *decodedString = [[NSString alloc] initWithData:decodedData encoding:NSUTF8StringEncoding];
        return decodedString;
    }
    return nil;
}


- (NSString *)dictionaryToString:(NSDictionary *)base64Dict {
    if (base64Dict) {
        NSData *decodedData = [NSJSONSerialization dataWithJSONObject:base64Dict options:0 error:nil];
        NSString *decodedString = [[NSString alloc] initWithData:decodedData encoding:NSUTF8StringEncoding];
        return decodedString;
    }
    return nil;
}

- (NSDictionary *)stringToDictionary:(NSString *)base64String {
    if (base64String) {
        NSData *decodedData = [base64String dataUsingEncoding:NSUTF32StringEncoding];
        return [NSJSONSerialization JSONObjectWithData:decodedData
                                               options:0
                                                 error:nil];
    }
    return nil;
}

#pragma mark - ManagedObjectContexts

- (void) setupSaveNotification
{
    [[NSNotificationCenter defaultCenter] addObserverForName:NSManagedObjectContextDidSaveNotification object:nil queue:nil usingBlock:^(NSNotification *note) {
        NSManagedObjectContext * moc = [[MNOUtil sharedInstance] defaultManagedContext];
        if (note.object != moc) {
            NSLog(@"Merging In Changes: ContextDidSaveNotif");
            [moc performBlock:^{
                [moc mergeChangesFromContextDidSaveNotification:note];
            }];
        }
    }];
}

- (NSManagedObjectContext *) newPrivateContext
{
    NSManagedObjectContext * context = [[NSManagedObjectContext alloc] initWithConcurrencyType:NSPrivateQueueConcurrencyType];
    context.persistentStoreCoordinator = [[self defaultManagedContext] persistentStoreCoordinator];
    return context;
}

- (NSManagedObjectContext *)defaultManagedContext {
    if (!_defaultManagedContext) {
        MNOAppDelegate *appDelegate = (MNOAppDelegate *) [[UIApplication sharedApplication] delegate];
        _defaultManagedContext = appDelegate.managedObjectContext;
    }
    return _defaultManagedContext;
}

- (NSString *)sha1:(NSString *)input {
    
    const char *cstr = [input cStringUsingEncoding:NSUTF8StringEncoding];
    NSData *data = [NSData dataWithBytes:cstr length:input.length];

    uint8_t digest[CC_SHA1_DIGEST_LENGTH];

    CC_SHA1(data.bytes, (int)data.length, digest);

    NSMutableString *output = [NSMutableString stringWithCapacity:CC_SHA1_DIGEST_LENGTH * 2];

    for (int i = 0; i < CC_SHA1_DIGEST_LENGTH; i++)
        [output appendFormat:@"%02x", digest[i]];

    return output;
}

/**
 * See Declaration in MNOUtil.h
 */
- (NSString *)formatURLString:(NSString *)widgetURL withPath:(NSString *)path
{    
    if (![widgetURL hasPrefix:@"https:"] && ![widgetURL hasPrefix:@"http:"]){
        NSURL * widgetBaseUrl = [[NSURL alloc] initWithString:[MNOAccountManager sharedManager].widgetBaseUrl];

        //format string (remove relative reference)
        widgetURL = [widgetURL stringByReplacingOccurrencesOfString:@".." withString:@""];
        //required
        widgetURL = [@"/owf" stringByAppendingPathComponent:widgetURL];
        //
        widgetURL = [[[NSURL alloc] initWithString:widgetURL relativeToURL:widgetBaseUrl] absoluteString];
        
    }
    
    // format path
    if (path) {
        path = [path stringByReplacingOccurrencesOfString:@".." withString:@""];
        if (![[path substringToIndex:1] isEqualToString:@"/"])
            path = [@"/" stringByAppendingString:path];
        
        widgetURL = [widgetURL stringByAppendingString:path];
    }
    
    // require for mobile
    widgetURL = [widgetURL stringByAppendingString:@"?mobile=true"];
    
    return  widgetURL;
}

- (void)showMessageBox:(NSString *)title message:(NSString *)message {
    [[[UIAlertView alloc] initWithTitle:title
                                message:message
                               delegate:nil
                      cancelButtonTitle:@"OK"
                      otherButtonTitles:nil] show];
}


#pragma mark - Cache

#pragma mark - Timers

- (void) registerTimer
{
    // Create and Start a New Timer
   cacheTimer = [NSTimer scheduledTimerWithTimeInterval:30.0
                                             target:self
                                           selector:@selector(updateCachedData)
                                           userInfo:nil
                                            repeats:YES];
}


- (void) updateCachedData
{
    // This should only be executing once
    if (!prevCache || prevCache.isFinished) {
        NSManagedObjectID * userId = [MNOAccountManager sharedManager].user.objectID;
        if (userId) {
            MNOUpdateCache * cacheUpdate= [[MNOUpdateCache alloc] initWithUser:userId];
            prevCache = cacheUpdate;
            [self.syncingQueue addOperation:cacheUpdate];
        }
    }
}

#pragma mark - Setters/Getters

- (NSOperationQueue *) syncingQueue
{
    if (!_syncingQueue) {
        _syncingQueue = [[NSOperationQueue alloc] init];
        [_syncingQueue setMaxConcurrentOperationCount:1];
    }
    return _syncingQueue;
}


@end
