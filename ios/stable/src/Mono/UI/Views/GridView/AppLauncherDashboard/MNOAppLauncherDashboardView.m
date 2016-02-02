//
//  AppLauncherDashboardView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/17/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAppLauncherDashboardView.h"
#import "MNODashboardView.h"
#import "MNOAppMallView.h"
#import "MNODashboard.h"
#import "MNOUser.h"

@interface MNOAppLauncherDashboardView ()

@property (strong, nonatomic) MNOUser * user;

@end

@implementation MNOAppLauncherDashboardView

- (id)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:frame withList:[MNOAccountManager sharedManager].dashboards];
    if (self) {
        // Initialization code
        self.user = [MNOAccountManager sharedManager].user;
    }
    return self;
}


/*
 // Only override drawRect: if you perform custom drawing.
 // An empty implementation adversely affects performance during animation.
 - (void)drawRect:(CGRect)rect
 {
 // Drawing code
 }
 */

- (void) refreshUserInManagedObjectContext:(NSManagedObjectContext *)moc
{
    if(self.list.count != self.user.dashboards.count){
        [self replaceCurrentViewsWithList:[self.user.dashboards allObjects]];
    }
}

- (MNOUser *) fetchUserInManagedObjectContext:(NSManagedObjectContext *)moc
{
    NSFetchRequest * fr = [NSFetchRequest fetchRequestWithEntityName:[MNOUser entityName]];
    [fr setPredicate:[NSPredicate predicateWithFormat:@"userId==%@",self.user.userId]];
    
    NSArray * results = [moc executeFetchRequest:fr error:nil];
    
    return [results firstObject];
}

- (id) createTileWithFrame:(CGRect)frame withMetadata:(MNODashboard *)dash
{
    return  [[MNODashboardView alloc] initWithFrame:frame usingDashboard:dash];
}


@end
