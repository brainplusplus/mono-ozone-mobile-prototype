//
//  AppDelegate.m
//  foo
//
//  Created by Ben Scazzero on 12/16/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import "AppDelegate.h"
#import "ProtocolManager.h"
#import "BatteryManager.h"
#import "NSURLCacheManager.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    [NSURLProtocol registerClass:[ProtocolManager class]];
    [NSURLCache setSharedURLCache:[[NSURLCacheManager alloc] init]];
    int cacheSizeMemory = 4*1024*1024; // 4MB
    int cacheSizeDisk = 32*1024*1024; // 32MB
  //  NSURLCache *sharedCache = [[NSURLCache alloc] initWithMemoryCapacity:cacheSizeMemory diskCapacity:cacheSizeDisk diskPath:@"nsurlcache"];
  //  [NSURLCache setSharedURLCache:sharedCache];
  
    //Init Managers
    
    // Override point for customization after application launch.
    NSLog(@"%lu", (unsigned long)[[NSURLCache sharedURLCache] diskCapacity]);
    NSLog(@"%lu", (unsigned long)[[NSURLCache sharedURLCache] memoryCapacity]);
   // [NSLog[(@"%lu", (unsigned long) )
    NSCache * cache = [[NSCache alloc] init];
    NSLog(@"%lu",(unsigned long)[cache countLimit]);
    NSLog(@"%lu", (unsigned long)[cache totalCostLimit]);
    return YES;
}
							
- (void)applicationWillResignActive:(UIApplication *)application
{
    // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
    // Use this method to pause ongoing tasks, disable timers, and throttle down OpenGL ES frame rates. Games should use this method to pause the game.
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
    // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later. 
    // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    [[UIApplication sharedApplication] performSelector:@selector(_performMemoryWarning)];
}

- (void)applicationWillEnterForeground:(UIApplication *)application
{
    // Called as part of the transition from the background to the inactive state; here you can undo many of the changes made on entering the background.
}

- (void)applicationDidBecomeActive:(UIApplication *)application
{
    // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
}

- (void)applicationWillTerminate:(UIApplication *)application
{
    // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
}

- (void)applicationDidReceiveMemoryWarning:(UIApplication *)application
{
    NSLog(@"Recieved Memory Warning!!");
    NSFileManager *fileMgr = [NSFileManager defaultManager];
    NSString *cachesPath = [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) lastObject];
    
    NSArray *fileArray = [fileMgr contentsOfDirectoryAtPath:cachesPath error:nil];
    for (NSString *filename in fileArray)  {
        
        [fileMgr removeItemAtPath:[cachesPath stringByAppendingPathComponent:filename] error:NULL];
    }
}

@end
