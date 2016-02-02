//
//  PinnedAndClientAuthHTTPSConnection.h
//  Security Pinning by CA
//
// Copyright (c) 2013 Dirk-Willem van Gulik <dirkx@webweaving.org>,
//                       All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

#import "PinnedHTTPSConnection.h"


@interface PinnedAndClientAuthHTTPSConnection : PinnedHTTPSConnection

-(id)initWithURL:(NSURL *)anUrl withPKCS12Client:(NSString *)pkcs12Path withPassword:(NSString *)password withRootCA:(NSString *)caDerFilePath strictHostNameCheck:(BOOL)check ;
-(id)initWithURL:(NSURL *)anUrl withIdentity:(SecIdentityRef)anIdentityRef withIdentityChain:(NSArray*)aClientChainOfSecCertificateRef withRootCAs:(NSArray *)anArrayOfSecCertificateRef strictHostNameCheck:(BOOL)check;
-(id)initWithURL:(NSURL *)anUrl;
-(id)initWithRequest:(NSURLRequest *)req;

@end
