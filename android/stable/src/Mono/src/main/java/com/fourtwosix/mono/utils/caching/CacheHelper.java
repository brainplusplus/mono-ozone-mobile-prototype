package com.fourtwosix.mono.utils.caching;

import android.content.Context;
import android.webkit.WebResourceResponse;

import com.android.volley.Cache;
import com.android.volley.NetworkResponse;
import com.android.volley.ParseError;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.RetryPolicy;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.HttpHeaderParser;
import com.fourtwosix.mono.data.ORM.types.BackingStore;
import com.fourtwosix.mono.data.ORM.types.CachedData;
import com.fourtwosix.mono.data.ORM.types.DatabaseHelper;
import com.fourtwosix.mono.utils.ConnectivityHelper;
import com.fourtwosix.mono.utils.IOUtil;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.WebHelper;
import com.fourtwosix.mono.webViewIntercept.json.CacheResponse;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import com.j256.ormlite.dao.Dao;
import com.j256.ormlite.stmt.PreparedQuery;
import com.j256.ormlite.stmt.QueryBuilder;

import org.apache.commons.io.IOUtils;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URL;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;

public abstract class CacheHelper extends Request<JSONObject> {
    public final static long DEFAULT_REFRESH = 3 * 60 * 60; // 3 minutes
    public final static long DEFAULT_EXPIRATION = 30L * 24 * 60 * 60; // 30 days
    public final static long MINUTES_TO_MILLIS = 60 * 1000;
    private static DatabaseHelper helper;

    public CacheHelper(int method, String url, Response.ErrorListener listener) {
        super(method, url, listener);
    }

    /**
     * Checks the Volley cache first (this is least expensive), then makes a database query if
     * necessary to see if we have data stored in the database cache.
     *
     * @param c   The context
     * @param url The url (key) to look up the data from the request queue
     * @return true or false based on whether or not the data exists in the Volley queue
     * or the database cache.
     */
    public static boolean dataIsCached(Context c, String url) {
        return (getCachedData(c, url) != null);
    }

    /**
     * Checks the Volley cache first (this is least expensive), then makes a database query if
     * necessary to see if we have data stored in the database cache.
     *
     * @param c   The context
     * @param url The url (key) to look up the data from the request queue
     * @return true or false based on whether or not the data exists in the Volley queue
     * or the database cache.
     */
    public static boolean dataIsCachedForOfflineUse(Context c, String url) {
        return (getDatabaseCachedData(c, url, false, false) != null);
    }

    /**
     * @param c   The context
     * @param url The url (key) to look up the data from the request queue
     * @return A Cache.Entry (Volley-based). cacheEntry.responseHeaders are not writable
     */
    public static Cache.Entry getCachedData(Context c, String url) {
        // Check the Volley Cache first
        Cache.Entry volleyCachedData = getVolleyCachedData(c, url, true);
        if (volleyCachedData == null) {
            // Check the database cache
            return getDatabaseCachedData(c, url);
        } else {
            return volleyCachedData;
        }
    }

    /**
     * @param c   The context
     * @param url The url (key) to look up the data from the request queue
     * @return A Cache.Entry (Volley-based). cacheEntry.responseHeaders are not writable
     */
    public static Cache.Entry getOfflineCachedDataWithoutRegardForExpiration(Context c, String url) {
        Cache.Entry volleyCachedData = getVolleyCachedDataWithoutExpiration(c, url);
        if (volleyCachedData == null) {
            // Check the database cache
            return getDatabaseOfflineCachedData(c, url);
        } else {
            return volleyCachedData;
        }
    }

    /**
     * Get the Volley cached data - this is cached based on response headers for softTTl and TTL
     *
     * @param c   The context
     * @param url The url (key) to look up the data from the request queue
     * @return A Cache.Entry (Volley-based)
     */
    public static Cache.Entry getVolleyCachedDataAndCheckExpiration(Context c, String url) {
        return getVolleyCachedData(c, url, true);
    }

    /**
     * Get the Volley cached data - this is cached based on response headers for softTTl and TTL
     *
     * @param c   The context
     * @param url The url (key) to look up the data from the request queue
     * @return A Cache.Entry (Volley-based)
     */
    public static Cache.Entry getVolleyCachedDataWithoutExpiration(Context c, String url) {
        return getVolleyCachedData(c, url, false);
    }

    /**
     * Get the Volley cached data - this is cached based on response headers for softTTl and TTL
     *
     * @param c   The context
     * @param url The url (key) to look up the data from the request queue
     * @return A Cache.Entry (Volley-based)
     */
    public static Cache.Entry getVolleyCachedData(Context c, String url, boolean checkForExpiration) {
        RequestQueue q = VolleySingleton.getInstance(c).getRequestQueue();
        Cache.Entry volleyCacheEntry = q.getCache().get(url);
        if (checkForExpiration) {
            if (volleyCacheEntry != null && dataIsNotExpired(volleyCacheEntry)) {
                return volleyCacheEntry;
            }
        } else {
            // otherwise don't check if data isn't expired and return volley CacheEntry if it's not null
            // TODO: also notify the widget making the request that the data is expired, so they can choose what to do (i.e. notify the user)
            if (volleyCacheEntry != null) {
                return volleyCacheEntry;
            }
        }
        return null;
    }

    /**
     * Get just the database cached data
     *
     * @param c   The context
     * @param url The url (key) to look up the data from the database
     * @return A Cache.Entry which contains key/value pairs based on Volley's implementation
     */
    public static Cache.Entry getDatabaseCachedData(Context c, String url) {
        return getDatabaseCachedData(c, url, true); // check for expiration on data
    }

    /**
     * Get just the database cached data specifically for offline usage
     *
     * @param c   The context
     * @param url The url (key) to look up the data from the database
     * @return A Cache.Entry which contains key/value pairs based on Volley's implementation
     */
    public static Cache.Entry getDatabaseOfflineCachedData(Context c, String url) {
        return getDatabaseCachedData(c, url, false); // don't check for expiration for data
    }

    public static Cache.Entry getDatabaseCachedData(Context c, String url, boolean checkIfDataIsExpired) {
        return getDatabaseCachedData(c, url, checkIfDataIsExpired, true);
    }

    /**
     * Get just the database cached data and check for expiration based on the boolean passed
     *
     * @param c                    The context
     * @param url                  The url (key) to look up the data from the database
     * @param checkIfDataIsExpired Whether or not to check if data is expired
     * @return A Cache.Entry which contains key/value pairs based on Volley's implementation
     */
    public static Cache.Entry getDatabaseCachedData(Context c, String url, boolean checkIfDataIsExpired, boolean getData) {
        try {
            if (helper == null) {
                helper = new DatabaseHelper(c);
            }
            Dao<CachedData, Integer> cachedDataDao = helper.getCachedDataDao();
            QueryBuilder<CachedData, Integer> queryBuilder = cachedDataDao.queryBuilder();
//            queryBuilder.limit(1L).where().eq(CachedData.URL_FIELD_NAME, url).and().ge(CachedData.REFRESH_TIME_FIELD_NAME, currentEpochTime);
            queryBuilder.limit(1L).where().eq(CachedData.URL_FIELD_NAME, url);

            PreparedQuery<CachedData> dataQuery = queryBuilder.prepare();
            List<CachedData> cachedData = cachedDataDao.query(dataQuery);
            if (cachedData.size() > 0) {
                final CachedData cachedDataEntry = cachedData.get(0);
                Cache.Entry cacheEntry = new Cache.Entry();

                if(getData) {
                    cacheEntry.data = readDataFromFilesystem(c, String.valueOf(cachedDataEntry.getId()));
                }
                cacheEntry.contentType = cachedDataEntry.getContentType();
                cacheEntry.softTtl = cachedDataEntry.getRefreshTime();
                cacheEntry.ttl = cachedDataEntry.getExpirationTime();
                cacheEntry.etag = cachedDataEntry.getETag();
                if (checkIfDataIsExpired) {
                    if (dataIsNotExpired(cacheEntry)) {
                        return cacheEntry;
                    } else {
                        // invalidate data
                        queryBuilder.where().eq(CachedData.URL_FIELD_NAME, url);
                        PreparedQuery<CachedData> deletesQuery = queryBuilder.prepare();
                        List<CachedData> deletes = cachedDataDao.query(deletesQuery);
                        cachedDataDao.delete(deletes);
                        RequestQueue q = VolleySingleton.getInstance(c).getRequestQueue();
                        q.getCache().invalidate(url, true);
                    }
                } else {
                    return cacheEntry;
                }
            }
            return null;
        } catch (SQLException e) {
            LogManager.log(Level.SEVERE, "Error making SQL query. " + e.getMessage());
            return null;
        }
    }

    private static byte[] readDataFromFilesystem(Context c, String filename) {
        try {
            FileInputStream fis = c.openFileInput(filename);
            return IOUtil.readBytes(fis);
        } catch (IOException e) {
            LogManager.log(Level.SEVERE, "IOException while trying to read file from device.");
            return null;
        }
    }

    /**
     * Returns the soft timeout of the data
     * time from response headers
     *
     * @param cacheEntry A Cache.Entry which contains key/value pairs based on Volley's implementation
     * @return The date of when the data has timed out (see description)
     */
    public static long getDataTimeoutInMillis(Cache.Entry cacheEntry) {
        return cacheEntry.softTtl * 60 * 1000;
    }

    /**
     * Returns true if data has timed out based on currentEpochTime (in seconds) compared to refresh
     * time from response headers
     *
     * @param cacheEntry A Cache.Entry which contains key/value pairs based on Volley's implementation
     * @return boolean value of whether or not data has timed out (see description)
     */
    public static boolean dataHasTimedOut(Cache.Entry cacheEntry) {
        long currentEpochTime = System.currentTimeMillis();
        long refreshTime = cacheEntry.softTtl;
        return refreshTime < currentEpochTime;
    }

    /**
     * Returns the hard timeout (expiration) of the data
     * time from response headers
     *
     * @param cacheEntry A Cache.Entry which contains key/value pairs based on Volley's implementation
     * @return The date of when the data has timed out (see description)
     */
    public static long getDataExpirationInMillis(Cache.Entry cacheEntry) {
        return cacheEntry.ttl * 60 * 1000;
    }

    /**
     * Returns true if data is expired based on currentEpochTime (in seconds) compared to refresh
     * and expired time from response headers
     *
     * @param cacheEntry A Cache.Entry which contains key/value pairs based on Volley's implementation
     * @return boolean value of whether or not data is expired (see description)
     */
    public static boolean dataIsExpired(Cache.Entry cacheEntry) {
        long currentEpochTime = System.currentTimeMillis();
        long refreshTime = cacheEntry.softTtl;
        long expireTime = cacheEntry.ttl;
        return (refreshTime < currentEpochTime || expireTime < currentEpochTime);
    }

    /**
     * Returns inverse of dataIsExpired. A trivial helper method. See: dataIsExpired
     *
     * @param cacheEntry A Cache.Entry which contains key/value pairs based on Volley's implementation
     * @return boolean value of whether or not data is NOT expired (see description)
     */
    public static boolean dataIsNotExpired(Cache.Entry cacheEntry) {
        return (!dataIsExpired(cacheEntry));
    }

    /**
     * The store function for initializing and storing a cache object in the database
     *
     * @param c   The applicationContext
     * @param url The url to key off the data and identify whether or not JSON data was embedded in it.
     * @return Returns a custom cache object
     * @throws SQLException
     */
    public static com.fourtwosix.mono.data.ORM.types.Cache store(Context c, String instanceGuid, String url, long refreshTime, long expirationTime) throws SQLException {
        com.fourtwosix.mono.data.ORM.types.Cache cache = generateCacheObject(instanceGuid, url, refreshTime, expirationTime);
        if (helper == null) {
            helper = new DatabaseHelper(c);
        }
        Dao<com.fourtwosix.mono.data.ORM.types.Cache, Integer> cacheDao = helper.getCacheDao();
        cacheDao.create(cache);
        return cache;
    }

    /**
     * Sets the cached data in both Volley and the database.
     *
     * @param c           The context
     * @param url         The url (key) to look up the data from the request queue
     * @param data        The data to cache, this is typically a string (like a fetched website),
     *                    it's then transformed into binary.
     * @param contentType The Content-Type header information associated with the content.
     *                    This is typically returned by a Volley request.
     * @return An array of bytes of the data.
     */
    public static byte[] setCachedData(Context c, String url, byte[] data, String contentType) throws NoSpaceLeftOnDeviceException {
        long currentEpochTime = System.currentTimeMillis() / 1000;
        ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(data);
        return setCachedData(c, url, byteArrayInputStream, contentType, currentEpochTime + DEFAULT_REFRESH, currentEpochTime + DEFAULT_EXPIRATION);
    }

    /**
     * Sets the cached data in both Volley and the database.
     *
     * @param c           The context
     * @param url         The url (key) to look up the data from the request queue
     * @param inputStream The data to cache, this is typically a string (like a fetched website),
     *                    it's then transformed into binary.
     * @param contentType The Content-Type header information associated with the content.
     *                    This is typically returned by a Volley request.
     * @return An array of bytes of the data.
     */
    public static byte[] setCachedData(Context c, String url, InputStream inputStream, String contentType) throws NoSpaceLeftOnDeviceException {
        long currentEpochTime = System.currentTimeMillis() / 1000;
        return setCachedData(c, url, inputStream, contentType, currentEpochTime + DEFAULT_REFRESH, currentEpochTime + DEFAULT_EXPIRATION);
    }

    /**
     * @param c                       The context
     * @param url                     The url (key) to look up the data from the request queue
     * @param inputStream             The data to cache, this is typically a string (like a fetched website),
     *                                it's then transformed into binary.
     * @param contentType             The Content-Type header information associated with the content.
     *                                This is typically returned by a Volley request.
     * @param refreshTimeInMinutes    The refresh time of the request in minutes
     * @param expirationTimeInMinutes The expiration time of the request in minutes
     * @return An array of bytes of the data
     */
    public static byte[] setCachedData(Context c, String url, InputStream inputStream, String contentType, Long refreshTimeInMinutes, Long expirationTimeInMinutes) throws NoSpaceLeftOnDeviceException {
        try {
            DigestInputStream shaStream = new DigestInputStream(inputStream, MessageDigest.getInstance("SHA-256"));
            String eTag = shaStream.getMessageDigest().digest().toString();

            long currentTime = System.currentTimeMillis();
            long refreshTimeInMillis = refreshTimeInMinutes * MINUTES_TO_MILLIS + currentTime;
            long expirationTimeInMillis = expirationTimeInMinutes * MINUTES_TO_MILLIS + currentTime;

            Cache.Entry cachedDatabaseData = getDatabaseCachedData(c, url);
            String dbEtag = "";
            if (cachedDatabaseData != null && cachedDatabaseData.etag != null) {
                dbEtag = cachedDatabaseData.etag;
            }
            if (cachedDatabaseData == null || !dbEtag.equals(eTag)) {
                // Now store it in the database as a backup
                try {
                    if (helper == null) {
                        helper = new DatabaseHelper(c);
                    }
                    String instanceGuid = "";
                    try {
                        Map<String, String> getParams = WebHelper.splitQuery(new URL(url));
                        instanceGuid = getParams.get("instanceGuid");
                    } catch (MalformedURLException e) {
                        LogManager.log(Level.SEVERE, "Unable to parse url: " + url);
                    } catch (UnsupportedEncodingException e) {
                        LogManager.log(Level.SEVERE, "Unsupported Encoding exception for url: " + url);
                    }

                    if (instanceGuid == null || instanceGuid.isEmpty()) {
                        instanceGuid = "MONO_APPLICATION_CACHE_ID";
                    }

                    com.fourtwosix.mono.data.ORM.types.Cache cache = store(c, instanceGuid, url, refreshTimeInMillis, expirationTimeInMillis);
                    String filename = String.valueOf(cache.getId());
                    FileOutputStream outputStream;
                    outputStream = c.openFileOutput(filename, Context.MODE_PRIVATE);
                    IOUtils.copy(inputStream, outputStream);
                    outputStream.close();
                    CachedData cachedData = new CachedData(cache, instanceGuid, url, contentType, refreshTimeInMillis, expirationTimeInMillis, eTag);
                    Dao<CachedData, Integer> cachedDataDao = helper.getCachedDataDao();
                    if (cachedDatabaseData != null) {
                        // delete out the old data first
                        QueryBuilder<CachedData, Integer> queryBuilder = cachedDataDao.queryBuilder();
                        queryBuilder.where().eq(CachedData.URL_FIELD_NAME, url);
                        PreparedQuery<CachedData> deletesQuery = queryBuilder.prepare();
                        List<CachedData> deletes = cachedDataDao.query(deletesQuery);
                        cachedDataDao.delete(deletes);
                    }
                    cachedDataDao.create(cachedData);
                    return new CacheResponse.StoreResponse(Status.success, cachedData.getId()).toString().getBytes();
                } catch (SQLException e) {
                    LogManager.log(Level.SEVERE, "Error making SQL query. " + e.getMessage());
                    return null;
                } catch (IOException e) {
                    LogManager.log(Level.SEVERE, "IOException in CacheHelper: " + e);
                    if(e.toString().contains("ENOSPC")){
                        throw new NoSpaceLeftOnDeviceException();
                    }
                }
            }
            return getCachedData(c, url).data;
        } catch (NoSuchAlgorithmException e) {
            LogManager.log(Level.SEVERE, "No Such Algorithm Exception: " + e);
            return null;
        }
    }

    /**
     * Get a JSON object based on the data stored in the cache
     *
     * @param c   The Application Context
     * @param url The url (key) to look up the data from the request queue
     * @return A JSONObject of the data
     */
    public static JSONObject getCachedJson(Context c, String url) {
        JSONObject jsonObject = new JSONObject();
        try {
            jsonObject = new JSONObject(getCachedStringData(c, url));
        } catch (JSONException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        }
        return jsonObject;
    }

    /**
     * Get a string object back from the data stored in the cache
     *
     * @param c   The context
     * @param url The url (key) to look up the data from the request queue
     * @return A string of the data (just byte[] to String)
     */
    public static String getCachedStringData(Context c, String url) {
        return new String(getCachedEntry(c, url).data);
    }

    /**
     * This method gets cached data, either from Volley or the database
     *
     * @param c   The context
     * @param url The url (key) to look up the data from the request queue
     * @return A cached entry object (Volley), this can be helpful when you need meta-data on the object
     */
    public static Cache.Entry getCachedEntry(Context c, String url) {
        return getCachedData(c, url);
    }

    /**
     * Gets the content type
     *
     * @param cachedEntry Takes a cached entry, see getCachedEntry
     * @return A String with the Content-Type in it.
     */
    public static String getContentType(Cache.Entry cachedEntry) {
        String contentType = null;
        try {
            contentType = cachedEntry.responseHeaders.get("Content-Type");
            if (contentType == null) {
                contentType = cachedEntry.contentType;
            }
        } catch (NullPointerException e) {
            LogManager.log(Level.SEVERE, "Null pointer exception when trying to determine content type in CacheHelper.getContentType" + e.toString());
        }
        return contentType;
    }

    /**
     * Gets the mime type of a Cached Entry. See getCachedEntry
     *
     * @param cacheEntry
     * @return a Mime Type (like "text/html", etc.)
     */
    public static String getMimeType(Cache.Entry cacheEntry) {
        String contentType = getContentType(cacheEntry);
        if (contentType != null) {
            return contentType.split(";")[0];
        }
        return null;
    }

    /**
     * Gets the encoding type (UTF-8, base64, etc.) from the entry
     *
     * @param cacheEntry a cache entry object from Volley
     * @return a string of the encoding (i.e. UTF-8, base64, etc.)
     */
    public static String getEncoding(Cache.Entry cacheEntry) {
        String contentType = getContentType(cacheEntry);
        if (contentType != null) {
            String[] splitHeader = contentType.split(";");
            if (splitHeader.length == 2) {
                return splitHeader[1].replace("charset=", "");
            }
        }
        return null;
    }

    @Override
    protected Response<JSONObject> parseNetworkResponse(NetworkResponse response) {
        try {
            String jsonString = new String(response.data, HttpHeaderParser.parseCharset(response.headers));
            return Response.success(new JSONObject(jsonString), HttpHeaderParser.parseCacheHeaders(response));
        } catch (UnsupportedEncodingException unsupportedEncodingException) {
            return Response.error(new ParseError(unsupportedEncodingException));
        } catch (JSONException jsonException) {
            return Response.error(new ParseError(jsonException));
        }
    }

    /**
     * Probably the most helpful when dealing with WebResourceResponses. This will attempt to get the cached
     * data and associated encoding and mimeType and return that. If it's not cached, it will return null.
     *
     * @param context The context
     * @param url     The url (key) to look up the data from the request queue
     * @return Either a WebResourceResponse, or null, depending on if the data is cached
     */
    public static WebResourceResponse returnCachedWebResourceResponseOrNull(Context context, String url) {
        Cache.Entry cachedEntry = null;
        if (!ConnectivityHelper.isNetworkAvailable(context)) {
            if (dataIsCachedForOfflineUse(context, url)) {
                cachedEntry = getOfflineCachedDataWithoutRegardForExpiration(context, url);
            }
        } else {
            if (dataIsCached(context, url)) {
                cachedEntry = getCachedData(context, url);
            }
        }
        if (cachedEntry != null) {
            String mimeType = (getMimeType(cachedEntry) == null) ? "text/html" : getMimeType(cachedEntry);
            String encoding = getEncoding(cachedEntry);
            if (encoding == null) {
                encoding = "UTF-8";
            }
            if (mimeType.contains("image") || mimeType.contains("octet-stream")) {
                encoding = "base64";
            }
            return new WebResourceResponse(mimeType, encoding, new ByteArrayInputStream(cachedEntry.data));
        }
        return null;
    }

    /**
     * Helper function to parse the store/update data
     *
     * @param url The url to key off the data and identify whether or not JSON data was embedded in it.
     * @return A Cache object
     */
    public static com.fourtwosix.mono.data.ORM.types.Cache generateCacheObject(String instanceGuid, String url, long refreshTime, long expirationTime) {
        // Make a new backing store and pack all of our data into it
        BackingStore store = new BackingStore();
        store.setSaveUrl(url);
        store.setInstanceId(instanceGuid);
        com.fourtwosix.mono.data.ORM.types.Cache cache = new com.fourtwosix.mono.data.ORM.types.Cache();
        cache.setBackingStore(store);
        cache.setTimeout(refreshTime);
        cache.setExpirationInMinutes(expirationTime);

        // Return the new cache
        return cache;
    }

    public static RetryPolicy zeroRetriesPolicy() {
        return new RetryPolicy() {
            @Override
            public int getCurrentTimeout() {
                return 3000;
            }

            @Override
            public int getCurrentRetryCount() {
                return 0;
            }

            @Override
            public void retry(VolleyError volleyError) throws VolleyError {
            }
        };
    }
}
