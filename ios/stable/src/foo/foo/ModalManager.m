//
//  ModalEventsViewController.m
//  foo
//
//  Created by Ben Scazzero on 1/8/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "ModalManager.h"
#import "RequestRouter.h"
#import "WidgetManager.h"

#define JSONError @"ModalManager: Unable to Serialize Dictionary Result %@"
#define setupError @"ModalManager: Unable to Create Modal"
#define setupSuccess @"ModalManager: Modal Created and Showing"

#define selection @"selection"
#define selectionError @"Unable to Retrieve User Selection!"

@interface ModalManager ()

@property (strong, nonatomic) NSMutableDictionary * timers;

@end

@implementation ModalManager

+(ModalManager *) sharedInstance
{
    static ModalManager * sharedManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedManager = [[self alloc] init];
    });
    
    return sharedManager;
}


- (id) init
{
    self = [super init];
    if (self) {
        //init
        _timers = [NSMutableDictionary new];
    }
    return self;
}


- (NSData *) showlTitle:(NSString *)title message:(NSString *)message withParams:(NSDictionary *)params
{
    UIAlertView * alert = [[UIAlertView alloc] initWithTitle:title message:message delegate:nil cancelButtonTitle:@"Ok" otherButtonTitles:nil];
    
    NSDictionary * result = nil;
    if (alert){
       result = @{APIstatus:APIsuccess};
        [alert show];
    }else
       result = @{APIstatus:APIfailure};
    
    return [self serializeDictionary:result];
}

- (void) sendUserResponse:(NSString *)response forAlert:(UIAlertView *)alert
{
    NSValue * key = [NSValue valueWithNonretainedObject:alert];
    NSDictionary * components = [_timers objectForKey:key];
    NSNumber * widgetGuid = [components objectForKey:widgetUDID], * dashGuid = [components objectForKey:dashboardUDID];
    NSString * callback = [components objectForKey:APIcallback];
    
    // - active info
    UIWebView * webview = [[WidgetManager sharedManager] widgetInDashboard:dashGuid withGuid:widgetGuid];
    
    if (webview) {
        
        NSDictionary * results = nil;
        
        if (![response isEqualToString:selectionError])
            results = @{APIstatus:APIsuccess, selection: response};
        else
            results = @{APIstatus:APIfailure, selection: selectionError};
        
        
        NSString * outcome = [NSString stringWithFormat:@"%@({'%@':%@,'%@':{'%@':'%@','%@':'%@'}});", monoCallbackName,monoCallbackFn,callback, monoCallbackArgs, APIstatus,[results objectForKey:APIstatus],selection, [results objectForKey:selection]];
        
        NSLog(@"%@",outcome);
        
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
    }
}


- (NSData *) showYesNoModalTitle:(NSString *)title message:(NSString *)message withParams:(NSDictionary *)params
{
    NSDictionary * result = nil;
    NSString * callback = [params objectForKey:APIcallback];
    
    NSNumber * widgetGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:widgetUDID] unsignedIntValue]],
    * dashGuid = [NSNumber numberWithUnsignedInteger:[[params objectForKey:dashboardUDID] unsignedIntValue]];
    
    // - active info
    if (callback != nil && dashGuid != nil && widgetGuid != nil) {
        
        UIAlertView * alertView = [[UIAlertView alloc] initWithTitle:title message:message delegate:self cancelButtonTitle:@"Cancel" otherButtonTitles:@"Yes",@"No", nil];
        //set other properties, these must be set
        
        NSValue * key = [NSValue valueWithNonretainedObject:alertView];
        
        NSDictionary * components =
        [[NSDictionary alloc] initWithObjectsAndKeys:dashGuid,dashboardUDID,widgetGuid,widgetUDID,callback,APIcallback, nil];
        
        [_timers setObject:components forKey:key];
        
        if (alertView){
            [alertView show];
            result = @{APIsetup:APIsuccess, @"message":setupSuccess};
        }
    }
    
    if (!result)
        result = @{APIsetup:APIfailure, @"message":setupError};
    
    return [self serializeDictionary:result];
}

#pragma -mark UIAlertViewDelegate

- (void)alertView:(UIAlertView *)alertView clickedButtonAtIndex:(NSInteger)buttonIndex
{
    if (buttonIndex == 1) {
        //yes
        [self sendUserResponse:@"Yes" forAlert:alertView];
    }else if(buttonIndex == 2){
        //no
        [self sendUserResponse:@"No" forAlert:alertView];
    }else if(buttonIndex == 0){
        //cancel
        [self sendUserResponse:@"Cancel" forAlert:alertView];
    }else{
        //unknown
        [self sendUserResponse:selectionError forAlert:alertView];
    }
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

@end
