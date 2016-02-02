//
//  AccelerometerManager.h
//  foo
//
//  Created by Ben Scazzero on 1/1/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreMotion/CoreMotion.h>

#import "RequestRouter.h"

@interface AccelerometerManager : NSObject<UIAccelerometerDelegate>


- (NSData * ) registerAccelerometerWithParams:(NSDictionary *) params;
- (NSData *) registerOrientationChangesWithParams:(NSDictionary *)params;

+(AccelerometerManager *) sharedInstance;

@end
