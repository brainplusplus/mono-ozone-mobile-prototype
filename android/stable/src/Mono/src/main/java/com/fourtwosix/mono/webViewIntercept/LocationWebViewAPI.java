package com.fourtwosix.mono.webViewIntercept;

import android.content.Context;

import android.location.Criteria;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.views.WidgetWebView;
import com.fourtwosix.mono.webViewIntercept.json.LocationResponse;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import com.fourtwosix.mono.webViewIntercept.json.StatusResponse;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;

/**
 * Created by alerman on 1/21/14.
 */
public class LocationWebViewAPI implements WebViewsAPI {

    private static final String JSON_MIME_TYPE = "text/json";
    private static final String UTF_8 = "UTF-8";

    private static LocationManager lm = null;

    private static LocationLooperThread looperThread = null;
    private static Looper looper;

    private static Map<WebView,LocationListener> registeredListeners = new HashMap<WebView,LocationListener>();

    private Context context;

    public LocationWebViewAPI(Context context) {
        if(lm == null) {
            this.context = context.getApplicationContext();
            lm = (LocationManager) context.getSystemService(this.context.LOCATION_SERVICE);
            looperThread = new LocationLooperThread();
        }
    }

    @Override
    public WebResourceResponse handle(WebView view, String methodName, URL fullUrl) {

        String urlString = fullUrl.toString();
        String data = urlString.substring(urlString.indexOf(methodName));

        //String data = uri.substring(uri.indexOf('/') + 1);
        if (methodName.equalsIgnoreCase("current")) {
            return getCurrentLocation(view, fullUrl);
        }
        else if (methodName.equalsIgnoreCase("register")) {
            return RegisterForUpdates(view, fullUrl);
        }
        else if (methodName.equalsIgnoreCase("disableUpdates")) {
            return Unregister(view);
        }

        StatusResponse response =  new StatusResponse(Status.failure, "Unrecognized method " + methodName + ".");
        return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(response.toString().getBytes()));
    }

    private WebResourceResponse getCurrentLocation(final WebView view, final URL url) {
        String query = url.getQuery();

        final String functionName;
        int interval = 1;

        try {
            JSONObject json = new JSONObject(query);

            if(json.has("%22callback%22") == false) {
                StatusResponse response =  new StatusResponse(Status.failure, "No callback found in JSON.");
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(response.toString().getBytes()));
            }

            functionName = json.getString("%22callback%22").replaceAll("%22", "");

            if(json.has("%22interval%22") == true) {
                interval = json.getInt("%22interval%22");
            }
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, "Unable to parse the JSON object.");
            StatusResponse response =  new StatusResponse(Status.failure, "Can't parse JSON.");
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(response.toString().getBytes()));
        }


        return getUpdates(view, functionName, interval, 0);
    }

    public WebResourceResponse RegisterForUpdates(WebView webView, URL url) {
        String query = url.getQuery();

        final String functionName;
        int radius = 1;

        try {
            JSONObject json = new JSONObject(query);

            if(json.has("%22callback%22") == false) {
                StatusResponse response =  new StatusResponse(Status.failure, "No callback found in JSON.");
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(response.toString().getBytes()));
            }

            functionName = json.getString("%22callback%22").replaceAll("%22", "");

            if(json.has("%22radius%22") == true) {
                radius = json.getInt("%22radius%22");
            }
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, "Unable to parse the JSON object.");
            StatusResponse response =  new StatusResponse(Status.failure, "Can't parse JSON.");
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(response.toString().getBytes()));
        }


        return getUpdates(webView, functionName, 0, radius);
    }

    private WebResourceResponse getUpdates(final WebView webView, final String functionName, int interval, int distance) {

        LocationListener listener = new LocationListener() {
            @Override
            public void onLocationChanged(final Location location) {
                new Handler(Looper.getMainLooper()).post(new Runnable() {
                    @Override
                    public void run() {
                        WidgetWebView wwv = (WidgetWebView) webView;
                        if (wwv.currentlyExecuting() == false) {
                            Unregister(wwv);
                        }

                        String responseText;
                        if (location != null) {
                            LocationResponse response = new LocationResponse(Status.success, location);
                            responseText = response.toString();
                        } else {
                            StatusResponse response = new StatusResponse(Status.success, "Location is null.");
                            responseText = response.toString();
                        }
                        String url = "javascript:Mono.Callbacks.Callback('" + functionName + "'," + responseText + ")";
                        webView.loadUrl(url);
                    }
                });
            }
            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {
                LogManager.log(Level.SEVERE, "Status changed: Provider: " + provider + ", status: " + status);
            }

            @Override
            public void onProviderEnabled(String provider) {
                LogManager.log(Level.SEVERE, "Provider enabled: Provider: " + provider);
            }

            @Override
            public void onProviderDisabled(String provider) {
                LogManager.log(Level.SEVERE, "Provider disabled: Provider: " + provider);
            }
        };

        // Make sure the looper is prepared

        if(looperThread.isAlive() == false) {
            looperThread.start();
        }

        while(looper == null);

        if(registeredListeners.containsKey(webView)) {
            lm.removeUpdates(registeredListeners.get(webView));
        }
        registeredListeners.put(webView, listener);


        String bestProvider = lm.getBestProvider(new Criteria(), true);
        lm.requestLocationUpdates(bestProvider, interval * 1000, distance, listener, looper);
        lm.requestSingleUpdate(new Criteria(), listener, looper);

        StatusResponse response = new StatusResponse(Status.success);
        response.setMessage("Successfully registered for location updates");
        return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(response.toString().getBytes()));
    }

    public WebResourceResponse Unregister(WebView view) {
        LocationListener listener = registeredListeners.get(view);
        if(listener != null){
            lm.removeUpdates(listener);
            registeredListeners.remove(view);

            if(registeredListeners.isEmpty()) {
                if(looper != null) {
                    looper.quit();
                }

                while(looperThread.isAlive() == true);

                looperThread = new LocationLooperThread(); // Set this up for next execution
            }

            StatusResponse response = new StatusResponse(Status.success);
            response.setMessage("Successfully unregistered location updates");
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(response.toString().getBytes()));


        }
        else {
            StatusResponse response = new StatusResponse(Status.failure);
            response.setMessage("No Listener found for this widget");
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(response.toString().getBytes()));

        }
    }

    private class LocationLooperThread extends Thread {
        public LocationManager lm;

        @Override
        public void run() {
            Looper.prepare();

            looper = Looper.myLooper();

            Looper.loop();

            looper = null;
        }
    }
}
