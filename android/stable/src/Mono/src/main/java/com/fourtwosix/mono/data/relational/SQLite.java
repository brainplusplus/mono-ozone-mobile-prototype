package com.fourtwosix.mono.data.relational;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import android.database.sqlite.SQLiteOpenHelper;

import com.fourtwosix.mono.data.relational.exceptions.BadSyntaxException;
import com.fourtwosix.mono.data.relational.exceptions.DBException;

import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * This is the SQLite backend for application storage.
 */
public class SQLite implements Database {
    private static Logger log = Logger.getLogger(SQLite.class.getName());
    private static final int DATABASE_VERSION = 2;

    // Database storage
    private Context context;
    // Unique identifier for the application using the database
    private String appIdentifier;

    // SQLiteHelper
    private SQLiteHelper helper;
    // The SQLiteDatabase itself
    private SQLiteDatabase db;

    public SQLite(Context context, String appIdentifier) {
        this.context = context;
        this.appIdentifier = appIdentifier;

        helper = new SQLiteHelper(context, appIdentifier);
        db = helper.getWritableDatabase();
    }

    private class SQLiteHelper extends SQLiteOpenHelper {
        public SQLiteHelper(Context context, String dbName) {
            super(context, dbName, null, DATABASE_VERSION);
        }

        @Override
        public void onCreate(SQLiteDatabase db) {
            // Do nothing in particular
        }

        @Override
        public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
            // Drop all previous tables
            //db.execSQL("SELECT 'DROP TABLE ' || name || ';' FROM sqlite_master where type = 'table'");
        }
    }

    /**
     * Returns true if the table exists.
     * @param tableName The table to test against.
     * @return True if the table exists, false otherwise.
     */
    public boolean tableExists(String tableName) {
        Cursor cursor = null;

        try {
            cursor = db.rawQuery("select tbl_name from sqlite_master where tbl_name = '" + tableName + "'", null);

            if(cursor != null) {
                if(cursor.getCount() > 0) {
                    return true;
                }
            }

            return false;
        }
        finally {
            if(cursor != null) {
                cursor.close();
            }
        }
    }

    /**
     * Executes a single query.
     * Meant for queries that require no result.
     * @param query The query to execute.
     * @param selectionArgs The arguments that the query should be using.
     * @throws com.fourtwosix.mono.data.relational.exceptions.BadSyntaxException
     * @throws com.fourtwosix.mono.data.relational.exceptions.DBException
     */
    public synchronized void exec(String query, String [] selectionArgs)
            throws BadSyntaxException, DBException {
        query(query, selectionArgs);
    }

    /**
     * Executes a query and returns the results.  This is not meant for queries that modify the table.
     * For those queries, use {@link #exec(String, String[])}
     * You should not concatenate variable values into your string.  Rather, you should supply them with
     * selectionArgs.  For example:
     *
     * String query = "SELECT * FROM table WHERE column1 = ? AND column2 = ?";
     * String [] args = new String[]{"5", "Henry"}
     * sqliteDb.rawQuery(query, args);
     *
     * @param query The query to execute.
     * @param selectionArgs The arguments that the query should be using.
     * @return A ResultList object populated with the rows from the query.
     * @throws com.fourtwosix.mono.data.relational.exceptions.BadSyntaxException
     * @throws com.fourtwosix.mono.data.relational.exceptions.DBException
     */
    public ResultList query(String query, String [] selectionArgs)
            throws BadSyntaxException, DBException {
        refreshDb();
        ResultList results = new ResultList();

        Cursor cursor = null;

        // Perform the actual query
        try {

            cursor = db.rawQuery(query, selectionArgs);

            // Get various data about the result set
            String [] columns = cursor.getColumnNames();
            int numCols = columns.length;
            int numRows = cursor.getCount();

            // Loop through the results, adding to our internal structures as we go
            for(int i=0; i<numRows; i++) {
                cursor.moveToPosition(i);
                Result result = new Result();

                // Go through each column for a row, determine the proper types
                for(int j=0; j<numCols; j++) {
                    int colType = cursor.getType(j);

                    switch(colType) {
                        case Cursor.FIELD_TYPE_BLOB:
                            result.addBlob(columns[j], cursor.getBlob(j));
                            break;

                        case Cursor.FIELD_TYPE_FLOAT:
                            result.addFloat(columns[j], cursor.getFloat(j));
                            break;

                        case Cursor.FIELD_TYPE_INTEGER:
                            result.addInteger(columns[j], cursor.getInt(j));
                            break;

                        case Cursor.FIELD_TYPE_NULL:
                            result.addNull(columns[j]);
                            break;

                        case Cursor.FIELD_TYPE_STRING:
                        default:
                            result.addString(columns[j], cursor.getString(j));
                            break;
                    }
                }

                // Add the result to our list
                results.addResult(result);
            }
        }
        catch(SQLiteException e) {
            // This is indicative of a syntax error
            if(e.getMessage().contains("not an error") || e.getMessage().contains("syntax error")) {
                throw new BadSyntaxException("Bad syntax in query: " + query);
            }
            else {
                log.log(Level.SEVERE, "Error during query.", e);
                throw new DBException(e);
            }
        }
        finally {
            if(cursor != null) {
                cursor.close();
            }
        }

        return results;
    }

    private synchronized void refreshDb() {
        if(db.isDatabaseIntegrityOk() == false) {
            db.close();
            db = helper.getWritableDatabase();
        }
    }
}
