//
//  AppsMallGridView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/12/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAppsMallGridView.h"
#import "MNOAppMallView.h"

@implementation MNOAppsMallGridView

- (id)initWithFrame:(CGRect)frame
{
    return nil;
}

- (id)initWithFrame:(CGRect)frame withList:(NSArray *)arr options:(NSDictionary *)options
{
    self.options = options;
    self =  [super initWithFrame:frame withList:arr withSize:CGSizeMake([MNOAppMallView standardWidth], [MNOAppMallView standardHeight])];
    
    if (self) {
        //
    }
    
    return self;
}

/* System Related Calls */

/*
// Only override drawRect: if you perform custom drawing.
// An empty implementation adversely affects performance during animation.
- (void)drawRect:(CGRect)rect
{
    // Drawing code
}
*/


// Call 

- (id) createTileWithFrame:(CGRect)frame withMetadata:(NSManagedObject *)widget
{
    return [[MNOAppMallView alloc] initWithFrame:frame
                                          entity:widget
                                        selected:[[self.options objectForKey:[widget valueForKey:@"widgetId"]] boolValue]];
}

@end
