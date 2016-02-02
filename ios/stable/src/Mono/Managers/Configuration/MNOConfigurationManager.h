//
//  MNOConfigurationManager.h
//  Mono
//
//  Created by Corey Herbert on 5/15/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOConfigurationManager : NSObject

/**
* Returns the singleton instane of the configuration manager.
**/
+ (MNOConfigurationManager *) sharedInstance;

/**
 * fetches the configuration key
 * @param key - The key to retieve
 * @returns the NSString value or null
 **/
- (NSString*) forKey:(NSString*)key;

@end
