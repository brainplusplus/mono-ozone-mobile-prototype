package com.fourtwosix.mono.webViewIntercept;


import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.data.widgetcommunication.PublishSubscribeAgent;
import com.fourtwosix.mono.data.widgetcommunication.interfaces.Callback;
import com.fourtwosix.mono.data.widgetcommunication.interfaces.IntentFragment;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.WebViewExecutor;
import com.fourtwosix.mono.views.WidgetWebView;
import com.fourtwosix.mono.webViewIntercept.json.JSONResponse;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import com.fourtwosix.mono.webViewIntercept.json.StatusResponse;

import org.apache.commons.lang.StringEscapeUtils;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.logging.Level;

/**
 * The handler between the web intercept and the Publish Subscribe layer.
 */
public class PublishSubscribeWebViewAPI implements WebViewsAPI {
    private static final String JSON_MIME_TYPE = "text/json";
    private static final String ENCODING = "UTF-8";

    private String guid;

    /**
     * Default constructor.
     */
    public PublishSubscribeWebViewAPI(String guid) {
        this.guid = guid;
    }

    /**
     * Determines how best to respond to the provided URI.
     * @param view The view that has pushed out the intercepted call.
     * @param methodName The URI to parse to determine which functionality to perform.
     * @param url The full URL from the web view.
     * @return A response based on which method was passed to the API.
     */
    @Override
    public WebResourceResponse handle(WebView view, String methodName, URL url) {
        String urlString = url.toString();
        int questionMarkLoc = urlString.indexOf('?');
        String data = urlString.substring(questionMarkLoc + 1);

        if(methodName.endsWith("/")) {
            methodName = methodName.substring(0, methodName.length() - 1);
        }

        JSONObject json = null;
        try {
            json = new JSONObject(URLDecoder.decode(data, "UTF-8"));
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, "Can't create JSON object from input data!", e);
            throw new IllegalArgumentException(e);
        }
        catch(UnsupportedEncodingException e) {
            LogManager.log(Level.SEVERE, "Can't create JSON object from input data, unsupported encoding!", e);
            throw new IllegalArgumentException(e);
        }

        // Make sure the view is a WidgetWebView
        WidgetWebView wwview = null;

        if(view instanceof WidgetWebView) {
            wwview = (WidgetWebView)view;
        }
        else {
            throw new IllegalArgumentException("Intents only work for WidgetWebViews.");
        }

        // Parse method calls
        JSONResponse response = null;
        if(methodName.equalsIgnoreCase("publish")) {
            response = publish(wwview, json);
        }
        else if(methodName.equalsIgnoreCase("subscribe")) {
            response = subscribe(wwview, json);
        }
        else if(methodName.equalsIgnoreCase("unsubscribe")) {
            response = unsubscribe(wwview, json);
        }
        else {
            return null;
        }

        if(response != null) {
            return new WebResourceResponse(JSON_MIME_TYPE, ENCODING, new ByteArrayInputStream(response.toString().getBytes()));
        }
        else {
            return null;
        }
    }

    /**
     * Publishes arbitrary data to a channel.  Subscribers to the channel will be notified of the new data.
     * @param json The input data to parse.  Should be a JSON object of the following format:
     *             - channelName: (string) The name of the channel to publish to.
     *             - data: (string) The string version of the Javascript object being published.
     * @return A status message encoded as WebResourceResponse object.
     */
    public JSONResponse publish(WidgetWebView view, JSONObject json) {
        try {
            if(view.getFragment() == null) {
                return new StatusResponse(Status.failure, "Publishing will only work inside of a dashboard or composite app.");
            }
            PublishSubscribeAgent pubsub = ((IntentFragment)view.getFragment()).getPublishSubscribeAgent();

            String channelName = json.getString("channelName");
            String pubData = json.getString("data");

            // Publish to channel
            pubsub.publish(channelName, pubData);

            return new StatusResponse(Status.success, "");
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, e.getMessage());

            return new StatusResponse(Status.failure, "");
        }
    }

    /**
     * Subscribes to a channel and listens for publish events.
     * Subscribers must provide a JavaScript function which will be triggered when a publish event occurs.
     * @param json The input data to parse.  Should be a JSON object of the following format:
     *             - channelName: (string) The name of the channel to publish to.
     *             - functionCallback: (string) The JavaScript function to call.  Should be base64 encoded.
     * @return A status message encoded as WebResourceResponse object.
     */
    public JSONResponse subscribe(WidgetWebView view, JSONObject json) {
        try {
            if(view.getFragment() == null) {
                return new StatusResponse(Status.failure, "Subscribing will only work inside of a dashboard or composite app.");
            }
            PublishSubscribeAgent pubsub = ((IntentFragment)view.getFragment()).getPublishSubscribeAgent();

            String channelName = json.getString("channelName");
            String functionCallback = json.getString("functionCallback");

            // Publish to channel
            pubsub.subscribe(channelName, new JavascriptCallback(view, functionCallback, guid));

            return new StatusResponse(Status.success, "");
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, "Json error!", e);

            return new StatusResponse(Status.failure, "");
        }
    }

    /**
     * Unsubscribes the widget from a channel.
     * @param json The input data to parse.  Should be a JSON object of the following format:
     *             - channelName: (string) The name of the channel to publish to.
     * @return A status message encoded as WebResourceResponse object.
     */
    public JSONResponse unsubscribe(WidgetWebView view, JSONObject json) {
        try {
            if(view.getFragment() == null) {
                return new StatusResponse(Status.failure, "Unsubscribing will only work inside of a dashboard or composite app.");
            }
            PublishSubscribeAgent pubsub = ((IntentFragment)view.getFragment()).getPublishSubscribeAgent();

            String channelName = json.getString("channelName");

            // Publish to channel
            pubsub.unsubscribe(channelName, guid);

            return new StatusResponse(Status.success, "");
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, e.getMessage());

            return new StatusResponse(Status.failure, "");
        }
    }

    // JavaScript callback class
    private class JavascriptCallback implements Callback {
        private WebView view;
        private String javascriptFunction;
        private String guid;

        public JavascriptCallback(WebView view, String javascriptFunction, String guid) {
            this.view = view;
            this.javascriptFunction = javascriptFunction;
            this.guid = guid;
        }

        @Override
        public String getId() {
            return guid;
        }

        @Override
        public void run(String data) {
            try {
                JSONObject idJson = new JSONObject().put("id", guid);
                String script = "javascript:Mono.Callbacks.Callback(\"" + javascriptFunction + "\", JSON.stringify(" + idJson.toString() + "), \"" + StringEscapeUtils.escapeJavaScript(data) + "\")";
                new WebViewExecutor(view).loadUrl(script);
            }
            catch(JSONException e) {
                LogManager.log(Level.SEVERE, "JSON error calling Javascript!");
            }
        }

        @Override
        public String getOutput() {
            return "";
        }
    }
}
