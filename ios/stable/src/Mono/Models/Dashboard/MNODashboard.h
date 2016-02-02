//
//  Dashboard.h
//  Mono2
//
//  Created by Ben Scazzero on 3/7/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class MNOUser, MNOWidget;

@interface MNODashboard : NSManagedObject

@property (nonatomic, retain) NSNumber *modified;
@property (nonatomic, retain) NSString * dashboardId;
@property (nonatomic, retain) NSString * name;
@property (nonatomic, retain) NSNumber * wasCreatedOnDesktop;
@property (nonatomic, retain) MNOUser *user;
@property (nonatomic, retain) NSSet *widgets;

@end

@interface MNODashboard (CoreDataGeneratedAccessors)

- (void)addWidgetsObject:(MNOWidget *)value;
- (void)removeWidgetsObject:(MNOWidget *)value;
- (void)addWidgets:(NSSet *)values;
- (void)removeWidgets:(NSSet *)values;


@end
