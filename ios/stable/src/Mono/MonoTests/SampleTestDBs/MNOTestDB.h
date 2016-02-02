//
//  TestDB.h
//  Mono
//
//  Created by Ben Scazzero on 5/8/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface MNOTestDB : UIManagedDocument

- (NSManagedObjectModel *) managedObjectModel;
- (id) initWithName:(NSString *)name;

@end
