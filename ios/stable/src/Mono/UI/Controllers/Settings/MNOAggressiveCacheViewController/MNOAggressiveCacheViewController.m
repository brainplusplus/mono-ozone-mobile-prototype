//
//  MNOAggressiveCacheViewController.m
//  Mono
//
//  Created by Ben Scazzero on 5/14/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAggressiveCacheViewController.h"
#import "MNOAggressiveCache.h"


// Aggressive Cache
#define statusDownloadText @"%lu/ %lu"
#define lastDateAggressiveCache @"lastDateAggressiveCache"

@interface MNOAggressiveCacheViewController ()
/**
 *  Completion Status i.e. How many widgets we've downloaded, how many we have left, etc
 */
@property (weak, nonatomic) IBOutlet UILabel *completionStatus;
// Aggressive Caching
/**
 *  View containg all the aggressive caching subviews
 */
@property (weak, nonatomic) IBOutlet UIView *aggressiveCacheView;

/**
 *  The current widget being downloaded
 */
@property (weak, nonatomic) IBOutlet UILabel *currentWidgetDownload;
/**
 *  The progress of the current widget being downloaded
 */
@property (weak, nonatomic) IBOutlet UILabel *currentWidgetProgress;
/**
 *  The start caching button
 */
@property (weak, nonatomic) IBOutlet UIButton *startCaching;
/**
 *  The date of the last time the widgets were downloaded.
 */
@property (weak, nonatomic) IBOutlet UILabel *lastDownloadedDate;
/**
 *  # of widgets that have successfully downloaded
 */
@property (nonatomic) unsigned long widgetsSuccess;
/**
 *  # of widgets that have failed to download
 */
@property (nonatomic) unsigned long widgetsFailed;

@end

@implementation MNOAggressiveCacheViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
    }
    return self;
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    // Do any additional setup after loading the view.
    // Aggressivee Cache
    self.startCaching.layer.cornerRadius = 5.0;
    [self layoutCacheSection];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}


#pragma -mark AggressiveCache/MNOAggressiveCacheDelegate

- (void) layoutCacheSection
{
    //Update the last downloaded section
    NSDate *  lastDate = (NSDate *)[[NSUserDefaults standardUserDefaults] objectForKey:lastDateAggressiveCache];
    if (lastDate != nil)
        [self updateLastDownloadedLabelWithDate:lastDate];
    
}

- (IBAction)startAggressiveCache:(id)sender
{
    [self.startCaching setTitle:@"Wait..." forState:UIControlStateNormal];
    [self.startCaching setEnabled:NO];
    
    MNOAggressiveCache * cache = [[MNOAggressiveCache alloc] init];
    cache.delegate = self;
    [cache store];
    
    NSArray * totalWidgets = [[MNOAccountManager sharedManager] defaultWidgets];
    self.widgetsSuccess = 0;
    self.widgetsFailed = 0;
    self.completionStatus.text = [NSString stringWithFormat:statusDownloadText, self.widgetsSuccess,(unsigned long)[totalWidgets count]];
}

- (void) willStartDownloadingContentsForWidget:(NSString*)widgetName
{
    self.currentWidgetDownload.text = widgetName;
}

- (void) didStartDownloadingContentsForWidget:(NSString *)widgetName
{
    //Started the widget download
}

- (void) totalComponents:(NSUInteger)total forWidget:(NSString *)widgetName
{
    self.currentWidgetProgress.text = [NSString stringWithFormat:statusDownloadText, 0l,(unsigned long)total];
}

- (void) downloadedComponents:(NSUInteger)complete invalidComponents:(NSUInteger)invalid remainingComponents:(NSUInteger)remaining forWidget:(NSString *)widgetName
{
    long double percent = (long double)complete/(long double)(complete+invalid+remaining);
    percent *= 100;
    self.currentWidgetProgress.text = [NSString stringWithFormat:statusDownloadText,(unsigned long)percent, (unsigned long)100];
}

- (void) didFailToDownload:(NSString*)widgetName
{
    self.widgetsFailed++;
    [self updateTotalResults];
}

- (void) didCompleteDownloadForWidget:(NSString*)widgetName
{
    self.widgetsSuccess++;
    [self updateTotalResults];
}

- (void) didFinishCaching
{
    NSDate * date = [NSDate new];
    [self updateLastDownloadedLabelWithDate:date];
    [[NSUserDefaults standardUserDefaults] setObject:date forKey:lastDateAggressiveCache];
    [[NSUserDefaults standardUserDefaults] synchronize];
    
    [self.startCaching setTitle:@"Start" forState:UIControlStateNormal];
    [self.startCaching setEnabled:YES];
}

- (void) updateTotalResults
{
    self.currentWidgetProgress.text = @"N/A";
    self.currentWidgetDownload.text  = @"N/A";
    NSArray * totalWidgets = [[MNOAccountManager sharedManager] defaultWidgets];
    self.completionStatus.text = [NSString stringWithFormat:statusDownloadText, self.widgetsSuccess,(unsigned long)[totalWidgets count]];
}

- (void) updateLastDownloadedLabelWithDate:(NSDate*)date
{
    NSDateFormatter *format = [[NSDateFormatter alloc] init];
    format.dateFormat = @"yyyy-MM-dd 'at' HH:mm";
    NSString * formattedDateString = [format stringFromDate:date];
    self.lastDownloadedDate.text = [NSString stringWithFormat:@"Last Downloaded: %@",formattedDateString];
}


/*
#pragma mark - Navigation

// In a storyboard-based application, you will often want to do a little preparation before navigation
- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender
{
    // Get the new view controller using [segue destinationViewController].
    // Pass the selected object to the new view controller.
}
*/

@end
