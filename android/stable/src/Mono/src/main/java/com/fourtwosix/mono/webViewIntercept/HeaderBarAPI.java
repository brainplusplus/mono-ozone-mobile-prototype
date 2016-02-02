package com.fourtwosix.mono.webViewIntercept;

import android.content.Context;
import android.content.Intent;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.ui.OverlayButton;
import com.fourtwosix.mono.views.WidgetWebView;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import com.fourtwosix.mono.webViewIntercept.json.StatusResponse;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.logging.Level;

/**
 * Created by Eric on 2/19/14.
 */
public class HeaderBarAPI implements WebViewsAPI {
    //static references for consistency
    public static final String INTENT_BROADCAST_FILTER = "com.fourtwosix.mono.HeaderBarAPI";
    public static final String INTENT_ACTION = "action";
    public static final String EXTRA_BUTTONS = "buttons";
    public static final String EXTRA_INSTANCE_ID = "instanceId";

    //static variables reflecting the header bar methods
    public static final String ADD_ACTION = "addHeaderButtons";
    public static final String INSERT_ACTION = "insertHeaderButtons";
    public static final String UPDATE_ACTION = "updateHeaderButtons";
    public static final String REMOVE_ACTION = "removeHeaderButtons";

    // Response types
    private static final String JSON_MIME_TYPE = "text/json";
    private static final String UTF_8 = "UTF-8";

    private Context context;

    public HeaderBarAPI(Context context) {
        this.context = context;
    }

    @Override
    public WebResourceResponse handle(WebView view, String methodName, URL url) {
        StatusResponse statusResponse = new StatusResponse(Status.success);

        try {
            String decodedUrl = URLDecoder.decode(url.toString(), "UTF-8");
            ArrayList<OverlayButton> data = parseButtons(decodedUrl);

            Intent intent = new Intent(INTENT_BROADCAST_FILTER);
            intent.putExtra(INTENT_ACTION, methodName);
            intent.putParcelableArrayListExtra(EXTRA_BUTTONS, data);
            intent.putExtra(EXTRA_INSTANCE_ID, ((WidgetWebView)view).getInstanceGuid());
            context.sendBroadcast(intent);

        } catch (JSONException exception) {
            LogManager.log(Level.SEVERE, "Unable to parse buttons out of the header bar url");
        } catch (UnsupportedEncodingException exception) {
            LogManager.log(Level.SEVERE, "Unable to decode header bar url: " + url.toString());
        } catch (Exception exception) {
            LogManager.log(Level.SEVERE, "General exception occurred in header bar API: " + exception.getMessage());
        }

        return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(statusResponse.toString().getBytes()));
    }


    /**
     * Parses out the header bar data from the url
     * @param url
     * @return
     */
    private ArrayList<OverlayButton> parseButtons(String url) throws JSONException {
        ArrayList<OverlayButton> buttons = new ArrayList<OverlayButton>();

        //deep clone
        String fullUrl = new String(url);

        //remove the url section and just leave the query params
        url = url.substring(url.indexOf("?")+1, url.length());

        //split based on &
        String[] split = url.split("&");
        for(String section: split) {
            if(section.charAt(0) == '{') {
                JSONObject jsonObject = new JSONObject(section);
                JSONObject payload = jsonObject.getJSONObject("payload");
                JSONArray items = payload.getJSONArray("items");
                for(int i = 0; i < items.length(); i++) {
                    JSONObject item = items.getJSONObject(i);
                    OverlayButton button = new OverlayButton();
                    button.setItemId(item.getString("itemId"));

                    //Default is XTYPE widgettool
                    button.setXtype(OverlayButton.XTYPE.widgettool);

                    String widgetType = item.optString("xtype");
                    if(widgetType != null) {
                        if(widgetType.equals(OverlayButton.XTYPE.button.toString())) {
                            button.setXtype(OverlayButton.XTYPE.button);
                        } else {
                            button.setXtype(OverlayButton.XTYPE.widgettool);
                        }
                    }

                    //to avoid redundant work
                    if(button.getXtype() == OverlayButton.XTYPE.button && item.has("text")) {
                        button.setText(item.getString("text"));
                    } else {
                        //widgettool type
                        button.setType(item.optString("type"));
                    }

                    if(item.has("icon")) {
                        try {
                            String iconPath = item.getString("icon");
                            URL fullUrlObject = new URL(fullUrl);
                            URL iconUrl = null;
                            if(iconPath.contains("http")) {
                                iconUrl = new URL(iconPath);
                            } else {
                                //reconstruct a new url with protocol://host:port/iconpath
                                String newUrl = fullUrlObject.getProtocol() + "://" + fullUrlObject.getHost() +":" + fullUrlObject.getPort() + "/" + iconPath;
                                iconUrl = new URL(newUrl);
                            }
                            button.setImagePath(iconUrl.toString());
                        } catch (MalformedURLException exception) {
                            LogManager.log(Level.SEVERE, "Malformed URL: " + exception.getMessage());
                        }
                    }

                    String callbackGuid = item.optString("callbackGuid");
                    button.setJavascriptCallback(callbackGuid);

                    buttons.add(button);
                }
                return buttons;
            }
        }

        return null;
    }
}
