//
//  MNOAccountManager.m
//  Mono
//
//  Created by Ben Scazzero on 2/18/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAccountManager.h"

#import "MNOHttpStack.h"
#import "MNOUserDownloadService.h"
#import "MNOLoginInfo.h"

@interface MNOAccountManager ()
/**
 *  Handle to our current Core Data instance
 */
@property(strong, nonatomic) NSManagedObjectContext *moc;

@end

@implementation MNOAccountManager{
    /**
     *  Handle to our network
     */
    MNOHttpStack *_httpStack;
}
/**
 *  Handle to our current user
 */
@synthesize user = _user;
/**
 *  Handle to the standard, default widgets for the user. These are all the widgets,
 * displayed in the App Launcher Section. All other widgets are clonded from the these standard widgets.
 */
@synthesize defaultWidgets = _defaultWidgets;
/**
 *  The list of the user's current dashbords
 */
@synthesize dashboards = _dashboards;

+ (MNOAccountManager *)sharedManager {
    static MNOAccountManager *sharedMyManager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedMyManager = [[self alloc] init];
    });
    return sharedMyManager;
}

- (id)init {
    self = [super init];
    if (self) {
        //default domain
        _httpStack = [MNOHttpStack sharedStack];
    }
    
    return self;
}

- (void)saveLoginInfo {
    NSManagedObjectContext *moc = self.moc;
    
    // Delete the previous login info
    [moc performBlockAndWait:^{
        NSFetchRequest *allLoginInfo = [NSFetchRequest fetchRequestWithEntityName:[MNOLoginInfo entityName]];
        NSError *error;
        
        NSArray *results = [moc executeFetchRequest:allLoginInfo error:&error];
        
        // Results is valid
        if(results) {
            // Delete these results (there should only be one)
            for(NSManagedObject *result in results) {
                [moc deleteObject:result];
            }
            
            [moc save:&error];
            
            // If we have an error, note it
            if(error) {
                NSLog(@"Error deleting old login info.  Message: %@.", error);
            }
            // Otherwise, generate the new login info and save it
            else {
                MNOLoginInfo *loginInfo = [MNOLoginInfo initWithManagedObjectContext:moc];
                
                loginInfo.certName = self.p12Name;
                loginInfo.server = self.serverBaseUrl;
                loginInfo.certData = self.p12Data;
                
                [moc save:&error];
                
                if(error) {
                    NSLog(@"Error saving new login info!  Message: %@.", error);
                }
            }
        }
        else {
            NSLog(@"Couldn't list old login info!  Message: %@.", error);
        }
    }];
}

- (void)loadLoginInfo {
    NSManagedObjectContext *moc = self.moc;
    
    
    // List all previous login info information.  There should only be one result.
    [moc performBlockAndWait:^{
        NSFetchRequest *allLoginInfo = [NSFetchRequest fetchRequestWithEntityName:[MNOLoginInfo entityName]];
        NSError *error;
        
        NSArray *results = [moc executeFetchRequest:allLoginInfo error:&error];
        
        // Results is valid
        if(results) {
            if([results count] > 0) {
                // Note if there's more than 1 object in here
                if([results count] > 1) {
                    NSLog(@"There is more than 1 login info object stored.  A developer should look into this.");
                }
                
                MNOLoginInfo *firstResult = [results objectAtIndex:0];
                
                self.p12Name = firstResult.certName;
                self.serverBaseUrl = firstResult.server;
                self.p12Data = firstResult.certData;
            }
        }
        else {
            NSLog(@"Couldn't load login info!  Message: %@.", error);
        }
    }];
}

#pragma mark - Getters

- (NSArray *) fetchDefaultWidgets
{
    return [self fetchDefaultWidgetsInContext:self.moc];
}

- (NSArray *) fetchDefaultWidgetsInContext:(NSManagedObjectContext *)moc
{
    return [self fetchDefaultWidgetsInContext:moc forUser:self.user];
}

- (NSArray *) fetchDefaultWidgetsInContext:(NSManagedObjectContext *)moc forUser:(MNOUser *)user
{
    NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNOWidget entityName]];
    fetch.predicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[[NSPredicate predicateWithFormat:@"user == %@",user],
                                                                           [NSPredicate predicateWithFormat:@"isDefault == %@", @(YES)]]];
    
    NSError * error = nil;
    NSArray * results = [moc executeFetchRequest:fetch error:&error];
    return results;
}

- (NSArray *) defaultWidgets {
    
    if (!_defaultWidgets) {
        NSSortDescriptor *sortDescriptor = [[NSSortDescriptor alloc] initWithKey:@"name" ascending:YES selector:@selector(caseInsensitiveCompare:)];
        [[[MNOUtil sharedInstance] defaultManagedContext] refreshObject:self.user mergeChanges:YES];
        _defaultWidgets  = [[self fetchDefaultWidgets] sortedArrayUsingDescriptors:[NSArray arrayWithObject:sortDescriptor]];
    }
    
    return _defaultWidgets;
}

- (NSArray *) dashboards
{
    if (!_dashboards) {
        // Create our array of new MNODashboard objects
        NSSortDescriptor *sortDescriptor = [[NSSortDescriptor alloc] initWithKey:@"name" ascending:YES selector:@selector(caseInsensitiveCompare:)];
        [[[MNOUtil sharedInstance] defaultManagedContext] refreshObject:self.user mergeChanges:YES];
        _dashboards  = [[self.user.dashboards allObjects] sortedArrayUsingDescriptors:[NSArray arrayWithObject:sortDescriptor]];
    }
    
    return _dashboards;
}

- (MNOUser *) user
{
    if (!_user) {
        NSString * userId = [[NSUserDefaults standardUserDefaults] objectForKey:@"user"];
        NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNOUser entityName]];
        fetch.predicate = [NSPredicate predicateWithFormat:@"userId == %@",userId];
        NSError * error = nil;
        NSArray * results= [self.moc executeFetchRequest:fetch error:&error];
        if (!error && [results count] == 1) {
            _user = [results firstObject];
        }
    }
    
    return _user;
}

/**
 * See declaration in MNOAccountManager.h
 */
- (MNOWidget *)getWidgetByName:widgetName {
    for (MNOWidget *widget in self.defaultWidgets) {
        if ([widget.name caseInsensitiveCompare:widgetName] == NSOrderedSame) {
            return widget;
        }
    }
    return nil;
}

- (NSManagedObjectContext *) moc
{
    if (!_moc) {
        _moc = [[MNOUtil sharedInstance] defaultManagedContext];
    }
    return _moc;
}

#pragma mark - Setters


- (void) setDefaultWidgets:(NSArray *)defaultWidgets
{
    // widgets
    _defaultWidgets = defaultWidgets;
    if(_defaultWidgets){
        NSSortDescriptor * sortDescriptor = [NSSortDescriptor sortDescriptorWithKey:@"name" ascending:YES selector:@selector(caseInsensitiveCompare:)];
        _defaultWidgets = [defaultWidgets sortedArrayUsingDescriptors:[NSArray arrayWithObject:sortDescriptor]];
    }
}

- (void) setDashboards:(NSArray *)dashboards
{
    _dashboards = dashboards;
    if (_dashboards) {
        // Create our array of new MNODashboard objects
        NSSortDescriptor *sortDescriptor = [[NSSortDescriptor alloc] initWithKey:@"name" ascending:YES selector:@selector(caseInsensitiveCompare:)];
        _dashboards  = [_dashboards sortedArrayUsingDescriptors:[NSArray arrayWithObject:sortDescriptor]];
    }
}

- (void) setUser:(MNOUser *)user
{
    _user = user;
    _defaultWidgets = nil;
    _dashboards = nil;
    [[NSUserDefaults standardUserDefaults] setObject:_user.userId forKey:@"user"];
    [[NSUserDefaults standardUserDefaults] synchronize];
}

- (void)loadOWFConfig {
    NSURL *baseUrl = [[NSURL alloc] initWithString:self.serverBaseUrl];
    NSURL *url = [[NSURL alloc] initWithString:getConfigPath relativeToURL:baseUrl];
    
    [_httpStack makeAsynchronousRequest:REQUEST_JSON url:[url absoluteString] success:^(MNOResponse *response) {
        NSLog(@"Successfully cached getConfig.");
    } failure:^(MNOResponse *response, NSError *error) {
        NSLog(@"Error caching getconfig.  Message: %@.", error);
    }];
}

@end
