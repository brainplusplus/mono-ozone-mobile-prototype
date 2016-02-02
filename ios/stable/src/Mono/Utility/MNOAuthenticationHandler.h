//
//  AuthenticationHandler.h
//  Mono2
//
//  Created by Ben Scazzero on 4/16/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface MNOAuthenticationHandler : NSObject

- (id) initWithURL:(NSURL *)url;

- (void) start;

@end
