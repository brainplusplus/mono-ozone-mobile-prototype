//
//  MonoTimer.h
//  foo
//
//  Created by Ben Scazzero on 1/20/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>

@interface MonoGPS : NSObject<CLLocationManagerDelegate>

- (id) initScheduleWithDashGuid:(NSNumber *)dashGuid widgetGuid:(NSNumber *)widgetGuid usingCallback:(NSString *)callback interval:(NSNumber *)interval repeat:(BOOL)repeat;

- (id) initRegisterWithDashGuid:(NSNumber *)dashGuid widgetGuid:(NSNumber *)widgetGuid usingCallback:(NSString *)callback interval:(NSNumber *)interval repeat:(BOOL)repeat;

-(void) stop;
-(void) start;

@property (readonly,strong,nonatomic) NSNumber * dashGuid;
@property (readonly,strong,nonatomic) NSNumber * widgetGuid;
@property (readonly,strong,nonatomic) NSString * callback;
@property (readonly,strong,nonatomic) NSNumber * interval;

@end
