package com.fourtwosix.mono.services;

import android.os.AsyncTask;
import android.os.Handler;

import com.fourtwosix.mono.data.services.DashboardsDataService;
import com.fourtwosix.mono.data.services.DataServiceFactory;

public class SyncDashboardsTask extends AsyncTask {
    private Handler handler;

    public SyncDashboardsTask(Handler handler) {
        this.handler = handler;
    }

    @Override
    protected Object doInBackground(Object[] objects) {
        DashboardsDataService dataServiceFactory = (DashboardsDataService) DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService);
        dataServiceFactory.sync(handler);
        return null;
    }
}
