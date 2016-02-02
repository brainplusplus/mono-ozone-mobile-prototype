//
//  Widget.h
//  Mono2
//
//  Created by Ben Scazzero on 4/13/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class MNOAppsMall, MNODashboard, MNOIntentSubscriberSaved, MNOUser;

@interface MNOWidget : NSManagedObject

@property (nonatomic, retain) NSString * descript;
@property (nonatomic, retain) NSString * headerIconUrl;
@property (nonatomic, retain) NSString * imageUrl;
@property (nonatomic, retain) NSString * largeIconUrl;
@property (nonatomic, retain) NSNumber * mobileReady;
@property (nonatomic, retain) NSString * name;
@property (nonatomic, retain) NSNumber * original;
@property (nonatomic, retain) NSString * smallIconUrl;
@property (nonatomic, retain) NSString * url;
@property (nonatomic, retain) NSString * widgetId;
@property (nonatomic, retain) NSNumber * isDefault;
@property (nonatomic, retain) NSString * instanceId;
@property (nonatomic, retain) MNODashboard *dashboard;
@property (nonatomic, retain) NSSet *intentRegister;
@property (nonatomic, retain) MNOUser*user;
@property (nonatomic, retain) MNOAppsMall *appsMall;

+(NSManagedObject *) clone:(NSManagedObject *)source inContext:(NSManagedObjectContext *)context;
    
@end

@interface MNOWidget (CoreDataGeneratedAccessors)

- (void)addIntentRegisterObject:(MNOIntentSubscriberSaved *)value;
- (void)removeIntentRegisterObject:(MNOIntentSubscriberSaved *)value;
- (void)addIntentRegister:(NSSet *)values;
- (void)removeIntentRegister:(NSSet *)values;


@end
