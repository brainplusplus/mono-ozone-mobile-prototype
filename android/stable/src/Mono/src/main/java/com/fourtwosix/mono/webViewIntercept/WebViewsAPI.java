package com.fourtwosix.mono.webViewIntercept;

import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import java.net.URL;

/**
 * Base WebViewsAPI class.  Should be extended when adding new functionality to the
 * WebViewIntercept.
 */
public interface WebViewsAPI {
    /**
     * Handles intercepted query calls and performs an operation based on the method name.
     *
     * @param view The view that has pushed out the intercepted call.
     * @param methodName The method name of the operation.
     * @param fullUrl
     * @return An appropriate web based response based on the implementing class and the supplied arguments.
     */
    public WebResourceResponse handle(WebView view, String methodName, URL fullUrl);
}
