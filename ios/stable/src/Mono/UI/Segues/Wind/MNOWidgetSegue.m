//
//  WidgetSegue.m
//  Mono2
//
//  Created by Ben Scazzero on 2/26/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOWidgetSegue.h"
#import "MNOWidgetViewController.h"
#import "MNODashboardViewController.h"
#import "MNOWidgetViewController.h"
#import "MNODashboard.h"

@implementation MNOWidgetSegue

- (void)perform
{
    
    UIViewController *sourceViewController = self.sourceViewController;
    UIViewController *destinationViewController = self.destinationViewController;
    
    NSString * identifier =  self.identifier;
    if([identifier isEqualToString:dashboardSegue]){
        MNODashboardViewController * dvc = (MNODashboardViewController *)destinationViewController;
        MNODashboard * dash = self.data;
        dvc.widgets = [NSArray arrayWithArray:[dash.widgets allObjects]];
        dvc.dashboard = dash;
    }else if( [identifier isEqualToString:widgetSegue]){
        
    }
    
    //
    [sourceViewController addChildViewController:destinationViewController];
    // Add the destination view as a subview, temporarily
    UIView * view = destinationViewController.view;
    [view setFrame:CGRectMake(0, 0, sourceViewController.view.frame.size.width, sourceViewController.view.frame.size.height)];
    [sourceViewController.view addSubview:view];
    
    
    // Transformation start scale
    destinationViewController.view.transform = CGAffineTransformMakeScale(0.05, 0.05);
    
    // Store original centre point of the destination view
    CGPoint originalCenter = destinationViewController.view.center;
    // Set center to start point of the button
    destinationViewController.view.center = sourceViewController.view.center;
    
    [UIView animateWithDuration:0.5
                          delay:0.0
                        options:UIViewAnimationOptionCurveEaseInOut
                     animations:^{
                         // Grow!
                         destinationViewController.view.transform = CGAffineTransformMakeScale(1.0, 1.0);
                         destinationViewController.view.center = originalCenter;
                     }
                     completion:^(BOOL finished){
                         
                         [destinationViewController didMoveToParentViewController:sourceViewController];
                     }];
}

@end
