//
//  IntentSwiperView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/26/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import "MNOIntentSwiperView.h"
#import "MNOAppDelegate.h"
#import "MNOAppView.h"
#import "MNOAppSwiperView.h"

@interface MNOIntentSwiperView ()

@property (strong, nonatomic) NSManagedObjectContext * moc;
@property (strong, nonatomic) NSMutableArray * array;

// buttons
@property (strong, nonatomic) UIButton * okButton;
@property (strong, nonatomic) UIButton * defaultButton;
@property (strong, nonatomic) UIButton * cancelButton;

@end

@implementation MNOIntentSwiperView

- (id)initWithFrame:(CGRect)frame
{
    return nil;
}

- (id) initWithFrame:(CGRect)frame usingReceivers:(NSArray *)intentReceivers withSize:(CGSize)size
{
    self = [super initWithFrame:frame usingContent:[self populateOptions:intentReceivers] withSize:size];
    if (self) {
        //
       [self populateOptions:intentReceivers];
        
    }
    return self;
}

- (NSArray *) populateOptions:(NSArray * )intentReceivers
{
    for (MNOIntentWrapper * is in intentReceivers) {
        
        NSFetchRequest * fetch = [[NSFetchRequest alloc] initWithEntityName:[MNOWidget entityName]];
        fetch.predicate = [NSPredicate predicateWithFormat:@"widgetId == %@",is.instanceId];
        
        NSError * error = nil;
        NSArray * results = [self.moc executeFetchRequest:fetch error:&error];
        if (results && [results count] && !error) {
            return results;
        }
    }
    
    return nil;
}

- (void) modifySwiperLook
{
    //add main background white part
    //UIView * whiteBackground;
    
    CGRect frame;
    frame.origin = self.scroller.frame.origin;
    frame.size = self.scroller.frame.size;
    
    CGFloat border = self.frame.size.height - self.scroller.frame.size.height;
    border /= 2; //of the extra space we have available, take half of it.
    border /= 2; //half it again, we'll add this value to the top and bottom
    
    frame.origin.y -= border;
    frame.size.height += (border * 2);
    frame.origin.x -= border;
    frame.size.width += (border * 2);
    
    //whiteBackground = [[UIView alloc] initWithFrame:frame];
    [self createBottomButtons];
    //add button to it
    
}


- (void) createBottomButtons;
{
    //ok
    UIButton * okButton = [UIButton buttonWithType:UIButtonTypeCustom];
    [okButton setTitleColor:[UIColor grayColor] forState:UIControlStateNormal];
    [okButton setTitle:@"Ok" forState:UIControlStateNormal];
    [okButton setBackgroundColor:[UIColor lightGrayColor]];
    self.okButton = okButton;
    
    // make default
    UIButton * defaultButton = [UIButton buttonWithType:UIButtonTypeCustom];
    [defaultButton setTitleColor:[UIColor grayColor] forState:UIControlStateNormal];
    [defaultButton setTitle:@"Make Default" forState:UIControlStateNormal];
    [defaultButton setBackgroundColor:[UIColor lightGrayColor]];
    self.defaultButton = defaultButton;
    
    // cancel
    UIButton * cancelButton = [UIButton buttonWithType:UIButtonTypeCustom];
    [cancelButton setTitleColor:[UIColor grayColor] forState:UIControlStateNormal];
    [cancelButton setTitle:@"Cancel" forState:UIControlStateNormal];
    [cancelButton setBackgroundColor:[UIColor lightGrayColor]];
    self.cancelButton = cancelButton;
}

/* Super Classes */

- (void)showScrollView
{
    [super showScrollView];
    
}

- (void) modifySwiperCard:(MNOAppSwiperView *)appview
{
    [super modifySwiperCard:appview];
    appview.backgroundColor = [UIColor whiteColor];
    appview.nameLabel.textColor = [UIColor blackColor];
}


- (void) layoutSubviews
{
    [super layoutSubviews];
    [self relayout];
}


- (void) relayout
{
    //CGRect baseFrame = self.frame;
}

/*
// Only override drawRect: if you perform custom drawing.
// An empty implementation adversely affects performance during animation.
- (void)drawRect:(CGRect)rect
{
    // Drawing code
}
*/

/* Getters */
- (NSManagedObjectContext *) moc
{
    return [[MNOUtil sharedInstance] defaultManagedContext];
}

//overwrite getter
- (UIScrollView *) createSpecialScroller
{
    if (![super scroller]){
        CGRect frame = CGRectZero;
        frame.origin = CGPointMake(0, CGRectGetHeight(self.frame) * .10);
        frame.size = CGSizeMake(CGRectGetWidth(self.frame), CGRectGetHeight(self.frame) * .80);
        [super setScroller:[[UIScrollView alloc] initWithFrame:frame]];
    }
    
    return [super scroller];
}


@end
