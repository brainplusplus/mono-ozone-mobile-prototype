//
//  Subscriber.h
//  Mono2
//
//  Created by Ben Scazzero on 3/19/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOSubscriber : NSObject

@property (strong, readonly,  nonatomic) NSString * channel;
@property (strong, readonly,  nonatomic) NSString * function;
@property (strong, nonatomic) NSString * instanceId;

- (id) initWithChannel:(NSString *)channel callbackFunction:(NSString *)function subscriberGuid:(NSString *)guid;

@end
