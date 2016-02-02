//
//  MNOLogInTests.m
//  Mono
//
//  Created by Ben Scazzero on 5/7/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>
#import "MNOUserDownloadService.h"
#import "MNOUser.h"
#import "MNODashboard.h"
#import "MNOIntentSubscriberSaved.h"
#import "MNOTestDB.h"
#import "XCTestCase+XCTestCaseExt.h"

#import "TestUtils.h"

@interface MNOLogInTests : XCTestCase

@end

@implementation MNOLogInTests
{
    MNOUser * createdUser;
    MNOTestDB * testdb;
}

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
}

- (void) testUserCredentials
{
    NSDictionary *mockJson = [TestUtils loadJsonFromFile:@"whoami"];
    [TestUtils mockResponseFromHttpStack:mockJson contentType:@"application/json" requestType:REQUEST_JSON];
    StartBlock();
    
    MNOUserDownloadService * service = [[MNOUserDownloadService alloc] initWithManagedObjectContext:testdb.managedObjectContext];
    // Verify User
    [service loadUserWithCredentialsSuccess:^(NSString *status, int code, MNOUser *user) {
    
        // We need to download this user's widgets and dashboards now
        createdUser = user;
        
        XCTAssertTrue(code == CREATED_NEW_USER, @"Created New User");
        XCTAssertTrue([user.userId isEqualToString:@"29"], @"Test Id");
        XCTAssertTrue([user.username isEqualToString:@"alerman"], @"Test Username");
        XCTAssertTrue([user.name isEqualToString:@"Adam Lerman"], @"Test Name");

        EndBlock();
        
    } orFailure:^(NSError *error) {
        XCTFail(@"Unable to Verify User: %@",error.description);

        EndBlock();
    }];
    
    WaitUntilBlockCompletes();
}

- (void) testUserCredentialsAndContent
{
    NSMutableDictionary *mockJson = [[TestUtils loadJsonFromFile:@"whoami"] mutableCopy];
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"group"]];
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"widgetList"]];
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"dashboard"]];
    
    [TestUtils mockResponseFromHttpStack:mockJson contentType:@"application/json" requestType:REQUEST_JSON];
    
    StartBlock();
    
    MNOUserDownloadService * service = [[MNOUserDownloadService alloc] initWithManagedObjectContext:testdb.managedObjectContext];
    // Verify User
    [service loadUserWithCredentialsSuccess:^(NSString *status, int code, MNOUser *user) {
        
        // We need to download this user's widgets and dashboards now
        //[self loadUserContent:user usingService:service];
        createdUser = user;
        XCTAssertTrue(code == CREATED_NEW_USER, @"Created New User");
        XCTAssertTrue([user.userId isEqualToString:@"29"], @"Test Id");
        XCTAssertTrue([user.username isEqualToString:@"alerman"], @"Test Username");
        XCTAssertTrue([user.name isEqualToString:@"Adam Lerman"], @"Test Name");
        
        [service loadContentsForUser:user withSuccess:^(NSString * innerStatus, int innerCode) {

            XCTAssertTrue(user.dashboards > 0, @"Test Dashboards Count");
            XCTAssertTrue(user.widgets > 0, @"Test Widget Count");
            EndBlock();
        }];
        
    } orFailure:^(NSError *error) {
        XCTFail(@"Unable to Verify User: %@",error.description);
        EndBlock();
    
    }];
    
    WaitUntilBlockCompletes();
}

@end
