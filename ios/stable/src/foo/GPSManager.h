//
//  GPSManager.h
//  foo
//
//  Created by Ben Scazzero on 12/30/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>
#import "RequestRouter.h"

@interface GPSManager : NSObject

- (NSData * ) registerGPSwithParams:(NSDictionary *)params;
- (NSData * ) timerGPSwithParams:(NSDictionary *)params;

+ (GPSManager *) sharedInstance;



@end
