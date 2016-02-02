package com.fourtwosix.mono.webViewIntercept;

import android.content.Context;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.IDataService;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.structures.WidgetListItem;
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
import java.util.List;
import java.util.logging.Level;

public class ModalWebViewAPI implements WebViewsAPI {

    public static final String JSON_MIME_TYPE = "text/json";
    public static final String UTF_8 = "UTF-8";

    private Context context;
    private WebView view;

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

            String title = inputJson.optString("title");

            if (methodName.equalsIgnoreCase("url")) {
                String url = inputJson.getString("url");
                String method = inputJson.optString("method");
                if(method.isEmpty()){
                    method = "GET";
                }
                if (inputJson.has("params")) {
                    params = inputJson.getJSONObject("params");
                }
                new ModalExecutor(view).launchWebViewModalFromUrl(title, url);
                String json = new StatusResponse(Status.success, "Successfully displayed url: " + url).toString();
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
            } else if (methodName.equalsIgnoreCase("message")) {
                String message = inputJson.getString("message");
                new ModalExecutor(view).launchModal(title, message);
                String json = new StatusResponse(Status.success, "Successfully displayed message: " + message).toString();
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
            } else if (methodName.equalsIgnoreCase("widget")) {
                final String widgetName = inputJson.getString("widgetName");

                WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);

                List<WidgetListItem> widgets = dataService.find(new IDataService.DataModelSearch<WidgetListItem>() {
                    @Override
                    public boolean search(WidgetListItem param) {
                        return param.getTitle().equals(widgetName);
                    }
                });

                WidgetListItem widget;

                if (widgets.size()==0) {
                    return errorResponse("Widget " + widgetName + " not found for modal display");
                }
                else {
                    widget = widgets.get(0);

                }

                String widgetGetParams = context.getResources().getString(R.string.widgetUrlGetParameters);


                new ModalExecutor(view).launchWidgetModal(widget, title, widgetGetParams);

                String json = new StatusResponse(Status.success, "Successfully displayed widget: " + widget.getTitle()).toString();
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));

            } else if (methodName.equalsIgnoreCase("yesNo")){
                String message = inputJson.getString("message");
                String yes = inputJson.optString("yes");
                String no = inputJson.optString("no");
                String callbackName = inputJson.optString("callback");
                new ModalExecutor(view).launchYesNoModal(title, message, yes, no, callbackName);
                String json = new StatusResponse(Status.success, "Successfully displayed message: " + message).toString();
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
            }
            else if (methodName.equalsIgnoreCase("html")){
                String html = inputJson.getString("html");

                new ModalExecutor(view).launchWebViewModalHtml(title, html);
                String json = new StatusResponse(Status.success, "Successfully displayed html").toString();
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
            }
            else {
                String alertTitle = "Unsupported operation (" + methodName + ")";
                String alertMsg = "Please use one of the following actions: url, message, or widget.";
                new ModalExecutor(view).launchModal(alertTitle, alertMsg);
                String json = new StatusResponse(Status.failure, "Requested modal operation, " + methodName + " not supported.").toString();
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

    private WebResourceResponse errorResponse(String message)
    {
        String alertTitle = "Error";
        String alertMsg = message;
        new ModalExecutor(view).launchModal(alertTitle, alertMsg);
        LogManager.log(Level.WARNING, message);
        String json = new StatusResponse(Status.failure, message ).toString();
        return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
    }
}
