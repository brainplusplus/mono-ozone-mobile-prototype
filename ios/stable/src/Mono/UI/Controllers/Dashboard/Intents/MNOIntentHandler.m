///
//  IntentHandler.m
//  Mono2
//
//  Created by Ben Scazzero on 4/11/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "MNOIntentHandler.h"
#import "MNOWidgetManager.h"

@interface MNOIntentHandler ()

@property (strong, nonatomic) NSMutableDictionary * intentMgr;
@property (strong, nonatomic) NSManagedObjectContext * moc;
@property (strong, nonatomic) NSArray * webViews;
@property (strong, nonatomic) NSArray * widgets;
@property (strong, nonatomic) MNODashboard * dash;
 
@end

@implementation MNOIntentHandler

/**
 * See Declaration in IntentHandler.h
 */
-(id)initWithWidgets:(NSArray*)widgets webViews:(NSArray *)webViews
{
    self = [super init];
    
    if (self) {        
        // All Widgets will have the same dashboard
        MNOWidget * w =  [widgets firstObject];
        self.dash = w.dashboard;
        
        self.widgets = widgets;
        self.webViews = webViews;
    }
    
    return self;
}

/**
 *  Helper function, called to format the variables sent in the
 *  Intent Notification.
 *
 *  @param params Intent Notification Variables
 *
 *  @return Formatted Intent Notification Variables
 */
- (NSDictionary *) formatInput:(NSDictionary *) params
{
    NSMutableDictionary * dict = [[NSMutableDictionary alloc] initWithDictionary:params];
    
    if([params objectForKey:@"data"] && [[params objectForKey:@"data"] isKindOfClass:[NSDictionary class]]) {
        NSString * data = [[MNOUtil sharedInstance] dictionaryToString:[dict objectForKey:@"data"]];
        [dict setObject:data forKey:@"data"];
    }
    
    return dict;
}

/**
 *  Help function, just calls the IntentWrapper init
 *
 *  @param params Variables to init IntentWrapper
 *
 *  @return IntentWrapper
 */
- (MNOIntentWrapper *) buildIntentWrapper:(NSDictionary *)params
{
    return [[MNOIntentWrapper alloc] initWithMetaData:params];
}

/**
 * See Declaration in IntentHandler.h
 */
- (BOOL) userHasIntentPreferenceSaved:(NSNotification *)notif newSender:(MNOIntentWrapper *)sender
{
    // Extract Notification Info
    NSDictionary * params = notif.object;
    // format the input
    params = [self formatInput:params];
    // build a wrapper object
    MNOIntentWrapper * is = [self buildIntentWrapper:params];
    
    // Query the database:
    NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNOIntentSubscriberSaved entityName]];
    // specify intent action/dataType
    NSPredicate * p1 = [NSPredicate predicateWithFormat:@"action == %@", is.action];
    NSPredicate * p2 = [NSPredicate predicateWithFormat:@"dataType == %@", is.dataType];
    // specify widgets belonging to this user
    NSPredicate * p3 = [NSPredicate predicateWithFormat:@"widget.dashboard == %@",self.dash];
    // see if the user saved this intent before
    NSPredicate * p4 = [NSPredicate predicateWithFormat:@"autoSendIntent != nil"];
    // specify widgets belonging to this user
    NSPredicate * p5 = [NSPredicate predicateWithFormat:@"widget.user == %@",[[MNOAccountManager sharedManager] user]];
    //
    NSPredicate * p6 = [NSPredicate predicateWithFormat:@"isReceiver == %@",@NO];
    //
    NSPredicate * p7 = [NSPredicate predicateWithFormat:@"widget.instanceId == %@",[params objectForKey:@"instanceId"]];

    
    fetch.predicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[p1,p2,p3,p4,p5,p6,p7]];
    NSError * error = nil;
    NSArray * results = [self.moc executeFetchRequest:fetch error:&error];
    
    // If we have a match, look for the same intent already registered
    if ([results count]==1){
        MNOIntentSubscriberSaved *savedInfo = results[0];
        NSString *recipientId = savedInfo.autoSendIntent.widget.instanceId;
        
        MNOIntentWrapper *receiver = nil;
        
        for(NSString *instanceId in [self.intentMgr allKeys]) {
            NSArray *intents = [self.intentMgr objectForKey:instanceId];
            
            for(MNOIntentWrapper *intent in intents) {
                // Found the intent -- break
                if([intent.instanceId isEqualToString:recipientId] && [intent.dataType isEqualToString:is.dataType] && [intent.action isEqualToString:is.action]) {
                    receiver = intent;
                    break;
                }
            }
            
            // Intent is found, so break
            if(receiver != nil) {
                break;
            }
        }
        
        if(receiver != nil) {
            // Send off the intent info
            [self sendIntentInfoTo:receiver from:sender];
            
            return YES;
        }
    }
    
    return NO;
}

- (MNOIntentWrapper *) buildIntentWrapperFromModel:(MNOIntentSubscriberSaved *)iss
{
    if (iss.data == nil) {
        // Working with a receiver
        return [self buildIntentWrapper:
         @{@"intent": @{@"action" : iss.action, @"dataType": iss.dataType},
           @"instanceId": iss.widget.instanceId,
           @"guid":iss.widget.widgetId}];
    }else{
        // working with a sender
        return  [self buildIntentWrapper:
                @{@"intent": @{@"action" : iss.action, @"dataType": iss.dataType},
                  @"data":iss.data,
                  @"instanceId": iss.widget.instanceId,
                  @"guid":iss.widget.widgetId}];
    }
}

/**
 * See Declaration in IntentHandler.h
 */
- (void) didReceiveIntent:(NSNotification *)notif
{
    MNOIntentWrapper * is = [self buildIntentWrapper:[self formatInput:notif.object]];
    
    if (![self.intentMgr objectForKey:is.channel])
        [self.intentMgr setObject:[NSMutableArray new] forKey:is.channel];
    
    NSMutableArray * arr = [self.intentMgr objectForKey:is.channel];
    [arr addObject:is];
}

/**
 * See Declaration in IntentHandler.h
 */
- (MNOIntentWrapper *) retreiveIntenWrappertForNotification:(NSNotification *)notif
{
    NSMutableDictionary * dict = [[NSMutableDictionary alloc] initWithDictionary:notif.object];
    
    return [self buildIntentWrapper:[self formatInput:dict]];
}

/**
  * See Declaration in IntentHandler.h
  */
- (NSMutableArray *) retreiveExistingEnpointsForIntent:(NSNotification *)notif
{
    MNOIntentWrapper * is = [self buildIntentWrapper:[self formatInput:notif.object]];
    return [self.intentMgr objectForKey:is.channel];
}

/**
  * See Declaration in IntentHandler.h
  */
- (NSMutableArray *) retreivePossibleEnpointsForIntent:(NSNotification *)notif widgetList:(NSArray **)endpoints
{
    MNOIntentWrapper * is = [self buildIntentWrapper:[self formatInput:notif.object]];
    // entity
    NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNOIntentSubscriberSaved entityName]];
    // specify intent action/dataType
    NSPredicate * p1 = [NSPredicate predicateWithFormat:@"action == %@", is.action];
    NSPredicate * p2 = [NSPredicate predicateWithFormat:@"dataType == %@", is.dataType];
    NSPredicate * p3 =  [NSPredicate predicateWithFormat:@"isReceiver == %@", @YES];
    // specify widgets belonging to this user
    NSPredicate * p4 = [NSPredicate predicateWithFormat:@"widget.user == %@",[[MNOAccountManager sharedManager] user]];
    // choose widget from the list of default widgets provided for this user
    NSPredicate * p5 = [NSPredicate predicateWithFormat:@"widget.isDefault == %@",@YES];

    NSMutableArray * arr = [NSMutableArray new];
    [arr addObject:p1];
    [arr addObject:p2];
    [arr addObject:p3];
    [arr addObject:p4];
    [arr addObject:p5];

    // don't return widgets that were originally added when the dashboard was created
    // i.e.: these are widgets that were addded in AppBuilder
    for (MNOWidget * widget in self.widgets)
        if ([widget.original boolValue])
            [arr addObject:[NSPredicate predicateWithFormat:@"widget.widgetId != %@",widget.widgetId]];
    
    
    fetch.predicate = [NSCompoundPredicate andPredicateWithSubpredicates:arr];
    NSError * error = nil;
    NSArray * results = [self.moc executeFetchRequest:fetch error:&error];
   
    NSMutableArray * intentEndpoints = [NSMutableArray new];
    NSMutableArray * otherWidgets = [[NSMutableArray alloc] init];
    
    
    if ([results count] > 0){
        for (MNOIntentSubscriberSaved * ir in results) {
            ir.widget.instanceId = [[[[NSUUID alloc] init] UUIDString] lowercaseString];
            [otherWidgets addObject:ir.widget];
            
            MNOIntentWrapper * intentSub =
            [self buildIntentWrapper:
             @{@"intent": @{@"action" : ir.action, @"dataType": ir.dataType},
               @"instanceId": ir.widget.instanceId,
               @"widgetId": ir.widget.widgetId}];
            
            [intentEndpoints addObject:intentSub];
        }
        
        NSError * error =  nil;
     
        if ([self.moc save:&error] && !error) {
            NSLog(@"Successfully Retreived Possible Enpoints");
        }
    }

    *endpoints = otherWidgets;
    return intentEndpoints;
}

/**
 * See Declaration in IntentHandler.h
 */
- (BOOL) processIntentWrapper:(MNOIntentWrapper *)is
{
    // Do we already have this widget in the dashboard, if so, there should be a corresponding webview
    BOOL exists = [[MNOWidgetManager sharedManager] widgetWithInstanceId:is.instanceId] ? YES: NO;
    
    if (!exists) {
        // retreive widget template
        MNOWidget * widget = [self widgetWithId:is.widgetId];
        // clone widget
        MNOWidget * newWidget = (MNOWidget *)[MNOWidget clone:widget inContext:self.moc];
        newWidget.isDefault = @NO;
        newWidget.original = @NO;
        newWidget.instanceId = is.instanceId;
        
        // if we have more than once instance of this widget, add a suffix to differentiate
        NSUInteger count = [self numberOfWidgetInstancesWithGuid:newWidget.widgetId];
        if (count)
            newWidget.name = [NSString stringWithFormat:@"%@_%lu",newWidget.name,(unsigned long)count];
        
        //update dashboard
        [self.dash addWidgetsObject:newWidget];
        
        //Save
        NSError * error = nil;
        [self.moc save:&error];
        if (!error){
            NSLog(@"Successfully Updated Dashboard with Widget: %@",widget.name);
            NSLog(@"Reloading Swiper and WebViews");
            
            return YES;
            
        }else
            NSLog(@"Could not Update Dashboard with Widget: %@",widget.name);
    }
    
    return NO;
}

/**
 *  See Declaration in IntentHandler.h
 */
- (BOOL) saveIntentReceiver:(MNOIntentWrapper *)receiver fromSender:(MNOIntentWrapper *)sender
{
    MNOWidget * widSender, *widReceiver;
    UIWebView * webviewSender = [[MNOWidgetManager sharedManager] widgetWithInstanceId:sender.instanceId];
    widSender = self.widgets[webviewSender.tag];
    
    UIWebView * webviewReceiver = [[MNOWidgetManager sharedManager] widgetWithInstanceId:receiver.instanceId];
    widReceiver = self.widgets[webviewReceiver.tag];
    
    
    if (widSender && widReceiver){
        MNOIntentSubscriberSaved * receivingIntent;
        
        for (MNOIntentSubscriberSaved * ir  in widReceiver.intentRegister)
            if ([ir.action isEqualToString:receiver.action] &&
                [ir.dataType isEqualToString:receiver.dataType]) {
                // set autoSentIntent to receiver widget
                // set data, handler
                receivingIntent = ir;
                break;
            }
        
        for (MNOIntentSubscriberSaved * ir  in widSender.intentRegister)
            if ([ir.action isEqualToString:sender.action] &&
                [ir.dataType isEqualToString:sender.dataType]) {
                // set autoSentIntent to receiver widget
                // set data, handler
                ir.data = sender.data;
                ir.autoSendIntent = receivingIntent;
                
                // Save
                NSError * error;
                [self.moc save:&error];
                if(error)
                    NSLog(@"Couldn't Save Intent Preference: %@",error);
                else
                    return YES;
            }
    }
    
    return NO;
}

/**
 *  Returns the number of widgets with a given widgetId/GUID. Scope
 *  is limited to the current/open dashboard.
 *
 *  @param guid Widget guid
 *
 *  @return Number of Widgets in the Dashboard with this guid.
 */
- (NSUInteger) numberOfWidgetInstancesWithGuid:(NSString *)guid
{
    int counter = 0;
    for (MNOWidget * w in self.widgets) {
        if ([w.widgetId isEqualToString:guid]) {
            counter++;
        }
    }
    return counter;
}

/**
 *  See declaration in IntentHandler.h
 */
- (void) sendIntentInfoTo:(MNOIntentWrapper *)receiver from:(MNOIntentWrapper *)sender
{
    UIWebView * receiverWebView = [[MNOWidgetManager sharedManager] widgetWithInstanceId:receiver.instanceId];
    UIWebView * intentWebView = [[MNOWidgetManager sharedManager] widgetWithInstanceId:sender.instanceId];
    
    // Send to the receiver
    if (receiverWebView && receiver && sender) {
        [receiverWebView notifyReciever:receiver fromSender:sender];
    }
    
    // Send to the start activity initiator
    if (intentWebView && receiver && sender) {
        [intentWebView notifyStartActivity:receiver fromSender:sender];
    }
}

/**
 *  Looks up and return a Widget that corresponds with a given instanceId.
 *
 *  @param instanceId Dynamically generated unique identifier for each widget
 *
 *  @return Widget corresponding to the instanceId
 */
- (MNOWidget *) widgetWithId:(NSString *)instanceId
{
    NSFetchRequest * request  = [[NSFetchRequest alloc] init];
    
    NSEntityDescription * ed = [NSEntityDescription entityForName:[MNOWidget entityName] inManagedObjectContext:self.moc];
    request.entity = ed;
    NSPredicate * predicate1 = [NSPredicate predicateWithFormat:@"widgetId == %@",instanceId];
    NSPredicate * predicate2 = [NSPredicate predicateWithFormat:@"isDefault == %@",@YES];
    NSPredicate * predicate3 = [NSPredicate predicateWithFormat:@"user == %@", [MNOAccountManager sharedManager].user];

    [request setPredicate:[NSCompoundPredicate andPredicateWithSubpredicates:@[predicate1,predicate2,predicate3]]];
    
    NSError * err;
    NSArray * results = [self.moc executeFetchRequest:request error:&err];
    MNOWidget * widget  = nil;
    
    if (!err && [results count] > 0) {
        widget = [results objectAtIndex:0];
    }
    
    return widget;
}


#pragma -mark Getters/Setters

- (NSMutableDictionary * ) intentMgr
{
    if(!_intentMgr) _intentMgr = [[NSMutableDictionary alloc] init];
    
    return _intentMgr;
}

- (NSManagedObjectContext *) moc
{
    if (!_moc) {
        _moc = [[MNOUtil sharedInstance] defaultManagedContext];
    }
    return _moc;
}

@end
