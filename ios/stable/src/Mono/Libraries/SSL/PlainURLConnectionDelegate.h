//
//  PlainURLConnectionDelegate.h
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

@interface PlainURLConnectionDelegate : NSObject  <NSURLConnectionDelegate>

// On Sync requests, this will contain the error that occured, if any.
@property (readonly, strong, nonatomic) NSError * error;

//Current Connection
@property (strong, nonatomic) NSURLConnection * connection;

-(id)initWithURL:(NSURL *)anUrl;
-(id)initWithRequest:(NSURLRequest*)req;
-(NSData *)fetchSync;
-(void)fetchAsyncCallback:(void(^)(NSData * data, NSError * error))cback;

@end
