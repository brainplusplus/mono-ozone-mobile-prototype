//
// Created by Michael Schreiber on 4/16/14.
// Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOCacheProcessor.h"
#import "MNOCachedData.h"
#import "MNOAppDelegate.h"
#import <CommonCrypto/CommonDigest.h>
#import "Util.h"
#import "MNOWidgetManager.h"

#import "MNOHttpStack.h"

// Methods
#define METHOD_UPDATE @"update"
#define METHOD_STORE @"store"
#define METHOD_RETRIEVE @"retrieve"
#define METHOD_STATUS @"status"

@interface MNOCacheProcessor ()
@property (strong, nonatomic) NSManagedObjectContext * moc;
@end

@implementation MNOCacheProcessor

#pragma mark public methods

- (MNOAPIResponse *)process:(NSString *)method params:(NSDictionary *)params url:(NSURL *)url webView:(UIWebView *)webView {
    MNOAPIResponse *response = nil;
    if ([method isEqualToString:METHOD_STORE] || [method isEqualToString:METHOD_UPDATE]) {
        response = [self storeCachedData:params];
    }
    else if ([method isEqualToString:METHOD_RETRIEVE]) {
        response = [self retrieveCachedData:params];
    }
    else if([method isEqualToString:METHOD_STATUS]){
        response = [self status:params];
    }
    else {
        response = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:[NSString stringWithFormat:@"Unrecognized method %@.", method]];
    }

    return response;
}

#pragma mark - Status

- (MNOAPIResponse *)status:(NSDictionary *)params
{
    NSString *url = [params objectForKey:@"url"];
    MNOUser * user = [[MNOAccountManager sharedManager] user];
    NSString * instanceId = [params objectForKey:@"instanceId"];
    
    // Check if we can retrieve something
    NSFetchRequest *fetchRequest = [[NSFetchRequest alloc] initWithEntityName:[MNOCachedData entityName]];
    [fetchRequest setPredicate:[NSPredicate predicateWithFormat:@"url == %@ AND belongsTo.user == %@  AND belongsTo.instanceId == %@",url,user,instanceId]];
    NSError * error = nil;
    NSArray * fetchedObjects = [[self moc] executeFetchRequest:fetchRequest error:&error];
    
    if(error || [fetchedObjects count] == 0) {
        return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Unable to retrieve cache"];
    }
    
    MNOCachedData * data =  [fetchedObjects firstObject]; // should only be 1 object
    return [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS additional:@{
                                                                           @"timeout":data.refreshTime,
                                                                           @"expiration":data.expirationTime,
                                                                           @"expirationDate":data.expirationDate.description,
                                                                           @"timeoutDate":data.refreshDate.description}];
}

#pragma mark - Store/Update

- (NSInteger) formatString:(NSString *)val
{
    BOOL valid;
    // trim whitespace
    val =  [val stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    // verify string is number
    NSCharacterSet *alphaNums = [NSCharacterSet decimalDigitCharacterSet];
    NSCharacterSet *inStringSet = [NSCharacterSet characterSetWithCharactersInString:val];
    valid = [alphaNums isSupersetOfSet:inStringSet];
    
    if (!valid || [val isEqualToString:@""]) // Not numeric
    {
        return 10;
    }
    return [val integerValue];
}

- (MNOAPIResponse *)storeCachedData:(NSDictionary *)params
{
    // Retrieve Required Info
    NSString * url = [params objectForKey:@"url"];
    NSString * formattedURL = [[NSURL URLWithString:url] absoluteString];
    if (formattedURL == nil)
        return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Invalid URL"];
    
    NSInteger expiration = [self formatString:[params objectForKey:@"expirationInMinutes"]];
    NSInteger timeout = [self formatString:[params objectForKey:@"timeOut"]];
    __block NSString * instanceId = [params objectForKey:@"instanceId"];
    MNOUser * user = [[MNOAccountManager sharedManager] user];
    
    
    // Check if we have to update an object or create a new one
    NSFetchRequest * request = [[NSFetchRequest alloc] initWithEntityName:[MNOCachedData entityName]];
    request.predicate = [NSPredicate predicateWithFormat:@"belongsTo.user == %@ AND belongsTo.instanceId == %@ AND url == %@",user, instanceId,formattedURL];
    NSError * error = nil;
    NSArray * results = [self.moc executeFetchRequest:request error:&error];
    
    
    __block MNOCachedData *cacheObj;
    if (!error && [results count] == 1)
        // We Updating
        cacheObj = [results firstObject];
    else{
        // We Creating New Instance
        NSFetchRequest * request = [[NSFetchRequest alloc] initWithEntityName:[MNOWidget entityName]];
        request.predicate = [NSPredicate predicateWithFormat:@"user == %@ AND instanceId == %@",user, instanceId];
        NSArray * results = [self.moc executeFetchRequest:request error:&error];
      
        if([results count] == 1){
            MNOWidget * widget = [results firstObject];
            cacheObj = [NSEntityDescription insertNewObjectForEntityForName:[MNOCachedData entityName] inManagedObjectContext:self.moc];
            cacheObj.belongsTo = widget;
        }else{
            return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Unable to save to the cache"];
        }
    }
    
    // Update Fields
    cacheObj.url = url;
    cacheObj.refreshTime = @(timeout);
    cacheObj.expirationTime = @(expiration);
    cacheObj.expirationDate = [NSDate dateWithTimeIntervalSinceNow:60*expiration];
    cacheObj.refreshDate = [NSDate dateWithTimeIntervalSinceNow:60*timeout];
    
    // Retrieves data via HTTP request and stores in cache database
    __block MNOAPIResponse * apiResponse = nil;
    __block BOOL wait = YES;
    NSURLRequest * httpRequest = [[NSURLRequest alloc] initWithURL:[NSURL URLWithString:url] cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:10.0];
    
    [[MNOHttpStack sharedStack] makeAsynchronousRequest:REQUEST_RAW request:httpRequest success:^(MNOResponse *response) {
        
        cacheObj.data = response.responseObject;
        cacheObj.dateCreated = [[NSDate alloc] init];
        NSString *eTag = response.etag;
        if (eTag == nil) {
            NSString *base64encodedString = [response.responseObject base64Encoding];
            eTag = [[MNOUtil sharedInstance] sha1:base64encodedString];
        }
        cacheObj.eTag = eTag;
        cacheObj.contentType = response.contentType;

        // Save
        NSError *error = nil;
        if(![self.moc save:&error] || error){
            apiResponse = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Unable to save to the cache"];
        }else{
            NSString * html =  [[NSString alloc] initWithData:response.responseData encoding:NSUTF8StringEncoding];
            apiResponse = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS additional:@{@"data":html}];
        }
        
        wait = NO;
    } failure:^(MNOResponse *response, NSError *error) {
        apiResponse = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Unable to save to the cache"];
        wait = NO;
    }];
    
   // Busy Wait
    while(wait)
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
    
 
    return apiResponse;
}

#pragma mark - Retrieve

- (MNOAPIResponse *)retrieveCachedData:(NSDictionary *)params
{
    NSString *url = [params objectForKey:@"url"];
    MNOUser * user = [[MNOAccountManager sharedManager] user];
    NSString * instanceId = [params objectForKey:@"instanceId"];
    
    // Check if we can retrieve something
    NSFetchRequest *fetchRequest = [[NSFetchRequest alloc] initWithEntityName:[MNOCachedData entityName]];
    [fetchRequest setPredicate:[NSPredicate predicateWithFormat:@"url == %@ AND belongsTo.user == %@  AND belongsTo.instanceId == %@",url,user,instanceId]];
    NSError * error = nil;
    NSArray * fetchedObjects = [[self moc] executeFetchRequest:fetchRequest error:&error];
    
    if(error || [fetchedObjects count] == 0) {
        return [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Unable to retrieve cache"];
    }

    MNOCachedData * data =  [fetchedObjects firstObject]; // should only be 1 object
    NSString * html =  [[NSString alloc] initWithData:data.data encoding:NSUTF8StringEncoding];
    return [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS additional:@{@"data":html}];
}

#pragma mark - Core Data

- (NSManagedObjectContext *)moc {
    if (!_moc) {
        _moc = [[MNOUtil sharedInstance] defaultManagedContext];
    }
    return _moc;
}

@end