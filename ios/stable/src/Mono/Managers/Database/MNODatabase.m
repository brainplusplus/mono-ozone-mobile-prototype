//
//  Database.m
//  Mono2
//
//  Created by Michael Wilson on 4/8/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNODatabase.h"
#import "FMDatabase.h"

@implementation MNODatabase
{
    // The widget ID for this database
    NSString *_widgetId;
    
    // The actual database handler
    FMDatabase *_database;
    
    // The path to the database file
    NSString *_dbPath;
}

#pragma mark constructors

- (id) init:(NSString *)widgetId
{
    if(widgetId != nil && (self = [super init]))
    {
        _widgetId = widgetId;
        
        // Find the path to put the database in to
        NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, true);
        NSMutableString *dbPath = ([paths count] > 0 ? [[NSMutableString alloc] initWithString:[paths objectAtIndex:0]] : nil);
        
        // Make sure we've got an appropriate DB path and open the database
        if(dbPath != nil)
        {
            _dbPath = [dbPath stringByAppendingPathComponent:_widgetId];
        
            if((_database = [FMDatabase databaseWithPath:_dbPath]) == nil || [_database open] == false)
            {
                NSLog(@"Unable to open database for widget ID %@.", _widgetId);
            }
            else
            {
                [self setIsOpen:TRUE];
            }
        }
    }
    
    return self;
}

#pragma mark - public methods

- (BOOL) exec:(NSString *)query params:(NSArray *)params
{
    BOOL result = FALSE;
    
    // Execute the query
    if(params != nil) {
        result = [_database executeUpdate:query withArgumentsInArray:params];
    }
    else {
        result = [_database executeUpdate:query];
    }
    
    // Upon error, log the error message
    if(result == FALSE)
    {
        NSLog(@"Error executing statement: %@.\nMessage: %@.", query, [_database lastErrorMessage]);
    }
    
    return result;
}

- (NSArray *) query:(NSString *)query params:(NSArray *)params
{
    FMResultSet *results;
    NSMutableArray *resultArray;
    
    // Execute the query
    if(params != nil) {
        results = [_database executeQuery:query withArgumentsInArray:params];
    }
    else {
        results = [_database executeQuery:query];
    }
    
    // Upon error, log the error message
    if(results == nil)
    {
        NSLog(@"Error executing statement: %@.\nMessage: %@.", query, [_database lastErrorMessage]);
        return nil;
    }
    
    // Get column list
    int columnCount = [results columnCount];
    NSMutableArray *columns = [[NSMutableArray alloc] initWithCapacity:columnCount];
    
    for(int i=0; i<columnCount; i++) {
        [columns addObject:[results columnNameForIndex:i]];
    }
    
    
    // Initialize the resultArray and pack all the results in
    resultArray = [[NSMutableArray alloc] init];
    while([results next]) {
        NSMutableDictionary *row = [[NSMutableDictionary alloc] initWithCapacity:columnCount];
        for(int i=0; i<columnCount; i++) {
            [row setValue:[results stringForColumnIndex:i] forKey:[columns objectAtIndex:i]];
        }
        [resultArray addObject:row];
    }
    
    return resultArray;
}

- (void) close
{
    // Make sure there's still a database around
    if(_database != nil)
    {
        // Attempt to close the database
        if([_database close] == false)
        {
            NSLog(@"Error closing database for widget ID %@.\nMessage: %@.", _widgetId, [_database lastErrorMessage]);
        }
        // Set _database to nil -- lets other functions know the close was successful
        else
        {
            _database = nil;
            [self setIsOpen:FALSE];
        }
    }
}

- (void) remove
{
    // Close the database
    [self close];
    
    // Remove the database
    if(_database == nil)
    {
        [[NSFileManager defaultManager] removeItemAtPath:_dbPath error:nil];
    }
}

- (void) dealloc
{
    // Make sure we close the database before we dealloc the object
    if(_database != nil)
    {
        [self close];
    }
}

@end
