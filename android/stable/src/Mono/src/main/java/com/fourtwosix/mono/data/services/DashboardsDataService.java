package com.fourtwosix.mono.data.services;

import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.util.Log;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.models.Dashboard;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.caching.VolleySingleton;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

public class DashboardsDataService implements IDataService<Dashboard> {
    final static String tableName = "Dashboard";
    final static String listDashboardsURL = "dashboard";

    String dashboardURI;
    SQLiteOpenHelper dbHelper;
    Context ctx;
    ConcurrentHashMap<String, Dashboard> dashboards;
    private RequestQueue mVolleyQueue;

    public DashboardsDataService(String baseURL, SQLiteOpenHelper dbHelper, Context ctx){
        this.dbHelper = dbHelper;
        this.dashboardURI = baseURL + listDashboardsURL;
        this.ctx = ctx.getApplicationContext();
        this.dashboards = new ConcurrentHashMap<String, Dashboard>();
        mVolleyQueue = VolleySingleton.getInstance(ctx).getRequestQueue();
        // Remove any cached information for the dashboard URI
        mVolleyQueue.getCache().remove(this.dashboardURI);

        loadDashboardDataFromDatabase();
    }

    //TODO: in the future we'll want to implement syncing
    private Response.Listener<JSONObject> dashboardsDownloadSuccessListener(final Handler handler) {
        return new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject responseObject) {
                try {
                    // remove all non-natively created dashboards and re-add them based on the JSON response from the REST endpoint
                    List<Dashboard> dashboardsToRemove = new ArrayList<Dashboard>();
                    Iterator it = dashboards.entrySet().iterator();
                    while (it.hasNext()) {
                        Map.Entry pairs = (Map.Entry)it.next();
                        Dashboard dashboard = (Dashboard) pairs.getValue();
                        // If not natively created, add dashboard of list to remove (we'll re-add it below, if it's still in the JSON)
                        if(!dashboard.getNativeCreated()){
                            dashboardsToRemove.add(dashboard);
                        }
                    }

                    for(Dashboard dashboard : dashboardsToRemove) {
                        remove(dashboard);
                    }

                    JSONArray items = responseObject.getJSONArray("data");
                    for(int i = 0; i < items.length(); i++){
                        Dashboard d = new Dashboard().fromJSON(items.getString(i));
                        d.setNativeCreated(false);
                        put(d);
                    }
                } catch (JSONException exception) {
                    LogManager.log(Level.SEVERE, this.getClass().getName() + " could not correctly handle json: " + responseObject);
                    LogManager.log(Level.SEVERE, this.getClass().getName() + " exception in parsing json: ", exception);
                } catch (Exception exception) {
                    LogManager.log(Level.SEVERE, this.getClass().getName() + " could not correctly handle json: " + responseObject);
                    LogManager.log(Level.SEVERE, this.getClass().getName() + " exception in parsing json: ", exception);
                }
                if(handler != null) {
                    Message message = new Message();
                    Bundle bundle = new Bundle();
                    bundle.putBoolean("success", true);
                    message.setData(bundle);
                    handler.sendMessage(message);
                }
            }
        };
    }

    private Response.ErrorListener dashboardsDownloadErrorListener(final Handler handler) {
        return new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.e(this.getClass().getName(), "Error downloading dashboards.");
                if(handler != null) {
                    Message message = new Message();
                    Bundle bundle = new Bundle();
                    bundle.putBoolean("success", false);
                    message.setData(bundle);
                    handler.sendMessage(message);
                }
            }
        };
    }


    @Override
    public Iterable<Dashboard> list() {
        return dashboards.values();
    }

    @Override
    public Dashboard find(String guid) {
        return dashboards.get(guid);
    }

    @Override
    public List<Dashboard> find(DataModelSearch<Dashboard> matcher) {
        ArrayList<Dashboard> found = new ArrayList<Dashboard>();
        for (Dashboard l : dashboards.values()){
            if(matcher.search(l))
                found.add(l);
        }
        return found;
    }

    @Override
    public int size() {
        return dashboards.size();
    }

    @Override
    public void put(Dashboard it) {
        SQLiteDatabase db = this.dbHelper.getWritableDatabase();
        if(!dashboards.containsKey(it.getGuid()))
            db.insert(tableName, null, getContentValues(it));
        else
            db.update(tableName, getContentValues(it), "guid=?", new String[] {it.getGuid()});
        db.close();
        dashboards.put(it.getGuid(), it);
    }

    @Override
    public void remove(Dashboard it) {        
        if(this.dashboards.containsKey(it.getGuid())){
            SQLiteDatabase db = this.dbHelper.getReadableDatabase();
            db.delete(tableName, "guid=?", new String[] {it.getGuid()});
            db.close();
            dashboards.remove(it.getGuid());
        }
    }

    @Override
    public void sync() {
//        sendDashboardsToServer();
        SharedPreferences sharedPreferences = ctx.getSharedPreferences(ctx.getString(R.string.app_package), Context.MODE_PRIVATE);
        if(sharedPreferences.getBoolean(ctx.getString(R.string.syncAppsPreference), true)) {
            loadDashboardDataFromURI(null);
        }
    }

    public void sync(Handler handler) {
        loadDashboardDataFromURI(handler);
    }

    @Override
    public void put(Iterable<Dashboard> list) {
        for(Dashboard it : list){
            put(it);
        }
    }

    private void loadDashboardDataFromURI(Handler handler) {
        JsonObjectRequest jsonObjRequest = new JsonObjectRequest(Request.Method.GET, this.dashboardURI, null,
                dashboardsDownloadSuccessListener(handler),
                dashboardsDownloadErrorListener(handler));
        mVolleyQueue.add(jsonObjRequest);
    }

    private void loadDashboardDataFromDatabase(){
        SQLiteDatabase db = this.dbHelper.getReadableDatabase();
        Cursor cur = db.query(tableName, null, null, null, null, null, null);
        while(cur.moveToNext()){
            String guid = cur.getString(cur.getColumnIndex("guid"));
            String objectDefinition = cur.getString(cur.getColumnIndex("objectDefinition"));
            this.dashboards.put(guid , new Dashboard().fromJSON(objectDefinition));
        }
        cur.close();
    }

    private void sendDashboardsToServer(){
        final String dashboard_changes = getRequestBody();
//        ArrayList<NameValuePair> header = new ArrayList<NameValuePair>();
//        header.add(new BasicNameValuePair("Content-Type", "application/x-www-form-urlencoded"));
        StringRequest postRequest = new StringRequest(Request.Method.POST, this.dashboardURI,
                new Response.Listener<String>()
                {
                    @Override
                    public void onResponse(String response) {
                        dashboardsDownloadSuccessListener(null);
                    }
                },
                new Response.ErrorListener()
                {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        dashboardsDownloadErrorListener(null);
                    }
                }
        ) {
            @Override
            protected Map<String, String> getParams()
            {
                Map<String, String>  params = new HashMap<String, String>();
                params.put("Content-Type", "application/x-www-form-urlencoded");
                params.put("body", dashboard_changes);

                return params;
            }
        };
        mVolleyQueue.add(postRequest);
    }

    private ContentValues getContentValues(Dashboard it){
        ContentValues cv = new ContentValues();
        cv.put("guid", it.getGuid());
        cv.put("name", it.getName());
        cv.put("description", it.getDescription());
        cv.put("createdDate", it.getWriteableDateFormat().format(it.getCreatedDate()));
        cv.put("prettyCreatedDate", it.getPrettyCreatedDate());
        cv.put("prettyEditedDate", it.getPrettyEditedDate());
        cv.put("editedDate", it.getWriteableDateFormat().format(it.getEditedDate()));
        cv.put("dashboardPosition", it.getDashboardPosition());
        cv.put("objectDefinition", it.toJSON());
        return cv;
    }

    private String getRequestBody(){
        StringBuilder sb = new StringBuilder("[");
        String encoded = "";
        for(Dashboard it : this.dashboards.values()){
            sb.append(it.toJSON());
            sb.append(",");
        }
        if(sb.length() > 1)
            sb.deleteCharAt(sb.length() -1);
            sb.append("]");
        try {
            encoded = URLEncoder.encode(sb.toString(), "UTF-8");
        } catch (UnsupportedEncodingException e) {
            LogManager.log(Level.SEVERE, "Couldn't encode " + sb.toString(), e);

        }

        return "_method=PUT&data=" + encoded;
    }
}
