//
//  XCTestCase+XCTestCaseExt.h
//  Mono
//
//  Created by Ben Scazzero on 5/7/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>

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

@interface XCTestCase (XCTestCaseExt)

- (void) cleanUpUser:(MNOUser*)createdUser inMOC:(NSManagedObjectContext*)moc;

@end
