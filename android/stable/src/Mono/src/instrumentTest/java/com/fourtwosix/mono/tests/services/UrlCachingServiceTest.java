//package com.fourtwosix.mono.tests.services;
//
//
//import android.content.Context;
//import android.content.Intent;
//import android.os.Parcelable;
//import android.test.ServiceTestCase;
//
//import com.fourtwosix.mono.controllers.UrlCachingServiceController;
//import com.fourtwosix.mono.services.UrlCachingService;
//import com.fourtwosix.mono.structures.Url;
//
//import com.fourtwosix.mono.tests.utilities.Useful;
//import com.fourtwosix.mono.utils.LogManager;
//import com.fourtwosix.mono.utils.caching.CacheHelper;
//
//
//import java.io.IOException;
//import java.io.InputStream;
//import java.io.InputStreamReader;
//import java.net.MalformedURLException;
//import java.net.URL;
//import java.util.ArrayList;
//import java.util.Date;
//import java.util.List;
//import java.util.logging.Level;
//
//
///**
// * Created by dchambers on 4/10/14.
// */
//public class UrlCachingServiceTest extends ServiceTestCase<UrlCachingService> {
//
//    private List<String> urlList;
//    private String Response = "";
//    private String serverUrl = "";
//    private Context context;
//    private Intent urlIntent;
//    UrlCachingServiceController urlController;
//
//
//    @Override
//    protected void setUp() throws Exception {
//        super.setUp();
//
//        context = getContext();
//        serverUrl = Useful.findKey(Useful.serverPropKey);
//
//        try {
//            InputStream is = GetWidgetCacheControllerTest.class.getResourceAsStream("/urlCacheServiceTest.txt");
//            InputStreamReader isr = new InputStreamReader(is);
//            char fileText[] = new char[is.available()];
//            isr.read(fileText, 0, is.available());
//            Response = String.copyValueOf(fileText);
//        } catch (IOException io) {
//            System.out.println("error reading cacheManifest.txt test data");
//            System.out.println(io.getMessage());
//        }
//
//        urlList = parseUrls(serverUrl, Response);
//        assertEquals(20, urlList.size());
//        urlIntent = geturlIntent(urlList);
//        Parcelable[] urls = urlIntent.getParcelableArrayExtra("urls");
//        assert (urls.length == 20);
//
//        urlController = new UrlCachingServiceController(context, urlIntent, 0, 0);
//
//    }
//
//    public List<String> parseUrls(String url, String response) {
//        // split on newlines
//        List<String> fullUrls = new ArrayList<String>();;
//        String[] urls = response.split("\n");
//        // always add the crafted URL as one of the original URLs, it will probably end up being called at some point in navigation
//        fullUrls.add(url);
//        String baseUrl = "";
//        try {
//            URL fullUrl = new URL(url);
//            String path = fullUrl.getPath();
//            // Get everything after the last slash
//            int lastSlashIndex = path.lastIndexOf("/");
//            String file = path.substring(lastSlashIndex + 1);
//            baseUrl = fullUrl.toString().replace(file, "");
//        } catch (MalformedURLException e){
//            LogManager.log(Level.SEVERE, "Failed to get base URL from " + url + "\n" + e.getStackTrace());
//        }
//        for(String urlString : urls){
//            try {
//
//                 String fullUrl = new URL(new URL(baseUrl), urlString).toString();
//                 fullUrls.add(fullUrl);
//
//            } catch (MalformedURLException e) {
//                LogManager.log(Level.SEVERE, "Failed to create URL from " + url + " and " + urlString + "\n" + e.getStackTrace());
//            }
//        }
//        return fullUrls;
//    }
//    public UrlCachingServiceTest(Class<UrlCachingService> serviceClass) {
//        super(serviceClass);
//    }
//
//    public UrlCachingServiceTest() {
//        super(UrlCachingService.class);
//    }
//
//    private Intent geturlIntent(List<String> urlList) {
//
//        Intent urlIntent = new Intent("com.fourtwosix.mono.services.UrlCachingService");
//
//        String[] strArray = urlList.toArray(new String[urlList.size()]);
//        Parcelable[] parcelableUrls = new Parcelable[urlList.size()];
//
//        for (int i = 0; i < parcelableUrls.length; i++) {
//            parcelableUrls[i] = new Url(strArray[i]);
//        }
//
//        urlIntent.putExtra("urls", parcelableUrls);
//
//        return urlIntent;
//    }
//
//    public void testHandleCompletedIntent() {
//
//        long startTime = new Date().getTime();
//        long endTime = new Date().getTime();
//
//        while ((urlController.getPercentComplete() < 99) && ((endTime - startTime) < 120*1000)) {
//
//            endTime = new Date().getTime();
//        }
//
//        for (String url : urlList) {
//            assertEquals(true, CacheHelper.dataIsCachedForOfflineUse(context, url));
//        }
//
//    }
//
//    protected void tearDown() throws Exception {
//        super.tearDown();
//    }
//}
