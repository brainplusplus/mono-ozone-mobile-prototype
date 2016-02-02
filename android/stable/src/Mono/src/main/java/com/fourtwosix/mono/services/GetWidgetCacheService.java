package com.fourtwosix.mono.services;


import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.Parcelable;

import com.fourtwosix.mono.controllers.GetWidgetCacheServiceController;


public class GetWidgetCacheService extends Service {

    GetWidgetCacheServiceController controller;
    public static final String NOTIFICATION = "com.fourtwosix.mono.services.cachingService";
    public static final String RESULT = "result";
    public static final String URLS = "urls";
    public static final String TOTAL_URLS = "totalUrls";
    public static final String PHASE = "phase1";

    public static final String NUM_WIDGETS = "numWidgets";
    public static final String NUM_SUCCEEDED = "numSucceeded";
    public static final String NUM_FAILED = "numFailed";
    @Override
    public IBinder onBind(Intent intent) {
        //TODO for communication return IBinder implementation
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String widgetUrlGetParameters = intent.getStringExtra("widgetUrlGetParams");
        if(widgetUrlGetParameters == null) {
            widgetUrlGetParameters = "";
        }
        Parcelable[] widgets = intent.getParcelableArrayExtra("widgets");

        controller = new GetWidgetCacheServiceController(this, widgets, widgetUrlGetParameters);

        return Service.START_STICKY;
    }
}