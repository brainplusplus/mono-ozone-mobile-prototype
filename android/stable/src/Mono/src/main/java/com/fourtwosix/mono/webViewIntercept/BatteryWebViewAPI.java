package com.fourtwosix.mono.webViewIntercept;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Handler;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.fourtwosix.mono.utils.LogManager;

import com.fourtwosix.mono.webViewIntercept.json.BatteryResponse;
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
 * Created by alerman on 1/15/14.
 */
public class BatteryWebViewAPI implements WebViewsAPI {

    public WebResourceResponse handle(WebView view, String methodName, URL fullUrl) {
        String urlString = fullUrl.toString();
        String data = urlString.substring(urlString.indexOf(methodName));

        //String data = uri.substring(uri.indexOf('/') + 1);
        if (methodName.equalsIgnoreCase("percentage")) {
            return GetBatteryPercentage(view.getContext());
        }

        if (methodName.equalsIgnoreCase("chargingState")) {
            return GetChargingState(view.getContext());
        }

        if (methodName.equalsIgnoreCase("register")) {
            return RegisterForUpdate(view, fullUrl);
        } else {
            StatusResponse statusResponse = new StatusResponse(Status.failure, "Unrecognized method.");
            return new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        }
    }

    public static WebResourceResponse GetBatteryPercentage(Context context) {
        Intent batteryIntent = context.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        int level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, 0);
        int scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        BatteryResponse.Percentage percentageResponse = new BatteryResponse.Percentage(Status.success, level * 100 / scale);
        WebResourceResponse result = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(percentageResponse.toString().getBytes()));
        return result;

    }

    public static WebResourceResponse GetChargingState(Context context) {
        Intent batteryIntent = context.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        int status = batteryIntent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        BatteryResponse.BatteryState chargingState = batteryStatusToBatteryState(status);
        BatteryResponse.ChargingState chargingStateResponse = new BatteryResponse.ChargingState(Status.success, chargingState);
        WebResourceResponse result = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(chargingStateResponse.toString().getBytes()));
        return result;
    }

    private static Map<WebView, BroadcastReceiver> registeredRecievers = new HashMap<WebView, BroadcastReceiver>();

    public static WebResourceResponse RegisterForUpdate(final WebView view, URL url) {
        final String functionName;

        try {
            JSONObject json = new JSONObject(url.getQuery());

            if(json.has("%22callback%22")) {
                functionName = json.getString("%22callback%22").replaceAll("%22", "");
            }
            else {
                throw new JSONException("Can't find callback field in JSON.");
            }
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, "Error parsing input JSON!", e);

            StatusResponse response = new StatusResponse(Status.failure, "Unable to parse input JSON.");
            return new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(response.toString().getBytes()));
        }

        final BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                BatteryResponse.BatteryState chargingState = batteryStatusToBatteryState(status);
                int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, 0);
                int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
                BatteryResponse.AllInfo allResponse = new BatteryResponse.AllInfo(Status.success, level * 100 / scale, chargingState);
                String url = "javascript:Mono.Callbacks.Callback('" + functionName + "', " + allResponse.toString() + ")";
                view.loadUrl(url);
            }
        };

        registeredRecievers.put(view, receiver);

        view.getContext().registerReceiver(receiver, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        final Intent currentBattery = view.getContext().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));

        new Handler(view.getContext().getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                receiver.onReceive(view.getContext(), currentBattery);
            }
        });

        StatusResponse statusResponse = new StatusResponse(Status.success);
        WebResourceResponse result = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        return result;
    }

    public static WebResourceResponse UnregisterForUpdate(final WebView view) {
        BroadcastReceiver receiver = registeredRecievers.get(view);

        if(receiver != null) {
            view.getContext().unregisterReceiver(registeredRecievers.get(view));
            registeredRecievers.remove(view);
        }

        StatusResponse statusResponse = new StatusResponse(Status.unregistered);
        WebResourceResponse result = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        return result;

    }

    private static BatteryResponse.BatteryState batteryStatusToBatteryState(int status) {
        BatteryResponse.BatteryState chargingState = BatteryResponse.BatteryState.discharging;
        if (status == BatteryManager.BATTERY_STATUS_FULL) {
            chargingState = BatteryResponse.BatteryState.charged;
        } else {
            if (status == BatteryManager.BATTERY_STATUS_CHARGING) {
                chargingState = BatteryResponse.BatteryState.charging;
            }
        }

        return chargingState;
    }
}
