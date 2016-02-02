package com.fourtwosix.mono.fragments;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.LinearLayout;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.ui.OverlayButton;
import com.fourtwosix.mono.utils.ui.WebViewControl;
import com.fourtwosix.mono.webViewIntercept.HeaderBarAPI;

import java.util.ArrayList;


/**
 * Created by Eric on 12/18/13.
 */
public class WidgetFragment extends BaseFragment {
    public static final String ITEM_KEY = "widget";
    private LinearLayout view;
    private WidgetListItem item;
    private WebViewControl webViewControl;

    /**
     * Default constructor
     */
    public WidgetFragment() { }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null && getArguments().containsKey(ITEM_KEY)) {
            item = getArguments().getParcelable(ITEM_KEY);
        }

        if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }

    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        if(savedInstanceState == null) {
            //inflate our layout
            view = (LinearLayout)inflater.inflate(R.layout.fragment_widget_layout, null);

            //create the webview control and create our template layout
            webViewControl = new WebViewControl(getActivity(), inflater, item);
            View template = webViewControl.inflateLayout();


            //add the template layout to the view
            view.addView(template);
        }
        return view;
    }

    @Override
    public void onBackPressed() {
        getActivity().getFragmentManager().popBackStack();
    }

    @Override
    public void onStart() {
        super.onStart();
        getActivity().registerReceiver(headerBarReceiver, new IntentFilter(HeaderBarAPI.INTENT_BROADCAST_FILTER));
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        getActivity().unregisterReceiver(headerBarReceiver);
        webViewControl.destroy();
    }


    private BroadcastReceiver headerBarReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            Bundle bundle = intent.getExtras();
            String action = bundle.getString(HeaderBarAPI.INTENT_ACTION, null);
            ArrayList<OverlayButton> buttons = bundle.getParcelableArrayList(HeaderBarAPI.EXTRA_BUTTONS);
            webViewControl.handleMessage(action, buttons);
        }
    };
}
