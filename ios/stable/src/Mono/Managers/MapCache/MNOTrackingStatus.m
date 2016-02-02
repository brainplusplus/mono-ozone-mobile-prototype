//
//  MNOTrackingEntry.m
//  Mono2
//
//  Created by Michael Wilson on 4/22/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOTrackingStatus.h"

@implementation MNOTrackingStatus
{
    int _processed;
}

#pragma mark constructors

- (id) init:(int)processed total:(int)total startTime:(long)startTime {
    if(self = [super init]) {
        _processed = processed;
        self.total = [[NSNumber alloc] initWithInt:total];
        self.startTime = [[NSDate alloc] initWithTimeIntervalSinceReferenceDate:startTime];
    }
    
    return self;
}

#pragma mark - public methods

- (void) incrementProcessed {
    _processed += 1;
}

- (BOOL) isComplete {
    int total = [_total intValue];
    
    if(total == 0 || _processed >= total) {
        return TRUE;
    }
    
    return FALSE;
}

- (NSDictionary *) asJson {
    double total = [self.total doubleValue];
    double processed = (double)_processed;
    NSNumber *percentage = [[NSNumber alloc] initWithInt:(int)(processed / total * 100.0)];
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    NSString *dateString = [formatter stringFromDate:self.startTime];
    
    NSString *processedString = [[NSString alloc] initWithFormat:@"%d", _processed];
    
    NSDictionary *dictionary =
    @{
      @"processed": processedString,
      @"remaining": processedString,
      @"percentComplete": [percentage stringValue],
      @"startDate": dateString,
      @"status": @"running"
     };

    return dictionary;
}

#pragma mark - properties

- (int) processed {
    return _processed;
}

@end
