//
//  Subscriber.m
//  Mono2
//
//  Created by Ben Scazzero on 3/19/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOSubscriber.h"

@interface MNOSubscriber ()

@property (strong, nonatomic) NSString * channel;
@property (strong, nonatomic) NSString * function;

@end

@implementation MNOSubscriber

- (id) initWithChannel:(NSString *)channel callbackFunction:(NSString *)function subscriberGuid:(NSString *)guid
{
    self = [super init];
    if (self) {
        self.function = function;
        self.channel = channel;
        self.instanceId = guid;
    }
    return self;
}

@end
