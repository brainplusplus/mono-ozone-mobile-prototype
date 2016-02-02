//
//  IntentGrid.m
//  Mono2
//
//  Created by Ben Scazzero on 3/27/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "MNOIntentGrid.h"
#import "MNOAppDelegate.h"
#import "MNOWidget.h"
#import "MNOAppView.h"
#import "MNOAppMallView.h"

@interface MNOIntentGrid ()

@property (strong, nonatomic) UIView * buttonViewContainer;
@property (strong, nonatomic) UIView * headerViewContainer;

@property (strong, nonatomic) UIButton * okButton;
@property (strong, nonatomic) UIButton * alwaysButton;
@property (strong, nonatomic) UILabel * senderLabel;

@property (weak, nonatomic) NSManagedObjectContext * moc;

@property (strong, nonatomic) MNOIntentWrapper * senderIntent;
@property (strong, nonatomic) MNOIntentWrapper * chosenIntentReceiver;
@property (strong, nonatomic) NSMutableArray * intentReceivers;

@property (strong, nonatomic) MNOWidget * senderWidget;
@end

@implementation MNOIntentGrid

- (id)initWithFrame:(CGRect)frame
{
    return nil;
}

- (id) initWithFrame:(CGRect)frame
             widgets:(NSArray *)widgetReceivers
             intents:(NSMutableArray *)intentReceivers
        senderWidget:(MNOWidget *)senderWidget
        senderIntent:(MNOIntentWrapper *)senderIntent
            withSize:(CGSize)size
{
    self = [super initWithFrame:frame withList:widgetReceivers withSize:size];
    
    if (self) {
        //
        self.opaque = NO;//optimization
        self.backgroundColor = [UIColor grayColor];
        self.alpha = 0.75;
        [self.layer setCornerRadius:5.0f];
        
        self.senderIntent = senderIntent;
        self.senderWidget = senderWidget;
        self.intentReceivers = intentReceivers;
        self.bounces = NO;
    }
    
    return self;
}

/*
// Only override drawRect: if you perform custom drawing.
// An empty implementation adversely affects performance during animation.
- (void)drawRect:(CGRect)rect
{
    // Drawing code
}
*/

- (void) layoutSubviews
{
    self.topSpacing = CGRectGetHeight(self.headerViewContainer.frame);
    [super layoutSubviews];
    [self positionBottomButton];
}

- (void) positionBottomButton
{

    if (!self.buttonViewContainer.superview) {
        UIButton * ok = [UIButton buttonWithType:UIButtonTypeCustom];
        [ok setTitle:@"Just Once" forState:UIControlStateNormal];
        [ok setTitleColor:Rgb2UIColor(79, 175, 54) forState:UIControlStateNormal];
        [ok addTarget:self action:@selector(onceChosen:) forControlEvents:UIControlEventTouchUpInside];
        [ok setBackgroundColor:[UIColor blackColor]];
        [[ok layer] setBorderWidth:1.0f];
        [[ok layer] setBorderColor:Rgb2UIColor(239, 239, 239).CGColor];
        self.okButton = ok;
        
        UIButton * always = [UIButton buttonWithType:UIButtonTypeCustom];
        [always setTitle:@"Always" forState:UIControlStateNormal];
        [always setTitleColor:Rgb2UIColor(79, 175, 54) forState:UIControlStateNormal];
        [always addTarget:self action:@selector(alwaysChosen:) forControlEvents:UIControlEventTouchUpInside];
        [always setBackgroundColor:[UIColor blackColor]];
        [[always layer] setBorderWidth:1.0f];
        [[always layer] setBorderColor:Rgb2UIColor(239, 239, 239).CGColor];
        self.alwaysButton = always;
        
        [self.buttonViewContainer addSubview:ok];
        [self.buttonViewContainer addSubview:always];
        
        [self addSubview:self.buttonViewContainer];
    }

    if(!self.headerViewContainer.superview){
        
        UILabel * sender = [[UILabel alloc] init];
        
        if (self.senderWidget)
            [sender setText:[NSString stringWithFormat:@"Sender: %@",self.senderWidget.name]];
        else
            [sender setText:@"Sender: N/A"];
        
        sender.textColor = [UIColor whiteColor];
        self.senderLabel = sender;
        
        [self.headerViewContainer addSubview:sender];
        [self addSubview:self.headerViewContainer];
    }

    //Reposition Bottom Buttons
    CGRect parentFrame = self.frame;
    CGRect container = self.buttonViewContainer.frame;
    container.size.width =  CGRectGetWidth(parentFrame);
    container.origin.y = parentFrame.size.height - container.size.height + self.contentOffset.y;
    self.buttonViewContainer.frame = container;
    
    CGFloat buttonWidth = CGRectGetWidth(container) / 2.0;
    CGFloat buttonHeight = CGRectGetHeight(container);
    [self.alwaysButton setFrame:CGRectMake(buttonWidth-1,0 , buttonWidth+2, buttonHeight)];
    [self.okButton setFrame:CGRectMake(-1, 0, buttonWidth+1, buttonHeight)];

    //Reposition Top Header
    [self.senderLabel setFrame:CGRectMake(CGRectGetWidth(self.headerViewContainer.frame)*.50*.05, 0, CGRectGetWidth(self.headerViewContainer.frame), CGRectGetHeight(self.headerViewContainer.frame))];
    
    
    //[self bringSubviewToFront:self.buttonViewContainer];
}

/* Button callbacks */

- (void) alwaysChosen:(id)sender
{
    if (self.gridDelegate && [self.gridDelegate respondsToSelector:@selector(selectedIntentOptionOnce:forReceiver:fromSender:)])
        [self.gridDelegate selectedIntentOptionOnce:NO forReceiver:self.chosenIntentReceiver fromSender:self.senderIntent];
}

- (void) onceChosen:(id)sender
{
    if (self.gridDelegate && [self.gridDelegate respondsToSelector:@selector(selectedIntentOptionOnce:forReceiver:fromSender:)])
        [self.gridDelegate selectedIntentOptionOnce:YES forReceiver:self.chosenIntentReceiver fromSender:self.senderIntent];
}

#pragma -mark AppViewDelegate

/**
 *  Go through the widgets currently being displayed to make sure only 1 MNOAppMallView is selected.
 *  For the selected widget, find its "Receiving Intent".
 *
 *  @param widget Corresponding Data Element for the Grid's Cell
 */
-(void)entrySelected:(MNOWidget *)widget
{
    for (UIView * view in self.viewList)
        // The viewlist should contain header (UILabel) and Widget (AppsMallView)
        if ([view isKindOfClass:[MNOAppMallView class]]) {
            MNOAppMallView * apmv = (MNOAppMallView *)view;
            if (apmv.entity == widget) {
                //find and save the IntentWrapper this widget corresponds to.
                if (apmv.selected){
                    for (MNOIntentWrapper * is in self.intentReceivers)
                        if ([is.instanceId isEqualToString:widget.instanceId]) {
                            self.chosenIntentReceiver = is;
                            break;
                        }
                }else{
                    self.chosenIntentReceiver  = nil;
                }
            }else{
                // make sure all other calls are toggled off
                apmv.selected = NO;
            }
        }
    
}

- (void) userSelected:(Widget *)widget
{
    for (MNOAppMallView * amv in self.viewList) {
        if (amv.entity == widget){
            if (amv.selected)
                ;
        }else
            amv.selected = NO;
    }
}

#pragma -mark Setters/Getters


- (UIView *) buttonViewContainer
{
    if(!_buttonViewContainer){
        CGRect gridContainer = self.bounds;
        CGFloat containerHeight = CGRectGetHeight(gridContainer) * .15;
        UIView * container = [[UIView alloc] initWithFrame:CGRectMake(0, CGRectGetMaxY(gridContainer) - containerHeight, CGRectGetWidth(gridContainer), containerHeight)];
        container.backgroundColor = [UIColor clearColor];
        _buttonViewContainer = container;
    }
    return _buttonViewContainer;
}


- (UIView *) headerViewContainer
{
    if(!_headerViewContainer){
        CGRect gridContainer = self.bounds;
        CGFloat containerHeight = CGRectGetHeight(gridContainer) * .15;
        UIView * container = [[UIView alloc] initWithFrame:CGRectMake(0, 0, CGRectGetWidth(gridContainer), containerHeight)];
        container.backgroundColor = [UIColor blackColor];
        _headerViewContainer = container;
    }
    
    return _headerViewContainer;
}

- (NSManagedObjectContext *) moc
{
    return [[MNOUtil sharedInstance] defaultManagedContext];
}

@end
