//
//  AppLauncherDashboardView.h
//  Mono2
//
//  Created by Ben Scazzero on 3/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOCustomGridView.h"

@interface MNOAppLauncherDashboardView : MNOCustomGridView

- (id)initWithFrame:(CGRect)frame;
- (void) refreshUserInManagedObjectContext:(NSManagedObjectContext *)moc;

@end
