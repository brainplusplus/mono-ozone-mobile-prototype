//
//  CustomGridView.m
//  Mono2
//
//  Created by Ben Scazzero on 3/11/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOCustomGridView.h"
#import "MNOAppView.h"
#import "Masonry.h"
#import "MNOCenterMenuView.h"

#define trashMaxHeight 75
#define trashMaxWidth 75

#define trashHeight 50
#define trashWidth 50

@interface MNOCustomGridView ()

@property (nonatomic) CGFloat cols;
@property (nonatomic) CGFloat rows;
@property (nonatomic) CGFloat spacing;

@property (nonatomic) CGRect animatingFrameOriginPosition;
@property (strong, nonatomic) UIImageView * trash;
@property (strong, nonatomic) MNOCenterMenuView * centerMenu;
@property (strong, nonatomic) UILongPressGestureRecognizer * prevGest;
@property (strong, nonatomic) void(^callback)(NSString * key, NSDictionary * dict);

@property (strong, nonatomic) UIView * menuBackground;
@property (strong, nonatomic) UIView * longpressCell;
@property (nonatomic) NSUInteger entries;
 
@end

@implementation MNOCustomGridView

- (id)initWithFrame:(CGRect)frame withList:(NSArray *)arr withSize:(CGSize)size
{
    self = [super initWithFrame:frame];
    if (self) {
        // Initialization code
        self.list = [NSMutableArray arrayWithArray:arr];
        self.entries  = self.list.count;
        self.size = size;
        self.backgroundColor = [UIColor clearColor];
    }
    return self;
}

- (id)initWithFrame:(CGRect)frame withList:(NSArray *)arr
{
    return [self initWithFrame:frame withList:arr withSize:CGSizeMake([MNOAppView standardWidth], [MNOAppView standardHeight])];
}


/*
// Only override drawRect: if you perform custom drawing.
// An empty implementation adversely affects performance during animation.
- (void)drawRect:(CGRect)rect
{
    // Drawing code
}
*/

#pragma -mark Layout

-(void)layoutSubviews
{
    [super layoutSubviews];
    [self relayoutUsingEntities];
}


- (void) calculateDimensionsForEntities:(NSUInteger)entries
{
    CGFloat width = self.bounds.size.width,
            widgetWidth = self.size.width;
    
    self.cols = floor(width/(self.minColSpacing+widgetWidth+self.minColSpacing));
    self.rows = ceil(entries / self.cols);
    self.spacing = (width - (self.cols * widgetWidth))/(self.cols+1);
    
    if(self.cols == INFINITY || self.cols != self.cols) {
        self.cols = 0;
    }
    if(self.rows == INFINITY || self.rows != self.rows) {
        self.cols = 0;
    }
    if(self.spacing == INFINITY || self.spacing != self.spacing) {
        self.cols = 0;
    }
}


- (void) relayoutUsingEntities
{
    if (![self.viewList count])
        [self gridWithSectionsForList:self.list];
 
    [self calculateDimensionsForEntities:self.list.count];
    [self adjustGridDimensions];
}

#pragma -mark Sections

- (void) gridWithSectionsForList:(NSArray *)list
{
    if (self.headings) {
        
        int index = 0;
        self.startingY = self.topSpacing;
        
        for (id obj in list)
            if ([obj isKindOfClass:[NSArray class]] && [obj count]) {
                
                self.startingX = self.spacing;
                [self calculateDimensionsForEntities:[obj count]];
                [self appendHeading:[self.headings objectAtIndex:index]];
                [self addObjects:obj];
                
                index++;
                
            }else {
                //TODO: Throw Exception
            }
    }else{
        
        self.startingX = self.spacing, self.startingY = self.topSpacing;
        [self calculateDimensionsForEntities:list.count];
        [self addObjects:list];
    }
}

- (void) adjustGridDimensions
{
    // if our list was emptied, use reloadListUsing instead
    CGFloat startingX = self.spacing,
            startingY = self.topSpacing,
            width = self.size.width,
            height = self.size.height;
    
    double colCounter = 0,
           sectionCounter = 0,
           entities = 0;
   
    for (UIView * cell in self.viewList) {
        
        if ([cell isKindOfClass:[UILabel class]]) {
            //
            CGRect frame = cell.frame;
            frame.origin.x = startingX = self.spacing;
            frame.origin.y = startingY;
            cell.frame = frame;
            
            startingY += self.headingSize.height;
            
            entities = [[self.list objectAtIndex:sectionCounter] count];
            sectionCounter++;
            
        } else if([cell isKindOfClass:[MNOAppView class]]) {
            CGRect frame = cell.frame;
            frame.origin.x = startingX;
            frame.origin.y = startingY;
            cell.frame = frame;
            
            //adjust starting coords
            startingX = startingX + width + self.spacing;
            colCounter += 1;
            if (fmod(colCounter, self.cols) == 0) {
                startingY = startingY + height + self.rowSpacing;
                startingX = self.spacing;
            }
            entities--;
        }
        
        // used for formatting purposes
        if (!entities){
            startingY = startingY + height + self.rowSpacing;
            startingX = self.spacing;
        }
    }
    
    self.startingX = startingX;
    self.startingY = startingY;
    CGFloat contentHeight = self.startingY+self.size.height+(self.frame.size.height*.20);
    [self setContentSize:CGSizeMake(CGRectGetWidth(self.frame), contentHeight)];
}

#pragma -mark Headings

- (void) appendHeading:(NSString *)heading
{
    UILabel * label = [[UILabel alloc] init];
    CGRect frame;
    frame.size = self.headingSize;
    frame.origin = CGPointMake(self.spacing, self.startingY);
    label.frame = frame;
    
    self.startingY += self.headingSize.height;
    self.startingX = self.spacing;
    
    label.text = heading;
    label.textColor = [UIColor whiteColor];
    
    [self.viewList addObject:label];
    [self addSubview:label];
}

#pragma -mark GridTiles

- (id) createTileWithFrame:(CGRect)frame withMetadata:(NSManagedObject *)item
{
    return [[MNOAppView alloc] initWithFrame:frame entity:item];
}

- (void) addNewObjects:(NSArray *)newEntries
{
    [self.list addObjectsFromArray:newEntries];
    [self addObjects:newEntries];
}

- (void) addObjects:(NSArray *)list
{
    CGFloat startingX = self.startingX,
            startingY = self.startingY,
            width = self.size.width,
            height = self.size.height;
    
    int tag = 0;
    for (NSManagedObject * item in list) {
        //create cell
        MNOAppView * cell = [self createTileWithFrame:CGRectMake(0, 0, width, height) withMetadata:item];
        
        cell.delegate = self;
        cell.tag = tag++;
        if ([self.gridDelegate respondsToSelector:@selector(entryIsRemovable:)]) {
            if([self.gridDelegate entryIsRemovable:item])
                [self applyGestures:cell];
        }
        
        //if ([[item valueForKey:@"widgetId"] intValue] != -1) {
            //[self applyGestures:cell];
            //[self applyLongPress:cell];
        //}
        
        
        [self.viewList addObject:cell];
        [self addSubview:cell];
    }
    
    self.startingX = startingX;
    self.startingY = startingY;
}

- (void) replaceCurrentViewsWithList:(NSArray *)list
{
    [self.list removeAllObjects];
    for (UIView * view in self.viewList) {
        [view removeFromSuperview];
    }
    [self.viewList removeAllObjects];
    self.list = [NSMutableArray arrayWithArray:list];
    [self calculateDimensionsForEntities:list.count];
    [self addObjects:list];
    [self adjustGridDimensions];
    
}

#pragma -mark Defaults

-(CGFloat) spacing
{
    if(_spacing <= 0)
        _spacing = 10;
    
    return _spacing;
}


-(CGFloat) colSpacing
{
    if(_minColSpacing <= 0)
        _minColSpacing = 10;
    
    return _minColSpacing;
}

-(CGFloat) rowSpacing
{
    if(_rowSpacing <= 0)
        _rowSpacing = 10;
    
    return _rowSpacing;
}


-(CGFloat)topSpacing
{
    if(_topSpacing <= 0)
        _topSpacing = 20;
    
    return _topSpacing;
}


-(CGFloat) minColSpacing
{
    if(_minColSpacing <= 0)
        _minColSpacing = 0;
    
    return _minColSpacing;
}

#pragma -mark AppViewDelegate

-(void)entrySelected:(id)entity
{
    if (self.gridDelegate && [self.gridDelegate respondsToSelector:@selector(entrySelected:)])
        [self.gridDelegate entrySelected:entity];
    
}

/* Dragging Gesture */

-(void) applyGestures:(UIView *)cell
{
    UIPanGestureRecognizer * pan = [[UIPanGestureRecognizer alloc] initWithTarget:self action:@selector(cellDrag:)];
    //pan.minimumNumberOfTouches = 1;
    pan.minimumNumberOfTouches = 1;
    [cell addGestureRecognizer:pan];
}

-(UIImageView *)trash
{
    CGRect frame = self.frame;
    if(!_trash){
        _trash = [[UIImageView alloc] initWithFrame:CGRectMake((CGRectGetWidth(frame)-trashWidth)/2.0,CGRectGetHeight(frame), trashWidth, trashHeight)];
        _trash.image = [UIImage imageNamed:@"icon_trash_"];
    }
    
    return _trash;
}

-(void)enlargeTrash
{
    CGRect frame = self.trash.frame;
    frame.size.width = trashMaxWidth;
    frame.size.height = trashMaxHeight;
    
    self.trash.backgroundColor = Rgb2UIColor(79, 175, 54);
    /*[UIView animateWithDuration:0.15 animations:^{
        //self.trash.frame = frame;
    } completion:^(BOOL finished) {
    }];*/
}

-(void)originalSizeTrash
{
    CGRect frame = self.trash.frame;
    frame.size.width = trashWidth;
    frame.size.height = trashHeight;
    
    self.trash.backgroundColor = [UIColor clearColor];
    /*[UIView animateWithDuration:0.15 animations:^{
        //self.trash.frame = frame;
    } completion:^(BOOL finished) {
    }];*/
}

-(void)cellDrag:(UIPanGestureRecognizer *)pan
{
    // Animate View
    CGPoint point =  [pan locationInView:self];
    UIView * cell = pan.view;
    
    // Panning started
    if (pan.state == UIGestureRecognizerStateBegan) {
        for (UIView * view in self.viewList)
            if (cell != view)
                [view setHidden:YES];
        
        
        UIView * backgroundColorView = [[UIView alloc] initWithFrame:
                                        CGRectMake(0, 0, CGRectGetWidth(cell.frame),
                                                   CGRectGetHeight(((MNOAppView *)cell).image.frame)+
                                                   CGRectGetMinY(((MNOAppView *)cell).image.frame))];
        backgroundColorView.tag = -1;
        backgroundColorView.backgroundColor = Rgb2UIColor(79, 175, 54);
        backgroundColorView.alpha = .60;
        [cell addSubview:backgroundColorView];
        
        self.animatingFrameOriginPosition = cell.frame;
        
        //add trash icon, originally offscreen
        [self addSubview:self.trash];
        
        // Animate on screen.
        [UIView animateWithDuration:0.50 animations:^{
            CGRect frame = self.trash.frame;
            frame.origin.y += (-trashMaxHeight+self.contentOffset.y);
            self.trash.frame = frame;
        } completion:^(BOOL finished) {
            /*[self.trash mas_makeConstraints:^(MASConstraintMaker *make) {
                make.bottom.equalTo(self.superview).offset(-trashMaxHeight+self.contentOffset.y);
                make.centerX.equalTo(self.superview);
                make.width.equalTo(@(self.trash.frame.size.width));
                make.height.equalTo(@(self.trash.frame.size.height));
            }];
           */
        }];
        
        
        self.scrollEnabled = NO;
    }else if(pan.state == UIGestureRecognizerStateChanged){
        // Position still being dragged
        
    }else if(pan.state == UIGestureRecognizerStateEnded){
        for (UIView * view in self.viewList)
            [view setHidden:NO];
        
        // if icon in trash can, remove it
        if(CGRectIntersectsRect(self.trash.frame, cell.frame)){
      
            id entry = [self.list objectAtIndex:cell.tag];
            [self.list removeObjectAtIndex:cell.tag];
            [self replaceCurrentViewsWithList:[NSArray arrayWithArray:self.list]];
            if(self.gridDelegate && [self.gridDelegate respondsToSelector:@selector(entryRemoved:)])
                [self.gridDelegate entryRemoved:entry];
            
        }else{
            // put it cell back
            cell.frame = self.animatingFrameOriginPosition;
            
            //remvoe colored view that was added
            for (UIView * view in cell.subviews)
                if (view.tag == -1) {
                    [view removeFromSuperview];
                    break;
                }
            
        }
        
        //animate trash offscreen & cell back to original
        [UIView animateWithDuration:1.0 animations:^{
            CGRect frame = self.trash.frame;
            frame.origin.y += trashMaxHeight;
            
        } completion:^(BOOL finished) {
            [self.trash removeFromSuperview];
            self.trash = nil;
        }];
    
  
        self.scrollEnabled = YES;
    }
    
    
    // move view to the user's current finger
    CGRect currFrame = cell.frame;
    currFrame.origin = point;
    currFrame.origin.y -= self.size.height;
    cell.frame = currFrame;
    
    // if we've dragged icon to trash, enlarge it.
    if (CGRectIntersectsRect(self.trash.frame, cell.frame)){
        [self enlargeTrash];
        cell.hidden = YES;
    // otherwise, put trash size back to original height if currently enlarged
    }else{// if(self.trash.frame.size.height == trashMaxHeight)
        [self originalSizeTrash];
        cell.hidden = NO;
    }
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
    return YES;
}

/* Long Press */

-(void)setCenterMenuContents:(NSDictionary *)contents
{
    //background
    self.menuBackground = [[UIView alloc] initWithFrame:self.frame];
    [self.menuBackground setBackgroundColor:[UIColor grayColor]];
    self.menuBackground.hidden = YES;
    [self addSubview:self.menuBackground];
    //[self.menuBackground mas_makeConstraints:^(MASConstraintMaker *make) {
    //    make.edges.equalTo(self.superview);
    //}];
    
    //menu
    [self.centerMenu removeFromSuperview];
    self.centerMenu = [[MNOCenterMenuView alloc] initWithSize:CGSizeMake(200, contents.count*80) contents:contents];
    //self.centerMenu.hidden = YES;
    [self.menuBackground addSubview:self.centerMenu];
    //[self.centerMenu mas_makeConstraints:^(MASConstraintMaker *make) {
    //    make.center.equalTo(self.menuBackground);
    //}];
    self.centerMenu.delegate = self;
}


- (void)optionSelectedKey:(NSString *)key withValue:(id)value
{
    for (UIView * view in self.viewList) {
        view.hidden = NO;
    }
    self.menuBackground.hidden = YES;
    //cgv.centerMenu.hidden = YES;
    
    if([self.gridDelegate respondsToSelector:@selector(entryLongPressed:optionSelectedKey:value:)])
        [self.gridDelegate entryLongPressed:[self.list objectAtIndex:self.longpressCell.tag]
                          optionSelectedKey:key
                                      value:value];
    
    self.longpressCell = nil;
}


-(void)applyLongPress:(UIView *)cell
{
    UILongPressGestureRecognizer * lpress = [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(cellLongPress:)];
    
    lpress.minimumPressDuration = 2.0;
    [cell addGestureRecognizer:lpress];
}

-(void)cellLongPress:(UILongPressGestureRecognizer *)recognizer
{
    if (self.menuBackground) {
        UIView * cell = recognizer.view;
        if (recognizer.state == UIGestureRecognizerStateBegan){
            // Long press detected, start the timer
            for (UIView * view in self.viewList) {
                view.hidden = YES;
            }
            //self.centerMenu.hidden = NO;
            self.menuBackground.hidden = NO;
            self.longpressCell = cell;
            
        }
    }
}


#pragma -mark Getters/Setters

-(NSMutableArray *)list
{
    if (!_list) {
        _list = [NSMutableArray new];
    }
    return _list;
}

-(NSMutableArray *)viewList
{
    if (!_viewList) {
        _viewList = [NSMutableArray new];
    }
    return _viewList;
}

-(void)setHeadings:(NSArray *)headings
{
    if ([headings count]) {
        int count = 0;
        for (id obj in self.list) {
            if ([obj isKindOfClass:[NSArray class]]) {
                for (id entity in obj)
                    if(entity)
                        count++;
                
            }
        }
        self.entries = count;
    }
    
    _headings = headings;
}

@end
