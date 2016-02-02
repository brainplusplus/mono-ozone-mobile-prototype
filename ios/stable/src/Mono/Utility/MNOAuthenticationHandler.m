//
//  AuthenticationHandler.m
//  Mono2
//
//  Created by Ben Scazzero on 4/16/14.
//  Copyright (c) 2014 42Six, a CSC company. All rights reserved.
//

#import "MNOAuthenticationHandler.h"

@interface MNOAuthenticationHandler ()

@property (strong, nonatomic) NSURL * url;

@end

@implementation MNOAuthenticationHandler

- (id) initWithURL:(NSURL *)url
{
    self = [super init];
    if(self){
        self.url = url;
    }
    return self;
}

- (void) setAuthHandler:(AFHTTPRequestOperation *)op
{
    NSString * userCert = [MNOAccountManager sharedManager].p12Name;
    NSString * identityPath =
    [[NSBundle mainBundle] pathForResource:[userCert stringByDeletingPathExtension] ofType:[userCert pathExtension]];
    
    
    
    [op setWillSendRequestForAuthenticationChallengeBlock:^(NSURLConnection *connection, NSURLAuthenticationChallenge *challenge) {
        if ([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]){
            NSLog(@"Server Auth");
            
            // trust server cert
            //[challenge.sender useCredential: [NSURLCredential credentialForTrust: challenge.protectionSpace.serverTrust]
              //   forAuthenticationChallenge: challenge];
            
            [challenge.sender continueWithoutCredentialForAuthenticationChallenge:challenge];
        }else if([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodClientCertificate]) {
            NSLog(@"Client Auth");
            
            //this handles authenticating the client certificate
            /*
             What we need to do here is get the certificate and an an identity so we can do this:
             NSURLCredential *credential = [NSURLCredential credentialWithIdentity:identity certificates:myCerts persistence:NSURLCredentialPersistencePermanent];
             [[challenge sender] useCredential:credential forAuthenticationChallenge:challenge];
             
             It's easy to load the certificate using the code in -installCertificate
             It's more difficult to get the identity.
             We can get it from a .p12 file, but you need a passphrase:
             */
            
            NSData *p12Data = [[NSData alloc] initWithContentsOfFile:identityPath];
            CFStringRef password = CFSTR("password");
            const void *keys[] = { kSecImportExportPassphrase };
            const void *values[] = { password };
            CFDictionaryRef optionsDictionary = CFDictionaryCreate(NULL, keys, values, 1, NULL, NULL);
            CFArrayRef p12Items;
            
            OSStatus result = SecPKCS12Import((__bridge CFDataRef)p12Data, optionsDictionary, &p12Items);
            
            CFRelease(optionsDictionary);
            
            if(result == noErr) {
                CFDictionaryRef identityDict = CFArrayGetValueAtIndex(p12Items, 0);
                SecIdentityRef identityApp =(SecIdentityRef)CFDictionaryGetValue(identityDict,kSecImportItemIdentity);
                
                SecCertificateRef certRef;
                SecIdentityCopyCertificate(identityApp, &certRef);
                
                SecCertificateRef certArray[1] = { certRef };
                CFArrayRef myCerts = CFArrayCreate(NULL, (void *)certArray, 1, NULL);
                CFRelease(certRef);
                
                NSURLCredential *credential = [NSURLCredential credentialWithIdentity:identityApp certificates:(__bridge NSArray *)myCerts persistence:NSURLCredentialPersistencePermanent];
                CFRelease(myCerts);
                
                [[challenge sender] useCredential:credential forAuthenticationChallenge:challenge];
            }
        }
    }];
    
}

- (void) start
{
    NSURLRequest * request = [NSURLRequest requestWithURL:self.url];
    
    AFHTTPRequestOperation *operation = [[AFHTTPRequestOperation alloc]
                                         initWithRequest:request];
    operation.responseSerializer = [AFJSONResponseSerializer serializer];
    
    [self setAuthHandler:operation];
    
    [operation setCompletionBlockWithSuccess:^(AFHTTPRequestOperation *operation, id responseObject) {
        NSLog(@"%@", responseObject);
    } failure:^(AFHTTPRequestOperation *operation, NSError *error) {
        NSLog(@"Failure: %@",error);
    }];

    [operation start];
}


@end
