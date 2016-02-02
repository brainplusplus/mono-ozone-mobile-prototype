package com.fourtwosix.mono.fragments.settings;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Parcelable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.controllers.GetWidgetCacheServiceController;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.fragments.BaseFragment;
import com.fourtwosix.mono.services.GetWidgetCacheService;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.ConnectivityHelper;

import java.util.Date;
import java.util.Map;

/**
 * Created by Eric on 5/7/2014.
 */
public class OfflineSettingsFragment extends BaseFragment {
    private TextView txtStatus;
    private SharedPreferences sharedPreferences;
    private Intent widgetIntent;

    private static final String offlineDownloadLastRan = "Offline download status:";

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {

        sharedPreferences = getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);

        final View rootView = inflater.inflate(R.layout.fragment_settings_offline, container, false);

        //Set the back click for the title
        rootView.findViewById(R.id.rlTitle).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                getActivity().getFragmentManager().popBackStack();
            }
        });

        //setup the status for offline storage
        setupOfflineCachingStatus(rootView);

        Button btnPrepareForOfflineUsage = (Button) rootView.findViewById(R.id.btnPrepareForOfflineUsage);
        btnPrepareForOfflineUsage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Context context = getActivity();
                if (ConnectivityHelper.isNetworkAvailable(context)) {
                    widgetIntent = new Intent(context, GetWidgetCacheService.class);

                    txtStatus.setText("Starting download...");
                    WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
                    Map<String, WidgetListItem> widgets = dataService.getWidgets();
                    Parcelable[] parcelableWidgets = new Parcelable[widgets.size()];
                    int i = 0;
                    for (Map.Entry entry : widgets.entrySet()) {
                        WidgetListItem item = (WidgetListItem) entry.getValue();
                        parcelableWidgets[i] = (item);
                        i++;
                    }

                    widgetIntent.putExtra("widgets", parcelableWidgets);
                    widgetIntent.putExtra("widgetUrlGetParams", getString(R.string.widgetUrlGetParameters));
                    context.startService(widgetIntent);

                    //Why does offline caching need to talk to the intents spinner?
                    //actionAdapter.loadData(selectedWidget);
                } else {
                    Toast toast = Toast.makeText(context, "No network available. Please check your device's network settings.", Toast.LENGTH_SHORT);
                    toast.show();
                }
            }
        });
        return rootView;
    }

    private BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                // setup phase1 variables for GetWidgetCacheService
                boolean phase1 = bundle.getBoolean(GetWidgetCacheService.PHASE);
                String widgetCacheServicePercentText = sharedPreferences.getString(context.getString(R.string.widgetCacheServiceCompletionText), "Widgets: (0/0)");
                String urlCachingServicePercentText = sharedPreferences.getString(context.getString(R.string.urlCachingServiceCompletionText), "Resources: (0/0)");

                // setup phase2 variables for UrlCachingService
                boolean phase2 = bundle.getBoolean(GetWidgetCacheServiceController.PHASE2);

                // set up common variables
                String currentTimestamp = new Date().toString();
                sharedPreferences.edit().putString(getString(R.string.cacheServicesLastRanPreference), currentTimestamp).commit();

                int numWidgets = intent.getIntExtra(GetWidgetCacheService.NUM_WIDGETS, 1);
                int numSucceeded = intent.getIntExtra(GetWidgetCacheService.NUM_SUCCEEDED, 0);
                int numFailed = intent.getIntExtra(GetWidgetCacheService.NUM_FAILED, 0);
                float reportedPercentage = (numSucceeded + numFailed) / numWidgets * 100;

                boolean deviceOutOfSpace = intent.getBooleanExtra(GetWidgetCacheServiceController.NO_SPACE_LEFT_EXCEPTION, false);
                if(deviceOutOfSpace){
                    Toast.makeText(context, "Device out of storage space!", Toast.LENGTH_LONG).show();
                }

                // Generate text based on phase and completion
                if (phase1) {
                    if(deviceOutOfSpace) {
                        widgetCacheServicePercentText = "Device out of storage: Additional widgets will not be downloaded.";
                        if (reportedPercentage < 100) {
                            widgetCacheServicePercentText += "Widgets: Partially complete (" + (numSucceeded + numFailed) + "/" + numWidgets + ")\n";
                        }
                        sharedPreferences.edit().putString(getString(R.string.widgetCacheServiceCompletionText), widgetCacheServicePercentText).commit();
                    }
                    if (reportedPercentage < 100) {
                        widgetCacheServicePercentText = "Widgets: Partially complete (" + (numSucceeded + numFailed) + "/" + numWidgets + ")\n";
                        sharedPreferences.edit().putString(getString(R.string.widgetCacheServiceCompletionText), widgetCacheServicePercentText).commit();
                    } else {
                        widgetCacheServicePercentText = "Widgets: Download completed " + currentTimestamp + "\n";
                        sharedPreferences.edit().putString(getString(R.string.widgetCacheServiceCompletionText), widgetCacheServicePercentText).commit();
                        context.stopService(widgetIntent);
                    }
                } else if (phase2) {
                    if(deviceOutOfSpace) {
                        urlCachingServicePercentText = "Device out of storage: Additional resources will not be downloaded.";
                        if (reportedPercentage < 100) {
                            urlCachingServicePercentText += "Resources: Partially complete... (" + (numSucceeded + numFailed) + "/" + numWidgets + ")";
                        }
                        sharedPreferences.edit().putString(getString(R.string.urlCachingServiceCompletionText), urlCachingServicePercentText).commit();
                    }
                    if (reportedPercentage < 100) {
                        urlCachingServicePercentText = "Resources: Partially complete... (" + (numSucceeded + numFailed) + "/" + numWidgets + ")";
                        sharedPreferences.edit().putString(getString(R.string.urlCachingServiceCompletionText), urlCachingServicePercentText).commit();
                    } else {
                        urlCachingServicePercentText = "Resources: Download completed " + currentTimestamp;
                        sharedPreferences.edit().putString(getString(R.string.urlCachingServiceCompletionText), urlCachingServicePercentText).commit();
                    }
                }

                txtStatus.setText(offlineDownloadLastRan + "\n" + widgetCacheServicePercentText + urlCachingServicePercentText);
            }
        }
    };

    private void setupOfflineCachingStatus(View rootView) {
        txtStatus = (TextView) rootView.findViewById(R.id.status);
        Context context = rootView.getContext();
        String widgetCacheServicePercentCompleteText = sharedPreferences.getString(context.getString(R.string.widgetCacheServiceCompletionText), null);
        String urlCachingServicePercentCompleteText = sharedPreferences.getString(context.getString(R.string.urlCachingServiceCompletionText), null);
        String lastRan = sharedPreferences.getString(context.getString(R.string.cacheServicesLastRanPreference), "---");

        String offlineDownloadLastRanText = widgetCacheServicePercentCompleteText + urlCachingServicePercentCompleteText;
        if (widgetCacheServicePercentCompleteText == null && urlCachingServicePercentCompleteText == null) {
            offlineDownloadLastRanText = "Last ran " + lastRan;
        }
        txtStatus.setText(offlineDownloadLastRan + "\n" + offlineDownloadLastRanText);
    }

    @Override
    public void onResume() {
        super.onResume();
        getActivity().registerReceiver(receiver, new IntentFilter(GetWidgetCacheService.NOTIFICATION));
    }

    @Override
    public void onPause() {
        super.onPause();
        getActivity().unregisterReceiver(receiver);
    }

    @Override
    public void onBackPressed() {
        getActivity().getFragmentManager().popBackStack();
    }
}