package com.fourtwosix.mono.data.services;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteConstraintException;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import com.fourtwosix.mono.structures.OzoneIntent;
import com.fourtwosix.mono.structures.OzoneIntentPreference;
import com.fourtwosix.mono.utils.LogManager;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;

/**
 * Created by Eric on 2/5/14.
 */
public class IntentPreferenceService implements IDataService<OzoneIntentPreference> {

    public final static String tableName = "IntentPreferences";
    public final static String CREATE_TABLE_STATEMENT = "CREATE TABLE IF NOT EXISTS IntentPreferences (dashboardGuid TEXT NOT NULL, sender TEXT NOT NULL, receiver TEXTNOT NULL, action TEXT NOT NULL, type TEXT NOT NULL, PRIMARY KEY(dashboardGuid, sender, receiver, action, type));";
    Map<String, OzoneIntentPreference> intents = new HashMap<String, OzoneIntentPreference>();

    SQLiteOpenHelper databaseHelper;
    Context context;

    public IntentPreferenceService(SQLiteOpenHelper databaseHelper, Context context) {
        this.databaseHelper = databaseHelper;
        this.context = context;
        load();
    }

    private void load(){
        SQLiteDatabase db = this.databaseHelper.getReadableDatabase();
        String[] columns = {"dashboardGuid", "sender", "receiver", "action", "type"};
        Cursor cur = db.query(tableName, columns, null, null, null, null, null);
        while(cur.moveToNext()){

            OzoneIntentPreference intent = new OzoneIntentPreference();
            intent.setDashboardGuid(cur.getString(0));
            intent.setSender(cur.getString(1));
            intent.setReceiver(cur.getString(2));
            intent.setAction(cur.getString(3));
            intent.setType(cur.getString(4));

            this.intents.put(intent.getGuid(), intent);
        }
        cur.close();
    }

    @Override
    public Iterable list() {
        return intents.values();
    }

    @Override
    public OzoneIntentPreference find(String guid) {
        if(intents.containsKey(guid)) {
            return intents.get(guid);
        } else {
            return null;
        }
    }

    @Override
    public List<OzoneIntentPreference> find(DataModelSearch<OzoneIntentPreference> matcher) {
        ArrayList<OzoneIntentPreference> found = new ArrayList<OzoneIntentPreference>();
        for (OzoneIntentPreference l : intents.values()){
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
    public void put(OzoneIntentPreference intent) {
        if(!intents.containsKey(intent.getGuid())) {
            SQLiteDatabase db = this.databaseHelper.getWritableDatabase();
            try {
                db.insert(tableName, null, getContentValues(intent));
                //make sure to update in memory copy with updated object
                intents.put(intent.getGuid(), intent);
            } catch (SQLiteConstraintException exception) {
                LogManager.log(Level.SEVERE, "Intent preference already exists", exception);
            }
        }
    }

    @Override
    public void put(Iterable<OzoneIntentPreference> list) {
        for(OzoneIntentPreference it : list) {
            put(it);
        }
    }

    @Override
    public void remove(OzoneIntentPreference intent) {
        SQLiteDatabase db = this.databaseHelper.getReadableDatabase();
        String whereClause = "dashboardGuid=? and sender=? and receiver=? and action=? and type=?";
        String[] whereArgs = new String[] { intent.getDashboardGuid(), intent.getSender(), intent.getReceiver(), intent.getAction(), intent.getType()};
        db.delete(tableName, whereClause, whereArgs);
        intents.remove(intent.getGuid());
    }

    @Override
    public void sync() {
        throw new UnsupportedOperationException();
    }

    /**
     * Finds the target of an intent in a given dashboard
     * @param dashboardGuid Guid of the dashboard
     * @param intent the OzoneIntent
     * @return
     */
    public OzoneIntentPreference findTarget(String dashboardGuid, OzoneIntent intent) {
        SQLiteDatabase db = this.databaseHelper.getReadableDatabase();
        String[] columns = new String[] { "dashboardGuid", "sender", "receiver", "action", "type"};
        String whereClause = "dashboardGuid = ? and sender = ? and action = ? and type = ?";
        String[] whereArgs = new String[] { dashboardGuid, intent.getGuid(), intent.getAction(), intent.getType()};
        Cursor cursor = db.query(tableName, columns, whereClause, whereArgs, null, null, null, "1");
        OzoneIntentPreference intentPreference = null;
        if(cursor.moveToNext()) {
            intentPreference = new OzoneIntentPreference();
            intentPreference.setDashboardGuid(cursor.getString(0));
            intentPreference.setSender(cursor.getString(1));
            intentPreference.setReceiver(cursor.getString(2));
            intentPreference.setAction(cursor.getString(3));
            intentPreference.setType(cursor.getString(4));
        }
        cursor.close();

        return intentPreference;
    }

    private ContentValues getContentValues(OzoneIntentPreference it){
        ContentValues cv = new ContentValues();
        cv.put("dashboardGuid", it.getDashboardGuid());
        cv.put("sender", it.getSender());
        cv.put("receiver", it.getReceiver());
        cv.put("action", it.getAction());
        cv.put("type", it.getType());
        return cv;
    }
}
