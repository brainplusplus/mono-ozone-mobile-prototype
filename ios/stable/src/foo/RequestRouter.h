//
//  RequestRouter.h
//  foo
//
//  Created by Ben Scazzero on 1/2/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>


@protocol RequestRouterDelegate <NSObject>
- (void) invalidateCallbacksFromWidgets:(NSArray *)widgetGuids onDashboard:(NSNumber *)dashboardGuid;
@optional
@end


@interface RequestRouter : NSObject

- (void) routeRequest:(NSURLRequest *)request onComplete:(void(^)(NSData *))block;

+ (RequestRouter *) sharedInstance;
+ (BOOL) isHardwareRequest:(NSURLRequest *)request;

@end
