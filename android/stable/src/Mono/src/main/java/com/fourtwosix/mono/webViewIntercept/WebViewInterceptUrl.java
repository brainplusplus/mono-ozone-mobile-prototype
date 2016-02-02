package com.fourtwosix.mono.webViewIntercept;

import com.fourtwosix.mono.utils.LogManager;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.logging.Level;

public class WebViewInterceptUrl {
    String strippedUrl;
    String apiPackageName;
    String methodName;
    URL fullUrl;
    String remainder;

    public WebViewInterceptUrl(String url, String OZONE_PREFIX) {
        this.strippedUrl = url.substring(url.indexOf(OZONE_PREFIX)+OZONE_PREFIX.length()); // Remove ozone prefix

        int questionMarkLoc = strippedUrl.indexOf('?');
        int firstSlash = strippedUrl.indexOf('/');
        if(firstSlash == -1) {
            // Error!
        }
        this.apiPackageName = strippedUrl.substring(0, firstSlash);
        if(questionMarkLoc == -1) {
            this.methodName = strippedUrl.substring(firstSlash + 1);
        }
        else {
            this.methodName = strippedUrl.substring(firstSlash + 1, questionMarkLoc); // Method to call
        }
        this.fullUrl = null;
        try {
            this.fullUrl = new URL(url.replace(OZONE_PREFIX + apiPackageName + "/" + methodName + "?/", ""));
        } catch (MalformedURLException e) {
            LogManager.log(Level.SEVERE, "MalformedURLException: ", e);
        }
        this.remainder = strippedUrl.replace(apiPackageName + "/" + methodName + "?", "");
    }

    public String getStrippedUrl() {
        return this.strippedUrl;
    }

    public String getApiPackageName() {
        return this.strippedUrl;
    }

    public String getMethodName() {
        return this.strippedUrl;
    }

    public URL getFullUrl() {
        return this.fullUrl;
    }
    public String getRemainder() {
        return this.remainder;
    }
}