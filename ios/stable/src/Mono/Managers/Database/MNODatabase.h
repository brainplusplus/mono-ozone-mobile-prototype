//
//  Database.h
//  Mono2
//
//  Created by Michael Wilson on 4/8/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 * Database object.  Allows the user to make a database on a per-instance basis and interact with it.
 **/
@interface MNODatabase : NSObject

#pragma mark properties

/**
 * Boolean that describes whether or not the database is currently open.
 **/
@property (nonatomic) BOOL isOpen;

#pragma mark - constructors

/**
 * Instantiates a database object given a widget id.
 * @param widgetId The ID of the widget making database calls.
 **/
- (id) init:(NSString *)widgetId;

#pragma mark - public methods

/**
 * Executes a query.  Returns no results.
 * @param (NSString *) The query to execute.
 * @param (NSArray *) The parameters to bind to the query.
 * @return Returns true if the statement was successful, false otherwise.
 **/
- (BOOL) exec:(NSString *)query params:(NSArray *)params;

/**
 * Executes a query that returns results.
 * @param (NSString *) The query to execute.
 * @param (NSArray *) The parameters to bind to the query.
 * @returns An array of dictionaries that is a list of results from the query.
 *          Returns nil on error.
 **/
- (NSArray *) query:(NSString *)query params:(NSArray *)params;

/**
 * Closes the database.
 * Note: Only use this when you're done with it -- NOT in between calls!
 **/
- (void) close;

/**
 * Remove the database.
 * Note: Only use this when you're done with it -- NOT in between calls!
 **/
- (void) remove;

@end
