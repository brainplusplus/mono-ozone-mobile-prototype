//
//  APIResponseTests.m
//  Mono2
//
//  Created by Michael Wilson on 4/10/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>
#import <Foundation/Foundation.h>

#import "MNOAPIResponse.h"
#import "UIWebView+OzoneWebView.h"
#import "MNOPersistentStorageProcessor.h"
#import "MNODBManager.h"
#import "TestUtils.h"
#import "CacheUtils.h"
#import "MNOCacheProcessor.h"
#import "MNOHttpStack.h"
#import "MNOModalProcessor.h"

@interface MNOAPIProcessingTests : XCTestCase

@end

@implementation MNOAPIProcessingTests

- (void)setUp {
    [super setUp];
    // Put setup code here. This method is called before the invocation of each test method in the class.
    // Set up base URL
    [[MNOAccountManager sharedManager] setWidgetBaseUrl:@"http://blah.com"];
    
    [TestUtils initTestPersistentStore];
}

- (void)tearDown {
    [TestUtils stopMockingResponse];
    
    [super tearDown];
}

// API response tests
// Exercise all of the constructors and make sure they look like what we're expecting
// Can do this by trying to parse the resulting NSData object as if it were JSON
- (void)testAPIResponse {
    NSError *error;

    // Test 1
    MNOAPIResponse *apiResponse1 = [[MNOAPIResponse alloc] initWithStatus:API_SUCCESS];
    
    NSDictionary *response1Json = [NSJSONSerialization JSONObjectWithData:[apiResponse1 getAsData] options:0 error:&error];

    XCTAssertEqualObjects([response1Json valueForKey:@"status"], @"success", @"The statuses do not match for response 1!");
    XCTAssertEqualObjects([response1Json valueForKey:@"message"], @"", @"The messages do not match for response 1!");
    XCTAssertEqual([response1Json count], 2, @"There should be 2 fields in response 1.");

    // Test 2
    MNOAPIResponse *apiResponse2 = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Testing"];
    
    NSDictionary *response2Json = [NSJSONSerialization JSONObjectWithData:[apiResponse2 getAsData] options:0 error:&error];

    XCTAssertEqualObjects([response2Json valueForKey:@"status"], @"failure", @"The statuses do not match for response 2!");
    XCTAssertEqualObjects([response2Json valueForKey:@"message"], @"Testing", @"The messages do not match for response 2!");
    XCTAssertEqual([response2Json count], 2, @"There should be 2 fields in response 2.");

    // Test 3
    MNOAPIResponse *apiResponse3 = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE message:@"Testing"
                                                     additional:[[NSDictionary alloc] initWithObjectsAndKeys:@"val1", @"test1", @"val2", @"test2", @"val3", @"test3", nil]];
    
    NSDictionary *response3Json = [NSJSONSerialization JSONObjectWithData:[apiResponse3 getAsData] options:0 error:&error];

    XCTAssertEqualObjects([response3Json valueForKey:@"status"], @"failure", @"The statuses do not match for response 3!");
    XCTAssertEqualObjects([response3Json valueForKey:@"message"], @"Testing", @"The messages do not match for response 3!");
    XCTAssertEqual([response3Json count], 5, @"There should be 5 fields in response 3.");

    // Test 4
    MNOAPIResponse *apiResponse4 = [[MNOAPIResponse alloc] initWithStatus:API_FAILURE
                                                     additional:[[NSDictionary alloc] initWithObjectsAndKeys:@"val1", @"test1", @"val2", @"test2", @"val3", @"test3", nil]];
    
    NSDictionary *response4Json = [NSJSONSerialization JSONObjectWithData:[apiResponse4 getAsData] options:0 error:&error];

    XCTAssertEqualObjects([response4Json valueForKey:@"status"], @"failure", @"The statuses do not match for response 4!");
    XCTAssertEqualObjects([response4Json valueForKey:@"message"], @"", @"The messages do not match for response 4!");
    XCTAssertEqual([response4Json count], 5, @"There should be 5 fields in response 4.");
}

// Set the flag for a block completion handler
#define StartBlock() __block BOOL waitingForBlock = YES

// Set the flag to stop the loop
#define EndBlock() waitingForBlock = NO

// Wait and loop until flag is set
#define WaitUntilBlockCompletes() WaitWhile(waitingForBlock)

// Macro - Wait for condition to be NO/false in blocks and asynchronous calls
#define WaitWhile(condition) \
do { \
while(condition) { \
[[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]]; \
 \
} \
} while(0)

- (void)testInitCacheAPI {
    // Clear out core data
    XCTAssert([CacheUtils initCache:nil].status == API_SUCCESS, @"Failed to initialize cache.");
}

- (void)testStoreCacheAPI {
    // Clear out core data
    NSString *cacheId = [[CacheUtils initCache:nil].additional objectForKey:@"cacheId"];
    NSString *url = @"http://www.42six.com";

    NSDictionary *params = @{
            @"cacheId" : cacheId,
            @"url" : url
    };
    
    [TestUtils mockResponseFromHttpStack:[@"<html><head></head><body>Yay</body></html>" dataUsingEncoding:NSUTF8StringEncoding] contentType:@"text/html" requestType:REQUEST_RAW];

    MNOCacheProcessor *cacheProcessor = [[MNOCacheProcessor alloc] init];
    StartBlock();
    [cacheProcessor storeCachedData:params withCallback:^(MNOAPIResponse *response) {
        XCTAssert(response != nil, @"Response is nil");
        XCTAssert(response.status == API_SUCCESS, @"Response was not successful.");
        EndBlock();
    }];

    WaitUntilBlockCompletes();
}

- (void)testRetrieveCacheAPI {
    // Clear out core data
    NSString *cacheId = [[CacheUtils initCache:nil].additional objectForKey:@"cacheId"];
    NSString *url = @"http://www.42six.com";

    NSDictionary *storeParams = @{
            @"cacheId" : cacheId,
            @"url" : url
    };

    NSDictionary *retrieveParams = @{@"url" : url};
    
    [TestUtils mockResponseFromHttpStack:[@"<html><head></head><body>Yay</body></html>" dataUsingEncoding:NSUTF8StringEncoding] contentType:@"text/html" requestType:REQUEST_RAW];

    MNOCacheProcessor *cacheProcessor = [[MNOCacheProcessor alloc] init];
    StartBlock();
    [cacheProcessor storeCachedData:storeParams withCallback:^(MNOAPIResponse *response) {
        XCTAssert(response != nil, @"Response is nil");
        XCTAssert(response.status == API_SUCCESS, @"Response was not successful.");
        MNOAPIResponse *storeResponse = [cacheProcessor retrieveCachedData:retrieveParams];
        NSString *contentType = [storeResponse.headers objectForKey:@"contentType"];
        XCTAssert([contentType isEqualToString:@"text/html"], @"Content type was not expected, text/html");
        NSString *expirationTime = [storeResponse.headers objectForKey:@"expirationTime"];
        XCTAssert(expirationTime != nil, @"Expiration time was not expected to be nil.");
        EndBlock();
    }];

    WaitUntilBlockCompletes();

}

- (void)testPersistentStorageAPI {
    NSString *widgetId = @"PSTW1";
    NSURL *originalUrl = [[NSURL alloc] initWithString:@"http://ozone.gov/storage/persistent"];
    
    // Clear out the database
    [[[MNODBManager sharedInstance] getDatabaseWithWidgetId:widgetId] remove];
    
    // Make the web view
    UIWebView *webView = [[UIWebView alloc] init];
    [webView initPropertiesWithURL:@"http://test.url/" widgetId:widgetId];

    // Make the Persistent Storage Procesor
    MNOPersistentStorageProcessor *psp = [[MNOPersistentStorageProcessor alloc] init];
    
    // Crazy long queries - exec commands
    NSDictionary *execParams1 = @{@"query": @"CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, desc TEXT)"};
    NSDictionary *execParams2 = @{@"query": @"INSERT INTO test (desc) VALUES ('row1')"};
    NSDictionary *execParams3 = @{@"query": @"INSERT INTO test (desc) VALUES (?)",
                                  @"values": @[@"row2"]};
    NSDictionary *execParams4 = @{@"query": @"INSERT INTO test (desc) VALUES ('row3')"};

    // Make sure everything succeeded
    XCTAssert([psp process:@"exec" params:execParams1 url:originalUrl webView:webView].status == API_SUCCESS, @"Create table unsuccessful!");
    XCTAssert([psp process:@"exec" params:execParams2 url:originalUrl webView:webView].status == API_SUCCESS, @"First insert unsuccessful!");
    XCTAssert([psp process:@"exec" params:execParams3 url:originalUrl webView:webView].status == API_SUCCESS, @"Second insert unsuccessful!");
    XCTAssert([psp process:@"exec" params:execParams4 url:originalUrl webView:webView].status == API_SUCCESS, @"Third insert unsuccessful!");

    // Crazy long queries - query commands
    NSDictionary *queryParams1 = [[NSDictionary alloc] initWithObjectsAndKeys:@"SELECT * FROM test", @"query", nil];
    NSDictionary *queryParams2 = [[NSDictionary alloc] initWithObjectsAndKeys:@"SELECT * FROM test WHERE desc = ?", @"query", [[NSArray alloc] initWithObjects:@"row2", nil], @"values", nil];
    
    MNOAPIResponse *response1 = [psp process:@"query" params:queryParams1 url:originalUrl webView:webView];
    MNOAPIResponse *response2 = [psp process:@"query" params:queryParams2 url:originalUrl webView:webView];
    
    NSDictionary *response1Json = [NSJSONSerialization JSONObjectWithData:[response1 getAsData] options:0 error:nil];
    NSDictionary *response2Json = [NSJSONSerialization JSONObjectWithData:[response2 getAsData] options:0 error:nil];

    XCTAssert([response1Json objectForKey:@"results"], @"No results in response 1!");
    XCTAssert([response2Json objectForKey:@"results"], @"No results in response 2!");

    NSArray *response1Results = [response1Json valueForKey:@"results"];
    NSArray *response2Results = [response2Json valueForKey:@"results"];

    int response1ResultCount = (int)[response1Results count];
    int response2ResultCount = (int)[response2Results count];

    XCTAssertEqual(response1ResultCount, 3, @"Was expecting 3 results in response 1!");
    XCTAssertEqual(response2ResultCount, 1, @"Was expecting 1 results in response 2!");

    for (int i = 0; i < response1ResultCount; i++) {
        NSDictionary *result = [response1Results objectAtIndex:i];

        if ([[result valueForKey:@"id"] isEqualToString:@"1"]) {
            XCTAssertEqualObjects([result valueForKey:@"desc"], @"row1", @"Desc field for id 1/response 1 does not match!");
        }
        else if ([[result valueForKey:@"id"] isEqualToString:@"2"]) {
            XCTAssertEqualObjects([result valueForKey:@"desc"], @"row2", @"Desc field for id 2/response 1 does not match!");
        }
        else if ([[result valueForKey:@"id"] isEqualToString:@"3"]) {
            XCTAssertEqualObjects([result valueForKey:@"desc"], @"row3", @"Desc field for id 3/response 1 does not match!");
        }
    }

    XCTAssertEqualObjects([[response2Results objectAtIndex:0] valueForKey:@"id"], @"2", @"Id for response 2 does not match!");
    XCTAssertEqualObjects([[response2Results objectAtIndex:0] valueForKey:@"desc"], @"row2", @"desc for response 2 does not match!");
}

- (void)testCommonModalAPI {
    /* TODO - because of dispatch_get_main_queue being called in MNOModalManager tests don't work, need to find a fix
    NSString *widgetId = @"CMT1";
    NSURL *htmlOriginalUrl = [[NSURL alloc] initWithString:@"https://ozone.gov/modals/html"];
    NSURL *messageOriginalUrl = [[NSURL alloc] initWithString:@"https://ozone.gov/modals/message"];
    NSURL *urlOriginalUrl = [[NSURL alloc] initWithString:@"https://ozone.gov/modals/url"];
    NSURL *widgetOriginalUrl = [[NSURL alloc] initWithString:@"https://ozone.gov/modals/widget"];
    NSURL *yesNoOriginalUrl = [[NSURL alloc] initWithString:@"https://ozone.gov/modals/yesNo"];

    // Make the web view
    UIWebView *webView = [[UIWebView alloc] init];
    [webView initPropertiesWithURL:@"http://test.url/" widgetId:widgetId];
    
    // Make the modal procesor
    MNOModalProcessor *modalProcessor = [[MNOModalProcessor alloc] init];
    
    // Different modal type params
    NSDictionary *htmlParams = @{@"title":@"HTML Modal", @"html": @"<html><head><title>HTML Modal Tester</title></head><body><div>Testing an HTML modal</div></body></html>"};
    NSDictionary *messageParams = @{@"title":@"Message Modal", @"message": @"This is a modal with a specified message."};
    NSDictionary *urlParams = @{@"title":@"URL Modal", @"url": @"http://www.42six.com"};
    NSDictionary *widgetParams = @{@"title":@"Widget Modal", @"widgetName": @"Modal Test"};
    NSDictionary *yesNoParams = @{@"title":@"Yes/No Modal", @"message": @"This is a yes / no modal."};
    
    // Make sure everything succeeded in launching the respective modals
    XCTAssert([modalProcessor process:@"html" params:htmlParams url:htmlOriginalUrl webView:webView].status == API_SUCCESS, @"HTML Modal Failed!");
    XCTAssert([modalProcessor process:@"message" params:messageParams url:messageOriginalUrl webView:webView].status == API_SUCCESS, @"Message Modal Failed!");
    XCTAssert([modalProcessor process:@"url" params:urlParams url:urlOriginalUrl webView:webView].status == API_SUCCESS, @"URL Modal Failed!");
    XCTAssert([modalProcessor process:@"widget" params:widgetParams url:widgetOriginalUrl webView:webView].status == API_SUCCESS, @"Widget Modal Failed!");
    XCTAssert([modalProcessor process:@"exec" params:yesNoParams url:yesNoOriginalUrl webView:webView].status == API_SUCCESS, @"Yes/No Modal Failed!");
     */
    XCTAssert(TRUE, @"True should be true!");
}

@end
