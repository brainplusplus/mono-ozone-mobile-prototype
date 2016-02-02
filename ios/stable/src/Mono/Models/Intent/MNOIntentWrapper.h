//
//  IntentSubscriber.h
//  Mono2
//
//  Created by Ben Scazzero on 3/26/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "MNOSubscriber.h"
#import "MNOIntentWrapper.h"

/**
 *  Wrapper class for an Intent Notification
 * Terms: Intent Notification: An NSNotification object that is triggered by an Intent.
 */
@interface MNOIntentWrapper : MNOSubscriber

/**
 *  Data associated with "Start Activity" Intents. This is 
 * typically sent to the receiver from a sender
 */
@property (strong, readonly, nonatomic) NSString * data;
/**
 *  Intent Action
 */
@property (strong, readonly, nonatomic) NSString * action;
/**
 *  Intent DataType
 */
@property (strong, readonly, nonatomic) NSString * dataType;
/**
 *  Unique Id, corresponds to the uniqueId in a Widget entity.
 */
@property (strong, nonatomic) NSString * instanceId;
/**
 *  Widget Guid, corresponds to teh widgetID in a Widget entity.
 */
@property (strong, nonatomic) NSString * widgetId;

/**
 *  Init
 *
 *  @param data Dictionary values to initalize object
 *
 *  @return IntentWrapper
 */
- (id) initWithMetaData:(NSDictionary *)data;

@end
