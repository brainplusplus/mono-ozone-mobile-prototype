package com.fourtwosix.mono.data.services;

import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.os.Handler;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.fragments.AppsMallFragment;
import com.fourtwosix.mono.structures.AppsMall;
import com.fourtwosix.mono.structures.OzoneIntent;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.structures.WidgetSource;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.WidgetImageDownloadHelper;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

/**
 * Created by Corey on 1/9/14.
 */
//TODO: This is a stub to be replaced with the data access layer
public class WidgetDataService implements IDataService<WidgetListItem> {
    Map<String, WidgetListItem> widgets = new ConcurrentHashMap<String, WidgetListItem>();
    final static String tableName = "Components";

    String baseUrl;
    String restUrl;
    SQLiteOpenHelper dbHelper;
    Context ctx;
    private String widgetSourceTableName = "WidgetSources";

    public WidgetDataService(String baseURL, SQLiteOpenHelper dbHelper, Context ctx) {
        this.dbHelper = dbHelper;
        this.baseUrl = baseURL;
        this.restUrl = baseURL + ctx.getString(R.string.widgetListPath);
        this.ctx = ctx;


        widgets = new ConcurrentHashMap<String, WidgetListItem>();
        loadWidgetsFromDatabase();
    }

    @Override
    public Iterable list() {
        return computeList(false);
    }

    public Iterable appsMallList(AppsMallFragment.AppsMallFragmentType type) {
        return computeList(type.equals(AppsMallFragment.AppsMallFragmentType.MALL));
    }

    private Iterable computeList(boolean appsMall) {
        Iterable result = widgets.values();
        SharedPreferences sharedPreferences = ctx.getSharedPreferences(ctx.getString(R.string.app_package), Context.MODE_PRIVATE);
        boolean showAll = sharedPreferences.getBoolean(ctx.getString(R.string.showAllWidgetsPreference), false);

        List<WidgetListItem> temp = new ArrayList<WidgetListItem>();
        for (WidgetListItem widget : widgets.values()) {
            if ((appsMall && widget.isAppsMall() )||(!appsMall && (!widget.isAppsMall() || widget.isInstalled()))) {
                if (!showAll) {
                    if (widget.getMobileReady()) {
                        temp.add(widget);
                    }
                } else {
                    temp.add(widget);
                }
            }


        }
        result = temp;

    return result;
}

    public Map<String, WidgetListItem> getWidgets() {
        return widgets;
    }

    @Override
    public WidgetListItem find(String guid) {
        return widgets.get(guid);
    }

    @Override
    public List<WidgetListItem> find(DataModelSearch<WidgetListItem> matcher) {
        ArrayList<WidgetListItem> found = new ArrayList<WidgetListItem>();
        for (WidgetListItem l : widgets.values()) {
            if (matcher.search(l))
                found.add(l);
        }
        return found;
    }

    @Override
    public int size() {
        return widgets.size();
    }

    @Override
    public void put(WidgetListItem it) {
        //replace the in memory version
        SQLiteDatabase db = this.dbHelper.getWritableDatabase();
        if (!widgets.containsKey(it.getGuid())) {
            db.insert(tableName, null, getContentValues(it));
        } else {
            it.setInstalled( widgets.get(it.getGuid()).isInstalled());
            db.update(tableName, getContentValues(it), "guid=?", new String[]{it.getGuid()});
        }

        widgets.put(it.getGuid(), it);
        db.close();
    }

    @Override
    public void put(Iterable<WidgetListItem> list) {
        for (WidgetListItem it : list) {
            put(it);
        }
    }

    @Override
    public void remove(WidgetListItem it) {
        SQLiteDatabase db = this.dbHelper.getReadableDatabase();
        db.delete(tableName, "guid=?", new String[]{it.getGuid()});
        db.close();
        widgets.remove(it.getGuid());
    }

    @Override
    public void sync() {
        throw new UnsupportedOperationException();
    }

    private void loadWidgetsFromDatabase() {
        SharedPreferences sharedPreferences = ctx.getSharedPreferences(ctx.getString(R.string.app_package), Context.MODE_PRIVATE);
        boolean showAll = sharedPreferences.getBoolean(ctx.getString(R.string.showAllWidgetsPreference), false);
        String whereClause = "appsMall=0";
        if (!showAll) {
            whereClause += " and mobileReady=1";
        }

        widgets = getWidgetsFromDB(whereClause);
    }

    private Map<String, WidgetListItem> getAllWidgetsFromDB() {
        return getWidgetsFromDB("");
    }

    private Map<String, WidgetListItem> getWidgetsFromDB(String whereClause) {
        SQLiteDatabase db = this.dbHelper.getReadableDatabase();
        String[] columns = {"guid", "title", "description", "url", "smallIcon", "largeIcon", "mobileReady", "appsMall","widgetSourceId", "installed"};
        Map<String, WidgetListItem> result = new HashMap<String, WidgetListItem>();
        Cursor cur = db.query(tableName, columns, whereClause, null, null, null, "title DESC");
        while (cur.moveToNext()) {
            WidgetListItem item = new WidgetListItem();
            item.setGuid(cur.getString(0));
            item.setTitle(cur.getString(1));
            item.setDescription(cur.getString(2));
            item.setUrl(cur.getString(3));
            item.setSmallIcon(cur.getString(4));
            item.setLargeIcon(cur.getString(5));
            item.setMobileReady(cur.getInt(6) == 1);
            item.setAppsMall(cur.getInt(7) == 1);
            item.setWidgetSource(getWidgetSource(cur.getString(8),true));
            item.setInstalled(cur.getInt(9) == 1);

            result.put(item.getGuid(), item);
        }
        cur.close();
        return result;
    }

    public WidgetSource getWidgetSource(String string,boolean byId) {
        SQLiteDatabase db = this.dbHelper.getReadableDatabase();
        String[] columns = {"guid", "url", "type"};

        String whereClause = "url = ?";
        if(byId){
            whereClause = "guid = ?";
        }
        Cursor cur = db.query(widgetSourceTableName, columns, whereClause, new String[]{string}, null, null, null);
        WidgetSource result = new WidgetSource();
        if(cur.moveToNext())
        {
            result.setId(cur.getString(0));
            result.setUrl(cur.getString(1));
            result.setType(cur.getString(2));
        }
        else
        {
            result.setId(UUID.randomUUID().toString());
            result.setUrl(string);
            //TODO set type
            result.setType("");
            ContentValues cv = new ContentValues();
            cv.put("guid",result.getId());
            cv.put("type",result.getType());
            cv.put("url",result.getUrl());
            db.insert(widgetSourceTableName,null,cv);
        }
        cur.close();
        return result;
    }

    private ContentValues getContentValues(WidgetListItem it) {
        ContentValues cv = new ContentValues();
        cv.put("guid", it.getGuid());
        cv.put("title", it.getTitle());
        cv.put("description", it.getDescription());
        cv.put("url", it.getUrl());
        cv.put("smallIcon", it.getSmallIcon());
        cv.put("largeIcon", it.getLargeIcon());
        cv.put("mobileReady", it.getMobileReady());
        cv.put("appsMall", it.isAppsMall());
        cv.put("widgetSourceId", it.getWidgetSource().getId());
        cv.put("installed",it.isInstalled());
        return cv;
    }

    /**
     * This method bulk inserts widgets. It will also take care of deduplication and pruning old widgets
     *
     * @param response
     * @return An arraylist of new widgets, empty list if no new widgets or error.
     */
    public void put(String widgetSourceUrl,JSONObject response) {
        try {
            JSONArray array = response.getJSONArray("rows");
            HashMap<String, WidgetListItem> newApps = new HashMap<String, WidgetListItem>(array.length());
            ArrayList<OzoneIntent> intents = new ArrayList<OzoneIntent>();

            for (int i = 0; i < array.length(); i++) {
                JSONObject containingObject = array.getJSONObject(i);
                JSONObject item = containingObject.getJSONObject("value");
                String guid = containingObject.getString("path");

                //get the universal name, if not, use the original name, using opt to prevent null pointer exceptions
                //TODO: remove hard coded references to JSON structure in favor of a reference
                if (item.has("originalName")) {
                    String title = item.getString("originalName");
                    String largeIconUrl = item.optString("largeIconUrl", null);
                    String smallIconUrl = item.optString("smallIconUrl", null);
                    boolean mobileReady = item.optBoolean("mobileReady", false);

                    String widgetUrl = item.getString("url") + ctx.getString(R.string.widgetUrlGetParameters);
                    if(!widgetUrl.contains("http")) {
                        widgetUrl = baseUrl + widgetUrl;
                    }
                    if (!largeIconUrl.contains("http")) {
                        largeIconUrl = baseUrl + largeIconUrl;
                    }
                    if (!smallIconUrl.contains("http")) {
                        smallIconUrl = baseUrl + smallIconUrl;
                    }

                    WidgetListItem widgetItem = new WidgetListItem(title, widgetUrl, smallIconUrl, largeIconUrl, guid, mobileReady);
                    widgetItem.setWidgetSource(getWidgetSource(widgetSourceUrl,false));
                    newApps.put(guid, widgetItem);

                    //grab the intents
                    JSONObject jsonIntents = item.getJSONObject("intents");
                    JSONArray sendIntents = jsonIntents.getJSONArray("send");
                    JSONArray receiveIntents = jsonIntents.getJSONArray("receive");
                    intents.addAll(processIntentJSON(sendIntents, guid, OzoneIntent.IntentDirection.SEND));
                    intents.addAll(processIntentJSON(receiveIntents, guid, OzoneIntent.IntentDirection.RECEIVE));
                }
            }
            //compare to list in db
            compareWidgets(newApps, false, null);

            IntentDataService dataService = (IntentDataService) DataServiceFactory.getService(DataServiceFactory.Services.IntentDataService);
            dataService.put(intents);
        } catch (JSONException exception) {
            LogManager.log(Level.SEVERE, "Could not correctly handle Json: " + response);
            LogManager.log(Level.SEVERE, "Json parsing exception:", exception);
        } catch (Exception exception) {
            LogManager.log(Level.SEVERE, "Json parsing exception:", exception);
        }
    }

    /**
     * Processes the json array of intents and returns an arraylist of OzoneIntents
     *
     * @param jsonArray json array containing the intents
     * @param guid      Guid of the widget
     * @param direction direction of the intents
     */
    private ArrayList<OzoneIntent> processIntentJSON(JSONArray jsonArray, String guid, OzoneIntent.IntentDirection direction) {
        ArrayList<OzoneIntent> intents = new ArrayList<OzoneIntent>();

        for (int i = 0; i < jsonArray.length(); i++) {
            try {
                JSONObject item = jsonArray.getJSONObject(i);
                JSONArray dataTypes = item.getJSONArray("dataTypes");

                for (int j = 0; j < dataTypes.length(); j++) {
                    OzoneIntent intent = new OzoneIntent();
                    intent.setDirection(direction);
                    intent.setGuid(guid);
                    intent.setAction(item.getString("action"));
                    intent.setType(dataTypes.getString(j));
                    intents.add(intent);
                }
            } catch (JSONException exception) {
                LogManager.log(Level.SEVERE, "Unable to process widget intent", exception);
            }
        }
        return intents;
    }

    /**
     * Compares widgets in the database to the downloaded list.
     * Will then add/remove widgets based on that result
     */
    private void compareWidgets(HashMap<String, WidgetListItem> downloadedWidgets, boolean appsMall, String appsMallUrl) {
        ArrayList<WidgetListItem> itemsToRemove = new ArrayList<WidgetListItem>();

        //if the database does not contain the widget remove from DB
        for (Map.Entry<String, WidgetListItem> entry : getAllWidgetsFromDB().entrySet()) {
            WidgetListItem item = entry.getValue();
           // If this current widget is not in the list we just downloaded
           if (!downloadedWidgets.containsKey(item.getGuid())) {
                if (!appsMall)
                    itemsToRemove.add(item);
                else {
                    // If the item is part of Apps Mall, has a Apps Mall Url; remove it
                    if (item.isAppsMall() && item.getWidgetSource().getUrl().equals(appsMallUrl)) {
                        itemsToRemove.add(item);
                    }
                }
            }

            // If this widget does not belong to the particular baseUrl; remove it
            if(!item.getWidgetSource().getUrl().equalsIgnoreCase(baseUrl)) {
                itemsToRemove.add(item);
            }
        }

        //remove items in a separate loop to avoid ConcurrentModification exceptions
        for (WidgetListItem item : itemsToRemove) {
            LogManager.log(Level.INFO, "Removing widget: " + item.getTitle());
            if (!item.isAppsMall()) {
                remove(item);
            }
        }

        //save the widgets
        for (Map.Entry<String, WidgetListItem> entry : downloadedWidgets.entrySet()) {
            WidgetListItem item = entry.getValue();
            // This should automatically update the url associated with the widget
            put(item);
        }

    }

    public void putAppsMall(AppsMall appsMall, JSONObject response) {
        try {
            JSONArray array = response.getJSONArray("data");
            HashMap<String, WidgetListItem> newApps = new HashMap<String, WidgetListItem>(array.length());

            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.getJSONObject(i);
                //JSONObject item = containingObject.getJSONObject("value");
                String guid = item.getString("uuid");//UUID.randomUUID().toString();//containingObject.getString("path");

                //get the universal name, if not, use the original name, using opt to prevent null pointer exceptions
                if (item.has("title")) {
//                    String title = appsMall.getName() + "_" + item.getString("title");
                    String title = item.getString("title");
                    String largeIconUrl = item.optString("imageLargeUrl", null);
                    String smallIconUrl = item.optString("imageSmallUrl", null);
                    boolean mobileReady = item.getJSONObject("owfProperties").optBoolean("mobileReady", false);
                    String widgetUrl = item.getString("launchUrl");
                    if (!widgetUrl.contains("http")) {
                        widgetUrl = baseUrl + widgetUrl;
                    }
                    if (!largeIconUrl.contains("http")) {
                        largeIconUrl = baseUrl + largeIconUrl;
                    }
                    if (!smallIconUrl.contains("http")) {
                        smallIconUrl = baseUrl + smallIconUrl;
                    }

                    WidgetListItem widgetItem = new WidgetListItem(title, widgetUrl, smallIconUrl, largeIconUrl, guid, mobileReady);
                    widgetItem.setAppsMall(true);
                    widgetItem.setWidgetSource(getWidgetSource(appsMall.getUrl().toString(),false));
                    newApps.put(guid, widgetItem);
                    // Download the apps mall icons
                    WidgetImageDownloadHelper widgetImageDownloadHelper = new WidgetImageDownloadHelper(ctx, new Handler(), widgetItem.getWidgetSource().getUrl());
                    widgetImageDownloadHelper.downloadImages(newApps);
                }
            }

            //TODO what if the widget already existed locally?
            compareWidgets(newApps, true, appsMall.getUrl().toString());
        } catch (JSONException exception) {
            LogManager.log(Level.SEVERE, "Could not correctly handle Json: " + response);
            LogManager.log(Level.SEVERE, "Json parsing exception:", exception);
        } catch (Exception exception) {
            LogManager.log(Level.SEVERE, "Json parsing exception:", exception);
        }
    }
}
