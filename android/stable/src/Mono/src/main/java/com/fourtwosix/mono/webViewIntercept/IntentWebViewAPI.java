package com.fourtwosix.mono.webViewIntercept;


import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.data.widgetcommunication.interfaces.IntentFragment;
import com.fourtwosix.mono.fragments.BaseFragment;
import com.fourtwosix.mono.structures.OzoneIntent;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.views.WidgetWebView;
import com.fourtwosix.mono.webViewIntercept.json.JSONResponse;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import com.fourtwosix.mono.webViewIntercept.json.StatusResponse;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;

/**
 * The handler between the web intercept and the Publish Subscribe layer.
 */
public class IntentWebViewAPI implements WebViewsAPI {
    private static final String JSON_MIME_TYPE = "text/json";
    private static final String ENCODING = "UTF-8";

    private String instanceId;
    private String widgetGuid;

    /**
     * Default constructor.
     */
    public IntentWebViewAPI(String instanceId, String widgetGuid) {
        this.instanceId = instanceId;
        this.widgetGuid = widgetGuid;
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
        if(methodName.equalsIgnoreCase("startActivity")) {
            response = startActivity(wwview, json);
        }
        else if(methodName.equalsIgnoreCase("receive")) {
            response = receive(wwview, json);
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
     * Starts an intent.  This will push out a new intent, and should start a widget if the widget issuing
     * the call is part of a composite app.
     * @param webView The WebView of the widget that is starting the activity.
     * @param json The input data to parse.  Should be a JSON object of the following format:
     *             - intent: (object) The Javascript object intent.
     *             - data: (object) The Javascript object data.
     *             - dest: (string []) (optional) - The explicit destinations of the activity.
     *             - handler: (string) The JavaScript function to call when the activity finishes.  Should be base64 encoded.
     * @return A status message encoded as WebResourceResponse object.
     */
    public JSONResponse startActivity(WidgetWebView webView, JSONObject json) {
        try {
            JSONObject intentJson = json.getJSONObject("intent");
            JSONObject data = json.getJSONObject("data");

            String callbackHandler = null;
            if(json.has("handler")) {
                String intentCallback = json.getString("handler");
                callbackHandler = intentCallback;
            }

            List<String> destinations = null;
            if(json.has("dest")) {
                JSONArray destJson = json.getJSONArray("dest");
                int numDests = destJson.length();

                destinations = new ArrayList<String>();
                for(int i=0; i<numDests; i++) {
                    destinations.add(destJson.getString(i));
                }
            }

            OzoneIntent intent = new OzoneIntent();
            intent.setGuid(instanceId);
            intent.setData(data);
            intent.setJavascriptCallback(callbackHandler);
            intent.setIntent(intentJson.toString());

            JSONObject jsonObject = new JSONObject(intentJson.toString());
            intent.setAction(jsonObject.getString("action"));
            intent.setType(jsonObject.getString("dataType"));

            BaseFragment fragment = webView.getFragment();
            if(fragment instanceof IntentFragment) {
                IntentFragment intentFragment = (IntentFragment)fragment;
                intentFragment.getIntentProcessor().processIntent(intent, destinations);
            }

            return new StatusResponse(Status.success, "");
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, e.getMessage());

            return new StatusResponse(Status.failure, "");
        }
    }

    /**
     * Establishes a receiver for an intent.
     * Subscribers must provide a JavaScript function which will be triggered when a publish event occurs.
     * @param webView The WebView of the widget that is starting the activity.
     * @param json The input data to parse.  Should be a JSON object of the following format:
     *             - intent: (object) The Javascript object intent.
     *             - handler: (string) The JavaScript function to call.  Should be base64 encoded.
     * @return A status message encoded as WebResourceResponse object.
     */
    public JSONResponse receive(WidgetWebView webView, JSONObject json) {
        try {
            if(webView.getFragment() == null) {
                return new StatusResponse(Status.failure, "Receiving an intent will only work inside of a dashboard or composite app.");
            }

            BaseFragment baseFragment = webView.getFragment();
            if(baseFragment instanceof IntentFragment) {
                JSONObject intent = json.getJSONObject("intent");
                String functionCallback = json.getString("handler");

                //Parse the javascript callback
                String javascriptCallback =  functionCallback;

                //get the action and dataType for the intent
                String action = intent.getString("action");
                String dataType = intent.getString("dataType");

                IntentFragment intentFragment = (IntentFragment)baseFragment;
                intentFragment.getIntentProcessor().registerReceiver(instanceId, action, dataType, javascriptCallback);
            }

            return new StatusResponse(Status.success, "");
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, "Json error!", e);

            return new StatusResponse(Status.failure, "");
        }
    }
}
