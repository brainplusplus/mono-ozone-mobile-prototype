package com.fourtwosix.mono.utils.ui;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.AdapterView;
import android.widget.GridView;
import android.widget.LinearLayout;

import com.android.volley.toolbox.ImageLoader;
import com.fourtwosix.mono.R;
import com.fourtwosix.mono.adapters.WidgetChromeAdapter;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.caching.VolleySingleton;
import com.fourtwosix.mono.views.WidgetWebView;
import com.fourtwosix.mono.webViewIntercept.HeaderBarAPI;

import java.util.ArrayList;

/**
 * Created by Eric on 2/18/14.
 */
public class WebViewControl implements IWebViewObserver {

    private Context context;
    private LayoutInflater inflater;
    private WidgetListItem widget;
    private boolean isExpanded = false;
    private GridView grdWidgetChrome;
    private WidgetChromeAdapter widgetChromeAdapter;
    private ArrayList<OverlayButton> buttons;

    //layout references
    private View layout;
    private WidgetWebView webView;

    private static Bitmap spriteSheet;

    /**
     * Default constructor
     * @param context
     * @param inflater
     * @param widget
     */
    public WebViewControl(Context context, LayoutInflater inflater, WidgetListItem widget) {
        this.context = context;
        this.inflater = inflater;
        this.widget = widget;
        this.buttons = new ArrayList<OverlayButton>();
    }

    /**
     * Creates the templated layout containing the WidgetWebView and the overlay controls
     * @return
     */
    public View inflateLayout() {
        if(layout == null) {
            layout = inflater.inflate(R.layout.partial_webview_layout, null);

            //initialize the webview
            webView = (WidgetWebView)layout.findViewById(R.id.webView);
            webView.setInstanceGuid(widget.getInstanceId());
            webView.init(widget.getGuid(), null);
            webView.loadUrl(widget.getUrl());

            //create our sprite sheet and grab an image loader
            if(spriteSheet == null) {
                spriteSheet = BitmapFactory.decodeResource(context.getResources(), R.drawable.ext_tool_sprites);
            }
            ImageLoader imageLoader = VolleySingleton.getInstance(context).getImageLoader();

            LinearLayout llExpand = (LinearLayout)layout.findViewById(R.id.llExpand);
            llExpand.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if(!isExpanded) {
                        grdWidgetChrome.setVisibility(View.VISIBLE);
                        isExpanded = true;
                    } else {
                        isExpanded = false;
                        grdWidgetChrome.setVisibility(View.GONE);
                    }
                }
            });

            //create the adapter
            widgetChromeAdapter = new WidgetChromeAdapter(context, imageLoader, spriteSheet, new ArrayList<OverlayButton>());

            //get the grid and set the adapter
            grdWidgetChrome = (GridView)layout.findViewById(R.id.grdWidgetChrome);
            grdWidgetChrome.setAdapter(widgetChromeAdapter);

            //set the OnClickListener for the buttons
            grdWidgetChrome.setOnItemClickListener(new AdapterView.OnItemClickListener() {
                @Override
                public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                    OverlayButton button = (OverlayButton)widgetChromeAdapter.getItem(position);
                    String javascriptCallback = button.getJavascriptCallback();
                    String javascript = "javascript: Mono.Callbacks.Callback('" + javascriptCallback + "');";
                    webView.loadUrl(javascript);
                }
            });

            webView.registerIWebViewObserver(this);
        }
        return layout;
    }

    /**
     * Handles the incoming buttons from a request
     * @param methodName
     * @param buttons
     */
    public void handleMessage(String methodName, ArrayList<OverlayButton> buttons) {
        if(methodName.equals(HeaderBarAPI.INSERT_ACTION) || methodName.equals(HeaderBarAPI.ADD_ACTION)) {
            widgetChromeAdapter.add(buttons);
        } else if(methodName.equals(HeaderBarAPI.REMOVE_ACTION)) {
            widgetChromeAdapter.remove(buttons);
        } else if(methodName.equals(HeaderBarAPI.UPDATE_ACTION)) {
            widgetChromeAdapter.update(buttons);
        }
    }

    /**
     * Destroys the webview to help release it from memory
     */
    public void destroy() {
        webView.destroy();
    }

    /**
     * Gets the widget web view
     * @return The widget web view
     */
    public WidgetWebView getWebView() {
        return webView;
    }

    @Override
    public void notifyPageFinished() {
        layout.findViewById(R.id.llLoadingLayout).setVisibility(View.GONE);
    }
}
