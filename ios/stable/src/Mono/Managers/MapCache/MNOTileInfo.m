//
//  MNOTileInfo.m
//  Mono
//
//  Created by Michael Wilson on 4/24/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOTileInfo.h"

@implementation MNOTileInfo

#pragma mark constructors

- (id) init:(int)x y:(int)y zoom:(int)zoom tileType:(MNOTileType)tileType {
    if(self = [super init]) {
        self.x = [[NSNumber alloc] initWithInt:x];
        self.y = [[NSNumber alloc] initWithInt:y];
        self.zoom = [[NSNumber alloc] initWithInt:zoom];
        self.tileType = tileType;
    }
    
    return self;
}

#pragma mark - custom properties

- (NSString *) tileHash {
    NSMutableString *hash = [[NSMutableString alloc] initWithFormat:@"%d,%d,%d",
                             [self.zoom intValue], [self.x intValue], [self.y intValue]];
    if(self.tileType == AERIAL) {
        [hash appendString:@",AERIAL"];
    }
    
    return hash;
}

- (NSString *) tilePath {
    return [[NSString alloc] initWithFormat:@"%d/%d/%d.png",
            [self.zoom intValue], [self.x intValue], [self.y intValue]];
}

@end
