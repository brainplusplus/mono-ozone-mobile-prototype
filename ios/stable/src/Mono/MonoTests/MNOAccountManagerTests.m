//
// Created by Michael Schreiber on 4/28/14.
// Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>
#import "OCMockObject.h"
#import "MNOAccountManager.h"

@interface MNOAccountManagerTests : XCTestCase

@end

@interface MNOAccountManager (AccountManagerTest)

- (void)refreshDashboard:(NSTimer *)timer;
- (void)updateComponentListWithSourceURL:(NSURL *)url;

@end

@implementation MNOAccountManagerTests

- (void)setUp {
    [super setUp];
    // Put setup code here. This method is called before the invocation of each test method in the class.
    // Set up base URL
    [[MNOAccountManager sharedManager] setServerBaseUrl:@"http://blah.com"];
    [[MNOAccountManager sharedManager] setWidgetBaseUrl:@"http://blah.com"];
}

- (void)tearDown {
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}
/*
- (void)testComponentListCalledWithUrl {
    MNOAccountManager *mnoAccountManager = [MNOAccountManager sharedManager];
    NSTimer *timer = [[NSTimer alloc] init];
    NSURL *serverBaseUrl = [NSURL URLWithString:mnoAccountManager.serverBaseUrl];
    NSURL *url = [NSURL URLWithString:componentPath relativeToURL:serverBaseUrl];
    
    [mnoAccountManager refreshDashboard:timer];
    id mock = [OCMockObject mockForClass:[MNOAccountManager class]];
    [[mock expect] updateComponentListWithSourceURL:url];
}

- (void)testFetchDashboards {
    MNOAccountManager *mnoAccountManager = [MNOAccountManager sharedManager];
    NSURL *url = [NSURL URLWithString:[[MNOAccountManager sharedManager].serverBaseUrl stringByAppendingPathComponent:componentPath]];
    [mnoAccountManager updateComponentListWithSourceURL:url];
}
*/
@end

