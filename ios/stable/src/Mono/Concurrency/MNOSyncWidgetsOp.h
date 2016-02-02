//
// Created by chris on 6/16/13.
//

#import <Foundation/Foundation.h>

@class Store;


@interface MNOSyncWidgetsOp : NSOperation
/**
 *  Init with the current, logged in user.
 *
 *  @param _userId the current user's id.
 *
 *  @return MNOSyncWidgetsOp
 */
- (id)initWithUserId:(NSManagedObjectID *)_userId;
/**
 *  Callback when operation complete.
 */
@property (nonatomic, copy) void (^progressCallback) (BOOL);
@end