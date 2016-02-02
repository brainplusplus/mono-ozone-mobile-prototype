//
//  RequestRouterTests.m
//  Mono2
//
//  Created by Michael Wilson on 4/8/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>

#import "MNOAPITypeAndMethod.h"
#import "MNODBManager.h"
#import "MNORouteRequestManager.h"
#import "UIWebView+OzoneWebView.h"

@interface MNORequestRouterTests : XCTestCase

@end

@interface MNORouteRequestManager (RequestRouterTest)

- (MNOAPITypeAndMethod *) parseAPICall:(NSURLRequest *) request;
- (NSDictionary *) extractParamsFromRequest:(NSURLRequest *)request;

@end

@implementation MNORequestRouterTests

- (void)setUp
{
    [super setUp];
    // Put setup code here. This method is called before the invocation of each test method in the class.
    // Set up base URL
    [[MNOAccountManager sharedManager] setWidgetBaseUrl:@"http://blah.com"];
}

- (void)tearDown
{
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}

- (void)testApiParsing
{
    // Create some dummy requests
    MNORouteRequestManager *router = [MNORouteRequestManager sharedInstance];
    NSURLRequest *request1 = [[NSURLRequest alloc] initWithURL:[[NSURL alloc] initWithString:@"https://www.test.com/ozone.gov/action/method"]];
    NSURLRequest *request2 = [[NSURLRequest alloc] initWithURL:[[NSURL alloc] initWithString:@"https://www.test.com/ozone.gov/action/method?some=get&params=true"]];
    NSURLRequest *request3 = [[NSURLRequest alloc] initWithURL:[[NSURL alloc] initWithString:@"https://www.test.com/ozone.gov/action/is/long/method?some=get&params=true"]];
    NSURLRequest *request4 = [[NSURLRequest alloc] initWithURL:[[NSURL alloc] initWithString:@"https://www.test.com/not/a/method"]];
    
    // Parse out the requests
    MNOAPITypeAndMethod *atam1 = [router parseAPICall:request1];
    MNOAPITypeAndMethod *atam2 = [router parseAPICall:request2];
    MNOAPITypeAndMethod *atam3 = [router parseAPICall:request3];
    MNOAPITypeAndMethod *atam4 = [router parseAPICall:request4];
    
    // Make sure the first three requests are parsed out properly
    XCTAssertEqualObjects(@"action", atam1.apiType, @"API types do not match.");
    XCTAssertEqualObjects(@"method", atam1.method, @"Methods do not match.");
    
    XCTAssertEqualObjects(@"action", atam2.apiType, @"API types do not match.");
    XCTAssertEqualObjects(@"method", atam2.method, @"Methods do not match.");
    
    XCTAssertEqualObjects(@"action/is/long", atam3.apiType, @"API types do not match.");
    XCTAssertEqualObjects(@"method", atam3.method, @"Methods do not match.");
    
    // Make sure the fourth request is nil
    XCTAssert(atam4 == nil, @"atam4 should be nil.");
}

- (void)testExtractParams
{
    MNORouteRequestManager *router = [MNORouteRequestManager sharedInstance];
    
    // Make some dummy URLs to test
    NSURL *url1 = [[NSURL alloc] initWithString:@"https://www.test.com/ozone.gov/action/method"];
    NSURL *url2 = [[NSURL alloc] initWithString:@"https://www.test.com/ozone.gov/action/is/long/method?%7B%22JSON%22:+%22stapled%22,+%22on%22:+%22this%22%7D"];
    
    // Make some dummy requests
    NSURLRequest *request1 = [[NSURLRequest alloc] initWithURL:url1];
    NSURLRequest *request2 = [[NSURLRequest alloc] initWithURL:url2];
    
    // Make sure the requests are parsed out correctly
    NSDictionary *dict1 = [router extractParamsFromRequest:request1];
    XCTAssertEqual(0, [dict1 count], @"Dictionaries are not the same size.");
    
    NSDictionary *dict2 = [router extractParamsFromRequest:request2];
    XCTAssertEqual(2, [dict2 count], @"Dictionaries are not the same size.");
}

- (void) testPubsubRouting
{
    MNORouteRequestManager *router = [MNORouteRequestManager sharedInstance];
    
    // Make some dummy URLs
    NSURL *url1 = [[NSURL alloc] initWithString:@"https://www.test.com/ozone.gov/pubsub/publish?"
                                                 "%7B%22channelName%22:+%22test%22,+%22data%22:+%22test%22,"
                                                 "%22instanceId%22:+%22test%22%7D"];
    NSURL *url2 = [[NSURL alloc] initWithString:@"https://www.test.com/ozone.gov/pubsub/subscribe?"
                                                 "%7B%22channelName%22:+%22test%22,+%22functionCallback%22:+%22test%22,"
                                                 "%22instanceId%22:+%22test%22%7D"];
    
    UIWebView *webView = [[UIWebView alloc] init];
    [webView initPropertiesWithURL:@"anystring" widgetId:@"someId" instanceId:@"test"];
    
    NSURLRequest *request1 = [[NSURLRequest alloc] initWithURL:url1];
    NSURLRequest *request2 = [[NSURLRequest alloc] initWithURL:url2];
    
    NSData *response1 = [router routeRequest:request1];
    NSData *response2 = [router routeRequest:request2];
    
    [self validateSuccess:response1];
    [self validateSuccess:response2];
}

- (void) testPersistentStorageRouting
{
    MNORouteRequestManager *router = [MNORouteRequestManager sharedInstance];
    UIWebView *webView = [[UIWebView alloc] init];
    NSString *widgetGuid = @"Persistent Storage Testing Widget";
    
    [[[MNODBManager sharedInstance] getDatabaseWithWidgetId:widgetGuid] remove];
    
    [webView initPropertiesWithURL:@"http://www.test.com" widgetId:widgetGuid];
    
    NSString *instanceId = webView.instanceId;
    
    // Make some dummy URLs
    NSURL *url1 = [[NSURL alloc] initWithString:[NSString stringWithFormat:
                                                 @"https://www.test.com/ozone.gov/storage/persistent/exec?"
                                                  "%%7B%%22instanceId%%22:%%22%@%%22,"
                                                  "%%22query%%22:+%%22CREATE+TABLE+test+(id+INTEGER+PRIMARY+KEY+AUTOINCREMENT,+desc+TEXT)%%22%%7D",
                                                 instanceId]];
    NSURL *url2 = [[NSURL alloc] initWithString:[NSString stringWithFormat:
                                                 @"https://www.test.com/ozone.gov/storage/persistent/exec?"
                                                  "%%7B%%22instanceId%%22:%%22%@%%22,"
                                                  "%%22query%%22:+%%22INSERT+INTO+test+(desc)+VALUES+('test')%%22%%7D",
                                                 instanceId]];
    NSURL *url3 = [[NSURL alloc] initWithString:[NSString stringWithFormat:
                                                @"https://www.test.com/ozone.gov/storage/persistent/query?"
                                                 "%%7B%%22instanceId%%22:%%22%@%%22,"
                                                 "%%22query%%22:+%%22SELECT+*+FROM+test%%22%%7D",
                                                 instanceId]];
    
    NSURLRequest *request1 = [[NSURLRequest alloc] initWithURL:url1];
    NSURLRequest *request2 = [[NSURLRequest alloc] initWithURL:url2];
    NSURLRequest *request3 = [[NSURLRequest alloc] initWithURL:url3];
    
    NSData *response1 = [router routeRequest:request1];
    NSData *response2 = [router routeRequest:request2];
    NSData *response3 = [router routeRequest:request3];
    
    [self validateSuccess:response1];
    [self validateSuccess:response2];
    [self validateSuccess:response3];
}

- (void) validateSuccess:(NSData *)data
{
    NSError *error;
    NSDictionary *responseDictionary = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    
    if(error)
    {
        XCTFail(@"Error encountered by JSON deserialization!  Message: %@.", error.description);
    }
    
    XCTAssertEqualObjects([responseDictionary valueForKey:@"status"], @"success", @"Status failure for response!");
}

@end
