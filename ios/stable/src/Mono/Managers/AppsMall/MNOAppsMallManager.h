//
//  MNOAppsMall.h
//  Mono
//
//  Created by Michael Wilson on 5/12/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

#import "MNOAppsMall.h"

@interface MNOAppsMallManager : NSObject

#pragma mark singleton instance

/**
 * Singleton AccelermoeterManager instance
 */
+ (MNOAppsMallManager *)sharedInstance;

#pragma mark - public methods

/**
 * Adds a storefront URL to the apps mall manager.
 * @param storefrontUrl The URL of the storefront to add.
 * @param storefrontName The name of the storefront to add.
 * @param success The block to execute on sucess.
 * @param failure The block to execute on failure.
 **/
- (void) addOrUpdateStorefront:(NSString *)storefrontUrl storefrontName:(NSString *)storefrontName success:(void(^)(MNOAppsMall *appsMall, NSArray *widgetList))success failure:(void(^)(void))failure;

/**
 * Removes a storefront from the apps mall manager.
 * @param storefrontUrl The name of the storefront to remove.
 **/
- (void) removeStorefront:(NSString *)storefrontName;

/**
 * Returns a list of all storefronts currently tracked by the application.
 * @return A list of storefronts.
 **/
- (NSArray *)getStorefronts;

/**
 * Returns the list of widgets associated with the given apps mall storefront.
 * @param appsMall The storefront to retrieve widgets for.
 * @return The widgets associated with this storefront.
 **/
- (NSArray *)getWidgetsForStorefront:(MNOAppsMall *)appsMall;

/**
 * Installs the list of widgets to the user's widget list and
 * uninstalls widgets that are not in this list.
 * @param widgets The list of widgets to install.
 **/
- (void)installWidgets:(NSArray *)widgets;

- (BOOL)removeFromDashboard:(MNODashboard *)dashboard widget:(MNOWidget *)widget inMoc:(NSManagedObjectContext *)moc;


@end
