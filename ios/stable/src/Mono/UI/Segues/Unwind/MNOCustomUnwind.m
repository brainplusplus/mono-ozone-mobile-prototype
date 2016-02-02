//
//  CustomUnwind.m
//  Mono2
//
//  Created by Ben Scazzero on 3/14/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOCustomUnwind.h"

@implementation MNOCustomUnwind

- (void)perform
{
    // Transformation start scale
    UIViewController * sourceVC = self.sourceViewController;
    
    sourceVC.view.transform = CGAffineTransformMakeScale(1.0, 1.0);
    
    [UIView animateWithDuration:0.5
                          delay:0.0
                        options:UIViewAnimationOptionCurveEaseInOut
                     animations:^{
                         // Grow!
                         sourceVC.view.transform = CGAffineTransformMakeScale(0.05, 0.05);
                     }
     
                     completion:^(BOOL finished){
                         [sourceVC willMoveToParentViewController:nil];
                         [sourceVC.view removeFromSuperview];
                         [sourceVC removeFromParentViewController];
                     }];
    
}


@end
