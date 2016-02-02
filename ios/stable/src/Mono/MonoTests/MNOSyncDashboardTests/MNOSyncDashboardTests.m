//
//  MNOSyncDashboardTests.m
//  Mono
//
//  Created by Ben Scazzero on 5/12/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>
#import "MNOHttpStack.h"
#import "MNOTestDB.h"
#import "MNOUserDownloadService.h"
#import "XCTestCase+XCTestCaseExt.h"
#import "MNODashboard.h"
#import "TestUtils.h"

@interface MNOSyncDashboardTests : XCTestCase
{
    MNOUserDownloadService * service;
    MNOUser * user;
}


@end

@implementation MNOSyncDashboardTests

- (void)setUp
{
    [super setUp];
    // Put setup code here. This method is called before the invocation of each test method in the class.
    service = [[MNOUserDownloadService alloc] init];
    
    [TestUtils initTestPersistentStore];
    
    [self loadUser];
}

- (void) testDashboardAdded
{
    NSDictionary * first = [TestUtils loadJsonFromFile:@"testAdd1"];
    
    NSArray * dashboards1 = [service loadDashboardFromDictionary:first withUser:user];
    XCTAssert([dashboards1 count] == 7, @"Verifiy Dashboard Count");
    XCTAssert([user.dashboards count] == 7, @"Verify Dashboard Count on User");
    
    NSDictionary * second = [TestUtils loadJsonFromFile:@"testAdd2"];
    NSArray * dashboards2 = [service loadDashboardFromDictionary:second withUser:user];
    
    XCTAssert([dashboards2 count] == 1, @"Verify Dashboard Count After Modifications");
    XCTAssert([user.dashboards count] == 8, @"Verify Dashboard Count on User After Modifications");
}


- (void) testDashboardDelete
{
    NSDictionary * first = [TestUtils loadJsonFromFile:@"testDelete1"];
    
    NSArray * dashboards1 = [service loadDashboardFromDictionary:first withUser:user];
    XCTAssert([dashboards1 count] == 8, @"Verifiy Dashboard Count");
    XCTAssert([user.dashboards count] == 8, @"Verify Dashboard Count on User");
    
    NSDictionary * second = [TestUtils loadJsonFromFile:@"testDelete2"];
    NSArray * dashboards2 = [service loadDashboardFromDictionary:second withUser:user];
    
    XCTAssert([dashboards2 count] == 0, @"Verify Dashboard Count After Modifications");
    XCTAssert([user.dashboards count] == 7, @"Verify Dashboard Count on User After Modifications");
}
              
- (void) testDashboardUpdated
{
    NSDictionary * first = [TestUtils loadJsonFromFile:@"testUpdate1"];
    NSArray * dashboards1 = [service loadDashboardFromDictionary:first withUser:user];
    XCTAssert([dashboards1 count] == 8, @"Verifiy Dashboard Count");
    XCTAssert([user.dashboards count] == 8, @"Verify Dashboard Count on User");
   
    MNODashboard * dash = [self lookupDashboardById:@"247d1f06-2696-41ba-8ff0-c728eb51269a"];
    XCTAssert(dash != nil, @"Assert our Dashboard Was Created Successfully");
    XCTAssert([dash.widgets count] == 0, @"Assert our Dashboard Size");

    NSDictionary * second = [TestUtils loadJsonFromFile:@"testUpdate2"];
    NSArray * dashboards2 = [service loadDashboardFromDictionary:second withUser:user];
    
    XCTAssert([dashboards2 count] == 1, @"Verify Dashboard Count After Modifications");
    XCTAssert([user.dashboards count] == 8, @"Verify Dashboard Count on User After Modifications");
    MNODashboard * dash2 = [self lookupDashboardById:@"247d1f06-2696-41ba-8ff0-c728eb51269a"];
    XCTAssert(dash2 != nil, @"Assert our Dashboard is Still Available");
    XCTAssert([dash2.widgets count] == 1, @"Assert our Dashboard Size Again");
 
}

- (MNODashboard*) lookupDashboardById:(NSString*)dashboardId
{
    NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNODashboard entityName]];
    fetch.predicate  = [NSPredicate predicateWithFormat:@"dashboardId == %@",dashboardId];
    
    NSArray * results = [[[MNOUtil sharedInstance] defaultManagedContext] executeFetchRequest:fetch error:nil];
    return [results firstObject];
}

- (void) loadUser
{
    NSMutableDictionary *mockJson = [[TestUtils loadJsonFromFile:@"whoami"] mutableCopy];
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"group"]];
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"widgetList"]];
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"dashboard"]];
    [TestUtils mockResponseFromHttpStack:mockJson contentType:@"application/json" requestType:REQUEST_JSON];
    StartBlock();
    // Verify User
    [service loadUserWithCredentialsSuccess:^(NSString *status, int code, MNOUser * _user) {
        // We need to download this user's widgets and dashboards now
        //[self loadUserContent:user usingService:service];
        user = _user;
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

- (void)tearDown
{
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}

@end
