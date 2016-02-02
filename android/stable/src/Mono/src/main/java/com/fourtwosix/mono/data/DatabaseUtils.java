package com.fourtwosix.mono.data;


import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.IntentPreferenceService;
import com.fourtwosix.mono.utils.LogManager;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;

public class DatabaseUtils extends SQLiteOpenHelper{
    static final String databaseName = "mono";
    static final String scriptTable = "scripts";
    static final String scriptField = "scriptName";

    private Context ctx;

    public DatabaseUtils(Context context){
        super(context,
                databaseName,
                null,
                Integer.parseInt(context.getString(R.string.database_version)));
        this.ctx = context;
        loadScripts();
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
//        loadScripts(db);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
//        loadScripts(db);
    }

    public boolean tableExists(String tableName){
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.rawQuery("select DISTINCT tbl_name from sqlite_master where tbl_name = '"+tableName+"'", null);
        if(cursor!=null) {
            if(cursor.getCount()>0) {
                cursor.close();
                return true;
            }
            cursor.close();
        }
        return false;
    }

    protected String getScriptFile(String name){
        InputStream ins = ctx.getResources().openRawResource( ctx.getResources().getIdentifier("raw/" + name,"raw", ctx.getPackageName()) );
        try{
            BufferedReader is = new BufferedReader(new java.io.InputStreamReader(ins, "UTF8"));
            StringBuilder sb = new StringBuilder();
            String line = null;
            while ((line = is.readLine()) != null) {
                sb.append(line).append("\n");
            }
            is.close();
            return sb.toString();
        }
        catch (UnsupportedEncodingException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
            return "";
        }
        catch (IOException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
            return "";
        }
    }

    protected void createScriptTable(){
        SQLiteDatabase db = getWritableDatabase();
        db.execSQL("CREATE TABLE " + scriptTable + " (" + scriptField + " TEXT)");
        db.execSQL("CREATE TABLE Components (guid TEXT, title TEXT, description TEXT, url TEXT, smallIcon TEXT, largeIcon TEXT, mobileReady INTEGER, appsMall INTEGER, widgetSourceId TEXT, installed INTEGER); ");
        db.execSQL("CREATE TABLE WidgetSources (guid TEXT, url TEXT, type TEXT, UNIQUE(url));");
        db.execSQL("CREATE TABLE Intents (guid TEXT, action TEXT, type TEXT, direction integer, defaultReceiver TEXT, PRIMARY KEY(guid, action, type, direction));");
        db.execSQL(IntentPreferenceService.CREATE_TABLE_STATEMENT);
    }

    public void loadScripts(){

        Map<String, Integer> scripts = getScripts();

        //Check to see if any scripts have been loaded
        if(tableExists(scriptTable)){
            SQLiteDatabase db = getReadableDatabase();
            Cursor c = db.query(scriptTable, new String[]{scriptField}, null, null, null, null, null);
            int id = c.getColumnIndex(scriptField);
            for(c.moveToFirst(); !c.isAfterLast(); c.moveToNext()) {
                scripts.remove(c.getString(id));
            }
            c.close();
        }
        else
            createScriptTable();

        for(Map.Entry<String, Integer> curr : scripts.entrySet()){
            try{
                SQLiteDatabase db = getWritableDatabase();
                db.execSQL(getScriptFile(curr.getKey()));
                ContentValues cv = new ContentValues();
                cv.put(scriptField, curr.getKey());
                db.insertOrThrow(scriptTable, null, cv);
                db.close();
            }
            catch (Exception e){
                LogManager.log(Level.SEVERE, e.getMessage());
            }
        }
    }

    protected Map<String, Integer> getScripts(){
        Map<String, Integer> scripts = new HashMap<String, Integer>();

        Field[] fields = R.raw.class.getFields();
        for(Field f : fields)
            try {
                scripts.put(f.getName(), f.getInt(null));
            } catch (IllegalArgumentException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
            } catch (IllegalAccessException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
            }

        return scripts;
    }
}