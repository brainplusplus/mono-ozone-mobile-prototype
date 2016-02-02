//
//  IntentSubscriberSaved.h
//  Mono2
//
//  Created by Ben Scazzero on 4/10/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class MNOIntentSubscriberSaved, Widget;

@interface MNOIntentSubscriberSaved : NSManagedObject

@property (nonatomic, retain) NSString * action;
@property (nonatomic, retain) NSString * data;
@property (nonatomic, retain) NSString * dataType;
@property (nonatomic, retain) NSNumber * isReceiver;
@property (nonatomic, retain) MNOIntentSubscriberSaved *autoReceiveIntent;
@property (nonatomic, retain) MNOIntentSubscriberSaved *autoSendIntent;
@property (nonatomic, retain) MNOWidget *widget;

@end
