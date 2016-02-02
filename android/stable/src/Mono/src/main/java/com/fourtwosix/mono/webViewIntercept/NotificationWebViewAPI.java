package com.fourtwosix.mono.webViewIntercept;

import android.content.Context;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import com.fourtwosix.mono.webViewIntercept.json.StatusResponse;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.logging.Level;

public class NotificationWebViewAPI implements WebViewsAPI {

    public static final String JSON_MIME_TYPE = "text/json";
    public static final String UTF_8 = "UTF-8";

    private Context context;
    private WebView view;
    private String instanceGuid;

    public NotificationWebViewAPI(String instanceGuid){
        this.instanceGuid = instanceGuid;
    }

    /**
     * Determines how best to respond to the provided URI.
     *
     * @param view       The view that has pushed out the intercepted call.
     * @param methodName The method name which determines which functionality to perform.
     * @param fullUrl    The full URL which is parsed to get the uriData from the query
     * @return A response based on which method was passed to the API.
     */
    @Override
    public WebResourceResponse handle(WebView view, String methodName, URL fullUrl) {
        this.context = view.getContext().getApplicationContext();
        this.view = view;
        WebViewInterceptUrl wvUrls = new WebViewInterceptUrl(fullUrl.toString(), WebViewIntercept.OZONE_PREFIX);
        try {
            JSONObject inputJson = new JSONObject(URLDecoder.decode(wvUrls.remainder, "UTF-8"));
            JSONObject params = null;

            if (methodName.equalsIgnoreCase("notify")) {

                String title = inputJson.optString("title");
                String text = inputJson.getString("text");
                String callback = inputJson.optString("callback");

                new NotificationExecutor(view).notify(title, text, callback, instanceGuid);
                String json = new StatusResponse(Status.success, "Successfully launched notification.").toString();
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
            }
            else {
                String json = new StatusResponse(Status.failure, "Requested notification operation, " + methodName + " not supported.").toString();
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
            }
        } catch (UnsupportedEncodingException e) {
            LogManager.log(Level.SEVERE, "Error during URL decode.", e);
            String json = new StatusResponse(Status.failure, "UTF-8 not supported on this device!" + e).toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        } catch (JSONException e) {
            LogManager.log(Level.SEVERE, "Error parsing JSON!", e);
            String json = new StatusResponse(Status.failure, "Error parsing JSON!" + e).toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        } catch (IOException e) {
            LogManager.log(Level.SEVERE, "IOException parsing WidgetData to string.", e);
            String alertTitle = "Error parsing Widget Data";
            String alertMsg = "Error parsing Widget Data. If you continue to see this message, please alert the widget developers for this particular widget.";
            new ModalExecutor(view).launchModal(alertTitle, alertMsg);
            String json = new StatusResponse(Status.failure, "IOException parsing WidgetData to string. " + e).toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        }
    }
}
