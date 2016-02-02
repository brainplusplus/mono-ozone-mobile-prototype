//
//  IntentGridDelegate.h
//  Mono2
//
//  Created by Ben Scazzero on 3/31/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "MNOCustomGridViewDelegate.h"

@protocol MNOIntentGridDelegate <MNOCustomGridViewDelegate>

/**
 *  Callback for the intents menu popup
 *
 *  @param once     YES if the user selected "Just Once", NO otherwise
 *  @param receiver The receiver of the Intent (chosen by the user)
 *  @param sender   The sender of the Intent (this is what triggered the intent menu)
 */
- (void) selectedIntentOptionOnce:(BOOL)once forReceiver:(MNOIntentWrapper*)receiver fromSender:(MNOIntentWrapper*)sender;

@end
