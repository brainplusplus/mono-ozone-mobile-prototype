//
//  XCTestCase+XCTestCaseExt.m
//  Mono
//
//  Created by Ben Scazzero on 5/7/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "XCTestCase+XCTestCaseExt.h"


@implementation XCTestCase (XCTestCaseExt)


- (void) cleanUpUser:(MNOUser*)createdUser inMOC:(NSManagedObjectContext*)moc
{
    if (createdUser != nil) {
        NSArray * dashboards = [createdUser.dashboards allObjects];
        for(int j = 0; j < dashboards.count; j++){
            MNODashboard * dash = [dashboards objectAtIndex:j];
            NSArray * widgets = [dash.widgets allObjects];
            
            for(int i = 0; i < widgets.count; i++){
                // remove all intents for each widget
                MNOWidget * widget =  [widgets objectAtIndex:i];
                [widget removeIntentRegister:widget.intentRegister];
            }
            // remove all widgets from dashboard
            [dash removeWidgets:dash.widgets];
        }
        
        // remove all dashboards
        [createdUser removeDashboards:createdUser.dashboards];
        
        // Delete Settings
        [moc deleteObject:createdUser.settings];
        // Delete Groups
        [createdUser removeGroups:createdUser.groups];
        
        // Delete Default Widgets
        NSArray * widgets = [createdUser.widgets allObjects];
        for(int i = 0; i < widgets.count; i++){
            // remove all intents for each widget
            MNOWidget * widget =  [widgets objectAtIndex:i];
            [widget removeIntentRegister:widget.intentRegister];
        }
        [createdUser removeWidgets:createdUser.widgets];
        // Finally Delete the User
        [moc deleteObject:createdUser];
        
        NSError * error = nil;
        [moc save:&error];
        XCTAssertTrue([moc save:&error] && !error, @"Successfully Cleaned Up");
        
    }
}




@end
