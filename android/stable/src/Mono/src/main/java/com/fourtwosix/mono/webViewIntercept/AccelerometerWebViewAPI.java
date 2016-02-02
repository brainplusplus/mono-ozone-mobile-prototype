package com.fourtwosix.mono.webViewIntercept;

import android.content.ComponentCallbacks;
import android.content.Context;

import android.content.res.Configuration;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.util.DisplayMetrics;
import android.view.Display;
import android.view.OrientationEventListener;
import android.view.Surface;
import android.view.WindowManager;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.views.WidgetWebView;
import com.fourtwosix.mono.webViewIntercept.json.AccelerometerResponse;
import com.fourtwosix.mono.webViewIntercept.json.OrientationResponse;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import com.fourtwosix.mono.webViewIntercept.json.StatusResponse;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.ByteArrayInputStream;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.logging.Level;

/**
 * Created by alerman on 1/21/14.
 */
public class AccelerometerWebViewAPI  implements WebViewsAPI {

    private static final String JSON_MIME_TYPE = "text/json";
    private static final String UTF_8 = "UTF-8";

    private static float curX;
    private static float curY;
    private static float curZ;

    private static SensorManager sm = null;

    public AccelerometerWebViewAPI(Context context) {
        if (sm == null) {
            sm = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
            if (sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null)

            {
                SensorEventListener sel = new SensorEventListener() {
                    @Override
                    public void onSensorChanged(SensorEvent event) {
                        curX = event.values[0];
                        curY = event.values[1];
                        curZ = event.values[2];
                    }

                    @Override
                    public void onAccuracyChanged(Sensor sensor, int accuracy) {

                    }
                };

                sm.registerListener(sel,
                        sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER),
                        500000); // In microseconds
            }
        }
    }

    @Override
    public WebResourceResponse handle(WebView view, String methodName, URL fullUrl) {

        String urlString = fullUrl.toString();
        String data = urlString.substring(urlString.indexOf(methodName));

        //String data = uri.substring(uri.indexOf('/') + 1);
        if (methodName.equalsIgnoreCase("detectOrientationChange")) {
            return DetectOrienatationChange(view, data.substring(data.indexOf('/') + 1));
        }

        if (methodName.equalsIgnoreCase("unregister")) {
            return Unregister(view, data.substring(data.indexOf('/') + 1));
        }

        if (methodName.equalsIgnoreCase("register")) {
            return RegisterForUpdate(view, data.substring(data.indexOf('/') + 1));
        } else return null;
    }

    private WebResourceResponse Unregister(WebView view, String type) {
        if (type.equalsIgnoreCase("orientation")) {
            orientationListeners.remove(view);
            StatusResponse sr = new StatusResponse(Status.success, "Unregistered for orienatation change events");
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(sr.toString().getBytes()));

        } else if (type.equalsIgnoreCase("accelerometer")) {
            SensorEventListener sel = registeredSensors.get(view);
            SensorManager sm = (SensorManager) view.getContext().getSystemService(Context.SENSOR_SERVICE);
            sm.unregisterListener(sel);
            registeredSensors.remove(view);

            StatusResponse sr = new StatusResponse(Status.success, "Unregistered for accelerometer change events");
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(sr.toString().getBytes()));
        } else {
            StatusResponse sr = new StatusResponse(Status.failure, "Unrecognized sensor type. Must be one of {'orientation','accelerometer'}");
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(sr.toString().getBytes()));
        }
    }

    public void UnregisterAll(WebView view) {
        // Remove everything
        ComponentCallbacks oel = orientationListeners.get(view);

        if(oel != null) {
            orientationListeners.remove(view);
        }
        SensorEventListener sel = registeredSensors.get(view);

        if(sel != null) {
            SensorManager sm = (SensorManager) view.getContext().getSystemService(Context.SENSOR_SERVICE);
            sm.unregisterListener(sel);
            registeredSensors.remove(view);
        }
    }

    private static Map<WebView, ComponentCallbacks> orientationListeners = new HashMap<WebView, ComponentCallbacks>();

    private WebResourceResponse DetectOrienatationChange(final WebView view, final String allData) {
        String data = allData.substring(allData.indexOf('?') + 1);
        JsonParser parser = new JsonParser();
        JsonObject obj = (JsonObject) parser.parse(data);

        final String functionName = obj.get("%22callback%22").getAsString().replaceAll("%22", "");
        final ComponentCallbacks listener = new ComponentCallbacks() {
            private int lastRotation = -1;

            @Override
            public void onConfigurationChanged(Configuration configuration) {
                Display display = ((WindowManager) view.getContext().getSystemService(Context.WINDOW_SERVICE)).getDefaultDisplay();
                int rotation = display.getRotation();

                // No need to fire an event if we haven't changed our rotation state
                if (rotation == lastRotation) {
                    return;
                }

                String orientationResponse = rotationToString(rotation, configuration);
                OrientationResponse or = new OrientationResponse(Status.success, orientationResponse);

                String url = "javascript:Mono.Callbacks.Callback('" + functionName + "', " + or.toString() + ")";
                view.loadUrl(url);

                lastRotation = rotation;
            }

            @Override
            public void onLowMemory() {
                // Do nothing
            }
        };

        view.getContext().getApplicationContext().registerComponentCallbacks(listener);
        orientationListeners.put(view, listener);

        // Trigger once on registration
        new Handler(view.getContext().getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                listener.onConfigurationChanged(view.getContext().getResources().getConfiguration());
            }
        });

        StatusResponse sr = new StatusResponse(Status.success, "Registered for orienatation change events");
        return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(sr.toString().getBytes()));
    }

    private static Map<WebView, SensorEventListener> registeredSensors = new HashMap<WebView, SensorEventListener>();

    private WebResourceResponse RegisterForUpdate(final WebView view, final String allData) {
        String data = allData.substring(allData.indexOf('?') + 1);
        JsonParser parser = new JsonParser();
        JsonObject obj = (JsonObject) parser.parse(data);

        final String functionName = obj.get("%22callback%22").getAsString().replaceAll("%22", "");
        final int interval = Integer.valueOf(obj.get("%22interval%22").getAsString().replaceAll("%22", ""));

        Timer timer = new Timer();
        IntervalTask task = new IntervalTask((WidgetWebView) view, functionName); // Guaranteed to be a WidgetWebView

        timer.scheduleAtFixedRate(task, 0, interval * 1000);

        StatusResponse sr = new StatusResponse(Status.success, "Registered for accelerometer events");
        return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(sr.toString().getBytes()));
    }

    private String rotationToString(int rotation, Configuration configuration) {
        // Start with unknown
        String orientationResponse = "Unknown";

        if(configuration.orientation == Configuration.ORIENTATION_PORTRAIT &&
                (rotation == Surface.ROTATION_0 || rotation == Surface.ROTATION_90)) {
            orientationResponse = "portrait";
        }
        else if(configuration.orientation == Configuration.ORIENTATION_PORTRAIT &&
                (rotation == Surface.ROTATION_180 || rotation == Surface.ROTATION_270)) {
            orientationResponse = "upsideDown";
        }
        else if(configuration.orientation == Configuration.ORIENTATION_LANDSCAPE &&
                (rotation == Surface.ROTATION_0 || rotation == Surface.ROTATION_90)) {
            orientationResponse = "landscapeRight";
        }
        else if(configuration.orientation == Configuration.ORIENTATION_LANDSCAPE &&
                (rotation == Surface.ROTATION_180 || rotation == Surface.ROTATION_270)) {
            orientationResponse = "landscapeLeft";
        }

        return orientationResponse;
    }

    private static class IntervalTask extends TimerTask {
        // The webView and function to run on
        private WidgetWebView webView;
        private String function;

        public IntervalTask(WidgetWebView webView, String function) {
            this.webView = webView;
            this.function = function;
        }

        @Override
        public void run() {
            // Run on the main thread
            new Handler(webView.getContext().getMainLooper()).post(new Runnable() {
                @Override
                public void run() {
                    // If the webView has been cleaned up, cancel this task
                    if(webView.currentlyExecuting() == false) {
                        cancel();
                    }
                    // Otherwise, execute the task
                    else {
                        AccelerometerResponse response = new AccelerometerResponse(curX, curY, curZ, new StatusResponse(Status.success, ""));
                        String url = "javascript:Mono.Callbacks.Callback('" + function + "', " + response.toString() + ")";
                        webView.loadUrl(url);
                    }
                }
            });
        }
    }
}
