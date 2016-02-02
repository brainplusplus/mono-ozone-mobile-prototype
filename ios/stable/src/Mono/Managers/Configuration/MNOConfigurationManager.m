//
//  MNOConfigurationManager.m
//  Mono
//
//  Created by Corey Herbert on 5/15/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOConfigurationManager.h"

@implementation MNOConfigurationManager

NSDictionary* configuration;

+ (MNOConfigurationManager *) sharedInstance {
    static MNOConfigurationManager * sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[self alloc] init];
    });
    
    return sharedInstance;
}


#pragma mark constructors

- (id) init {
    NSString *path = [[NSBundle mainBundle] pathForResource:@"Server" ofType:@"plist"];
    configuration = [[NSDictionary alloc] initWithContentsOfFile:path];
    return self;
}

#pragma mark public methods

- (NSString*) forKey:(NSString*)key{
    return [configuration objectForKey:key];
}


@end
