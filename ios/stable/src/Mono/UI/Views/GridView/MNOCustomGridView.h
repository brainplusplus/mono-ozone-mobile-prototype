//
//  CustomGridView.h
//  Mono2
//
//  Created by Ben Scazzero on 3/11/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "MNOAppViewDelegate.h"
#import "MNOMenuViewDelegate.h"
#import "MNOCustomGridViewDelegate.h"

@interface MNOCustomGridView : UIScrollView<MNOAppViewDelegate,MNOMenuViewDelegate>

/* Layout Related Properties */
@property (readonly, nonatomic) CGFloat cols;
@property (readonly, nonatomic) CGFloat rows;
@property (readonly, nonatomic) CGFloat spacing;

@property (nonatomic) CGFloat topSpacing;
@property (nonatomic) CGFloat minColSpacing;
@property (nonatomic) CGFloat rowSpacing;
@property (nonatomic) CGFloat startingX;
@property (nonatomic) CGFloat startingY;
// Headings
@property (nonatomic) CGSize headingSize;
@property (strong, nonatomic) NSArray * headings;

//Sections
@property (nonatomic) NSUInteger sections;
@property (strong,nonatomic) NSMutableDictionary * rowCounts;


// Layout Related Methods
- (void) gridWithSectionsForList:(NSArray *)list;
- (void) adjustGridDimensions;

// Create Tile
- (id) createTileWithFrame:(CGRect)frame withMetadata:(id)item;

// Tile Size
@property (nonatomic) CGSize size;
// Tile Views
@property (strong, nonatomic) NSMutableArray * viewList;
// Tile Metadata
@property (strong, nonatomic) NSMutableArray * list;
/* Callback */
@property (weak, nonatomic) id<MNOCustomGridViewDelegate> gridDelegate;


// Init Options
- (id)initWithFrame:(CGRect)frame withList:(NSArray *)arr withSize:(CGSize)size;
- (id)initWithFrame:(CGRect)frame withList:(NSArray *)arr;

// Methods
- (void) calculateDimensionsForEntities:(NSUInteger)entries;
- (void) addObjects:(NSArray *)list;
- (void) addNewObjects:(NSArray *)newEntries;
- (void) replaceCurrentViewsWithList:(NSArray *)list;

// Menu
-(void)setCenterMenuContents:(NSDictionary *)contents;
-(void)applyLongPress:(UIView *)cell;
-(void) applyGestures:(UIView *)cell;

@end
