//
//  User.h
//  Mono2
//
//  Created by Ben Scazzero on 4/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class MNODashboard, MNOGroup, MNOSettings, MNOWidget;

@interface MNOUser : NSManagedObject

@property (nonatomic, retain) NSString * profileUrl;
@property (nonatomic, retain) NSString * email;
@property (nonatomic, retain) NSString * name;
@property (nonatomic, retain) NSString * userId;
@property (nonatomic, retain) NSString * username;
@property (nonatomic, retain) NSSet * dashboards;
@property (nonatomic, retain) NSSet * groups;
@property (nonatomic, retain) NSSet *widgets;
@property (nonatomic, retain) MNOSettings *settings;
@end

@interface MNOUser (CoreDataGeneratedAccessors)

- (void)addDashboardsObject:(MNODashboard *)value;
- (void)removeDashboardsObject:(MNODashboard *)value;
- (void)addDashboards:(NSSet *)values;
- (void)removeDashboards:(NSSet *)values;

- (void)addGroupsObject:(MNOGroup *)value;
- (void)removeGroupsObject:(MNOGroup *)value;
- (void)addGroups:(NSSet *)values;
- (void)removeGroups:(NSSet *)values;

- (void)addWidgetsObject:(MNOWidget *)value;
- (void)removeWidgetsObject:(MNOWidget *)value;
- (void)addWidgets:(NSSet *)values;
- (void)removeWidgets:(NSSet *)values;

@end
