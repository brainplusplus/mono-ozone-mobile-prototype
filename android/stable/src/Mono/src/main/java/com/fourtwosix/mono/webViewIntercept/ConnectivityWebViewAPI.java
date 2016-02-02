package com.fourtwosix.mono.webViewIntercept;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.webViewIntercept.json.ConnectivityResponse;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import com.fourtwosix.mono.webViewIntercept.json.StatusResponse;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.ByteArrayInputStream;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by alerman on 1/21/14.
 */
public class ConnectivityWebViewAPI implements WebViewsAPI {

    private static Map<WebView, BroadcastReceiver> registeredRecievers = new HashMap<WebView, BroadcastReceiver>();

    @Override
    public WebResourceResponse handle(WebView view, String methodName, URL fullUrl) {

        String urlString = fullUrl.toString();
        String data = urlString.substring(urlString.indexOf(methodName));

        //String data = uri.substring(uri.indexOf('/') + 1);
        if (methodName.equalsIgnoreCase("isOnline")) {
            return IsOnline(view.getContext());
        }

        if (methodName.equalsIgnoreCase("unregister")) {
            return Unregister(view);
        }

        if (methodName.equalsIgnoreCase("register")) {
            return RegisterForUpdate(view, data.substring(data.indexOf('/') + 1));
        } else {
            StatusResponse response =  new StatusResponse(Status.failure, "Unrecognized method " + methodName + ".");
            return new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(response.toString().getBytes()));
        }
    }

    private WebResourceResponse RegisterForUpdate(final WebView view, final String allData) {
        String data = allData.substring(allData.indexOf('?')+1);
        JsonParser parser = new JsonParser();
        JsonObject obj = (JsonObject) parser.parse(data);

        final String functionName = obj.get("%22callback%22").getAsString().replaceAll("%22","");

        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                ConnectivityResponse cr = determineOnlineStatus(context);

                String url = "javascript:Mono.Callbacks.Callback('" + functionName + "'," + cr.toString() + ")";
                view.loadUrl(url);
            }
        };

        registeredRecievers.put(view, receiver);

        view.getContext().registerReceiver(receiver, new IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION));
        StatusResponse statusResponse = new StatusResponse(Status.success);
        WebResourceResponse result = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        return result;
    }

    private WebResourceResponse Unregister(WebView view) {

        view.getContext().unregisterReceiver(registeredRecievers.get(view));
        registeredRecievers.remove(view);

        StatusResponse statusResponse = new StatusResponse(Status.unregistered);
        WebResourceResponse result = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        return result;


    }

    private WebResourceResponse IsOnline(Context context) {
        ConnectivityResponse cr = determineOnlineStatus(context);
        WebResourceResponse result = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(cr.toString().getBytes()));
        return result;


    }

    private ConnectivityResponse determineOnlineStatus(Context context) {
        ConnectivityResponse cr;
        ConnectivityManager cm =
                (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo netInfo = cm.getActiveNetworkInfo();
        if (netInfo != null && netInfo.isConnectedOrConnecting()) {
            cr = new ConnectivityResponse(true,new StatusResponse(Status.success,""));
        }else {

            cr = new ConnectivityResponse(false,new StatusResponse(Status.success,""));
        }
        return cr;
    }
}
