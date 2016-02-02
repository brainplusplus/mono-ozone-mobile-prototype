//
//  DashboardView.h
//  Mono2
//
//  Created by Ben Scazzero on 3/3/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAppView.h"

@interface MNODashboardView : MNOAppView

@property (readonly,strong,nonatomic) MNODashboard * dashboard;

- (id)initWithFrame:(CGRect)frame usingDashboard:(MNODashboard *)dashboard;
- (void) createViewForDashboard:(MNODashboard *)dashboard;

@end
