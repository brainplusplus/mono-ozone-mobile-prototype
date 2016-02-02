//
//  DBManager.h
//  Mono2
//
//  Created by Michael Wilson on 4/10/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNODatabase.h"

/**
 * Singleton object that maintains several sqlite databases.
 **/
@interface MNODBManager : NSObject

#pragma mark public methods

/**
 * Retrieves the singleton instance of DBManager.
 * @return The database manager singleton.
 **/
+ (MNODBManager *) sharedInstance;

/**
 * Returns a database given the widgetGuid.  If one exits, it will
 * be retrieved.  If it does not currently exist, it will be created.
 * @param widgetGuid A widget identifier.
 * @return The database associated with the widgetGuid.
 **/
- (MNODatabase *) getDatabaseWithWidgetId:(NSString *)widgetGuid;

@end
