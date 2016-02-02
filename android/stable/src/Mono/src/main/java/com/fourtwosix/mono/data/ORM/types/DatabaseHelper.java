package com.fourtwosix.mono.data.ORM.types;

/**
 * Created by alerman on 1/22/14.
 */


import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import com.fourtwosix.mono.utils.LogManager;
import com.j256.ormlite.android.apptools.OrmLiteSqliteOpenHelper;
import com.j256.ormlite.dao.Dao;
import com.j256.ormlite.dao.RuntimeExceptionDao;
import com.j256.ormlite.support.ConnectionSource;
import com.j256.ormlite.table.TableUtils;

import java.sql.SQLException;
import java.util.logging.Level;

/**
 * Database helper class used to manage the creation and upgrading of your database. This class also usually provides
 * the DAOs used by the other classes.
 */
public class DatabaseHelper extends OrmLiteSqliteOpenHelper {

    // name of the database file for your application -- change to something appropriate for your app
    private static final String DATABASE_NAME = "mono.db";
    // any time you make changes to your database objects, you may have to increase the database version
    private static final int DATABASE_VERSION = 4;

    // the DAO object we use to access the SimpleData table
    private Dao<Cache, Integer> cacheDao = null;
    private Dao<CachedData, Integer> cachedDataDao = null;
    private RuntimeExceptionDao<Cache, Integer> cacheRuntimeDao = null;

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    /**
     * This is called when the database is first created. Usually you should call createTable statements here to create
     * the tables that will store your data.
     */
    @Override
    public void onCreate(SQLiteDatabase db, ConnectionSource connectionSource) {
        try {
            Log.i(DatabaseHelper.class.getName(), "onCreate");
            TableUtils.createTable(connectionSource, Cache.class);
            TableUtils.createTable(connectionSource, CachedData.class);
        } catch (SQLException e) {
            LogManager.log(Level.SEVERE, "Can't create database", e);
            throw new RuntimeException(e);
        }

//        // here we try inserting data in the on-create as a test
//        RuntimeExceptionDao<Cache, Integer> dao = getSimpleDataDao();
//        long millis = System.currentTimeMillis();
//        // create some entries in the onCreate
//
//
//        Log.i(DatabaseHelper.class.getName(), "created new entries in onCreate: " + millis);
    }

    /**
     * This is called when your application is upgraded and it has a higher version number. This allows you to adjust
     * the various data to match the new version number.
     */
    @Override
    public void onUpgrade(SQLiteDatabase db, ConnectionSource connectionSource, int oldVersion, int newVersion) {
        try {
            Log.i(DatabaseHelper.class.getName(), "onUpgrade");
            TableUtils.dropTable(connectionSource, Cache.class, true);
            TableUtils.dropTable(connectionSource, CachedData.class, true);
            // after we drop the old databases, we create the new ones
            onCreate(db, connectionSource);
        } catch (SQLException e) {
            LogManager.log(Level.SEVERE, "Can't drop databases", e);
            throw new RuntimeException(e);
        }
    }

    /**
     * Returns the Database Access Object (DAO) for our SimpleData class. It will create it or just give the cached
     * value.
     */
    public Dao<Cache, Integer> getCacheDao() throws SQLException {
        if (cacheDao == null) {
            cacheDao = getDao(Cache.class);
        }
        return cacheDao;
    }

    /**
     * Returns the RuntimeExceptionDao (Database Access Object) version of a Dao for our SimpleData class. It will
     * create it or just give the cached value. RuntimeExceptionDao only through RuntimeExceptions.
     */
    public RuntimeExceptionDao<Cache, Integer> getSimpleDataDao() {
        if (cacheRuntimeDao == null) {
            cacheRuntimeDao = getRuntimeExceptionDao(Cache.class);
        }
        return cacheRuntimeDao;
    }

    /**
     * Close the database connections and clear any cached DAOs.
     */
    @Override
    public void close() {
        super.close();
        cacheDao = null;
        cacheRuntimeDao = null;
    }

    public Dao<CachedData, Integer> getCachedDataDao() throws SQLException {
        if (cachedDataDao == null) {
            cachedDataDao = getDao(CachedData.class);
        }
        return cachedDataDao;
    }
}