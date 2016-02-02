package com.fourtwosix.mono.utils;

import android.app.Activity;
import android.content.Context;
import android.widget.Toast;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.structures.AppsMall;
import com.fourtwosix.mono.utils.caching.NoSpaceLeftOnDeviceException;
import com.fourtwosix.mono.utils.caching.VolleySingleton;

import com.fourtwosix.mono.utils.secureLogin.AuthJsonRequest;
import org.json.JSONObject;

import java.util.Set;
import java.util.logging.Level;

import static com.fourtwosix.mono.utils.caching.CacheHelper.dataIsCached;
import static com.fourtwosix.mono.utils.caching.CacheHelper.getCachedJson;
import static com.fourtwosix.mono.utils.caching.CacheHelper.setCachedData;

/**
 * Created by alerman on 5/5/14.
 */
public class AppsMallWidgetDownloader {

    private static final String APPLICATION_JSON = "application/json";

    public static void updateAppStoreWidgets(Activity currentActivity) {

        RequestQueue mVolleyQueue = VolleySingleton.getInstance(currentActivity.getApplicationContext()).getRequestQueue();
        Set<String> appsStores = ArrayPreferenceHelper.retrieveStringArray(currentActivity.getApplicationContext().getString(R.string.storeListPreference), currentActivity.getApplicationContext().getSharedPreferences(currentActivity.getApplicationContext().getString(R.string.app_package), Context.MODE_PRIVATE));

        if (appsStores != null) {
            LogManager.log(Level.INFO,"appsStores NOT NULL");
            for (String appStore : appsStores) {
                AppsMall am = AppsMall.fromString(appStore);
                String appStoreUrl = am.getUrl().toString();
                if (dataIsCached(currentActivity.getApplicationContext(), appStoreUrl)) {
                    handleAppsMallResponse(currentActivity,am,appStoreUrl + "/public/serviceItem/getServiceItemsAsJSON", getCachedJson(currentActivity.getApplicationContext(), appStoreUrl));
                } else {
                    AuthJsonRequest jsonObjRequest = new AuthJsonRequest(Request.Method.GET, appStoreUrl + "/public/serviceItem/getServiceItemsAsJSON", null,
                            appsMallSuccessListener(currentActivity,am,appStoreUrl + "/public/serviceItem/getServiceItemsAsJSON"), appsMallErrorListener(), currentActivity.getApplicationContext());
                    mVolleyQueue.add(jsonObjRequest);
                }
            }
        }else
        {

            LogManager.log(Level.INFO,"appsStores NULL");
        }


    }

    private static Response.ErrorListener appsMallErrorListener() {
        return new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {

               LogManager.log(Level.SEVERE, "Exception in getAppsMall", error);
            }
        };
    }

    private static Response.Listener<JSONObject> appsMallSuccessListener(final Activity currentActivity,final AppsMall appsMall,String url) {
        final String finalUrl = url;
        return new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                handleAppsMallResponse(currentActivity,appsMall,finalUrl, response);
            }
        };
    }

    private static void handleAppsMallResponse(Activity currentActivity,final AppsMall appsMall,String url, JSONObject response) {


        WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
        dataService.putAppsMall(appsMall,response);
        try {
            setCachedData(currentActivity.getApplicationContext(), url, response.toString().getBytes(), APPLICATION_JSON);
            Toast.makeText(currentActivity, "Apps Mall listing download complete!", Toast.LENGTH_SHORT).show();
        } catch (NoSpaceLeftOnDeviceException e) {
            Toast.makeText(currentActivity, "Device out of storage space!", Toast.LENGTH_LONG).show();
        }
        LogManager.log(Level.INFO, url);
        LogManager.log(Level.INFO, response.toString());
    }


}
