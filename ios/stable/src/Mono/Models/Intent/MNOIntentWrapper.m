//
//  IntentSubscriber.m
//  Mono2
//
//  Created by Ben Scazzero on 3/26/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "MNOIntentWrapper.h"

@interface MNOIntentWrapper ()

/**
 *  See Declaration in IntentWrapper.h
 */
@property (strong, nonatomic) NSString * data;
@property (strong, nonatomic) NSString * action;
@property (strong, nonatomic) NSString * dataType;

@end

@implementation MNOIntentWrapper

/**
 *  See Declaration in IntentWrapper.h
 */
- (id) initWithMetaData:(NSDictionary *)data
{
    NSDictionary * intent = [data objectForKey:@"intent"];
    self.action = [intent objectForKey:@"action"];
    self.dataType = [intent objectForKey:@"dataType"];
    self.widgetId = [data objectForKeyedSubscript:@"widgetId"];
    
    NSString * channel = [self.action stringByAppendingString:@":-:"];
    channel = [channel stringByAppendingString:self.dataType];
    
    
    self = [super initWithChannel:channel
                 callbackFunction:[data objectForKey:@"handler"]
                   subscriberGuid:[data objectForKey:@"instanceId"]];
    
    if (self) {
        //
        self.data = [data objectForKey:@"data"];
    }
    
    return self;
}

@end
