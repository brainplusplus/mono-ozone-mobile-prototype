//
//  IntentGrid.h
//  Mono2
//
//  Created by Ben Scazzero on 3/27/14.
//  Created by Ben Scazzero on 3/31/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOCustomGridView.h"
#import "MNOIntentGridDelegate.h"
#import <Foundation/Foundation.h>
#import "MNOAppsMallGridView.h"

@class MNOIntentSubscriber;

@interface MNOIntentGrid : MNOAppsMallGridView

- (id) initWithFrame:(CGRect)frame
             widgets:(NSArray *)widgetReceivers
             intents:(NSArray *)intentReceivers
        senderWidget:(MNOWidget *)senderWidget
        senderIntent:(MNOIntentWrapper *)senderIntent
            withSize:(CGSize)size;

@property (weak, nonatomic) id<MNOIntentGridDelegate> gridDelegate;

@end
