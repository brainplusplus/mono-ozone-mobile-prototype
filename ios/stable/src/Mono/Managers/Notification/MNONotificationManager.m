//
//  MNONotificationManager.m
//  Mono
//
//  Created by Corey Herbert on 5/1/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNONotificationManager.h"
#import "MNOWidgetManager.h"

@implementation MNONotificationManager

+ (MNONotificationManager *) sharedInstance {
    static MNONotificationManager * sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[self alloc] init];
    });
    
    return sharedInstance;
}

#pragma mark constructors

- (id) init {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(processNotification:)
                                                 name:@"widgetNotified"
                                               object:nil];
    return self;
}

- (void) processNotification:(NSNotification *)notification{
    NSString *instanceID = [[notification userInfo] objectForKey:@"instanceID"];
    NSString *callbackName = [[notification userInfo] objectForKey:@"callbackName"];
    UIWebView *webview = [[MNOWidgetManager sharedManager] widgetWithInstanceId:instanceID];
    
    dispatch_async(dispatch_get_main_queue(), ^{
        [self showCallback:webview callbackName:callbackName];
    });
}

- (void) showCallback:(id) it callbackName:(NSString*) callbackName
{
    NSString *callbackString = [NSString stringWithFormat:@"Mono.EventBus.runEvents('%@', {status: 'success', outcome: 'yes'});", callbackName];
    [(UIWebView*)it stringByEvaluatingJavaScriptFromString: callbackString];
}

#pragma mark public methods

- (void) notify:(NSString*)title text:(NSString*)text callbackName:(NSString*)callbackName instanceID:(NSString *) instanceID{
    UILocalNotification *localNotification = [[UILocalNotification alloc] init];
    
    localNotification.fireDate =[[NSDate date] dateByAddingTimeInterval:1];
    
    // Schedule the notification
    localNotification.alertBody = text;
    localNotification.userInfo = [NSDictionary dictionaryWithObjectsAndKeys: title, @"title", callbackName, @"callbackName", instanceID, @"instanceID", nil];
    localNotification.alertAction = @"Go to widget";
    localNotification.timeZone = [NSTimeZone defaultTimeZone];
    localNotification.applicationIconBadgeNumber = 1;
    localNotification.soundName = UILocalNotificationDefaultSoundName;
    
    
    [[UIApplication sharedApplication] scheduleLocalNotification:localNotification];
}

@end
