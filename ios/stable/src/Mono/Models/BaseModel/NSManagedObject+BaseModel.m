//
//  BaseModel.m
//  Mono2
//
//  Created by Michael Wilson on 4/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "NSManagedObject+BaseModel.h"

@implementation NSManagedObject (BaseModel)

+ (id) initWithManagedObjectContext:(NSManagedObjectContext *)moc
{
    return [NSEntityDescription insertNewObjectForEntityForName:[self entityName] inManagedObjectContext:moc];
}

+ (NSString *) entityName {
    return NSStringFromClass([self class]);
}

@end
