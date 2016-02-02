//
//  PersistentCacheManager.h
//  Mono2
//

#import <Foundation/Foundation.h>

@interface MNOPersistentCacheManager : NSObject

//- (NSData *) initalizeObject:(NSString *)data withParams:(NSDictionary *)params;
//- (NSData *) storeObject:(NSString *)url withParams:(NSDictionary *)params;
- (NSData *) retrieveObject:(NSString *)url withParams:(NSDictionary *)params;
- (NSData *) deleteObjectAtIndex:(NSString *)index withParams:(NSDictionary *)params;

+ (MNOPersistentCacheManager *) sharedManager;

@end
