//
//  MNOAppsMallTests.m
//  Mono
//
//  Created by Michael Wilson on 5/13/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>

#import "MNOAppsMall.h"
#import "MNOAppsMallManager.h"
#import "MNOHttpStack.h"
#import "MNONetworkWrapperProtocol.h"
#import "MNOProtocolManager.h"
#import "MNOUserDownloadService.h"
#import "MNOUtil.h"
#import "TestUtils.h"
#import "XCTestCase+XCTestCaseExt.h"

@interface MNOAppsMallTests : XCTestCase

@end

@implementation MNOAppsMallTests

- (void)setUp
{
    [super setUp];
    
    [TestUtils initTestPersistentStore];
}

- (void)tearDown
{
    [TestUtils stopMockingResponse];
    
    [super tearDown];
}

- (void)testAppsMallRetrieve
{
    // Set up mock client
    MNOAppsMallManager *appsMallManager = [MNOAppsMallManager sharedInstance];
    
    NSMutableDictionary *mockJson = [[NSMutableDictionary alloc] init];
    [mockJson setValue:@2 forKey:@"total"];
    [mockJson setValue:@[[self generateTestItem:@"1" guid:@"1" launchUrl:@"1"],
                         [self generateTestItem:@"2" guid:@"2" launchUrl:@"2"]] forKey:@"data"];
    
    [TestUtils mockResponseFromHttpStack:mockJson contentType:@"application/json" requestType:REQUEST_JSON];
    
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    NSString *testUrl = @"https://blah.com/marketplace/";
    
    __block NSArray *widgets;
    __block MNOAppsMall *thisAppsMall;
    
    // Grab the list of widgets
    [appsMallManager addOrUpdateStorefront:testUrl storefrontName:@"test" success:^(MNOAppsMall *appsMall, NSArray *widgetList) {
        widgets = widgetList;
        thisAppsMall = appsMall;
        dispatch_semaphore_signal(semaphore);
    } failure:^{
        XCTFail(@"Failure block hit!");
        dispatch_semaphore_signal(semaphore);
    }];
    
    while(dispatch_semaphore_wait(semaphore, DISPATCH_TIME_NOW)) {
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate date]];
    }
    
    XCTAssert(widgets, @"Widgets should not be nil!");
    
    NSManagedObjectContext *moc = [[MNOUtil sharedInstance] defaultManagedContext];
    
    // Set up searches to validate in core data
    NSFetchRequest *fetch = [NSFetchRequest fetchRequestWithEntityName:[MNOAppsMall entityName]];
    fetch.predicate = [NSPredicate predicateWithFormat:@"url == %@", testUrl];
    
    NSFetchRequest *widgetFetch = [NSFetchRequest fetchRequestWithEntityName:[MNOWidget entityName]];
    widgetFetch.predicate = [NSPredicate predicateWithFormat:@"appsMall == %@", thisAppsMall];
    
    // Perform the searches
    [moc performBlockAndWait:^{
        NSError *error;
        NSArray *results = [moc executeFetchRequest:fetch error:&error];
        
        if(error) {
            XCTFail("Error while searching!  Message: %@.", error);
        }
        
        // There should be only one storefront URL
        XCTAssertEqual(1, [results count], @"Only expected to have one apps mall int the apps mall store.");
        
        error = nil;
        NSArray *widgetResults = [moc executeFetchRequest:widgetFetch error:&error];
        
        // Number of widgets stored and the number we found should match
        XCTAssertEqual(2, [widgetResults count],
                       @"List of widgets stored and list of widgets retrieved from core data does not match what was received directly from the storefront.");
    }];
    
    NSMutableDictionary *newMockJson = [[NSMutableDictionary alloc] init];
    [newMockJson setValue:@2 forKey:@"total"];
    [newMockJson setValue:@[[self generateTestItem:@"1" guid:@"2" launchUrl:@"1"],
                            [self generateTestItem:@"3" guid:@"3" launchUrl:@"3"],] forKey:@"data"];
    
    // Reset the mocking of this object
    [TestUtils mockResponseFromHttpStack:newMockJson contentType:@"application/json" requestType:REQUEST_JSON];
    
    // Try the same request again -- should be an update
    [appsMallManager addOrUpdateStorefront:testUrl storefrontName:@"test" success:^(MNOAppsMall *appsMall, NSArray *widgetList) {
        widgets = widgetList;
        dispatch_semaphore_signal(semaphore);
    } failure:^{
        XCTFail(@"Failure block hit!");
        dispatch_semaphore_signal(semaphore);
    }];
    
    while(dispatch_semaphore_wait(semaphore, DISPATCH_TIME_NOW)) {
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate date]];
    }
    
    // Perform the same searches
    [moc performBlockAndWait:^{
        NSError *error;
        NSArray *results = [moc executeFetchRequest:fetch error:&error];
        
        if(error) {
            XCTFail("Error while searching!  Message: %@.", error);
        }
        
        // There should still be only one URL
        XCTAssertEqual(1, [results count], @"Only expected to have one apps mall int the apps mall store.");
        
        error = nil;
        NSArray *widgetResults = [moc executeFetchRequest:widgetFetch error:&error];
        
        // Number of widgets stored and the number we found should match
        XCTAssertEqual(2, [widgetResults count],
                       @"List of widgets stored and list of widgets retrieved from core data does not match what was received directly from the storefront.");
    }];
}

- (void)testAppsMallRemove {
    NSMutableDictionary *mockJson = [[NSMutableDictionary alloc] init];
    NSString *testUrl = @"https://blah.com/marketplace/";
    
    [mockJson setValue:@2 forKey:@"total"];
    [mockJson setValue:@[[self generateTestItem:@"1" guid:@"1" launchUrl:@"1"],
                         [self generateTestItem:@"2" guid:@"2" launchUrl:@"2"]] forKey:@"data"];
    [TestUtils mockResponseFromHttpStack:mockJson contentType:@"application/json" requestType:REQUEST_JSON];
    
    NSManagedObjectContext *moc = [[MNOUtil sharedInstance] defaultManagedContext];
    
    // Insert two non-apps mall widgets
    [moc performBlock:^{
        MNOWidget *widget1 = [MNOWidget initWithManagedObjectContext:moc];
        
        widget1.isDefault = NO;
        
        // Set the rest of the fun stuff
        widget1.url = @"d1";
        widget1.name = @"d1";
        widget1.widgetId = @"d1";
        
        widget1.largeIconUrl = @"/";
        widget1.smallIconUrl = @"/";
        
        widget1.mobileReady = FALSE;
        
        widget1.appsMall = nil;
        
        MNOWidget *widget2 = [MNOWidget initWithManagedObjectContext:moc];
        
        // Make sure the default is false at first
        widget2.isDefault = NO;
        
        // Set the rest of the fun stuff
        widget2.url = @"d2";
        widget2.name = @"d2";
        widget2.widgetId = @"d2";
        
        widget2.largeIconUrl = @"/";
        widget2.smallIconUrl = @"/";
        
        widget2.mobileReady = FALSE;
        
        widget2.appsMall = nil;
    }];
    
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    MNOAppsMallManager *appsMallManager = [MNOAppsMallManager sharedInstance];
    __block MNOAppsMall *thisAppsMall;
    [appsMallManager addOrUpdateStorefront:testUrl storefrontName:@"test2" success:^(MNOAppsMall *appsMall, NSArray *widgetList) {
        thisAppsMall = appsMall;
        dispatch_semaphore_signal(semaphore);
    } failure:^{
        XCTFail(@"Failure block hit!");
        dispatch_semaphore_signal(semaphore);
    }];
    
    while(dispatch_semaphore_wait(semaphore, DISPATCH_TIME_NOW)) {
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate date]];
    }
    
    __block int numWidgets = 0;
    
    [moc performBlockAndWait:^{
        NSFetchRequest *allWidgetsRequest = [NSFetchRequest fetchRequestWithEntityName:[MNOWidget entityName]];
    
        NSError *error;
        NSArray *results = [moc executeFetchRequest:allWidgetsRequest error:&error];
        
        if(error) {
            NSLog(@"Error trying to find AppsMall widgets.  Error: %@.", error);
            XCTFail(@"Error trying to find AppsMall widgets.");
        }
        
        numWidgets = [results count];
    }];
    
    [appsMallManager removeStorefront:@"test2"];
    
    [moc performBlockAndWait:^{
        NSFetchRequest *allWidgetsRequest = [NSFetchRequest fetchRequestWithEntityName:[MNOWidget entityName]];
    
        NSError *error;
        NSArray *results = [moc executeFetchRequest:allWidgetsRequest error:&error];
        
        if(error) {
            NSLog(@"Error trying to find AppsMall widgets.  Error: %@.", error);
            XCTFail(@"Error trying to find AppsMall widgets.");
        }
        
        XCTAssertEqual([results count], numWidgets - 2, @"Should have had 2 widgets total.");
    }];
}

#pragma mark - private methods

- (NSDictionary *)generateTestItem:(NSString *)title guid:(NSString *)guid launchUrl:(NSString *)launchUrl {
    return
    @{
      @"imageLargeUrl" : @"/",
      @"imageSmallUrl" : @"/",
      @"launchUrl" : launchUrl,
      @"uuid" : guid,
      @"title" : title,
      @"owfProperties" : @{@"mobileReady": [[NSNumber alloc] initWithBool:TRUE]}
    };
}

- (void) loadUser
{
    NSMutableDictionary *mockJson = [[TestUtils loadJsonFromFile:@"whoami"] mutableCopy];
    MNOUserDownloadService *service = [[MNOUserDownloadService alloc] initWithManagedObjectContext:[[MNOUtil sharedInstance] defaultManagedContext]];
    
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"group"]];
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"emptyList"]];
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"dashboard"]];
    [TestUtils mockResponseFromHttpStack:mockJson contentType:@"application/json" requestType:REQUEST_JSON];
    StartBlock();
    // Verify User
    [service loadUserWithCredentialsSuccess:^(NSString *status, int code, MNOUser * user) {
        // We need to download this user's widgets and dashboards now
        //[self loadUserContent:user usingService:service];
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
