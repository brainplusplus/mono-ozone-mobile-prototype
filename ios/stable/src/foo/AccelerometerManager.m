//
//  AccelerometerManager.m
//  foo
//
//  Created by Ben Scazzero on 1/1/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "AccelerometerManager.h"
#import "WidgetManager.h"
#import "MemoryCacheManager.h"


#define portrait @"portrait"
#define upsideDown @"upsideDown"
#define landscapeLeft @"landscapeLeft"
#define landscapeRight @"landscapeRight"

#define currTimer @"timer"
#define currRepeat @"repeat"
#define currInterval @"interval"

#define dAccX @"x"
#define dAccY @"y"
#define dAccZ @"z"

#define dYaw @"yaw"
#define dPitch @"pitch"
#define dRoll @"roll"

#define kUpdateInterval (1.0f / 60.0f)

#define JSONError @"AccelerometerManager: Unable to Serialize Dictionary Result %@"


@interface AccelerometerManager ()

@property (strong, nonatomic) NSString * accX;
@property (strong, nonatomic) NSString * accY;
@property (strong, nonatomic) NSString * accZ;

@property (strong, nonatomic) NSString * yaw;
@property (strong, nonatomic) NSString * pitch;
@property (strong, nonatomic) NSString * roll;


@property (readwrite, nonatomic) UIAccelerationValue y;
@property (readwrite, nonatomic) UIAccelerationValue z;
@property (readwrite, nonatomic) UIAccelerationValue x;

@property (strong, nonatomic) NSMutableDictionary * timers;
@property (strong, nonatomic) NSTimer * mainUpdateTimer;
@property (strong, nonatomic) CMMotionManager *motionManager;

- (void) sendAccelerometertoJavascript:(NSTimer *)timer;

@end

@implementation AccelerometerManager

+(AccelerometerManager *) sharedInstance
{
    static AccelerometerManager * sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}

-(id)init
{
    self = [super init];
    
    if (self) {
        //init
        _x = -1;
        _y = -1;
        _z = -1;
        
        _timers = [[NSMutableDictionary alloc] init];
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(dashboardSwitch:) name:dashboardSwitched object:nil];
        [[NSNotificationCenter defaultCenter] addObserver:self  selector:@selector(orientationChanged:)  name:UIDeviceOrientationDidChangeNotification  object:nil];

    
        _motionManager = [[CMMotionManager alloc] init];
       // _motionManager.deviceMotionUpdateInterval = 0.05; // 20 Hz
       // [_motionManager startDeviceMotionUpdates];
      //  _motionManager.accelerometerUpdateInterval = 0.05; // 20 Hz
      //  [_motionManager startAccelerometerUpdates];
        
      //  _mainUpdateTimer = [NSTimer scheduledTimerWithTimeInterval:0.1 target:self selector:@selector(updateValues:) userInfo:nil repeats:YES];
        
        
        [[UIAccelerometer sharedAccelerometer] setDelegate:self];
        [[UIAccelerometer sharedAccelerometer] setUpdateInterval:1.0f];
    }
    
    return self;
}

#pragma -mark dashboard changed
- (void) dashboardSwitch:(NSNotification *)notif
{
    /* Disable Any Timers on Dashboard we're moving away from (if available) */
    NSDictionary * userInfo = [notif userInfo];
    NSNumber * dashboardGuid = [userInfo objectForKey:dashboardUDIDPrev];
    NSArray * widgetArr = [userInfo objectForKey:widgetUDIDPrev];
    
    for (NSNumber * widgetGuid in widgetArr) {
        
        NSString * key = [self keyForDashboard:dashboardGuid widgetGuid:widgetGuid];
        NSMutableDictionary * componenets = [_timers objectForKey:key];
        NSTimer * timer = [componenets objectForKey:currTimer];
        [timer invalidate];
    }

    /* Enable Any Timers on Dashboard we're moving to (if available) */
    dashboardGuid = [userInfo objectForKey:dashboardUDIDNew];
    widgetArr = [userInfo objectForKey:widgetUDIDNew];

    for (NSNumber * widgetGuid in widgetArr) {
        
        NSString * key = [self keyForDashboard:dashboardGuid widgetGuid:widgetGuid];
        NSMutableDictionary * componenets = [_timers objectForKey:key];
        
        BOOL repeat = [[componenets objectForKey:currRepeat] boolValue];
        NSTimeInterval interval = [[componenets objectForKey:currInterval] doubleValue];
        
        NSTimer * timer = [NSTimer scheduledTimerWithTimeInterval:interval target:self selector:@selector(sendAccelerometertoJavascript:) userInfo:nil repeats:repeat];
        
        [componenets setObject:timer forKey:currTimer];
    }
    
}


#pragma -mark orientation
- (NSString *) orientationDescription:(UIInterfaceOrientation)orientation
{
    NSString * newOrientation = nil;
    
    if (orientation == UIInterfaceOrientationPortrait)
        newOrientation  = portrait;
    else if(orientation == UIInterfaceOrientationPortraitUpsideDown)
        newOrientation = upsideDown;
    else if(orientation == UIInterfaceOrientationLandscapeRight)
        newOrientation = landscapeRight;
    else if (orientation == UIInterfaceOrientationLandscapeLeft)
        newOrientation = landscapeLeft;
    
    return newOrientation;
}

- (void) orientationChanged:(NSNotification *)notification{
   
    NSString * result = nil;
    NSNumber * dashGuid = nil;
    UIInterfaceOrientation orientation = [[UIApplication sharedApplication] statusBarOrientation];
    NSString * newOrientation = [self orientationDescription:orientation];
    
    // - active info
    dashGuid = [WidgetManager sharedManager].dashGuid;
    NSSet * set = [[WidgetManager sharedManager] activeWidgets];
    
    //For all widgets on this dashboard, send updates for those who registered
    for (NSNumber * widgetGuid in set) {
        
        NSString * key = [self keyForDashboard:dashGuid widgetGuid:widgetGuid];
        NSDictionary * components = [_timers objectForKey:key];
        //This has been registered
        if (components) {
            UIWebView * webview = [[WidgetManager sharedManager] widgetInDashboard:dashGuid withGuid:widgetGuid];
            NSString * callback = [components objectForKey:APIcallback];
        
            if (webview && callback) {
                
                if ( newOrientation == nil)
                    result = [NSString stringWithFormat:@"%@({'%@':%@,'%@':{'%@':'%@'}});",monoCallbackName,monoCallbackFn,callback,monoCallbackArgs,APIstatus,APIfailure];
                else
                    result = [NSString stringWithFormat:@"%@({'%@':%@,'%@':{'%@':'%@','orientation':'%@'}});",monoCallbackName,monoCallbackFn,callback,monoCallbackArgs,APIstatus,APIsuccess,newOrientation];
                
            
                NSLog(@"Connection Timer Start: %@",[NSDate new]);
                if ([[NSThread currentThread] isMainThread]) {
                    [webview stringByEvaluatingJavaScriptFromString:result];
                } else {
                    __strong UIWebView * strongWebView = webview;
                    dispatch_sync(dispatch_get_main_queue(), ^{
                        [strongWebView stringByEvaluatingJavaScriptFromString:result];
                    });
                }
                NSLog(@"Connection Timer Finish: %@",[NSDate new]);
            }
        }
    }
}


//save callback info
-(void)registerCallbackToDashboard:(NSNumber *)dashboardGuid withWidget:(NSNumber *)widgetGuid withJSAction:(NSString *)action
{
    NSString * key = [self keyForDashboard:dashboardGuid widgetGuid:widgetGuid];
    
    NSMutableDictionary * components = [[NSMutableDictionary alloc] initWithObjectsAndKeys:dashboardGuid,dashboardUDID,widgetGuid,widgetUDID,action,APIcallback,nil];

    [_timers setObject:components forKey:key];
}

//called to register widgets for future orientation updates
- (NSData *) registerOrientationChangesWithParams:(NSDictionary *)params;
{
    NSDictionary * results = nil;
    NSString * callback = nil;
    
    NSNumber * widgetGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:widgetUDID] unsignedIntValue]],
    * dashGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:dashboardUDID] unsignedIntValue]];
    
    callback = [params objectForKey:APIcallback];
    
    if (callback != nil && dashGuid != nil && widgetGuid != nil) {
        
        // - register this widget for future updates
        [self registerCallbackToDashboard:dashGuid withWidget:widgetGuid withJSAction:callback];
        
        UIInterfaceOrientation orientation = [[UIApplication sharedApplication] statusBarOrientation];
        NSString * newOrientation = [self orientationDescription:orientation];
        
        // - will be success unless above call throws an error
        // - send back what we currently have
        results = @{APIstatus:APIsuccess, @"orientation":newOrientation};
        
    }else{
        results = @{APIstatus:APIfailure};
    }
    
    return [self serializeDictionary:results];
}


#pragma -mark accTime

//Called by timer
- (void) sendAccelerometertoJavascript:(NSTimer *)timer
{
    NSString * key = timer.userInfo;
    NSDictionary * kvPairs = [_timers objectForKey:key];
    
    NSNumber * dashGuid = [kvPairs objectForKey:dashboardUDID];
    NSNumber * widgetGuid = [kvPairs objectForKey:widgetUDID];
    UIWebView * webview = [[WidgetManager sharedManager] widgetInDashboard:dashGuid withGuid:widgetGuid];

    NSString * callback = [kvPairs objectForKey:APIcallback];
    
    NSData *jsonData = [self serializeDictionary:@{dAccX:_accX,dAccY:_accY,dAccZ:_accZ}];
    NSString * accJSON = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    
    NSString * outcome = [NSString stringWithFormat:@"%@({'%@':%@,'%@':%@})",monoCallbackName,monoCallbackFn,callback,monoCallbackArgs,accJSON];
    
    NSLog(@"%@",outcome);
    
    if (webview != nil) {
        
        NSLog(@"%@",[NSDate date]);
        
        NSLog(@"Connection Timer Start: %@",[NSDate new]);
        if ([[NSThread currentThread] isMainThread]) {
            [webview stringByEvaluatingJavaScriptFromString:outcome];
        } else {
            __strong UIWebView * strongWebView = webview;
            dispatch_sync(dispatch_get_main_queue(), ^{
                [strongWebView stringByEvaluatingJavaScriptFromString:outcome];
            });
        }
        NSLog(@"Connection Timer Finish: %@",[NSDate new]);
        
    }else{
        //invalidate if the webview is available anymore
        NSLog(@"Invalidating UIWebView - WidgetGuid:%@, DashGuid:%@",widgetGuid,dashGuid);
        [timer invalidate];
    }
    
}


-(void)registerCallbackToDashboard:(NSNumber *)dashboardGuid withWidget:(NSNumber *)widgetGuid withJSAction:(NSString *)action
                     usingInterval:(NSTimeInterval)interval
{
     NSString * key = [self keyForDashboard:dashboardGuid widgetGuid:widgetGuid];
     BOOL repeat = interval > 0 ? YES : NO;
     NSTimer * timer = [NSTimer scheduledTimerWithTimeInterval:interval target:self selector:@selector(sendAccelerometertoJavascript:) userInfo:key repeats:repeat];
    
    //can only have 1 timer per widget, make sure we don't have one running already
    if (timer &&
        [_timers objectForKey:dashboardGuid]){
        
        NSMutableDictionary * components = [_timers objectForKey:key];
        NSTimer * oldTimer = [components objectForKey:currTimer];
        [oldTimer invalidate];
        [components removeObjectForKey:widgetGuid];
    }
    
    if (timer &&
        repeat ) {
        
        NSMutableDictionary * components =
        [[NSMutableDictionary alloc] initWithObjectsAndKeys:[NSNumber numberWithDouble:interval],currInterval,dashboardGuid,dashboardUDID,widgetGuid,widgetUDID,action,APIcallback,timer,currTimer,[NSNumber numberWithBool:repeat],currRepeat, nil];
        
        [_timers setObject:components forKey:key];
    }
    
}

//Called from RequestRouter
- (NSData * ) registerAccelerometerWithParams:(NSDictionary *) params
{
    NSString * callback = nil;
    NSTimeInterval interval = -1;
    
    NSNumber * widgetGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:widgetUDID] unsignedIntValue]],
    * dashGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:dashboardUDID] unsignedIntValue]];
    
    callback = [params objectForKey:APIcallback];
    
    if([params objectForKey:APIinterval] != nil && [[params objectForKey:APIinterval] doubleValue] > 0)
        interval = [[params objectForKey:APIinterval] doubleValue];
    else
        interval = 0;
    
    NSDictionary * results = nil;
    if (callback != nil && dashGuid != nil && widgetGuid != nil) {
        
        [self registerCallbackToDashboard:dashGuid withWidget:widgetGuid withJSAction:callback usingInterval:interval];
        // will be success unless above call throws an error
        
        results = @{APIsetup:APIsuccess};
    }else{
        results = @{APIsetup:APIfailure};
    }
    
    return [self serializeDictionary:results];
}

#pragma mark - AccelerometerDelegate/CoreMotionPolling

- (void) accelerometer:(UIAccelerometer *)accelerometer didAccelerate:(UIAcceleration *)acceleration{
    //_x = acceleration.x;
    //_y = acceleration.y;
    //_z = acceleration.z;
    
    _accX  = [NSString stringWithFormat:@"%.2f", acceleration.x];
    _accY = [NSString stringWithFormat:@"%.2f", acceleration.y];
    _accZ = [NSString stringWithFormat:@"%.2f", acceleration.z];
}

- (void) updateValues:(NSTimer *)timer {
    
     _accX  = [NSString stringWithFormat:@"%.2f", _motionManager.accelerometerData.acceleration.x];
     _accY = [NSString stringWithFormat:@"%.2f", _motionManager.accelerometerData.acceleration.y];
     _accZ = [NSString stringWithFormat:@"%.2f", _motionManager.accelerometerData.acceleration.z];
    
    /*
    _roll = [NSString stringWithFormat:@"%.2f",(180/M_PI)* _motionManager.deviceMotion.attitude.roll];
    _yaw = [NSString stringWithFormat:@"%.2f",(180/M_PI)* _motionManager.deviceMotion.attitude.yaw];
    _pitch = [NSString stringWithFormat:@"%.2f",(180/M_PI)* _motionManager.deviceMotion.attitude.pitch];
     */
}


#pragma -mark JSON
- (NSData *) serializeDictionary:(NSDictionary *)result
{
    NSError * error = nil;
    NSData * jsondata = [NSJSONSerialization dataWithJSONObject:result options:0 error:&error];
    if (jsondata && !error)
        return jsondata;
    
    NSLog(JSONError,error);
    return nil;
}

- (NSString *) keyForDashboard:(NSNumber *)dashGuid widgetGuid:(NSNumber *)widgetGuid
{
    return [NSString stringWithFormat:@"%@-%@",dashGuid,widgetGuid];
}


@end
