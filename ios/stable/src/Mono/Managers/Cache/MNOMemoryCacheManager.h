//
//  MemoryCacheManager.h
//  Mono2
//

#import <Foundation/Foundation.h>

@interface MemoryCacheManager : NSObject

- (NSData *) setObject:(id<NSCoding>)item withParams:(NSDictionary *)params;
- (NSData *) deleteObjectAtIndex:(NSString *)index withParams:(NSDictionary *)params;
- (NSData *) retrieveObject:(NSString *)index withParams:(NSDictionary *)params;
- (NSData *) updateObject:(id<NSCoding>)object atIndex:(NSString *)index withParams:(NSDictionary *)params;

+ (MemoryCacheManager *) sharedManager;

@end
