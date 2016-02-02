//
//  NSString+MNOAdditions.h
//  Mono
//
//  Created by Ben Scazzero on 4/29/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "NSString+MNOAdditions.h"

@implementation NSString (MNOAdditions)

- (NSString *)mno_urlEncodedString {
    NSMutableString *output = [NSMutableString string];
    const unsigned char *source = (const unsigned char *)[self UTF8String];
    int sourceLen = (int)strlen((const char *)source);
    
    for (int i = 0; i < sourceLen; ++i) {
        const unsigned char thisChar = source[i];
        
        if (thisChar == ' '){
            [output appendString:@"+"];
        } else if (thisChar == '.' || thisChar == '-' || thisChar == '_' || thisChar == '~' ||
                   (thisChar >= 'a' && thisChar <= 'z') ||
                   (thisChar >= 'A' && thisChar <= 'Z') ||
                   (thisChar >= '0' && thisChar <= '9')) {
            [output appendFormat:@"%c", thisChar];
        } else {
            [output appendFormat:@"%%%02X", thisChar];
        }
    }
    
    return output;
}

// Borrowed from http://stackoverflow.com/questions/5569794/escape-nsstring-for-javascript-input
- (NSString *) mno_escapeJson {
    const char *chars = [self UTF8String];
    NSMutableString *escapedString = [NSMutableString string];
    while (*chars)
    {
        if (*chars == '\\')
            [escapedString appendString:@"\\\\"];
        else if (*chars == '"')
            [escapedString appendString:@"\\\""];
        else if (*chars < 0x1F || *chars == 0x7F)
            [escapedString appendFormat:@"\\u%04X", (int)*chars];
        else
            [escapedString appendFormat:@"%c", *chars];
        ++chars;
    }
    
    return escapedString;
}

@end
