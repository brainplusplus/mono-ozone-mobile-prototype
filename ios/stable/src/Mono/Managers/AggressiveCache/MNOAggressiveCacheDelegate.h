//
//  MNOAggressiveCacheDelegate.h
//  Mono2
//
//  Created by Ben Scazzero on 4/21/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol MNOAggressiveCacheDelegate <NSObject>

/**
 *  Called before the widget is about to downloaded.
 *
 *  @param widget that will start downloading
 */
- (void) willStartDownloadingContentsForWidget:(NSString *)widgetName;

/**
 *  Called when the widget starts downloading
 *
 *  @param widget that has started downloading
 */
- (void) didStartDownloadingContentsForWidget:(NSString *)widgetName;

/**
 *  Returns the total number of elements in the widget's cache manifest file.
 *
 *  @param total      Total number of components to download.
 *  @param widgetName widget that is being downloaded
 */
- (void) totalComponents:(NSUInteger)total forWidget:(NSString *)widgetName;

/**
 *  Called to give status updates on the current widget
 *
 *  @param complete  components of the widget that have been downloaded
 *  @param remaining components of the widget that have not been downloaded
 *  @param widget    widget that is being downloaded/cached
 */
- (void) downloadedComponents:(NSUInteger)complete invalidComponents:(NSUInteger)invalid remainingComponents:(NSUInteger)remaining forWidget:(NSString*)widgetName;

/**
 *  Called when all of the resources in the cache manifest have finished downloading.
 *
 *  @param widget that has been aggressively cached
 */
- (void) didCompleteDownloadForWidget:(NSString*)widgetName;

/**
 *  Called when the widget was unable do download successfully. This will be called if the widget
 *  has no cache manifest available.
 *
 *  @param widgetName widget that has been ag
 */
- (void) didFailToDownload:(NSString*)widgetName;

/**
 *  Called when we have finished (or attempted to) download all of the resources for all of the available 
 *  widgets.
 */
- (void) didFinishCaching;
@end
