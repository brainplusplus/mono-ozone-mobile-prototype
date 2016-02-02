//
//  CameraViewController.m
//  foo
//
//  Created by Ben Scazzero on 12/17/13.
//  Copyright (c) 2013 Ben Scazzero. All rights reserved.
//

#import "CameraViewController.h"

@interface CameraViewController ()

@end

@implementation CameraViewController

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

    if (![UIImagePickerController isSourceTypeAvailable:UIImagePickerControllerSourceTypeCamera]) {
        
        UIAlertView *myAlertView = [[UIAlertView alloc] initWithTitle:@"Error"
                                                              message:@"Device has no camera"
                                                             delegate:nil
                                                    cancelButtonTitle:@"OK"
                                                    otherButtonTitles: nil];
        
        [myAlertView show];
        
        [_webView removeFromSuperview];
    }else{
       // NSString *path = [[NSBundle mainBundle] bundlePath];
       // NSURL *baseURL = [NSURL fileURLWithPath:path];
       // [webView loadHTMLString:htmlString baseURL:baseURL];
        
        [_webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"http://10.1.11.18:80/hardware/camera.html"]]];

    }
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

#pragma mark - UIWebViewDelegate

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
{
    NSLog(@"NSURLRequest: %@",request);
    NSURL *url = request.URL;
    
    //check host
    if ([@"native.owf" isEqualToString:[url host]]) {
        //check path
        if ([@"/hardware/camera" isEqualToString:[url path]]) {
            //update gps location
            UIImagePickerController *picker = [[UIImagePickerController alloc] init];
            picker.delegate = self;
            picker.allowsEditing = YES;
            picker.sourceType = UIImagePickerControllerSourceTypeCamera;
            [self presentViewController:picker animated:YES completion:NULL];
            
            return NO;
        }
    }
    return YES;
}

-(void) webViewDidFinishLoad:(UIWebView *)webView
{
    if (_baseHTML == nil) {
        _baseHTML = [_webView stringByEvaluatingJavaScriptFromString:@"$('html').html()"];
        _baseHTML = [[@"<html>" stringByAppendingString:_baseHTML] stringByAppendingString:@"</html>"];
    }
}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error
{
    NSLog(@"%@",error);
}

#pragma mark - UIImagePickerDelegate

- (void)imagePickerController:(UIImagePickerController *)picker didFinishPickingMediaWithInfo:(NSDictionary *)info {
    
    UIImage *chosenImage = [info objectForKey:UIImagePickerControllerEditedImage];
    
    CGSize newSize = CGSizeMake(250, 250);
    UIGraphicsBeginImageContext(newSize);
    [chosenImage drawInRect:CGRectMake(0,0,newSize.width,newSize.height)];
    UIImage* newImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    
    // Save the image to the filesystem
    NSData *imageData = UIImagePNGRepresentation(newImage);
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documentsPath = [paths objectAtIndex:0];
    
    static int imgCount = 0;
    NSString * name = [NSString stringWithFormat:@"CameraPhoto%d.png",imgCount];
    imgCount += 1;
    
    NSString* savePath = [documentsPath stringByAppendingPathComponent:name];
    NSError * error = nil;
    BOOL success =[[NSFileManager defaultManager] removeItemAtPath:savePath error:&error];
    if (!success || error) {
        NSLog(@"%@",error);
    }
    BOOL result = [imageData writeToFile:savePath atomically:YES];
    
    if(result)
        NSLog(@"Saved Image");
    else
        NSLog(@"Could Not Save Image");
    
    // Load the HTML into the webview

    NSString * html = [_baseHTML stringByReplacingOccurrencesOfString:@"{CameraPhoto}" withString:name];
    [_webView loadHTMLString:html baseURL:[NSURL fileURLWithPath:documentsPath]];
    
    [picker dismissViewControllerAnimated:YES completion:NULL];
}

- (void)imagePickerControllerDidCancel:(UIImagePickerController *)picker {
    
    [picker dismissViewControllerAnimated:YES completion:NULL];
    
}

@end
