//
//  MNOAppsMall.h
//  Mono
//
//  Created by Michael Wilson on 5/13/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class MNOWidget;

@interface MNOAppsMall : NSManagedObject

@property (nonatomic, retain) NSString *name;
@property (nonatomic, retain) NSString *url;
@property (nonatomic, retain) NSArray *widgets;

@end
