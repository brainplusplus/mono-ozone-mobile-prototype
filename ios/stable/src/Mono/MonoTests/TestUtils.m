//
// Created by Michael Schreiber on 4/17/14.
// Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <XCTest/XCTest.h>

#import "TestUtils.h"
#import "MNOAppDelegate.h"
#import "MNOHttpStack.h"
#import "MNOUserDownloadService.h"

#import "OCMock.h"

// Mock MNOHttpStack
static id mockHttpStack = nil;

@implementation MNOHttpStack (Tests)

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wobjc-protocol-method-implementation"
+ (MNOHttpStack *)sharedStack {
    return mockHttpStack;
}
#pragma clang diagnostic pop

@end

@implementation TestUtils

+(void) initTestPersistentStore {
    // Clear out the database
    MNOAppDelegate *appDelegate = [UIApplication sharedApplication].delegate;
    
    NSPersistentStoreCoordinator *coordinator = [[NSPersistentStoreCoordinator alloc] initWithManagedObjectModel:[appDelegate managedObjectModel]];
    
    NSError *error;
    NSPersistentStore *store = [coordinator addPersistentStoreWithType:NSInMemoryStoreType
                                                         configuration:nil
                                                                   URL:nil
                                                               options:nil
                                                                 error:&error];
    
    
    if(store == nil || error != nil) {
        NSLog(@"Error adding persistent store.  Message: %@.", error);
    }

    NSManagedObjectContext *moc = [[NSManagedObjectContext alloc] initWithConcurrencyType:NSPrivateQueueConcurrencyType];
    moc.persistentStoreCoordinator = coordinator;
    [moc reset];
    
    appDelegate.persistentStoreCoordinator = coordinator;
    appDelegate.managedObjectContext = moc;
    [MNOUtil sharedInstance].defaultManagedContext = nil;
}

+ (id)mockResponseFromHttpStack:(id)response contentType:(NSString *)contentType requestType:(MNORequestType)requestType {
    // Mock HTTP stack
    if(mockHttpStack != nil) {
        [mockHttpStack stopMocking];
        mockHttpStack = nil;
    }
    mockHttpStack = [OCMockObject niceMockForClass:[MNOHttpStack class]];
    void (^block)(NSInvocation *) = ^void(NSInvocation *invocation) {
        void (^successBlock)(MNOResponse *operation) = nil;
        
        [invocation getArgument:&successBlock atIndex:4];
        
        MNOResponse *returnResponse = [[MNOResponse alloc] init];
        returnResponse.responseObject = response;
        returnResponse.contentType = contentType;
        
        successBlock(returnResponse);
    };
    
    [[[mockHttpStack stub] andDo:block] makeAsynchronousRequest:requestType url:[OCMArg any] success:[OCMArg any] failure:[OCMArg any]];
    [[[mockHttpStack stub] andReturn:response] makeSynchronousRequest:requestType url:[OCMArg any]];
    
    [[mockHttpStack stub] loadCert:[OCMArg any] password:[OCMArg any]];
    
    return mockHttpStack;
}

+ (id)mockResponseFromHttpStack:(id)response forUrl:(NSString *)url contentType:(NSString *)contentType requestType:(MNORequestType)requestType {
    // Mock HTTP stack
    if(mockHttpStack == nil) {
        mockHttpStack = [OCMockObject niceMockForClass:[MNOHttpStack class]];
    }
    void (^block)(NSInvocation *) = ^void(NSInvocation *invocation) {
        void (^successBlock)(MNOResponse *operation) = nil;
        
        [invocation getArgument:&successBlock atIndex:4];
        
        MNOResponse *returnResponse = [[MNOResponse alloc] init];
        returnResponse.responseObject = response;
        returnResponse.contentType = contentType;
        
        successBlock(returnResponse);
    };
    
    [[[mockHttpStack stub] andDo:block] makeAsynchronousRequest:requestType url:url success:[OCMArg any] failure:[OCMArg any]];
    [[[mockHttpStack stub] andReturn:response] makeSynchronousRequest:requestType url:url];
    [[mockHttpStack stub] loadCert:[OCMArg any] password:[OCMArg any]];
    
    return mockHttpStack;
}

+ (void)stopMockingResponse {
    if(mockHttpStack != nil) {
        [mockHttpStack stopMocking];
        mockHttpStack = nil;
    }
}

+ (void)removePersistenceStore
{
    MNOAppDelegate *appDelegate = [UIApplication sharedApplication].delegate;
    NSPersistentStoreCoordinator * psc = appDelegate.persistentStoreCoordinator;
    assert([psc.persistentStores count] == 1);
    //should only be 1
    NSPersistentStore * ps = [psc.persistentStores firstObject];
    NSError * error = nil;
    assert([psc removePersistentStore:ps error:&error] && !error);
    assert([[psc persistentStores] count] == 0);
  
    // reset values
    appDelegate.managedObjectContext = nil;
    appDelegate.persistentStoreCoordinator = nil;
    [MNOUtil sharedInstance].defaultManagedContext = nil;
}

+ (NSDictionary *) loadJsonFromFile:(NSString*)filename
{
    NSString* path = [ [NSBundle bundleForClass:[self class]] pathForResource:filename
                                                     ofType:@"txt"];
 
    NSString* content = [NSString stringWithContentsOfFile:path
                                                  encoding:NSUTF8StringEncoding
                                                     error:NULL];
    return
    [NSJSONSerialization JSONObjectWithData:[content dataUsingEncoding:NSUTF8StringEncoding]
                                    options: NSJSONReadingMutableContainers
                                      error: nil];
}

@end