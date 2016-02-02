//
//  RNCachedData.h
//  foo
//
//  Created by Ben Scazzero on 1/14/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface RNCachedData : NSObject <NSCoding>
@property (nonatomic, readwrite, strong) NSData *data;
@property (nonatomic, readwrite, strong) NSURLResponse *response;
@property (nonatomic, readwrite, strong) NSURLRequest *redirectRequest;
@end
