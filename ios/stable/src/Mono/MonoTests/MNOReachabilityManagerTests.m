//
//  MNOReachabilityManagerTests.m
//  Mono
//
//  Created by Michael Wilson on 5/20/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>

#import "MNOReachabilityManager.h"

#import "MNOWidgetManager.h"

#import "AFNetworkReachabilityManager.h"
#import "OCMock.h"
#import "XCTestCase+XCTestCaseExt.h"

typedef void (^AFNetworkReachabilityStatusBlock)(AFNetworkReachabilityStatus status);

@interface AFNetworkReachabilityManager (Tests)

@property (readwrite, nonatomic, copy) AFNetworkReachabilityStatusBlock networkReachabilityStatusBlock;

@end

@interface MNOReachabilityManager (Tests)

- (void)useThisReachabilityManager:(id)reachabilityManager;
- (void(^)(AFNetworkReachabilityStatus status))getBlock;

@end

@interface MNOReachabilityManagerTests : XCTestCase

@end

@implementation MNOReachabilityManagerTests

- (void)setUp
{
    [super setUp];
    // Put setup code here. This method is called before the invocation of each test method in the class.
}

- (void)tearDown
{
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}

- (void)testIsOnline
{
    MNOReachabilityManager *manager = [MNOReachabilityManager sharedInstance];
    
    // Set up mocked returns
    [self setUpMockManager:TRUE];
    
    XCTAssert([manager isOnline] == TRUE, @"isOnline should have been true!");
    
    [self setUpMockManager:FALSE];
    
    XCTAssert([manager isOnline] == FALSE, @"isOnline should have been false!");
}

- (void)testNotification {
    MNOReachabilityManager *reachabilityManager = [MNOReachabilityManager sharedInstance];
    
    AFNetworkReachabilityManager *afManager = [self setUpMockManager:FALSE];
    
    [MNOAccountManager sharedManager].widgetBaseUrl = @"https://www.blah.com";
    UIWebView *webView = [[UIWebView alloc] init];
    [webView initPropertiesWithURL:@"http://www.blah.com" widgetId:@"reachabilityWebView"];
    id webViewMock = [OCMockObject partialMockForObject:webView];
    
    [reachabilityManager registerCallback:webView.instanceId withJSAction:@"dummy"];
    
    __block NSString *jsArg;
    [[[webViewMock stub] andDo:^(NSInvocation *invocation) {
        [invocation getArgument:&jsArg atIndex:2];
        
        NSLog(@"Executed stub!  Javascript that would have been executed: %@", jsArg);
        
    }] stringByEvaluatingJavaScriptFromString:[OCMArg any]];
    
    MNOWidgetManager *widgetManager = [MNOWidgetManager sharedManager];
    [widgetManager registerWidget:webViewMock withInstanceId:webView.instanceId];
    
    [afManager startMonitoring];
    
    NSString *expectedJs = @"Mono.Callbacks.Callback('dummy', [{\"status\":\"success\",\"isOnline\":false,\"message\":\"\"}]);";
    XCTAssert([expectedJs isEqualToString:jsArg], @"JS strings do not match!");
}

#pragma mark - private methods

- (id)setUpMockManager:(BOOL)reachable {
    // Create the mocked manager
    id mockReachabilityManager = [OCMockObject mockForClass:[AFNetworkReachabilityManager class]];
    
    [[[mockReachabilityManager stub] andReturnValue:OCMOCK_VALUE(reachable)] isReachable];
    [[MNOReachabilityManager sharedInstance] useThisReachabilityManager:mockReachabilityManager];
    
    // We're going to use start monitoring to automatically trigger the change block for these tests
    [[[mockReachabilityManager stub] andDo:^(NSInvocation *invocation) {
        [[MNOReachabilityManager sharedInstance] getBlock](AFNetworkReachabilityStatusNotReachable);
    }] startMonitoring];
    
    return mockReachabilityManager;
}
                                
@end
