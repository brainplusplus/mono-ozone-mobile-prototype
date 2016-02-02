//
// Created by Michael Schreiber on 4/17/14.
// Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "MNOHttpStack.h"

@interface TestUtils : NSObject
+(void) initTestPersistentStore;
+ (id)mockResponseFromHttpStack:(id)response contentType:(NSString *)contentType requestType:(MNORequestType)requestType;
+ (id)mockResponseFromHttpStack:(id)response forUrl:(NSString *)url contentType:(NSString *)contentType requestType:(MNORequestType)requestType;
+ (void)removePersistenceStore;
+ (void)stopMockingResponse;
+ (NSDictionary *) loadJsonFromFile:(NSString*)filename;
@end