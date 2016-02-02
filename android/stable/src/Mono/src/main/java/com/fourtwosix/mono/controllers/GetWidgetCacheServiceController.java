package com.fourtwosix.mono.controllers;


import android.content.Context;
import android.content.Intent;
import android.os.Parcelable;
import android.util.Xml;
import android.webkit.WebResourceResponse;
import android.widget.Toast;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.WebHelper;
import com.fourtwosix.mono.utils.caching.CacheHelper;
import com.fourtwosix.mono.utils.caching.NoSpaceLeftOnDeviceException;
import com.fourtwosix.mono.utils.caching.PrioritizedStringRequest;
import com.fourtwosix.mono.utils.caching.VolleySingleton;
import com.fourtwosix.mono.utils.secureLogin.OpenAMAuthentication;

import org.apache.commons.io.FilenameUtils;
import org.apache.http.Header;
import org.apache.http.HttpHost;
import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.client.HttpClient;
import org.apache.http.client.ResponseHandler;
import org.apache.http.message.BasicHttpRequest;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Level;

public class GetWidgetCacheServiceController {
    private RequestQueue mVolleyQueue;

    private AtomicInteger widgetsComplete;
    private AtomicInteger widgetsFailed;
    private AtomicInteger totalWidgets;
    List<String> fullUrls = new ArrayList<String>();

    public static final String NOTIFICATION = "com.fourtwosix.mono.services.cachingService";
    public static final String URLS = "urls";
    public static final String PHASE1 = "phase1";
    public static final String PHASE2 = "phase2";

    public static final String NUM_WIDGETS = "numWidgets";
    public static final String NUM_SUCCEEDED = "numSucceeded";
    public static final String NUM_FAILED = "numFailed";

    public static final String NO_SPACE_LEFT_EXCEPTION = "noSpaceLeft";

    String[] exclusions = {"CACHE MANIFEST", "NETWORK:", "CACHE:"};
    Context context;

    ExecutorService executor;

    private AtomicInteger urlsComplete;
    private AtomicInteger urlsFailed;
    private AtomicInteger totalUrls;

    private AtomicInteger timesUrlsCalled;

    private AtomicBoolean startedUrlCaching;

    private boolean noSpaceLeftOnDevice;

    public GetWidgetCacheServiceController(Context _context) {
        // explicit for unit test
        context = _context;

        mVolleyQueue = VolleySingleton.getInstance(context).getRequestQueue();

        executor = Executors.newFixedThreadPool(2);

        widgetsComplete = new AtomicInteger(0);
        widgetsFailed = new AtomicInteger(0);
        totalWidgets = new AtomicInteger(0);

        urlsComplete = new AtomicInteger(0);
        urlsFailed = new AtomicInteger(0);
        totalUrls = new AtomicInteger(0);

        startedUrlCaching = new AtomicBoolean(false);
        noSpaceLeftOnDevice = false;
    }

    public GetWidgetCacheServiceController(Context _context, Parcelable[] widgets, String widgetUrlGetParameters) {
        this(_context);
        if (widgetUrlGetParameters == null) {
            widgetUrlGetParameters = "";
        }

        WidgetListItem[] widgetsArray = null;
        if (widgets != null) {
            widgetsArray = Arrays.copyOf(widgets, widgets.length, WidgetListItem[].class);
            totalWidgets.set(widgets.length);
        }
        widgetsComplete.set(0);

        if (widgetsArray != null) {
            for (WidgetListItem widget : widgetsArray) {
                String url = widget.getUrl();
                // if we have an extension or / is the last character in the url, just tack on the widgetUrlGetParams
                // otherwise add a trailing slash
                if (!url.contains(widgetUrlGetParameters)) {
                    if (WebHelper.endsWithFileOrSlash(url)) {
                        url += widgetUrlGetParameters;
                    } else {
                        url += "/" + widgetUrlGetParameters;
                    }
                }
                PrioritizedStringRequest prioritizedStringRequest = new PrioritizedStringRequest(Request.Method.GET, url,
                        widgetItemSuccessListener(url),
                        widgetItemErrorListener(url), context);
                prioritizedStringRequest.setPriority(Request.Priority.LOW);
                mVolleyQueue.add(prioritizedStringRequest);
            }
        }

    }

    public boolean completed() {
        return (widgetsComplete.get() + widgetsFailed.get() == totalWidgets.get()) && (totalWidgets.get() > 0);
    }

    private Response.Listener<String> widgetItemSuccessListener(String url) {
        // because these are used in an inner class, they have to be declared final
        final String UrlString = url;

        return new Response.Listener<String>() {
            @Override
            public void onResponse(String response) {
                handleWidgetItemResponse(UrlString, response);
            }
        };
    }

    public String handleWidgetItemResponse(String url, String response) {
        String finalUrl = null;
        try {
            CacheHelper.setCachedData(context.getApplicationContext(), url, response.getBytes(), "text/html");
        } catch (NoSpaceLeftOnDeviceException e) {
            Toast.makeText(context, "No space left on device!", Toast.LENGTH_LONG);
        }
        if (CacheHelper.dataIsCachedForOfflineUse(context.getApplicationContext(), url)) {
            LogManager.log(Level.INFO, "GetWidgetCacheServiceController:  stored url properly: " + url);
        } else {
            LogManager.log(Level.WARNING, "GetWidgetCacheServiceController: did not cache url properly " + url);
        }

        // parse response and get HTML data-mono element
        Document doc = Jsoup.parse(response);
        String dataMono = doc.select("html").attr("manifest");
        if (!dataMono.isEmpty()) {
            try {

                URL Url = new URL(url);
                String craftedUrl = Url.getProtocol() + "://" + Url.getAuthority() + Url.getPath();
                if (!craftedUrl.substring(craftedUrl.length() - 1).equals("/") && FilenameUtils.getExtension(url).equals("")) {
                    craftedUrl += "/";
                }
                // clean up the URL so it's pretty again.
                finalUrl = new URL(new URL(craftedUrl), dataMono).toString();

                // download the list of associated URLs from the url provided from data-mono element
                PrioritizedStringRequest prioritizedStringRequest = new PrioritizedStringRequest(Request.Method.GET, finalUrl,
                        monoUrlDataSuccessHandler(finalUrl),
                        monoUrlDataErrorListener(finalUrl), context);
                prioritizedStringRequest.setPriority(Request.Priority.LOW);
                mVolleyQueue.add(prioritizedStringRequest);
            } catch (MalformedURLException e) {
                LogManager.log(Level.WARNING, "GetWidgetCacheService Malformed URL Exception: " + e);
            }
        } else {
            LogManager.log(Level.INFO, "GetWidgetCacheServiceController: manifest element within widget's HTML was null: " + url);
            incrementSuccessfulWidgets();
        }
        return finalUrl;
    }

    private Response.ErrorListener widgetItemErrorListener(String url) {
        final String Url = url;
        return new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                incrementFailedWidgets();
                LogManager.log(Level.WARNING, "Exception in GetWidgetCacheService. Failed to fetch from widget base url:" + Url, error);
            }
        };
    }

    private Response.Listener<String> monoUrlDataSuccessHandler(String url) {
        // because these are used in an inner class, they have to be declared final
        final String UrlString = url;

        return new Response.Listener<String>() {
            @Override
            public void onResponse(String response) {
                handleMonoData(UrlString, response);
                // Return the URLs, which will then be passed to the UrlCachingService
                publishWidgetResults();
            }
        };
    }

    public List<String> handleMonoData(String url, String response) {
        // split on newlines
        String[] urls = response.split("\n");
        // always add the crafted URL as one of the original URLs, it will probably end up being called at some point in navigation
        fullUrls.add(url);
        String baseUrl = "";
        try {
            URL fullUrl = new URL(url);
            String path = fullUrl.getPath();
            // Get everything after the last slash
            int lastSlashIndex = path.lastIndexOf("/");
            String file = path.substring(lastSlashIndex + 1);
            baseUrl = fullUrl.toString().replace(file, "");
        } catch (MalformedURLException e) {
            LogManager.log(Level.SEVERE, "GetWidgetCacheServiceController: Failed to get base URL from " + url + "\n" + e.getStackTrace());
        }
        for (String urlString : urls) {
            try {
                if (isValidUrl(urlString)) {
                    String fullUrl = new URL(new URL(baseUrl), urlString).toString();
                    fullUrls.add(fullUrl);
                }
            } catch (MalformedURLException e) {
                LogManager.log(Level.SEVERE, "GetWidgetCacheServiceController: Failed to create URL from " + url + " and " + urlString + "\n" + e.getStackTrace());
            }
        }
        incrementSuccessfulWidgets();
        return fullUrls;

    }

    private Response.ErrorListener monoUrlDataErrorListener(String url) {
        final String UrlString = url;
        return new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                LogManager.log(Level.WARNING, "Exception in GetWidgetCacheService. Failed to fetch cache list for url:" + UrlString, error);
            }
        };
    }

    private void incrementSuccessfulWidgets() {
        widgetsComplete.incrementAndGet();
        publishWidgetResults();
    }

    private void incrementFailedWidgets() {
        widgetsFailed.incrementAndGet();
        publishWidgetResults();
    }

    private void publishWidgetResults() {
        Intent intent = new Intent(NOTIFICATION);
        intent.putExtra(PHASE1, true);
        if (fullUrls != null && (widgetsComplete.get() + widgetsFailed.get() == totalWidgets.get())) {
            if (startedUrlCaching.getAndSet(true) == false && fullUrls.size() > 0) {
                totalUrls.set(fullUrls.size());
                // Convert ArrayList<String> to String[]
                String[] urls = new String[totalUrls.get()];
                urls = fullUrls.toArray(urls);
                intent.putExtra(URLS, urls);
                final HttpClient httpClient = VolleySingleton.getInstance(context).getSslHttpStack().getUnderlyingHttpClient();

                timesUrlsCalled = new AtomicInteger(0);
                for (String urlVal : fullUrls) {
                    final String urlString = urlVal;
                    executor.submit(new Runnable() {
                        @Override
                        public void run() {
//                            LogManager.log(Level.INFO, "GetWidgetCacheServiceController: TimesUrlsCalled: " + timesUrlsCalled.incrementAndGet());
                            try {
                                HttpHost host = getHostFromUri(urlString);
                                java.util.Date date= new java.util.Date();
                                LogManager.log(Level.INFO, "GetWidgetCacheServiceController: Processing Url: " + timesUrlsCalled.get() + " | " + urlString + " | " + new Timestamp(date.getTime()).toString());

                                if(host != null) {
                                    httpClient.execute(host, new BasicHttpRequest("GET", urlString), urlSuccessListener(urlString, timesUrlsCalled.get()));
                                }
                                else {
                                    LogManager.log(Level.SEVERE, "GetWidgetCacheServiceController: Host was null.  Unable to execute fetch for " + urlString + ".");
                                }
                            }
                            catch(Exception e) {
                                LogManager.log(Level.SEVERE, "GetWidgetCacheServiceController: Unable to execute http fetch for " + urlString + "!", e);
                                incrementUrlsFailedAndPublishResults(urlString);
                            }
                        }
                    });
                }
            }
        }

        intent.putExtra(NUM_WIDGETS, totalWidgets.get());
        intent.putExtra(NUM_SUCCEEDED, widgetsComplete.get());
        intent.putExtra(NUM_FAILED, widgetsFailed.get());

        context.sendBroadcast(intent);
    }

    private boolean isValidUrl(String url) {
        // exclude newlines/empty lines
        if (url.isEmpty()) {
            return false;
        }

        //exclude wildcards and comments
        char firstChar = url.charAt(0);
        if (firstChar == '#' || firstChar == '*') {
            return false;
        }

        for (String exclusion : exclusions) {
            if (url.equals(exclusion)) {
                return false;
            }
        }
        return true;
    }

    // UrlCachingService logic
    private HttpHost getHostFromUri(String urlString) {
        try {
            URL url = new URL(urlString);
            return new HttpHost(url.getHost(), url.getPort(), url.getProtocol());
        }
        catch(MalformedURLException e) {
            return null;
        }
    }

    private ResponseHandler<WebResourceResponse> urlSuccessListener(String url, int urlCount) {
        // because these are used in an inner class, they have to be declared final
        final String UrlString = url;
        final int UrlCount = urlCount;

        return new ResponseHandler<WebResourceResponse>() {
            @Override
            public WebResourceResponse handleResponse(HttpResponse response) {
                WebResourceResponse wrResponse = null;

                HttpResponse trueResponse = OpenAMAuthentication.authorizeIfNecessary(UrlString, response, context);

                if(response.getStatusLine().getStatusCode() == HttpStatus.SC_OK) {
                    try {
                        // Extract the content type and encoding
                        Header[] headers = trueResponse.getAllHeaders();

                        String contentType, encoding;

                        // Parse out the content type and encoding
                        Header contentTypeHeader = trueResponse.getEntity().getContentType();

                        String contentTypeHeaderValue = null;

                        if(contentTypeHeader != null) {
                            contentTypeHeaderValue = trueResponse.getEntity().getContentType().getValue();
                        }

                        if(contentTypeHeaderValue == null) {
                            contentType = "text/html";
                            encoding = Xml.Encoding.UTF_8.name();
                        }
                        else {
                            String[] cthSplit = contentTypeHeaderValue.split(";");

                            contentType = cthSplit[0];
                            if (cthSplit.length > 1) {
                                encoding = cthSplit[1];
                            } else if(trueResponse.getEntity().getContentEncoding() != null) {
                                encoding = trueResponse.getEntity().getContentEncoding().getValue();
                            }
                            else {
                                encoding = Xml.Encoding.UTF_8.name(); // Default UTF-8
                            }
                        }

                        wrResponse = new WebResourceResponse(contentType, encoding, trueResponse.getEntity().getContent());
                        handleUrlSuccessResponse(UrlString, UrlCount, wrResponse);
                    } catch (IOException e) {
                        LogManager.log(Level.SEVERE, "GetWidgetCacheServiceController: Error while processing response!", e);
                        incrementUrlsFailedAndPublishResults(UrlString);
                    }
                }
                else {
                    incrementUrlsFailedAndPublishResults(UrlString);
                }

                return wrResponse;
            }
        };
    }

    private void handleUrlSuccessResponse(String url, int urlCount, WebResourceResponse response) {
        String contentType = response.getMimeType();
        try{
            CacheHelper.setCachedData(context.getApplicationContext(), url, response.getData(), contentType);
        } catch (NoSpaceLeftOnDeviceException e) {
            noSpaceLeftOnDevice = true;
            publishWidgetResults();
        }
        if (CacheHelper.dataIsCachedForOfflineUse(context, url)) {
            urlsComplete.incrementAndGet();
//            LogManager.log(Level.INFO, "GetWidgetCacheServiceController: urlsComplete: "  + urlsComplete.get() + "urlsFailed: " + urlsFailed.get());
            java.util.Date date= new java.util.Date();
            LogManager.log(Level.INFO, "GetWidgetCacheServiceController: stored url properly: "  + urlCount + " | " + url + " | " + new Timestamp(date.getTime()).toString());
        } else {
            LogManager.log(Level.WARNING, "GetWidgetCacheServiceController : did not cache url properly " + url);
            urlsFailed.incrementAndGet();
        }
        publishUrlResults();
    }

    private void incrementUrlsFailedAndPublishResults(String Url) {
        urlsFailed.incrementAndGet();
        LogManager.log(Level.WARNING, "Exception in GetWidgetCacheServiceController. Failed to fetch from url: " + Url);
        publishUrlResults();
    }

    private void publishUrlResults() {
        Intent intent = new Intent(NOTIFICATION);
        intent.putExtra(PHASE2, true);

        intent.putExtra(NUM_WIDGETS, totalUrls.get());
        intent.putExtra(NUM_SUCCEEDED, urlsComplete.get());
        intent.putExtra(NUM_FAILED, urlsFailed.get());

        intent.putExtra(NO_SPACE_LEFT_EXCEPTION, noSpaceLeftOnDevice);
        noSpaceLeftOnDevice = false;

        context.sendBroadcast(intent);
    }
}

