package com.fourtwosix.mono.data.services;

import android.content.Context;
import android.database.sqlite.SQLiteOpenHelper;

import com.fourtwosix.mono.data.DatabaseUtils;

public class DataServiceFactory {
    public enum Services {DashboardsDataService, WidgetsDataService, IntentDataService, IntentPreferenceService, OSMCacheService};

    private IDataService dashboardDataService;
    private IDataService widgetDataService;
    private IDataService intentDataService;
    private IDataService osmCacheDataService;
    private IDataService intentPreferenceService;
    private Context ctx;
    private SQLiteOpenHelper dbHelper;
    private String baseUrl;

    private static DataServiceFactory instance;

    private DataServiceFactory(Context ctx, String baseUrl){
        this.ctx = ctx;
        this.baseUrl = baseUrl;
        this.dbHelper = new DatabaseUtils(ctx);
    }

    private static DataServiceFactory getInstance(){
        return instance;
    }

    public static DataServiceFactory create(Context ctx, String baseUrl){
        if (instance == null)
            instance = new DataServiceFactory(ctx, baseUrl);
        return instance;
    }

    public IDataService getDashboardDataService(){
        if (this.dashboardDataService == null){
            this.dashboardDataService = new DashboardsDataService(this.getBaseUrl(),
                    new DatabaseUtils(ctx),
                    this.getContext());
            this.dashboardDataService.sync();
        }
        return this.dashboardDataService;
    }

    public IDataService getWidgetService(){
        if (this.widgetDataService == null){
            this.widgetDataService = new WidgetDataService(this.getBaseUrl(), this.getHelper(), this.getContext());
        }
        return this.widgetDataService;
    }

    public IDataService getIntentDataService(){
        if (this.intentDataService == null){
            this.intentDataService = new IntentDataService(this.getHelper(), this.getContext());
        }
        return this.intentDataService;
    }

    public IDataService getOSMCacheDataService(){
        if (this.osmCacheDataService == null){
            this.osmCacheDataService = new OSMCacheService(this.getHelper(), this.getContext());
        }
        return this.osmCacheDataService;
    }

    public IDataService getIntentPreferenceService() {
        if(this.intentPreferenceService == null) {
            this.intentPreferenceService = new IntentPreferenceService(this.getHelper(), this.getContext());
        }
        return this.intentPreferenceService;
    }

    public Context getContext(){
        return this.ctx;
    }

    public SQLiteOpenHelper getHelper(){
        return this.dbHelper;
    }

    public String getBaseUrl(){
        return this.baseUrl;
    };

    public static IDataService getService(Services service){
        if(service == Services.DashboardsDataService){
            return DataServiceFactory.getInstance().getDashboardDataService();
        } else if(service == Services.WidgetsDataService){
            return DataServiceFactory.getInstance().getWidgetService();
        } else if(service == Services.IntentDataService) {
            return DataServiceFactory.getInstance().getIntentDataService();
        } else if(service == Services.OSMCacheService) {
            return DataServiceFactory.getInstance().getOSMCacheDataService();
        } else if(service == Services.IntentPreferenceService) {
            return DataServiceFactory.getInstance().getIntentPreferenceService();
        }
        else
            return null;
    }
}
