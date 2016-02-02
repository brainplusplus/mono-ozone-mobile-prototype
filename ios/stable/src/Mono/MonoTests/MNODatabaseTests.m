//
//  DatabaseTests.m
//  Mono2
//
//  Created by Michael Wilson on 4/10/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>

#import "MNODatabase.h"
#import "MNODBManager.h"

@interface MNODatabaseTests : XCTestCase

@end

@implementation MNODatabaseTests
{
    MNODatabase *_db;
}

- (void)setUp
{
    [super setUp];
    
    _db = [[MNODatabase alloc] init:@"TestingDB"];
}

- (void)tearDown
{
    // Remove the TestingDB file
    [_db remove];
    
    [super tearDown];
}

- (void)testDatabase
{
    // Create test table
    [_db exec:@"CREATE TABLE Testing (id INTEGER PRIMARY KEY AUTOINCREMENT, bool_field BOOLEAN, int_field INTEGER, real_field REAL, text_field TEXT, blob_field BLOB)" params:nil];
    
    // Create a bunch of test data
    [_db exec:@"INSERT INTO Testing (bool_field, int_field, real_field, text_field, blob_field) values (1, 1, 1.0, 'Some text1', 'A blob1')" params:nil];
    [_db exec:@"INSERT INTO Testing (bool_field, int_field, real_field, text_field, blob_field) values (?, ?, ?, ?, ?)" params:@[@"1", @"2", @"2.0", @"Some text2", @"A blob2"]];
    [_db exec:@"INSERT INTO Testing (bool_field, int_field, real_field, text_field, blob_field) values (1, 3, 3.0, 'Some text3', 'A blob3')" params:nil];
    [_db exec:@"INSERT INTO Testing (bool_field, int_field, real_field, text_field, blob_field) values (?, ?, ?, ?, ?)" params:@[@"1", @"4", @"4.0", @"Some text4", @"A blob4"]];
    
    NSArray *results = [_db query:@"SELECT * FROM Testing" params:nil];
    
    // Verify the results
    XCTAssertEqual([results count], 4, @"Results was the incorrect size coming back from the database.");
    
    int numResults = (int)[results count];
    for(int i=0; i<numResults; i++)
    {
        NSDictionary *result = [results objectAtIndex:i];
        
        if([(NSString *)[result objectForKey:@"id"] isEqual:@"1"] == TRUE)
        {
            XCTAssertEqualObjects([result objectForKey:@"bool_field"], @"1", @"Boolean field for ID 1 should be 1.");
            XCTAssertEqualObjects([result objectForKey:@"int_field"], @"1", @"Integer field for ID 1 should be 1.");
            XCTAssertEqualObjects([result objectForKey:@"real_field"], @"1.0", @"Real field for ID 1 should be 1.00.");
            XCTAssertEqualObjects([result objectForKey:@"text_field"], @"Some text1", @"Text field for ID 1 should be 'Some text1'.");
            XCTAssertEqualObjects([result objectForKey:@"blob_field"], @"A blob1", @"Blob field for ID 1 should be 'A blob1'.");
        }
        else if([(NSString *)[result objectForKey:@"id"] isEqual:@"2"] == TRUE)
        {
            XCTAssertEqualObjects([result objectForKey:@"bool_field"], @"1", @"Boolean field for ID 2 should be 1.");
            XCTAssertEqualObjects([result objectForKey:@"int_field"], @"2", @"Integer field for ID 2 should be 2.");
            XCTAssertEqualObjects([result objectForKey:@"real_field"], @"2.0", @"Real field for ID 2 should be 2.00.");
            XCTAssertEqualObjects([result objectForKey:@"text_field"], @"Some text2", @"Text field for ID 2 should be 'Some text2'.");
            XCTAssertEqualObjects([result objectForKey:@"blob_field"], @"A blob2", @"Blob field for ID 2 should be 'A blob2'.");
        }
        else if([(NSString *)[result objectForKey:@"id"] isEqual:@"3"] == TRUE)
        {
            XCTAssertEqualObjects([result objectForKey:@"bool_field"], @"1", @"Boolean field for ID 3 should be 1.");
            XCTAssertEqualObjects([result objectForKey:@"int_field"], @"3", @"Integer field for ID 3 should be 3.");
            XCTAssertEqualObjects([result objectForKey:@"real_field"], @"3.0", @"Real field for ID 3 should be 3.00.");
            XCTAssertEqualObjects([result objectForKey:@"text_field"], @"Some text3", @"Text field for ID 3 should be 'Some text3'.");
            XCTAssertEqualObjects([result objectForKey:@"blob_field"], @"A blob3", @"Blob field for ID 3 should be 'A blob3'.");
        }
        else if([(NSString *)[result objectForKey:@"id"] isEqual:@"4"] == TRUE)
        {
            XCTAssertEqualObjects([result objectForKey:@"bool_field"], @"1", @"Boolean field for ID 4 should be 1.");
            XCTAssertEqualObjects([result objectForKey:@"int_field"], @"4", @"Integer field for ID 4 should be 4.");
            XCTAssertEqualObjects([result objectForKey:@"real_field"], @"4.0", @"Real field for ID 4 should be 4.00.");
            XCTAssertEqualObjects([result objectForKey:@"text_field"], @"Some text4", @"Text field for ID 3 should be 'Some text4'.");
            XCTAssertEqualObjects([result objectForKey:@"blob_field"], @"A blob4", @"Blob field for ID 4 should be 'A blob4'.");
        }
    }
    
    // Make parameters for parameter testing
    NSMutableArray *params = [[NSMutableArray alloc] initWithObjects:@"3", @"1", @"3", @"3.00", @"Some text3", nil];
    
    NSString *paramQuery = @"SELECT * FROM Testing WHERE id = ? AND bool_field = ? AND int_field = ? AND real_field = ? AND text_field = ?";
    
    NSArray *paramResults = [_db query:paramQuery params:params];
    
    XCTAssertEqual([paramResults count], 1, @"Param query should only have 1 element.");
}

- (void) testDBManager
{
    MNODBManager *dbManager = [MNODBManager sharedInstance];
    
    MNODatabase *testDb1 = [dbManager getDatabaseWithWidgetId:@"TestingDb1"];
    MNODatabase *testDb2 = [dbManager getDatabaseWithWidgetId:@"TestingDb2"];
    
    // Want to do a regular assert -- making sure the two memory addresses are equal
    XCTAssertEqual(testDb1, [dbManager getDatabaseWithWidgetId:@"TestingDb1"], @"testDb1's second retrieval should have the same memory address as the first");
    XCTAssertEqual(testDb2, [dbManager getDatabaseWithWidgetId:@"TestingDb2"], @"testDb2's second retrieval should have the same memory address as the first");
    
    // Cleanup
    [testDb1 remove];
    [testDb2 remove];
}

@end
