//
//  DBManager.m
//  Mono2
//
//  Created by Michael Wilson on 4/10/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNODBManager.h"

@implementation MNODBManager
{
    // List of databases
    NSMutableDictionary *_databases;
}

#pragma mark public methods

+ (MNODBManager *) sharedInstance
{
    static MNODBManager *sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

- (MNODatabase *) getDatabaseWithWidgetId:(NSString *)widgetId
{
    MNODatabase *db = nil;
    
    if(widgetId != nil)
    {
        // Make sure we don't accidentally try to make two databases
        @synchronized(self)
        {
            db = [_databases valueForKey:widgetId];
            
            // If the DB isn't currently in the DBManager, make it
            if(db == nil || [db isOpen] == FALSE)
            {
                db = [[MNODatabase alloc] init:widgetId];
                [_databases setValue:db forKey:widgetId];
            }
        }
    }
    
    return db;
}

#pragma mark - private methods

- (id) init
{
    if(self = [super init])
    {
        _databases = [[NSMutableDictionary alloc] init];
    }
    
    return self;
}

@end
