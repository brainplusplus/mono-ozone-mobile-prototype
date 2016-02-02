//
//  AggressiveCacheTests.m
//  Mono2
//
//  Created by Ben Scazzero on 4/28/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>
#import "MNOAggressiveCacheDelegateTest.h"
#import "MNONetworkWrapperProtocol.h"
#import "MNOProtocolManager.h"
#import "MNOHttpStack.h"
#import "MNOUserDownloadService.h"
#import "TestUtils.h"
#import "XCTestCase+XCTestCaseExt.h"

@interface MNOAggressiveCacheTests : XCTestCase

@end

@implementation MNOAggressiveCacheTests

- (void)setUp
{
    [super setUp];
    
    [TestUtils initTestPersistentStore];
    
    [self loadUser];
}

/* Test New Utility Method */
- (void) testURLUtilityRelativeBaseNoPath0
{
    [MNOAccountManager sharedManager].widgetBaseUrl = @"https://monoval.42six.com:8443";

    NSString * test1 = @"/location/to/my/widget";
    // Format the url with the corret schema and host
    NSString * formattedTest1 = [[MNOUtil sharedInstance] formatURLString:test1 withPath:nil];
    NSURL * formattedURL = [NSURL URLWithString:formattedTest1];
    
    NSString * baseURL = [MNOAccountManager sharedManager].widgetBaseUrl;
    NSURL * compare = [NSURL URLWithString:baseURL];
    XCTAssertTrue([formattedURL.host isEqualToString:compare.host], @"Compare Hosts");
    XCTAssertTrue([formattedURL.scheme isEqualToString:compare.scheme], @"Compare Scheme");
    XCTAssertTrue([formattedURL.path isEqualToString:@"/owf/location/to/my/widget"], @"Compare Path");
}

- (void) testURLUtilityRelativeBaseNoPath1
{
    [MNOAccountManager sharedManager].widgetBaseUrl = @"https://monoval.42six.com:8443";

    NSString * test1 = @"../location/to/my/widget";
    // Format the url with the corret schema and host
    NSString * formattedTest1 = [[MNOUtil sharedInstance] formatURLString:test1 withPath:nil];
    NSURL * formattedURL = [NSURL URLWithString:formattedTest1];
    
    NSString * baseURL = [MNOAccountManager sharedManager].widgetBaseUrl;
    NSURL * compare = [NSURL URLWithString:baseURL];
    XCTAssertTrue([formattedURL.host isEqualToString:compare.host], @"Compare Hosts");
    XCTAssertTrue([formattedURL.scheme isEqualToString:compare.scheme], @"Compare Scheme");
    XCTAssertTrue([formattedURL.path isEqualToString:@"/owf/location/to/my/widget"], @"Compare Path");
}

- (void) testURLUtilityRelativeBaseWithPath0
{
    [MNOAccountManager sharedManager].widgetBaseUrl = @"https://monoval.42six.com:8443";

    NSString * test1 = @"/location/to/my/widget";
    NSString * addedPath = @"../cache/manifest";
    NSString * formattedTest1 = [[MNOUtil sharedInstance] formatURLString:test1 withPath:addedPath];
    NSURL * formattedURL = [NSURL URLWithString:formattedTest1];
    
    NSString * baseURL = [MNOAccountManager sharedManager].widgetBaseUrl;
    NSURL * compare = [NSURL URLWithString:baseURL];
    
    XCTAssertTrue([formattedURL.host isEqualToString:compare.host], @"Compare Hosts");
    XCTAssertTrue([formattedURL.scheme isEqualToString:compare.scheme], @"Compare Scheme");
    XCTAssertTrue([formattedURL.path isEqualToString:@"/owf/location/to/my/widget/cache/manifest"], @"Compare Path");
}

- (void) testURLUtilityRelativeBaseWithPath1
{
    [MNOAccountManager sharedManager].widgetBaseUrl = @"https://monoval.42six.com:8443";

    NSString * test1 = @"/location/to/my/widget";
    NSString * addedPath = @"/cache/manifest";
    NSString * formattedTest1 = [[MNOUtil sharedInstance] formatURLString:test1 withPath:addedPath];
    NSURL * formattedURL = [NSURL URLWithString:formattedTest1];
    
    NSString * baseURL = [MNOAccountManager sharedManager].widgetBaseUrl;
    NSURL * compare = [NSURL URLWithString:baseURL];
    
    XCTAssertTrue([formattedURL.host isEqualToString:compare.host], @"Compare Hosts");
    XCTAssertTrue([formattedURL.scheme isEqualToString:compare.scheme], @"Compare Scheme");
    XCTAssertTrue([formattedURL.path isEqualToString:@"/owf/location/to/my/widget/cache/manifest"], @"Compare Path");
}

/* Test Offline Caching */
- (void) testAggressiveCache
{
    StartBlock();
    
    NSURL *widgetUrl = [NSURL URLWithString:@"https://monoval.42six.com:8443/presentationGrails/watchboard/?mobile=true&usePrefix=false"];
    NSURL *manifestUrl = [NSURL URLWithString:@"config/cache.manifest" relativeToURL:widgetUrl];
    NSURL *imageUrl = [NSURL URLWithString:@"image.jpg" relativeToURL:manifestUrl];
    
    // Extract User Info
    NSManagedObjectContext * moc = [[MNOUtil sharedInstance] defaultManagedContext];
    MNOWidget * widget = [MNOWidget initWithManagedObjectContext:moc];
    widget.name = @"Watchboard";
    widget.url = @"https://monoval.42six.com:8443/presentationGrails/watchboard/";
    [moc save:nil];
    
    [MNOAccountManager sharedManager].defaultWidgets = @[widget];

    [TestUtils mockResponseFromHttpStack:[@"<html manifest=\"config/cache.manifest\"><head></head><body></body></html>" dataUsingEncoding:NSUTF8StringEncoding] forUrl:[widgetUrl absoluteString] contentType:@"text/html" requestType:REQUEST_RAW];
    [TestUtils mockResponseFromHttpStack:[@"CACHE MANIFEST\nimage.jpg" dataUsingEncoding:NSUTF8StringEncoding] forUrl:[manifestUrl absoluteString] contentType:@"text/html" requestType:REQUEST_RAW];
    [TestUtils mockResponseFromHttpStack:UIImagePNGRepresentation([UIImage imageNamed:@"bkg_stripe_dark.png"]) forUrl:[imageUrl absoluteString] contentType:@"image/png" requestType:REQUEST_RAW];
    
    MNOAggressiveCacheDelegateTest * cacher = [[MNOAggressiveCacheDelegateTest alloc] init];
    [cacher startAggressiveCache:^(BOOL success) {
        if (!success) {
            XCTFail("Unable to cache widget offline");
        }
        
        [moc deleteObject:widget];
        [moc save:nil];
        [MNOAccountManager sharedManager].defaultWidgets = nil;
        
        EndBlock();
    }];
    
    WaitUntilBlockCompletes();
}

- (void) loadUser
{
    NSMutableDictionary *mockJson = [[TestUtils loadJsonFromFile:@"whoami"] mutableCopy];
    MNOUserDownloadService *service = [[MNOUserDownloadService alloc] initWithManagedObjectContext:[[MNOUtil sharedInstance] defaultManagedContext]];
    
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"group"]];
    [mockJson addEntriesFromDictionary:[TestUtils loadJsonFromFile:@"widgetList"]];
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

- (void)tearDown
{
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}

@end
