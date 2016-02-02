//
//  MNOOpenAMAuthenticationManagerTests.m
//  Mono
//
//  Created by Jason Lettman on 5/16/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>

#import "MNOOpenAMAuthenticationManager.h"

@interface MNOOpenAMAuthenticationManagerTests : XCTestCase {
    @private
    NSURL *openAmOWFServer;
    NSData *accessValidationPage;
    NSString *openAMOWFServerString;
}

@end

@implementation MNOOpenAMAuthenticationManagerTests

- (void)setUp {
    [super setUp];
    // Put setup code here. This method is called before the invocation of each test method in the class.
    openAMOWFServerString = @"https://monoval-sp.42six.com:8443/owf/";
    openAmOWFServer = [[NSURL alloc] initWithString:openAMOWFServerString];
    NSString *validatedPageString = @"<html><head><title>Access rights validated</title></head><body onload=\"document.forms[0].submit()\"><form method=\"post\" action=\"&#x2f;fedlet&#x2f;fedletapplication\"><input type=\"hidden\" name=\"SAMLResponse\" value=\"PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6&#xd;&#xa;\" /><noscript><center><input type=\"submit\" value=\"Submit SAMLResponse data \" /></center></noscript></form></body></html>";
    accessValidationPage = [validatedPageString dataUsingEncoding:NSUTF8StringEncoding];
}

- (void)tearDown {
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    [super tearDown];
}

- (void)testAuthenticateIfNecessaryTrue {
    NSURLRequest *openAMRequest = [MNOOpenAMAuthenticationManager authenticateIfRequired:openAmOWFServer withResponse:accessValidationPage];
    XCTAssert(openAMRequest != nil, @"Open AM request should not be nil");
    
    if(openAMRequest) {
        NSString *requestURLString = [[openAMRequest URL] absoluteString];
        XCTAssert([requestURLString isEqualToString:@"https://monoval-sp.42six.com:8443/fedlet/fedletapplication"], @"Open AM request URL is incorrect");
    }
}

- (void)testAuthenticateIfNecessaryFalse {
    NSString *casServerResponseString = @"{\"currentUserName\":\"bscazzero\",\"currentUser\":\"Ben Scazzero\",\"currentUserPrevLogin\":\"2014-04-16T21:17:58Z\",\"currentId\":30}";
    NSData *casServerResponse = [casServerResponseString dataUsingEncoding:NSUTF8StringEncoding];
    
    NSURLRequest *openAMRequestCAS = [MNOOpenAMAuthenticationManager authenticateIfRequired:openAmOWFServer withResponse:casServerResponse];
    XCTAssert(openAMRequestCAS == nil, @"Open AM request should be nil");
    
    NSURLRequest *openAMRequestNil = [MNOOpenAMAuthenticationManager authenticateIfRequired:openAmOWFServer withResponse:nil];
    XCTAssert(openAMRequestNil == nil, @"Open AM request should be nil");
}
@end
