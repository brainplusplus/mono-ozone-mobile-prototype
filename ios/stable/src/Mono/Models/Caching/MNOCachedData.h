//
//  MNOCachedData.h
//  Pods
//
//  Created by Ben Scazzero on 6/24/14.
//
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class MNOWidget;

@interface MNOCachedData : NSManagedObject

@property (nonatomic, retain) NSString * contentType;
@property (nonatomic, retain) NSData * data;
@property (nonatomic, retain) NSDate * dateCreated;
@property (nonatomic, retain) NSString * eTag;
@property (nonatomic, retain) NSNumber * expirationTime;
@property (nonatomic, retain) NSNumber * refreshTime;
@property (nonatomic, retain) NSString * url;
@property (nonatomic, retain) NSDate * expirationDate;
@property (nonatomic, retain) NSDate * refreshDate;
@property (nonatomic, retain) MNOWidget *belongsTo;

@end
