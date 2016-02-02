package com.fourtwosix.mono.utils;

import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import com.fourtwosix.mono.views.WidgetWebView;

import org.json.JSONException;

/**
 * A variety of useful functions that need to be executed by our program.
 */
public class WebViewExecutor {
    WebView view;

    /**
     * Creates a new WebViewExecutor that can load URLs into the view.
     * @param view The view to load URLs into.
     */
    public WebViewExecutor(WebView view) {
        this.view = view;
    }

    /**
     * Loads the given URL into the webview given in the constructor.
     * Can also be used to make Javascript calls as well.
     * @param url The URL to load into the WebView.
     * @throws JSONException
     */
    public void loadUrl(String url) throws JSONException {
        LoadUrl loadUrl = new LoadUrl(view, url);
        Looper looper = view.getContext().getMainLooper();

        // Dispatch null message -- we don't care what the content is
        new Handler(looper).post(loadUrl);
        while(loadUrl.hasHandlerRun() == false) {
            // Do nothing and wait
        }
    }

    public boolean getCurrentlyExecuting() throws IllegalArgumentException {
        if(view instanceof WidgetWebView) {
            WidgetWebView wwview = (WidgetWebView) view;
            GetCurrentlyExecuting getCurrentlyExecuting = new GetCurrentlyExecuting(wwview);
            Looper looper = wwview.getContext().getMainLooper();

            // Dispatch null message -- we don't care what the content is
            new Handler(looper).post(getCurrentlyExecuting);
            while(getCurrentlyExecuting.hasHandlerRun() == false) {
                // Do nothing and wait
            }

            return getCurrentlyExecuting.isCurrentlyExecuting();
        }
        else {
            throw new IllegalArgumentException("getCurrentlyExecuting will only work on WidgetWebViews.");
        }
    }

    private class LoadUrl implements Runnable {
        private boolean handlerRun;
        private String url;
        private WebView view;

        public LoadUrl(WebView view, String url) {
            this.view = view;
            this.url = url;

            handlerRun = false;
        }

        public boolean hasHandlerRun() {
            return handlerRun;
        }

        public void run() {
            if(view != null) {
                view.loadUrl(url);
            }
            handlerRun = true;
        }
    }

    private class GetCurrentlyExecuting implements Runnable {
        private boolean handlerRun;
        private boolean currentlyExecuting;
        private WidgetWebView view;

        public GetCurrentlyExecuting(WidgetWebView view) {
            this.view = view;

            handlerRun = false;
            currentlyExecuting = false;
        }

        public boolean hasHandlerRun() {
            return handlerRun;
        }

        public boolean isCurrentlyExecuting() {
            return currentlyExecuting;
        }

        public void run() {
            currentlyExecuting = view.currentlyExecuting();
            handlerRun = true;
        }
    }
}
