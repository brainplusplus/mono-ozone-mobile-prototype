//
//  MNOLoginInfo.h
//  Mono
//
//  Created by Michael Wilson on 5/29/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>


@interface MNOLoginInfo : NSManagedObject

@property (nonatomic, retain) NSString * server;
@property (nonatomic, retain) NSString * certName;
@property (nonatomic, retain) NSData * certData;

@end
