//
//  AggressiveCacheTests.m
//  Mono
//
//  Created by Ben Scazzero on 4/29/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>

#import "MNOAggressiveCacheDelegateTest.h"
#import "MNONetworkWrapperProtocol.h"
#import "MNOProtocolManager.h"

#import "MNOHttpStack.h"

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

@interface AggressiveCacheTests : XCTestCase

@end

@implementation AggressiveCacheTests

- (void)setUp
{
    [super setUp];
    // Put setup code here. This method is called before the invocation of each test method in the class.
    
    [NSURLProtocol registerClass:[MNONetworkWrapperProtocol class]];
    [NSURLProtocol registerClass:[MNOProtocolManager class]];
    
    NSString *userCert = @"bscazzero.p12";
    
    NSString * identityPath =
    [[NSBundle mainBundle] pathForResource:[userCert stringByDeletingPathExtension] ofType:[userCert pathExtension]];
    
    [[MNOHttpStack sharedStack] loadCert:identityPath];
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
    //Try to log in using these settings:
    [MNOAccountManager sharedManager].p12Name = @"iosTestUser.p12";
    [MNOAccountManager sharedManager].serverCert = @"monoval.der";
    [MNOAccountManager sharedManager].widgetBaseUrl = @"https://monoval.42six.com:8443/";
    [MNOAccountManager sharedManager].serverBaseUrl = @"https://monoval.42six.com:8443/owf";
    
    // Extract User Info
    NSManagedObjectContext * moc = [[MNOUtil sharedInstance] defaultManagedContext];
    MNOWidget * widget = [MNOWidget initWithManagedObjectContext:moc];
    widget.name = @"Watchboard";
    widget.url = @"https://monoval.42six.com:8443/presentationGrails/watchboard";
    [moc save:nil];
    
    [MNOAccountManager sharedManager].defaultWidgets = @[widget];
    
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

- (void)tearDown
{
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}

@end
