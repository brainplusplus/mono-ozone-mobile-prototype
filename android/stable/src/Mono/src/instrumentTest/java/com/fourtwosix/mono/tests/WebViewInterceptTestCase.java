package com.fourtwosix.mono.tests;

import android.app.Activity;
import android.test.ActivityInstrumentationTestCase2;
import android.test.UiThreadTest;
import android.test.suitebuilder.annotation.Suppress;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.activities.LoginActivity;
import com.fourtwosix.mono.data.ORM.types.BackingStore;
import com.fourtwosix.mono.data.ORM.types.Cache;
import com.fourtwosix.mono.data.ORM.types.DatabaseHelper;
import com.fourtwosix.mono.webViewIntercept.WebViewIntercept;
import com.j256.ormlite.dao.Dao;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.SQLException;

/**
 * Created by alerman on 1/29/14.
 */

public class WebViewInterceptTestCase extends ActivityInstrumentationTestCase2<LoginActivity> {

    private   WebView webview;

    private Activity activity;
    private Cache testCache;

    private final static String SERVER_ADDRESS = "http://mono.42six.com";
    private final static String INTERCEPT_ADDRESS = "ozone.gov";
    private final static String INSTANCE_ID = "%22instanceID%22:%221234%22";


    public WebViewInterceptTestCase() {
        super(LoginActivity.class);
    }

    protected void setUp() throws Exception {
        super.setUp();
        activity = getActivity(); //start the activity

        Cache cache = new Cache();
        cache.setBackingStore(new BackingStore());
        cache.setExpirationInMinutes(125);
        cache.setTimeout(125);

        DatabaseHelper dbh = new DatabaseHelper(activity.getApplicationContext());
        Dao<Cache, Integer> cacheDAO = dbh.getCacheDao();
        cacheDAO.create(cache);
        testCache = cache;
        try {
            this.runTestOnUiThread(new Runnable() {
                @Override
                public void run() {
                    webview = new WebView(activity.getApplication().getApplicationContext());
                }
            });
        } catch (Throwable throwable) {
            throwable.printStackTrace();
        }

    }

    protected void tearDown() throws Exception {
        super.tearDown();
    }

    @UiThreadTest
    public void testBatteryPercentage() throws IOException, JSONException {

        WebResourceResponse wrr = WebViewIntercept.Intercept(SERVER_ADDRESS + INTERCEPT_ADDRESS + "/battery/percentage?params=none", null, null, webview);
        JSONObject obj = getJsonObject(wrr);
        String status = obj.getString("status");
        assertEquals(status,"success");

        int batteryPercentage = obj.getInt("batteryLevel");
        assertTrue("Checking valid battery percentage",batteryPercentage>0 && batteryPercentage <= 100);
    }


    @UiThreadTest
    public void testCacheStore() throws IOException, JSONException {
        WebResourceResponse wrr = WebViewIntercept.Intercept(SERVER_ADDRESS + INTERCEPT_ADDRESS + "/caching/store?{" +
                "%22backingStore%22:" +
                "   {%22saveUrl%22:%22http://thisIsTheSaveUrl.com%22," +
                "   }," +
                "%22timeOut%22:200," +
                "%22expirationInMinutes%22:86400}",
                null,
                null,
                webview);
        JSONObject obj = getJsonObject(wrr);
        assertNotNull(obj.getInt("cacheId"));
    }


    @UiThreadTest
    public void testCacheDataStoreAndRetrieve() throws IOException, JSONException, SQLException {
        WebResourceResponse webResourceResponse = WebViewIntercept.Intercept(SERVER_ADDRESS + INTERCEPT_ADDRESS + "/caching/store?{"+
                "%22backingStore%22:" +
                "   {%22saveUrl%22:%22http://thisIsTheSaveUrl.com%22," +
                "   }," +
                "%22timeOut%22:200," +
                "%22expirationInMinutes%22:86400}",
                null,
                null,
                webview);
        JSONObject obj = getJsonObject(webResourceResponse);
        assertNotNull(obj.getInt("dataId"));

        webResourceResponse = WebViewIntercept.Intercept(SERVER_ADDRESS + INTERCEPT_ADDRESS + "/caching/retrieve?{"+
                "   {%22url%22:%22http://thisIsTheSaveUrl.com%22}",
                null,
                null,
                webview);
        obj = getJsonObject(webResourceResponse);
        assertNotNull(obj.getString("dataObject"));
        assertEquals("the data has changed", obj.getString("dataObject"), "THIS IS SOME DATA");


    }

    @UiThreadTest
    public void testCacheExpiration() throws SQLException, InterruptedException {
        CachedData data = new CachedData(testCache, "some url", "some data".getBytes(), "text/plain");
        Calendar testCalTime = Calendar.getInstance();
        testCalTime.add(Calendar.YEAR, -1);
        data.setDateCreated(testCalTime.getTime());
        CacheExpirationReceiver.getInstance().disable();

        // TODO: this used to take in "%22payload%22:%22THIS IS SOME DATA%22" as payload data
        WebResourceResponse webResourceResponse = WebViewIntercept.Intercept(SERVER_ADDRESS + INTERCEPT_ADDRESS + "/location/current?{"+
                        WIDGET_GUID + "," +
                        DASHBOARD_GUID +"}",
                null,
                null,
                webview);
        JSONObject obj = getJsonObject(webResourceResponse);
        assertNotNull(obj);
        String status = obj.getString("status");
        assertEquals("SUCCESS", status);
    }

    @UiThreadTest
    public void testAccelerometerRegister() throws IOException, JSONException, SQLException {

        // TODO: this used to take in "%22payload%22:%22THIS IS SOME DATA%22" as payload data
        WebResourceResponse webResourceResponse = WebViewIntercept.Intercept(SERVER_ADDRESS + INTERCEPT_ADDRESS + "/location/current?{"+
                        WIDGET_GUID + "," +
                        DASHBOARD_GUID +"}",
                null,
                null,
                webview);
        JSONObject obj = getJsonObject(webResourceResponse);
        assertNotNull(obj);
        String status = obj.getString("status");
        assertEquals("SUCCESS", status);
    }

    @UiThreadTest
    public void testAccelerometerRegister() throws IOException, JSONException, SQLException {

        // TODO: this used to take in "%22payload%22:%22THIS IS SOME DATA%22" as payload data
        WebResourceResponse webResourceResponse = WebViewIntercept.Intercept(SERVER_ADDRESS + INTERCEPT_ADDRESS + "/accelerometer/register?{"+
                        WIDGET_GUID + "," +
                        DASHBOARD_GUID +"}",
                null,
                null,
                webview);
        JSONObject obj = getJsonObject(webResourceResponse);
        assertNotNull(obj);
        String status = obj.getString("status");
        assertEquals("SUCCESS", status);
    }

//    @UiThreadTest
//    public void testCacheExpiration() throws SQLException, InterruptedException {
//        CachedData data = new CachedData(testCache, "some url", "some data", "text/plain");
//        Calendar testCalTime = Calendar.getInstance();
//        testCalTime.add(Calendar.YEAR, -1);
//        data.setDateCreated(testCalTime.getTime());
//        CacheExpirationReceiver.getInstance().disable();
//
//        DatabaseHelper dbh = new DatabaseHelper(activity.getApplicationContext());
//        Dao<CachedData, Integer> cachedDataDao = dbh.getCachedDataDao();
//
//        cachedDataDao.create(data);
//
//        assertEquals(cachedDataDao.queryForId(data.getId()).getId(), data.getId());
//
//        int size = cachedDataDao.queryForAll().size();
//
//        CacheExpirationReceiver.getInstance().enable();
//        CacheExpirationReceiver.getInstance().onReceive(activity.getApplicationContext(), new Intent(CacheExpirationReceiver.EXPIRE_INTENT));
//        assertEquals(size - 1, cachedDataDao.queryForAll().size());
//
//
//    }

    @Suppress
    private JSONObject getJsonObject(WebResourceResponse wrr) throws IOException, JSONException {
        BufferedReader br=new BufferedReader(new InputStreamReader(wrr.getData()));
        String s=br.readLine();

        return new JSONObject(s);
    }


}
