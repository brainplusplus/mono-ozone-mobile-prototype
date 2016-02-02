package com.fourtwosix.mono.fragments;

import android.app.ActionBar;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.activities.MainActivity;
import com.fourtwosix.mono.data.models.Dashboard;
import com.fourtwosix.mono.data.services.DashboardsDataService;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.IDataService;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.data.widgetcommunication.IntentProcessor;
import com.fourtwosix.mono.data.widgetcommunication.PublishSubscribeAgent;
import com.fourtwosix.mono.data.widgetcommunication.interfaces.IntentFragment;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.ImageHelper;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.ui.OverlayButton;
import com.fourtwosix.mono.utils.ui.WebViewControl;
import com.fourtwosix.mono.views.WidgetWebView;
import com.fourtwosix.mono.webViewIntercept.HeaderBarAPI;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;

public class DashboardsWidgetsFragment extends BaseFragment implements IntentFragment {
    //variables for this instance
    private Dashboard dashboard;
    private IDataService widgetService;
    private int lastPosition = 0;
    private boolean swiperActive = true;

    //data helpers
    private Dashboard.Widget[] widgets;
    private List<WebViewControl> webViewControls;
    private ArrayAdapter<String> widgetNameData;

    //layout stuff
    private LinearLayout rootView;
    private ActionBar actionBar;
    private LayoutInflater rootInflater;
    private Spinner appSpinner;
    private HorizontalScrollView horizontalScrollView;
    private FrameLayout frameLayout;

    //intents and pubsub
    private PublishSubscribeAgent publishSubscribeAgent;
    private IntentProcessor intentProcessor;

    //static variables
    private static final String DASHBOARD_ARGUMENT = "dashboard";

    public static DashboardsWidgetsFragment newInstance(Dashboard d) {
        DashboardsWidgetsFragment frag = new DashboardsWidgetsFragment();
        Bundle args = new Bundle();
        args.putSerializable(DASHBOARD_ARGUMENT, d);
        frag.setArguments(args);

        return frag;
    }

    public DashboardsWidgetsFragment() {
        this.widgetService = DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
    }

    @Override
    public void onBackPressed() {
        if(swiperActive) {
            MainActivity mainActivity = (MainActivity)getActivity();
            mainActivity.loadFragment(MainActivity.FragmentName.DASHBOARD);
        } else {
            showSwiperView();
        }
    }

    @Override
    public void onDetach() {
        super.onDetach();

        publishSubscribeAgent.finalize();
    }

    @Override
    public void onStart() {
        super.onStart();
        getActivity().registerReceiver(headerBarReceiver, new IntentFilter(HeaderBarAPI.INTENT_BROADCAST_FILTER));
    }

    @Override
    public void onStop() {
        super.onStop();
        getActivity().unregisterReceiver(headerBarReceiver);
    }

    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putBoolean("swiperActive", swiperActive);
        outState.putInt("lastPosition", lastPosition);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        intentProcessor = new IntentProcessor(this);
        publishSubscribeAgent = new PublishSubscribeAgent();

        rootView = (LinearLayout) inflater.inflate(R.layout.fragment_dashboard_widgets, container, false);
        rootInflater = inflater;
        horizontalScrollView = (HorizontalScrollView) rootView.findViewById(R.id.horizontalScrollView);

        if (getArguments().containsKey(DASHBOARD_ARGUMENT)) {
            actionBar = getActivity().getActionBar();
            dashboard = (Dashboard) getArguments().get(DASHBOARD_ARGUMENT);

            actionBar.setTitle(getDashboard().getName());
            actionBar.setIcon(R.drawable.icon_ozone_320x320);

            //list of names for the spinner
            List<String> names = new ArrayList<String>();
            names.add("Select a widget");

            //create our arraylist of web view controls
            webViewControls = new ArrayList<WebViewControl>();

            widgets = getDashboard().getWidgets();
            for(Dashboard.Widget widget: widgets){
                names.add(widget.name);

                //create the widget
                WidgetListItem item = (WidgetListItem)widgetService.find(widget.guid);
                item.setInstanceId(widget.instanceId);

                //create the web view control wrapper
                WebViewControl webViewControl = new WebViewControl(getActivity(), rootInflater, item);
                webViewControl.inflateLayout(); //inflate layout can be called more than once, will only inflate the layout once

                //add the known controls
                webViewControls.add(webViewControl);

                //add the webview to the intent processor
                intentProcessor.addWidget(widget.instanceId, webViewControl.getWebView());
            }

            appSpinner = (Spinner) rootView.findViewById(R.id.app_names);
            widgetNameData = setupWidgetAdapter(rootView, appSpinner, names);
            widgetNameData.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            appSpinner.setAdapter(widgetNameData);

            createScrollView(inflater, rootView);
            createFrameView(rootView);

            // Set the number of widgets into the compositeApps box
            ((TextView) rootView.findViewById(R.id.txtCompositeAppCount)).setText(String.valueOf(widgets.length));

            LinearLayout compositeAppsPreview = (LinearLayout) rootView.findViewById(R.id.lytCompositeApp);
            compositeAppsPreview.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    LogManager.log(Level.INFO, "DashboardWidgetsFragment - Clicked on the composite apps preview button.");
                    showSwiperView();
                }
            });
        }

        //recover from saved instance state
        if(savedInstanceState != null && savedInstanceState.containsKey("swiperActive")) {
            swiperActive = savedInstanceState.getBoolean("swiperActive");
            lastPosition = savedInstanceState.getInt("lastPosition");
            if(swiperActive) {
                showSwiperView();
            } else {
                showWebView(lastPosition);
            }
        } else {
            showSwiperView();
        }

        return rootView;
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);

        DisplayMetrics displaymetrics = new DisplayMetrics();
        getActivity().getWindowManager().getDefaultDisplay().getMetrics(displaymetrics);
        int screenHeight = displaymetrics.heightPixels;

        //design ratio is 2*width / 3*height
        double adjustedHeight = screenHeight * .5;
        double adjustedWidth = 2.0 / 3.0 * adjustedHeight;

        //adjust the swiper
        LinearLayout layout = (LinearLayout)horizontalScrollView.findViewById(R.id.llLinearLayout);
        for(int i = 0; i < webViewControls.size(); i++) {
            LinearLayout itemLayout = (LinearLayout)layout.getChildAt(i);
            setSwipeItemSize(itemLayout, (int) adjustedWidth, (int) adjustedHeight);
        }
    }

    /**
     * Sets up the widget spinner adapter
     * @param rootView
     * @param appSpinner
     * @param names
     * @return
     */
    private ArrayAdapter<String> setupWidgetAdapter(final LinearLayout rootView, Spinner appSpinner, final List<String> names) {
        ArrayAdapter<String> dataAdapter = new ArrayAdapter<String>(rootView.getContext(), android.R.layout.simple_spinner_item, names) {
            public View getView(int position, View convertView,ViewGroup parent) {
                View v = super.getView(position, convertView, parent);

                ((TextView) v).setTextSize(12);
                v.setBackgroundColor(getResources().getColor(R.color.primary1));
                ((TextView) v).setTextColor(Color.WHITE);
                return v;
            }

            public View getDropDownView(int position, View convertView,ViewGroup parent) {
                View v = super.getDropDownView(position, convertView,parent);
                ((TextView) v).setTextSize(12);
                v.setBackgroundColor(getResources().getColor(R.color.primary1));
                ((TextView) v).setTextColor(Color.WHITE);

                return v;
            }
        };
        appSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parentView, View v, int position, long id) {
                if (position != 0) {
                    showWebView(position - 1);
                    lastPosition = position - 1;
                }
            }

            @Override
            public void onNothingSelected(AdapterView<?> parentView) {
                showWebView(lastPosition);
            }
        });
        return dataAdapter;
    }

    /**
     * Launches a new widget and returns its current instance Guid.
     * @param widgetGuid The widget Guid to launch.
     * @param instanceId The instanceId to assign to it
     */
    public void launchNewWidget(String widgetGuid, String instanceId) {
        LogManager.log(Level.INFO, "Intents - Launching new widget, (guid: " + widgetGuid + ")(instanceId: " + instanceId +")");

        // Get widget info
        WidgetDataService widgetDataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
        WidgetListItem item = widgetDataService.find(widgetGuid);

        if(item == null) {
            LogManager.log(Level.SEVERE, "Intents - Attempted to send intent to non-existent widget: \nWidgetGuid: " + widgetGuid + "\nInstance Id: " + instanceId );
            return;
        }

        item = item.clone();
        item.setInstanceId(instanceId);

        // Update the dashboard in the database
        dashboard.addWidget(item);

        //save the dashboard
        DashboardsDataService dashboardsDataService = (DashboardsDataService)DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService);
        dashboardsDataService.put(dashboard);

        WebViewControl webViewControl = new WebViewControl(getActivity(), rootInflater, item);
        View webViewControlView = webViewControl.inflateLayout();

        intentProcessor.addWidget(instanceId, webViewControl.getWebView());
        webViewControls.add(webViewControl);

        loadWidgetListItem(webViewControl);
        frameLayout.addView(webViewControlView);

        // Add the widget to the app spinner
        widgetNameData.add(item.getTitle());
        widgetNameData.notifyDataSetChanged();

        appSpinner.setAdapter(widgetNameData);

        // Update the composite app count
        ((TextView) rootView.findViewById(R.id.txtCompositeAppCount)).setText(String.valueOf(webViewControls.size()));

        // Update the scroll view
        createScrollView(rootInflater, rootView);
    }

    private void showWebView(int position) {
        LogManager.log(Level.INFO, "DashboardWidgetsFragment - showing WEB view");

        horizontalScrollView.setVisibility(View.GONE);

        int numWebViews = webViewControls.size();
        for(int i=0; i<numWebViews; i++) {
            if(i == position) {
                frameLayout.getChildAt(i).setVisibility(View.VISIBLE);
            }
            else {
                frameLayout.getChildAt(i).setVisibility(View.GONE);
            }
        }

        frameLayout.setVisibility(View.VISIBLE);
        swiperActive = false;
        lastPosition = position;
    }

    private void showSwiperView() {
        //TestFlight.passCheckpoint("Swiper Viewed");

        appSpinner.setSelection(0);
        LogManager.log(Level.INFO, "DashboardWidgetsFragment - showing stack view");
        horizontalScrollView.setVisibility(View.VISIBLE);
        frameLayout.setVisibility(View.GONE);
        swiperActive = true;
    }

    /**
     * Adds all of our created WidgetWebViews to the frame layout
     * @param rootView the root vie containing the frame layout
     */
    private void createFrameView(LinearLayout rootView) {
        frameLayout = (FrameLayout) rootView.findViewById(R.id.frameLayout);

        for(int i = 0; i < webViewControls.size(); i++) {
            WebViewControl webViewControl = webViewControls.get(i);
            View layout = webViewControls.get(i).inflateLayout();
            frameLayout.addView(layout);
            webViewControl.getWebView().init(this);
            webViewControl.getWebView().getSettings().setJavaScriptEnabled(true);
            loadWidgetListItem(webViewControl);
        }
    }

    private void setSwipeItemSize(LinearLayout layout, int adjustedWidth, int adjustedHeight) {
        LinearLayout.LayoutParams swipeBodyParams = new LinearLayout.LayoutParams(adjustedWidth, adjustedHeight);
        LinearLayout llSwipeBody = (LinearLayout)layout.findViewById(R.id.llSwipeBody);
        llSwipeBody.setLayoutParams(swipeBodyParams);

        LinearLayout.LayoutParams imageSizeParams = new LinearLayout.LayoutParams((int)(adjustedWidth - 50), (int)(adjustedWidth-50));
        ImageView imageView = (ImageView)layout.findViewById(R.id.imgWidget);
        imageView.setLayoutParams(imageSizeParams);
    }

    /**
     * Creates the preview swiper dynamically based on screen size
     * @param inflater
     * @param rootView
     */
    private void createScrollView(LayoutInflater inflater, LinearLayout rootView) {
        //get our structure containing our views and clear it

        LinearLayout layout = (LinearLayout)horizontalScrollView.findViewById(R.id.llLinearLayout);
        layout.removeAllViews();

        DisplayMetrics displaymetrics = new DisplayMetrics();
        getActivity().getWindowManager().getDefaultDisplay().getMetrics(displaymetrics);
        int screenHeight = displaymetrics.heightPixels;

        //get the db service
        WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
        for(int i = 0; i < webViewControls.size(); i++) {
            WebViewControl webViewControl = webViewControls.get(i);
            WidgetWebView widgetWebView = webViewControl.getWebView();

            //get the widget pertaining to the current Widget
            WidgetListItem item = dataService.find(widgetWebView.getWidgetGuid());
            try {
                //get the widget image
                Bitmap image = new ImageHelper(getActivity()).loadWidgetImage(item);

                //get the relative layout holding the views
                LinearLayout itemLayout = (LinearLayout)inflater.inflate(R.layout.stack_flow_item, null);
                LinearLayout.LayoutParams layoutParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                layoutParams.setMargins(10, 0, 10, 0);

                itemLayout.setLayoutParams(layoutParams);

                /* design ratio is 2*width / 3*height */
                double adjustedHeight = screenHeight * .5;
                double adjustedWidth = 2.0 / 3.0 * adjustedHeight;
                setSwipeItemSize(itemLayout, (int) adjustedWidth, (int) adjustedHeight);

                //set the title
                TextView txtTitle = (TextView)itemLayout.findViewById(R.id.txtTitle);
                txtTitle.setText(item.getTitle());

                //set the image for the widget
                LinearLayout.LayoutParams imageSizeParams = new LinearLayout.LayoutParams((int)(adjustedWidth - 50), (int)(adjustedWidth-50));
                ImageView imageView = (ImageView)itemLayout.findViewById(R.id.imgWidget);
                itemLayout.findViewById(R.id.imgMobile).setVisibility(item.getMobileReady() ? View.VISIBLE : View.INVISIBLE);
                imageView.setLayoutParams(imageSizeParams);
                if(image != null) {
                    imageView.setImageBitmap(image);
                }

                //set the tag to be retrieved in the on click listener
                itemLayout.setTag(i);
                itemLayout.setOnClickListener(widgetOnClickListener);

                //add the view dynamically to the layout
                layout.addView(itemLayout);
            } catch (NullPointerException exception) {
                LogManager.log(Level.SEVERE, "Error loading widget: ", exception);
            }
        }
    }

    /**
     * Loads the widgets URL
     * @param webViewControl
     */
    private void loadWidgetListItem(WebViewControl webViewControl){
        String widgetUrl = ((WidgetListItem) widgetService.find(webViewControl.getWebView().getWidgetGuid())).getUrl();
        webViewControl.getWebView().loadUrl(widgetUrl);
    }

    private BroadcastReceiver headerBarReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            Bundle bundle = intent.getExtras();
            String action = bundle.getString(HeaderBarAPI.INTENT_ACTION, null);
            ArrayList<OverlayButton> buttons = bundle.getParcelableArrayList(HeaderBarAPI.EXTRA_BUTTONS);
            String instanceId = bundle.getString(HeaderBarAPI.EXTRA_INSTANCE_ID);

            for(WebViewControl webViewControl: webViewControls) {
                WidgetWebView widgetWebView = webViewControl.getWebView();
                if(widgetWebView.getInstanceGuid().equals(instanceId)) {
                    webViewControl.handleMessage(action, buttons);
                }
            }
        }
    };

    /**
     * The onclick listener for the widget preview swiper
     */
    private View.OnClickListener widgetOnClickListener = new View.OnClickListener() {
        @Override
        public void onClick(View view) {
            int index = (Integer)(view.getTag());
            showWebView(index);
        }
    };


    public Dashboard getDashboard() {
        return dashboard;
    }

    /**
     * Returns the publish/subscribe agent for this dashboard.
     * @return The publish/subscribe agent.
     */
    public PublishSubscribeAgent getPublishSubscribeAgent() {
        return publishSubscribeAgent;
    }

    public IntentProcessor getIntentProcessor() { return intentProcessor; }
}