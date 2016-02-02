//
//  WebViewManager.m
//  foo
//
//  Created by Ben Scazzero on 12/30/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import "WidgetManager.h"

@interface WidgetManager ()

@property (strong, nonatomic) NSMutableDictionary * master;
@property (strong, nonatomic) NSMutableSet * activeWidgetGuids;
@property (strong, nonatomic) NSNumber * dashGuid;

@end

@implementation WidgetManager

+(WidgetManager *) sharedManager
{
    static WidgetManager * sharedManager = nil;
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
        _activeWidgetGuids = [[NSMutableSet alloc] init];
        _dashGuid = nil;
    }
    return self;
}

- (NSSet *) activeWidgets
{
    return[[NSSet alloc] initWithSet:_activeWidgetGuids];    
}

- (void) setActiveWidget:(NSNumber *)widgetGuid onDashboard:(NSNumber *)dashGuid
{
    if (![_dashGuid isEqualToNumber:dashGuid]) {
        NSLog(@"Unregistering Dashboard: %@, Registering %@",_dashGuid, dashGuid);
        [_activeWidgetGuids removeAllObjects];
        
        _dashGuid  = dashGuid;
        [_activeWidgetGuids addObject:widgetGuid];
        
        [[NSNotificationCenter defaultCenter] postNotificationName:dashboardSwitched object:nil userInfo:@{dashboardUDIDNew:dashGuid,dashboardUDIDPrev:_dashGuid}];
    }else{
        [_activeWidgetGuids addObject:widgetGuid];
    }
}

- (UIWebView *) widgetInDashboard:(NSNumber *)dashboardGuid withGuid:(NSNumber *)widgetGuid
{
    if (_master != nil) {
        NSMutableDictionary * innerDict = [_master objectForKey:dashboardGuid];
        if(innerDict != nil){
            UIWebView * widget = [innerDict objectForKey:widgetGuid];
            return widget;
        }
    }
    return nil;
}
- (void) registerWidget:(UIWebView *)widget withGuid:(NSNumber *)widgetGuid toDashboard:(NSNumber *)dashGuid
{
    if (_master == nil) {
        _master = [[NSMutableDictionary alloc] init];
    }
    
    NSMutableDictionary * innerDict = [_master objectForKey:dashGuid];
    
    if(innerDict == nil)
        innerDict = [[NSMutableDictionary alloc] init];
    
    [innerDict setObject:widget forKey:widgetGuid];
    [_master setObject:innerDict forKey:dashGuid];
    
}

@end
