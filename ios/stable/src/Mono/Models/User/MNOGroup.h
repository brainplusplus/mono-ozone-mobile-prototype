//
//  MNOGroup.h
//  Mono2
//
//  Created by Michael Wilson on 4/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class MNOUser;

@interface MNOGroup : NSManagedObject

@property (nonatomic, retain) NSString * name;
@property (nonatomic, retain) MNOUser *user;

@end
