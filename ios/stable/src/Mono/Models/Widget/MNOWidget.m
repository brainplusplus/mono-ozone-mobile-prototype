//
//  Widget.m
//  Mono2
//
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOWidget.h"
#import "MNODashboard.h"
#import "MNOIntentSubscriberSaved.h"
#import "MNOUser.h"


@implementation MNOWidget

@dynamic descript;
@dynamic headerIconUrl;
@dynamic imageUrl;
@dynamic largeIconUrl;
@dynamic mobileReady;
@dynamic name;
@dynamic original;
@dynamic smallIconUrl;
@dynamic url;
@dynamic widgetId;
@dynamic isDefault;
@dynamic instanceId;
@dynamic dashboard;
@dynamic intentRegister;
@dynamic user;
@dynamic appsMall;

+(NSManagedObject *) clone:(NSManagedObject *)source inContext:(NSManagedObjectContext *)context{
    NSString *entityName = [[source entity] name];
    
    //create new object in data store
    MNOWidget *cloned = [NSEntityDescription
                               insertNewObjectForEntityForName:entityName
                               inManagedObjectContext:context];
    
    
    //loop through all attributes and assign then to the clone
    NSDictionary *attributes = [[NSEntityDescription
                                 entityForName:entityName
                                 inManagedObjectContext:context] attributesByName];
    
    for (NSString *attr in attributes) {
        [cloned setValue:[source valueForKey:attr] forKey:attr];
    }
    
    //Loop through all relationships, and clone them.
    NSDictionary *relationships = [[NSEntityDescription
                                    entityForName:entityName
                                    inManagedObjectContext:context] relationshipsByName];
    for (NSRelationshipDescription *rel in relationships){
        NSString *keyName = [NSString stringWithFormat:@"%@",rel];
        //get a set of all objects in the relationship
        if ([keyName isEqualToString:@"dashboard"] ||
            [keyName isEqualToString:@"user"] ||
            [keyName isEqualToString:@"autoSendIntent"] ||
            [keyName isEqualToString:@"autoReceiveIntent"] ||
            [keyName isEqualToString:@"widget"]  ||
            [keyName isEqualToString:@"appsMall"] ||
            [keyName isEqualToString:@"cacheData"])
            continue;
        
        NSMutableSet *sourceSet = [source mutableSetValueForKey:keyName];
        NSMutableSet *clonedSet = [cloned mutableSetValueForKey:keyName];
        NSEnumerator *e = [sourceSet objectEnumerator];
        NSManagedObject *relatedObject;
        while ( relatedObject = [e nextObject]){
            //Clone it, and add clone to set
            NSManagedObject *clonedRelatedObject = [MNOWidget clone:relatedObject
                                                                    inContext:context];
            [clonedSet addObject:clonedRelatedObject];
        }
        
    }
    
    return cloned;
}

@end
