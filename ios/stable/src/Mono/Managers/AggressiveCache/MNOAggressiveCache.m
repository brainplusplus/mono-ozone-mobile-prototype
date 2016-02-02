//
//  MNOAggressiveCache.m
//  Mono2
//
//  Created by Ben Scazzero on 4/21/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAggressiveCache.h"
#import "TFHpple.h"
#import "TFHppleElement.h"
#import "MNOHttpStack.h"

// lock used to ensure proper updating of the UI through multi-threaded enviorment.
static NSObject * lock = nil;
@interface MNOAggressiveCache ()

@end

@implementation MNOAggressiveCache
{
    NSMutableSet * exclusions;
    dispatch_queue_t bossQueue;
    //changes per widget
    uint downloaded;
    uint invalid;
    uint count;
}

/**
 *  Initialize the aggressive cache service.
 *
 *  @return MNOAggressiveCache
 */
- (id) init
{
    self = [super init];
    if (self) {
        exclusions = [NSMutableSet new];
        [exclusions addObjectsFromArray:@[@"CACHE MANIFEST",@"NETWORK",@"",@"CACHE:",@"NETWORK:"]];
        if(!lock)
            lock = [NSObject new];
        
    }
    return self;
}

/**
 *  Format the Widget's URL
 *
 *  @param widgetPath the widget's url path
 *
 *  @return a formated NSURL with the widget's url
 */
- (NSURL *) formatWidgetUrl:(NSString *)widgetPath
{
    NSURL * widgetUrl = [NSURL URLWithString:[widgetPath stringByAppendingString:@"?mobile=true&usePrefix=false"]];
    if (!widgetUrl.host) { // if we have no host, add one
        NSURL * tempUrl = [NSURL URLWithString:[MNOAccountManager sharedManager].widgetBaseUrl];
        NSURL * newBaseUrl  = [NSURL URLWithString:@"/owf" relativeToURL:tempUrl];
        
        widgetPath = [widgetPath stringByReplacingOccurrencesOfString:@".." withString:@""];
        NSString * tempStr = [@"/owf" stringByAppendingPathComponent:widgetPath];
        tempStr = [tempStr stringByAppendingString:@"?mobile=true"];
        
        widgetUrl = [NSURL URLWithString:tempStr relativeToURL:newBaseUrl];
    }
    
    return widgetUrl;
}



/**
 *  Downloads the landing page for the widget, attempts to search for a cache manfiest reference, and returns a
 *  new url pointing to that manifest file.
 *
 *  @param widget that is being processed
 *
 *  @return String URL pointing to the widget's cache manifest.
 */
- (NSString *) retrieveManifestPath:(MNOWidget *)widget
{
    NSURL * widgetUrl = [self formatWidgetUrl:widget.url];
    NSURLRequest * request = [[NSURLRequest alloc] initWithURL:[NSURL URLWithString:[widgetUrl absoluteString]]
                                                   cachePolicy:NSURLRequestUseProtocolCachePolicy
                                               timeoutInterval:10.0];
    
    NSData * data = [[MNOHttpStack sharedStack] makeSynchronousRequest:REQUEST_RAW request:request];

    
    if(data){
        TFHpple * doc       = [[TFHpple alloc] initWithHTMLData:data];
        NSArray * elements  = [doc searchWithXPathQuery:@"//*[@manifest]"];
        
        if ([elements count]) {
            TFHppleElement * element = [elements firstObject];
            NSString * manifestPath = [[element attributes] objectForKey:@"manifest"];
            return  [[NSURL URLWithString:manifestPath relativeToURL:widgetUrl] absoluteString];
        }
    }
    
    return nil;
}

/**
 *  Takes a widget and its cache manifest URL. Downloads the content of the cache manifest and return an array
 *  containing all the resources from the cache manifest file.
 *
 *  @param widget widget that is being processed
 *  @param path   the URL to the widget's cache manifest file.
 *
 *  @return Array containg all the resources in the cache manifest file.
 */
- (NSArray *) retrieveManfiestItemsForWidget:(MNOWidget *)widget manifestPath:(NSString*)path
{
    NSData * data = [[MNOHttpStack sharedStack] makeSynchronousRequest:REQUEST_RAW url:path];
    NSString * base64String = [data base64EncodedStringWithOptions:0];
    NSString * decodedData = [[MNOUtil sharedInstance] decodeBase64String:base64String];
    return [decodedData componentsSeparatedByString:@"\n"];
}

/**
 * See declaration in MNOAggressiveCache.h
 */
- (void) store
{
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0),
                   ^{
                       NSArray * widgets = [[MNOAccountManager sharedManager] defaultWidgets];
                       for (MNOWidget * widget in widgets) {
                           if ([self.delegate respondsToSelector:@selector(willStartDownloadingContentsForWidget:)]) {
                              
                               //perform callbacks on main thread
                               dispatch_async(dispatch_get_main_queue(), ^{
                                   [self.delegate willStartDownloadingContentsForWidget:widget.name];
                               });
                               
                               [self retrieveHTMLForWidget:widget];
                               
                           }
                       }
                       
                       // Notify delegate we're done.
                       if ([self.delegate respondsToSelector:@selector(didFinishCaching)]) {
                           //perform callbacks on main thread
                           dispatch_async(dispatch_get_main_queue(), ^{
                               [self.delegate didFinishCaching];
                           });
                       }
                   });
}

/**
 *  Downloads and caches all of the resources in the widget's cache manifest file.
 *
 *  @param widget widget that is going to be processed
 */
- (void) retrieveHTMLForWidget:(MNOWidget*)widget
{
    if ([self.delegate respondsToSelector:@selector(didStartDownloadingContentsForWidget:)]) {
        //perform callbacks on main thread
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.delegate didStartDownloadingContentsForWidget:widget.name];
        });
    }
    
    //sync
    NSString * manifestPath = [self retrieveManifestPath:widget];
    if(!manifestPath) {
        [self didFailToDownload:widget.name];
        return;
    }
    
    //sync
    NSArray * componentPaths = [self retrieveManfiestItemsForWidget:widget manifestPath:manifestPath];
    if (![componentPaths count]){
        [self didFailToDownload:widget.name];
        return;
    }
    
    //update UI
    downloaded = invalid = count = 0;
    count = (uint)[componentPaths count];
    [self updateTotalComponents:count forWidget:widget.name];
    
    // download all the components on a group queue, sync
    [self downloadComponents:componentPaths forWidget:widget manifestPath:manifestPath];
    
    if ([self.delegate respondsToSelector:@selector(didCompleteDownloadForWidget:)]) {
        //perform callbacks on main thread
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.delegate didCompleteDownloadForWidget:widget.name];
        });
    }
}

/**
 *  Calls the delegate's didFailToDownload method
 *
 *  @param  name The widget's name
 */
- (void) didFailToDownload:(NSString *)name
{
    if ([self.delegate respondsToSelector:@selector(didFailToDownload:)]) {
        //perform callbacks on main thread
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.delegate didFailToDownload:name];
        });
    }
}

/**
 *  Calls the delgate's totalComponents:forWidget method
 *
 *  @param components A widget's total number of components
 *  @param name       The widget's name
 */
- (void) updateTotalComponents:(NSUInteger)components forWidget:(NSString *)name
{
    if ([self.delegate respondsToSelector:@selector(totalComponents:forWidget:)]) {
        //perform callbacks on main thread
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.delegate totalComponents:count forWidget:name];
        });
    }
}

/**
 *  Takes an array of URLs found in the cache manifest. It then downloads all of the URLs in the array and caches them.
 *  This method does not return until all the URLs have downloaded.
 *
 *  @param componentPaths array of URLs to downlooad
 *  @param widget         widget that the resource belongs to
 *  @param manifestPath   the manifest path -- item URLs are relative to this
 */
- (void) downloadComponents:(NSArray*)componentPaths forWidget:(MNOWidget*)widget manifestPath:(NSString *)manifestPath {
    dispatch_queue_t queue = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0);
    dispatch_group_t group = dispatch_group_create();
    NSLog(@"Dispatching Group for Widget: %@",widget.name);
    
    NSString * baseUrl = [MNOAccountManager sharedManager].widgetBaseUrl;
    
    // Download each component in the cache manifest
    for(NSString * itemPath in componentPaths) {
        if ( [itemPath hasPrefix:@"#"] || [itemPath hasPrefix:@"*"] ){
            count--;
            [self updateTotalComponents:count forWidget:widget.name];
            continue;
        }else if( [exclusions containsObject:itemPath]){
            count--;
            [self updateTotalComponents:count forWidget:widget.name];
            continue;
        }
        
        NSString * resourceURL = itemPath;
        
        if (![itemPath hasPrefix:@"http"]) {
            // Format URL
            NSString * str  = [self parseRelativeUrl:itemPath baseUrl:baseUrl manfiestUrl:manifestPath];
            // Trim Ends
            str = [str stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
            // Use NSURL to verify output
            resourceURL = [[NSURL URLWithString:str] absoluteString];
        }
        
        // If we still dont' have a valid URL, skip this resource
        if (resourceURL == nil) {
            count--;
            [self updateTotalComponents:count forWidget:widget.name];
            continue;
        }
        
        // Load Resource
        [self dispatchTaskWithURL:resourceURL forQueue:queue group:group widget:widget];
        
    }
    
    NSLog(@"Waiting for group to finish for widget: %@",widget.name);
    // When you cannot make any more forward progress,
    // wait on the group to block the current thread.
    while(dispatch_group_wait(group, DISPATCH_TIME_FOREVER)) {
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate date]];
    }
    NSLog(@"Group Finished for Widget: %@",widget.name);
    NSLog(@"%@: Total: %d, Success: %d, Error: %d",widget.name,count,downloaded,invalid);
}


/**
 *  Format the URL
 *
 *  @param relative    url from manifest
 *  @param baseUrl     base url, used for log in.
 *  @param manifestUrl manfiestUrl of widget
 *
 *  @return formatted url
 */
- (NSString * ) parseRelativeUrl:(NSString *)relative baseUrl:(NSString*)baseUrl manfiestUrl:(NSString *)manifestUrl
{

    NSString * firstRelativeComponent = [[relative pathComponents] firstObject];
    
    // Handle Relative URLs
    // If we have two dots (..) remove the last 2 components from the base URL.
    // If we have one dot (.) remove the last component from the base URL.
    if ([firstRelativeComponent isEqualToString:@".."] || [firstRelativeComponent isEqualToString:@"."]) {
        NSURL * tempBase = [NSURL URLWithString:manifestUrl];
        NSString * newUrl =  [[NSURL URLWithString:relative relativeToURL:tempBase] absoluteString];
        return newUrl;
    }
    
    NSString * firstBaseComponent = [[NSURL URLWithString:baseUrl] lastPathComponent];
    
    // Format the Base and Relative Urls
    if ([firstBaseComponent isEqualToString:@"/"] && (![firstRelativeComponent isEqualToString:@"/"])) {
        return [baseUrl stringByAppendingString:relative];
    
    }else if((![firstBaseComponent isEqualToString:@"/"]) && [firstRelativeComponent isEqualToString:@"/"] ){
        return [baseUrl stringByAppendingString:relative];
    
    }else if((![firstBaseComponent isEqualToString:@"/"]) && (![firstRelativeComponent isEqualToString:@"/"])){
        return [[baseUrl stringByAppendingString:@"/"] stringByAppendingString:relative];
        
    }else if([firstBaseComponent isEqualToString:@"/"] && [firstRelativeComponent isEqualToString:@"/"]){
        return [baseUrl stringByAppendingString:[relative substringFromIndex:1]];
    }

    return  nil;
}

/**
 *  Takes a URL, concurrent queue, group queue, and widget. Method puts the task of downloading the resource URL onto the given
 * queue. The task and queue are then associated with the given group.
 *
 *  @param resourceUrl resource to download
 *  @param queue       queue that will handle the download in a separate thread
 *  @param group       group to associate the task and queue
 *  @param widget      widget that the resource belongs to
 */
- (void) dispatchTaskWithURL:(NSString*)resourceUrl forQueue:(dispatch_queue_t)queue group:(dispatch_group_t)group widget:(MNOWidget*)widget {
    dispatch_group_async(group, queue, ^{
        // Download and Cache item
        NSURLRequest * request = [[NSURLRequest alloc] initWithURL:[NSURL URLWithString:resourceUrl]
                                                       cachePolicy:NSURLRequestUseProtocolCachePolicy
                                                   timeoutInterval:10.0];
        NSData * data = [[MNOHttpStack sharedStack] makeSynchronousRequest:REQUEST_RAW request:request];
        BOOL success  = NO;
        
        if (data)
            success = YES;
        
        // myData has been cached nothing left but to update UI
        @synchronized(lock){
            if (success)  // data is valid
                downloaded++;
            else {
                invalid++;
            }
        }
        
        if ([self.delegate respondsToSelector:@selector(downloadedComponents:invalidComponents:remainingComponents:forWidget:)]){
            //perform callbacks on main thread
            dispatch_async(dispatch_get_main_queue(), ^{
                [self.delegate downloadedComponents:downloaded invalidComponents:invalid remainingComponents:(count-downloaded-invalid) forWidget:widget.name];
            });
        }
    });
    
}

@end
