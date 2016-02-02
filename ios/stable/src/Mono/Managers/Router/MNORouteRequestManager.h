//
//  MNORequestRouter.h
//  Mono
//
//  Created by Ben Scazzero on 1/2/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>


@protocol MNORouteRequestManagerDelegate <NSObject>
- (void) invalidateCallbacksFromWidgets:(NSArray *)widgetGuids onDashboard:(NSNumber *)dashboardGuid;
@optional
@end


@interface MNORouteRequestManager : NSObject

#pragma mark public methods

/**
 * Gets the singleton instance of request router.
 * @return The singleton instance of request router.
 **/
+ (MNORouteRequestManager *) sharedInstance;

/**
 * Determines if a given NSURLRequest can be routed using the Request Router.
 * @param request The request to decide on.
 * @return True if the request can be routed, false otherwise.
 **/
+ (BOOL) canRoute:(NSURLRequest *)request;

/**
 * Routes the given NSURLRequest if possible.
 * @param request The request to route.
 * @return JSON packed into an NSData object.  The json is guaranteed to have at least a
 *         "status" field with the value "success" or "failure."  If the message is failure,
 *         the "message" field will be populated with the reason.  On success, the message
 *         field will be empty, and additional values may exist.
 **/
- (NSData *) routeRequest:(NSURLRequest *)request;

@end
