//
//  MonoTimer.m
//  foo
//
//  Created by Ben Scazzero on 1/20/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "MonoGPS.h"
#import "WidgetManager.h"

@interface MonoGPS ()

@property (nonatomic, strong) CLLocationManager *locationManager;
@property (readwrite, nonatomic) CLLocationDegrees lat;
@property (readwrite, nonatomic) CLLocationDegrees lon;

@property (strong,nonatomic) NSNumber * dashGuid;
@property (strong,nonatomic) NSNumber * widgetGuid;
@property (strong,nonatomic) NSString * callback;
@property (strong,nonatomic) NSNumber * interval;
@property (readwrite,nonatomic) BOOL repeat;

@property (readwrite, nonatomic) BOOL isMetered;
@property (strong, nonatomic) NSTimer * timer;

@end


@implementation MonoGPS

#pragma mark - CLLocationManagerDelegate

- (id) init
{
    self = [super init];
    if (self) {
        
    }
    return self;
}

- (id) initScheduleWithDashGuid:(NSNumber *)dashGuid widgetGuid:(NSNumber *)widgetGuid usingCallback:(NSString *)callback interval:(NSNumber *)interval repeat:(BOOL)repeat
{
    self = [self init];
    if (self) {
        //init
        _lat = 0;
        _lon = 0;
        
        _dashGuid = dashGuid;
        _widgetGuid = widgetGuid;
        _callback = callback;
        _interval = interval;
        _repeat = repeat;

        //start tracking, must call this before start!
        [self trackCurrentLocationInSeconds];
        //schedule timer
        [self start];
        
    }
    return self;
}

- (id) initRegisterWithDashGuid:(NSNumber *)dashGuid widgetGuid:(NSNumber *)widgetGuid usingCallback:(NSString *)callback interval:(NSNumber *)interval repeat:(BOOL)repeat
{
    self = [self init];
    if (self) {
        //init
        _lat = 0;
        _lon = 0;
        
        _dashGuid = dashGuid;
        _widgetGuid = widgetGuid;
        _callback = callback;
        _interval = interval;
        _repeat = repeat;
        _isMetered = YES;
        
        //start tracking
        [self trackCurrentLocationInMeters];
        //schedule timer
        [self start];
        
    }
    return self;
}

- (void) start
{
    if (!_isMetered) {
        //stop old
        [self stop];
        
        //start new
        if (_repeat)
           _timer = [NSTimer scheduledTimerWithTimeInterval:_interval.integerValue target:self selector:@selector(sendTimedGPStoJavascript:) userInfo:nil repeats:_repeat];
    }
    
    [_locationManager startUpdatingLocation];
}

- (void) stop
{
    if (!_isMetered) {
        if (_timer) {
            [_timer invalidate];
            _timer = nil;
        }
    }
    
    [_locationManager stopUpdatingLocation];
}

-(void)sendCoordinates
{
    UIWebView * webview = [[WidgetManager sharedManager] widgetInDashboard:_dashGuid withGuid:_widgetGuid];
    
    if (webview != nil) {
        
        NSString * outcome = [NSString stringWithFormat:@"%@({'%@':%@,'%@':{'%@':'%@','coords':{'lat':%.8f,'lon':%.8f}}})",monoCallbackName,monoCallbackFn,_callback,monoCallbackArgs,APIstatus,APIsuccess,_lat,_lon];
        
        NSLog(@"%@: %@",[NSDate date],outcome);

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
        NSLog(@"Invalidating UIWebView - WidgetGuid:%@, DashGuid:%@",_widgetGuid,_dashGuid);
        [self stop];
    }
}

// called by timer
-(void)sendTimedGPStoJavascript:(NSTimer *)timer
{
    [self sendCoordinates];
}

// called by timer
-(void)sendMeteredGPStoJavascript
{
    [self sendCoordinates];
}

- (void) trackCurrentLocationInMeters
{
    _locationManager = [[CLLocationManager alloc] init];
    _locationManager.delegate = self;
    _locationManager.desiredAccuracy = kCLLocationAccuracyBest;
    _locationManager.distanceFilter = _interval.doubleValue;
    
    [_locationManager startUpdatingLocation];
}

- (void) trackCurrentLocationInSeconds
{
    _locationManager = [[CLLocationManager alloc] init];
    _locationManager.delegate = self;
    _locationManager.desiredAccuracy = kCLLocationAccuracyBest;
    
    [_locationManager startUpdatingLocation];
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error
{
    UIAlertView *errorAlert = [[UIAlertView alloc]
                               initWithTitle:@"Error" message:@"Failed to Get Your Location" delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil];
    [errorAlert show];
}

- (void) locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray *)locations
{
    if (locations != nil && [locations lastObject] != nil) {
        CLLocation * location = [locations lastObject];
        _lat = location.coordinate.latitude;
        _lon = location.coordinate.longitude;
        
        if (_isMetered) {
            [self sendMeteredGPStoJavascript];
        }
    }
}

@end
