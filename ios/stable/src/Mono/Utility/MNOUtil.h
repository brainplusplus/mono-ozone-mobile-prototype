//
//  Util.h
//  Mono2
//
//  Created by Ben Scazzero on 4/11/14.
//  Copyright (c) 2014 Ben Scazzero. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOUtil : NSObject

#pragma mark public methods

/**
 * The singleton unstance of the utility object.
 **/
+ (MNOUtil *) sharedInstance;

/**
 * Retrieves the default managed context for the application.
 * @return The default managed context.
 **/
@property (strong, nonatomic) NSManagedObjectContext * defaultManagedContext;

@property (strong, nonatomic) NSOperationQueue * syncingQueue;

- (NSManagedObjectContext *) newPrivateContext;

/**
 * Decodes a base64 string into a regular string.
 * @param base64String A base64 encoded string.
 * @return The decoded string.
 **/
- (NSString * ) decodeBase64String:(NSString *)base64String;

/**
 * Takes a base64 encoded dictionary and outputs it as a string.
 * @param base64Dict The dictionary to convert into a string.
 * @return The stringified version of the dictionary.
 **/
- (NSString * ) dictionaryToString:(NSDictionary *)base64Dict;

/**
 * Takes a base64 string, parses it as a JSON, and returns the dictionary.
 * @param base64String The base64 encoded string.
 * @return The JSON parsed from the string, or nil on error.
 **/
- (NSDictionary *) stringToDictionary:(NSString *)base64String;

/**
 * Generates a sha1 hash based on the input.
 * @param input The input to generate a SHA1 hash from.
 * @return A SHA1 hash based on the input string.
 **/
- (NSString *)sha1:(NSString *)input;

/**
 *  Takes a widgetURL and a relative path. If the widgetURL is a valid path (schema, host, path)
 *  then a non-nil path is appended to it. If the widgetURL is relative, then it is formatted using
 *  the [AccountManager sharedManager].widgetBaseUrl
 *
 *  @param widgetURL a widget's landing page url
 *  @param path      a path to append to the widget's landing page url
 *
 *  @return valid, formatted URL combining the widgetURL and path variables
 **/
- (NSString *)formatURLString:(NSString *)widgetURL withPath:(NSString *)path;

/**
 * Shows an error message box.
 * @param title The title of the box to show.
 * @param message The message to display in the box.
 **/
- (void)showMessageBox:(NSString *)title message:(NSString *)message;
@end
