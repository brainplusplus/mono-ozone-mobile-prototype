//
//  MNOUpdateCache.m
//  Mono
//
//  Created by Ben Scazzero on 6/24/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOUpdateCache.h"
#import "MNOCachedData.h"
#import "MNOHttpStack.h"

@implementation MNOUpdateCache
{
    NSManagedObjectContext * context;
    MNOUser * user;
    NSManagedObjectID  * userId;
}

- (instancetype) initWithUser:(NSManagedObjectID*)_userId
{
    self = [super init];
    if (self) {
        userId = _userId;
    }
    
    return self;
}

- (void) main
{
    // Create a NSManagedObjectContext in the current thread
    context = [[MNOUtil sharedInstance] newPrivateContext];
    context.undoManager = nil;
    // Retrieve our user from this context
    user = (MNOUser *)[context objectWithID:userId];
   
    // Perform Operation
 
     NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNOCachedData entityName]];
     fetch.predicate = [NSPredicate predicateWithFormat:@"belongsTo.user == %@",user];
     NSError * error = nil;
     NSArray * results = [context executeFetchRequest:fetch error:&error];

     NSDate * date = [[NSDate alloc] init];
     NSLog(@"Updating %d Cache Objects", [results count]);
    
     for (MNOCachedData * data in results) {
         // Check first if we need to update the Expiration Time
         NSComparisonResult result = [date compare:data.expirationDate];
         if (result == NSOrderedDescending) {
             [self update:data verifyDiff:NO];
             data.expirationDate = [NSDate dateWithTimeIntervalSinceNow:60*[data.expirationTime intValue]];
             data.refreshDate =  [NSDate dateWithTimeIntervalSinceNow:60*[data.refreshTime intValue]];
             [self save];
             NSLog(@"Updated %@, Next Refresh: %@", data.url, data.refreshDate);
             NSLog(@"Updated %@, Next Expiration: %@", data.url, data.expirationDate);
         }else{
             result  = [date compare:data.refreshDate];
             if (result == NSOrderedDescending) {
                 [self update:data verifyDiff:YES];
                 data.refreshDate =  [NSDate dateWithTimeIntervalSinceNow:60*[data.refreshTime intValue]];
                [self save];
                 NSLog(@"Updated %@, Next Refresh: %@", data.url, data.refreshDate);
             }
         }
     }
}

- (void) update:(MNOCachedData *)cacheObj verifyDiff:(BOOL)verifyDiff
{
    
    dispatch_semaphore_t holdOn = dispatch_semaphore_create(0);
    
    // Retrieves data via HTTP request and stores in cache database
    NSURLRequest * httpRequest = [[NSURLRequest alloc] initWithURL:[NSURL URLWithString:cacheObj.url] cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:10.0];
    
    [[MNOHttpStack sharedStack] makeAsynchronousRequest:REQUEST_RAW request:httpRequest success:^(MNOResponse *response) {
        
        if (verifyDiff) {
            if(![cacheObj.data isEqualToData:response.responseData]){
                [self update:cacheObj withResponse:response];
            }
        }else{
            [self update:cacheObj withResponse:response];
        }
        
        dispatch_semaphore_signal(holdOn);

    } failure:^(MNOResponse *response, NSError *error) {
        dispatch_semaphore_signal(holdOn);
    }];

    
    dispatch_semaphore_wait(holdOn, DISPATCH_TIME_FOREVER);

}


- (void) update:(MNOCachedData *)cacheObj withResponse:(MNOResponse *)response
{
    cacheObj.data = response.responseObject;
    NSString *eTag = response.etag;
    if (eTag == nil) {
        NSString *base64encodedString = [response.responseObject base64Encoding];
        eTag = [[MNOUtil sharedInstance] sha1:base64encodedString];
    }
    cacheObj.eTag = eTag;
    cacheObj.contentType = response.contentType;
}

- (BOOL) save
{
    // Save
    NSError *error = nil;
    if([context hasChanges] && [context save:&error] && !error){
        return YES;
    }
    
    NSLog(@"Unable to Update Cache Object");
    return NO;
}
@end

