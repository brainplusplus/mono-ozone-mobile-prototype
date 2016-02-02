//
//  BaseModel.h
//  Mono2
//
//  Created by Michael Wilson on 4/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface NSManagedObject (BaseModel)

+ (id) initWithManagedObjectContext:(NSManagedObjectContext *)moc;

+ (NSString *) entityName;

@end
