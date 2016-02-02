//
//  NSString+MNOAdditions.h
//  Mono
//
//  Created by Ben Scazzero on 4/29/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface NSString (MNOAdditions)

- (NSString *)mno_urlEncodedString;

- (NSString *) mno_escapeJson;

@end
