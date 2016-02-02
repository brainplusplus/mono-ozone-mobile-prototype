//
//  SyncWidgets.m
//  Mono
//
//  Created by Ben Scazzero on 6/5/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>
#import "TestUtils.h"
#import "MNOSyncWidgetsOp.h"
#import "MNOUserDownloadService.h"

@interface MNOSyncWidgetsTest : XCTestCase

@end

@implementation MNOSyncWidgetsTest

- (void)setUp
{
    [super setUp];
    // Put setup code here. This method is called before the invocation of each test method in the class.
    [TestUtils initTestPersistentStore];

}

- (void)tearDown
{
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
    [MNOAccountManager sharedManager].user = nil;
    [TestUtils stopMockingResponse];
    [TestUtils removePersistenceStore];

}

- (void) testCreateNewWidget
{
    NSDictionary * response = [self generateTestItem:@"1" guid:@"1" launchUrl:@"1" mobileReady:YES];

    [TestUtils mockResponseFromHttpStack:response contentType:@"application/json" requestType:REQUEST_JSON];
    
    NSManagedObjectContext * moc = [[MNOUtil sharedInstance] defaultManagedContext];
    MNOUser * user = [self createUser];
    [MNOAccountManager sharedManager].user = user;

    // Create new operation for this request
    [self refreshListForUser:user];

    NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNOWidget entityName]];
    
    NSArray * results = [moc executeFetchRequest:fetch error:nil];
    XCTAssert([results count] == 1, @"Verfy We Have 1 Widget");
}

- (void) testModifyNewNewWidget
{
    NSDictionary * response = [self generateTestItem:@"1" guid:@"1" launchUrl:@"1" mobileReady:YES];
    [TestUtils mockResponseFromHttpStack:response contentType:@"application/json" requestType:REQUEST_JSON];
    
    NSManagedObjectContext * moc = [[MNOUtil sharedInstance] defaultManagedContext];
    MNOUser * user = [self createUser];
    [MNOAccountManager sharedManager].user = user;

    [self refreshListForUser:user];
    
    // Verify
    NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNOWidget entityName]];
    NSArray * results = [moc executeFetchRequest:fetch error:nil];
    XCTAssert([results count] == 1, @"Verfy We Have 1 Widget");
    
    NSDictionary * response2 = [self generateTestItem:@"1" guid:@"1" launchUrl:@"2" mobileReady:YES];
    [TestUtils mockResponseFromHttpStack:response2 contentType:@"application/json" requestType:REQUEST_JSON];
    [self refreshListForUser:user];
    
    // Verify
    NSFetchRequest * fetch2 = [[NSFetchRequest alloc] initWithEntityName:[MNOWidget entityName]];
    NSArray * results2 = [moc executeFetchRequest:fetch2 error:nil];
    XCTAssert([results2 count] == 1, @"Verfy We Have 1 Widget");
    MNOWidget * widget = [results2 firstObject];
    XCTAssert([widget.url isEqualToString:@"2"], @"Verify the URL Change");
}


- (void) testCreateDeleteWidget
{
    NSDictionary * response = [self generateTestItem:@"1" guid:@"1" launchUrl:@"1" mobileReady:YES];
    [TestUtils mockResponseFromHttpStack:response contentType:@"application/json" requestType:REQUEST_JSON];
    
    NSManagedObjectContext * moc = [[MNOUtil sharedInstance] defaultManagedContext];
    MNOUser * user = [self createUser];
    [MNOAccountManager sharedManager].user = user;
    [self refreshListForUser:user];
    
    // Verify
    NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNOWidget entityName]];
    NSArray * results = [moc executeFetchRequest:fetch error:nil];
    XCTAssert([results count] == 1, @"Verfy We Have 1 Widget");
    
    NSDictionary * response2 =  [self generateNoWidgets];
    [TestUtils mockResponseFromHttpStack:response2 contentType:@"application/json" requestType:REQUEST_JSON];
    [self refreshListForUser:user];
    
    // Verify
    NSFetchRequest * fetch2 = [[NSFetchRequest alloc] initWithEntityName:[MNOWidget entityName]];
    NSArray * results2 = [moc executeFetchRequest:fetch2 error:nil];
    XCTAssert([results2 count] == 0, @"Verfy Widget Was Deleted");
}

- (MNOUser *)createUser
{
    NSManagedObjectContext * moc = [[MNOUtil sharedInstance] defaultManagedContext];
    MNOUser * user = [MNOUser initWithManagedObjectContext:moc];
    user.name = @"Bobby Senger";
    user.username = @"bsenger";
    return user;
}

- (void) refreshListForUser:(MNOUser*)user
{
    // Create new operation for this request
    NSManagedObjectContext * moc = [[MNOUtil sharedInstance] defaultManagedContext];
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    MNOUserDownloadService * service = [[MNOUserDownloadService alloc] initWithManagedObjectContext:moc];
    [service refreshWidgetList:^(BOOL success) {
        XCTAssert(success, @"Assert Successful Refresh");
        dispatch_semaphore_signal(semaphore);
    } forUser:user];
    // Start operation
    while(dispatch_semaphore_wait(semaphore, DISPATCH_TIME_NOW)) {
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate date]];
    }
}

- (NSDictionary *)generateTestItem:(NSString *)title guid:(NSString *)guid launchUrl:(NSString *)launchUrl mobileReady:(BOOL)mobileReady
{
    return
    @{@"success":@"true",
      @"rows":@[@{
          @"path":guid,
          @"value":@{
              @"userId":@"bsenger",
              @"userRealName":@"Bobby Senger",
              @"imageLargeUrl" : @"/",
              @"imageSmallUrl" : @"/",
              @"url" : launchUrl,
              @"originalName" : title,
              @"mobileReady": [NSNumber numberWithBool:mobileReady],
          }
      }],
    };
}

- (NSDictionary *)generateNoWidgets
{
    return
    @{@"success":@"true",
      @"rows":@[@{
                    @"value":@{
        
                              }
               }],
    };
}

@end
