package com.fourtwosix.mono.data.services;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteConstraintException;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import com.fourtwosix.mono.data.DatabaseUtils;
import com.fourtwosix.mono.structures.OzoneIntent;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.LogManager;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;

/**
 * Created by Eric on 2/5/14.
 */
public class IntentDataService implements IDataService<OzoneIntent> {

    final static String tableName = "Intents";
    Map<String, OzoneIntent> intents = new HashMap<String, OzoneIntent>();

    SQLiteOpenHelper databaseHelper;
    Context context;

    public IntentDataService(SQLiteOpenHelper databaseHelper, Context context) {
        this.databaseHelper = databaseHelper;
        this.context = context;
        loadIntentsFromDatabase();
    }

    private void loadIntentsFromDatabase(){
        SQLiteDatabase db = this.databaseHelper.getReadableDatabase();
        String[] columns = {"guid", "action", "type", "direction", "defaultReceiver"};
        DatabaseUtils dbu = new DatabaseUtils(context);
        if(!dbu.tableExists(tableName))
        {
            db.execSQL("CREATE TABLE Intents (guid TEXT, action TEXT, type TEXT, direction integer, defaultReceiver TEXT, PRIMARY KEY(guid, action, type, direction));");
        }
        Cursor cur = db.query(tableName, columns, null, null, null, null, null);
        while(cur.moveToNext()){

            OzoneIntent intent = new OzoneIntent();
            intent.setGuid(cur.getString(0));
            intent.setAction(cur.getString(1));
            intent.setType(cur.getString(2));
            intent.setDirection(OzoneIntent.IntentDirection.values()[cur.getInt(3)]);
            intent.setDefaultReceiver(cur.getString(4));

            this.intents.put(getIntentKey(intent), intent);
        }
        cur.close();
    }

    @Override
    public Iterable list() {
        return intents.values();
    }

    @Override
    public OzoneIntent find(String guid) {
        for(Map.Entry<String, OzoneIntent> entry : intents.entrySet()) {
            if(getIntentKey(entry.getValue()).equals(guid)) {
                return entry.getValue();
            }
        }
        return null;
    }

    @Override
    public List<OzoneIntent> find(DataModelSearch<OzoneIntent> matcher) {
        ArrayList<OzoneIntent> found = new ArrayList<OzoneIntent>();
        for (OzoneIntent l : intents.values()){
            if(matcher.search(l))
                found.add(l);
        }
        return found;
    }

    @Override
    public int size() {
        return intents.size();
    }

    @Override
    public void put(OzoneIntent intent) {
        SQLiteDatabase db = this.databaseHelper.getWritableDatabase();
        String id = getIntentKey(intent);
        if(!intents.containsKey(id)) {
            try {
                db.insert(tableName, null, getContentValues(intent));
                //make sure to update in memory copy with updated object
                intents.put(id, intent);
            } catch (SQLiteConstraintException exception) {
                LogManager.log(Level.SEVERE, "Widget intent already exists", exception);
            }
        }
        else {
            String whereClause = "guid=? and action=? and type=? and direction=?";
            String[] whereArgs = new String[] { intent.getGuid(), intent.getAction(), intent.getType(), "" + intent.getDirection()};
            db.update(tableName, getContentValues(intent), whereClause, whereArgs);
            OzoneIntent existingIntent = intents.get(getIntentKey(intent));
            existingIntent.merge(intent);
            intents.put(id, existingIntent);
        }
    }

    @Override
    public void put(Iterable<OzoneIntent> list) {
        for(OzoneIntent it : list) {
            put(it);
        }
    }

    @Override
    public void remove(OzoneIntent intent) {
        SQLiteDatabase db = this.databaseHelper.getReadableDatabase();
        String whereClause = "guid=? and action=? and type=? and direction=?";
        String[] whereArgs = new String[] { intent.getGuid(), intent.getAction(), intent.getType(), "" + intent.getDirection()};
        db.delete(tableName, whereClause, whereArgs);
        intents.remove(getIntentKey(intent));
    }

    @Override
    public void sync() {
        throw new UnsupportedOperationException();
    }

    /**
     * Gets a string ID of the intent
     * @param intent
     * @return
     */
    public String getIntentKey(OzoneIntent intent) {
        return intent.getGuid() + "-" + intent.getAction() + "-" + intent.getType() + "-" + intent.getDirection();
    }

    private ContentValues getContentValues(OzoneIntent it){
        ContentValues cv = new ContentValues();
        cv.put("guid", it.getGuid());
        cv.put("action", it.getAction());
        cv.put("type", it.getType());
        cv.put("direction", it.getDirection());
        cv.put("defaultReceiver", it.getDefaultReceiver());
        return cv;
    }

    /**
     * Gets all intents for a given widget
     * @param widget
     * @return
     */
    public Iterable<OzoneIntent> getWidgetIntents(WidgetListItem widget) {
        ArrayList<OzoneIntent> widgetIntents = new ArrayList<OzoneIntent>();
        for(Map.Entry<String, OzoneIntent> entry : intents.entrySet()) {
            if(entry.getValue().getGuid().equals(widget.getGuid())) {
                widgetIntents.add(entry.getValue());
            }
        }
        return widgetIntents;
    }

    /**
     * Gets all intents for a given widget and direction
     * @param widget
     * @param intentDirection
     * @return
     */
    public Iterable<OzoneIntent> getWidgetIntents(WidgetListItem widget, OzoneIntent.IntentDirection intentDirection) {
        ArrayList<OzoneIntent> widgetIntents = new ArrayList<OzoneIntent>();
        for(Map.Entry<String, OzoneIntent> entry : intents.entrySet()) {
            OzoneIntent intent = entry.getValue();
            if(intent != null && intent.getGuid() != null && intent.getIntentDirection() != null) {
                if (intent.getGuid().equals(widget.getGuid()) && intent.getIntentDirection() == intentDirection) {
                    widgetIntents.add(entry.getValue());
                }
            }
        }
        return widgetIntents;
    }

    /**
     * Checks whether a widget can receive an intent
     * @param widgetListItem The widget
     * @param intent The intent
     * @return
     */
    public boolean canReceiveIntent(WidgetListItem widgetListItem, OzoneIntent intent) {
        SQLiteDatabase db = this.databaseHelper.getReadableDatabase();
        boolean result = false;
        String where = "guid = ? AND action = ? and type = ? and direction = ?";
        String[] whereArgs = new String[] {widgetListItem.getGuid(), "" + intent.getAction(), "" + intent.getType(), "" + intent.getDirection()};
        try {
            Cursor cur = db.query(tableName, null, where, whereArgs, null, null, null);
            if(cur.getCount() > 0) {
                result = true;
            }
            cur.close();
        } catch (Exception exception) {
            LogManager.log(Level.SEVERE, "IntentDataService Exception", exception);
        }
        return result;
    }
}
