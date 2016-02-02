package com.fourtwosix.mono.caching;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.fourtwosix.mono.data.ORM.types.Cache;
import com.fourtwosix.mono.data.ORM.types.CachedData;
import com.fourtwosix.mono.data.ORM.types.DatabaseHelper;
import com.fourtwosix.mono.utils.ConnectivityHelper;
import com.fourtwosix.mono.utils.LogManager;
import com.j256.ormlite.dao.Dao;
import com.j256.ormlite.stmt.PreparedQuery;
import com.j256.ormlite.stmt.QueryBuilder;

import java.sql.SQLException;
import java.util.Calendar;
import java.util.List;
import java.util.logging.Level;

/**
 * Created by alerman on 2/1/14.
 */
public class CacheExpirationReceiver extends BroadcastReceiver {

    public static final String EXPIRE_INTENT = "RUN_CACHE_EXPIRATION";
    public static final long RUN_INTERVAL = 1000 * 60 * 5;
    private static CacheExpirationReceiver instance = null;

    protected CacheExpirationReceiver() {
        // Exists only to defeat instantiation.
    }
    public static CacheExpirationReceiver getInstance() {
        if(instance == null) {
            instance = new CacheExpirationReceiver();
        }
        return instance;
    }

    private static boolean enabled = true;

    @Override
    public void onReceive(Context context, Intent intent) {
        // Only call the expiration receiver when comms are available.
        if(ConnectivityHelper.isNetworkAvailable(context)) {
            LogManager.log(Level.INFO, "CacheExpirationReceiver onRecieve called");
            DatabaseHelper helper = new DatabaseHelper(context);

            if (CacheExpirationReceiver.enabled) {
                try {
                    List<Cache> caches = helper.getCacheDao().queryForAll();
                    for (Cache cache : caches) {
                        // TODO: find a less dangerous way to do this
                        int expirationInMinutes = (int) cache.getExpirationInMinutes();
                        Calendar expireBeforeCal = Calendar.getInstance();
                        expireBeforeCal.add(Calendar.MINUTE, -expirationInMinutes);

                        Dao<CachedData, Integer> cachedDataDao = helper.getCachedDataDao();
                        QueryBuilder<CachedData, Integer> queryBuilder = cachedDataDao.queryBuilder();

                        queryBuilder.where().lt(CachedData.DATE_FIELD_NAME, expireBeforeCal.getTime());

                        PreparedQuery<CachedData> deletesQuery = queryBuilder.prepare();
                        List<CachedData> deletes = cachedDataDao.query(deletesQuery);

                        cachedDataDao.delete(deletes);
                    }
                } catch (SQLException e) {
                    LogManager.log(Level.SEVERE, "Sql exception was " + e.getMessage());
                }
            }
        }
    }

    public void disable() {
        this.enabled = false;
    }

    public void enable(){
        this.enabled = true;
    }
}
