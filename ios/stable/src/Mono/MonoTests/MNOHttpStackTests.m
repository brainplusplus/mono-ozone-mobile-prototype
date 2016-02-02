//
//  MNOHttpStackTests.m
//  Mono
//
//  Created by Jason Lettman on 5/20/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>

#import "MNOHttpStack.h"

@interface MNOHttpStackTests : XCTestCase

@end

@implementation MNOHttpStackTests {
    NSString *casURL;
    NSString *openAMURL;
    NSString *failURL;
    NSString *casFailURL;
    NSString *openAMFailURL;
    MNOHttpStack *httpStack;
}

- (void)setUp {
    //[super setUp];
    // Put setup code here. This method is called before the invocation of each test method in the class.
    //casURL = @"https://monoval.42six.com:8443/owf/prefs/person/whoami";
    //openAMURL = @"https://monoval-sp.42six.com:8443/owf/prefs/person/whoami";
    //failURL = @"https://monoval-fail.42six.com:8443/owf/prefs/person/whoami";
    //casFailURL = @"https://monoval.42six.com:8443/owf/prefs/person/whoamis";
    //openAMFailURL = @"https://monoval-sp.42six.com:8443/owf/prefs/person/whoamis";
    //httpStack = [MNOHttpStack sharedStack];
    //[httpStack loadCert:@"bscazzero.p12"];
}

- (void)tearDown {
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}

/* TODO: Flesh out these tests as a separate task need to utilize stop mock since
 * calls returned from httpStack in the test environment
- (void)testSyncSuccessCAS {
    [self verifyUserName:casURL];
}

- (void)testSyncFailCAS {
    [self verifyFail:casFailURL];
}

- (void)testSyncSuccessOpenAM {
    [self verifyUserName:openAMURL];
}

- (void)testSyncFailOpenAM {
    [self verifyFail:openAMFailURL];
}


 - (void)testAsyncSuccessCAS {
 XCTFail(@"No implementation for \"%s\"", __PRETTY_FUNCTION__);
 }
 
 - (void)testAsyncFailCAS {
 XCTFail(@"No implementation for \"%s\"", __PRETTY_FUNCTION__);
 }
 
 - (void)testAsyncSuccessOpenAM {
 XCTFail(@"No implementation for \"%s\"", __PRETTY_FUNCTION__);
 }
 
 - (void)testAsyncFailOpenAM {
 XCTFail(@"No implementation for \"%s\"", __PRETTY_FUNCTION__);
 }
 

- (void)testSyncBadDomain {
    [self verifyFail:failURL];
}

- (void)verifyUserName:(NSString *)serverURL {
    NSDictionary *results = [httpStack makeSynchronousRequest:REQUEST_JSON url:serverURL];
    XCTAssert(results, @"No results were returned");
    
    NSString *userName = [results objectForKey:@"currentUserName"];
    XCTAssert([userName isEqualToString:@"bscazzero"], @"The username is incorrect");
}

- (void)verifyFail:(NSString *)serverURL {
    NSDictionary *results = [httpStack makeSynchronousRequest:REQUEST_JSON url:serverURL];
    XCTAssert(results == nil, @"Results were returned");
}

 */

@end
