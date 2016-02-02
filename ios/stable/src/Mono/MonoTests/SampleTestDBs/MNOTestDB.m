//
//  TestDB.m
//  Mono
//
//  Created by Ben Scazzero on 5/8/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOTestDB.h"

@implementation MNOTestDB
{
    NSManagedObjectModel * model;
}

- (id) initWithName:(NSString *)name
{
    NSURL *url = [[self applicationDocumentsDirectory] URLByAppendingPathComponent:name];
    self = [super initWithFileURL:url];
    if (self) {
      
    }
    return self;
}

- (NSURL *)applicationDocumentsDirectory
{
    return [[[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask] lastObject];
}

- (NSManagedObjectModel *) managedObjectModel
{
    if(!model){
        NSString *path = [[NSBundle mainBundle] pathForResource:@"Mono"ofType:@"momd"];
        NSURL *momURL = [NSURL fileURLWithPath:path];
        model = [[NSManagedObjectModel alloc] initWithContentsOfURL:momURL];
    }
    
    return model;
}



@end
