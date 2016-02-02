//
//  Settings.h
//  Mono2
//
//  Created by Ben Scazzero on 4/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class User;

@interface MNOSettings : NSManagedObject

@property (nonatomic, retain) NSNumber * allowsIntents;
@property (nonatomic, retain) User *belongsTo;

@end
