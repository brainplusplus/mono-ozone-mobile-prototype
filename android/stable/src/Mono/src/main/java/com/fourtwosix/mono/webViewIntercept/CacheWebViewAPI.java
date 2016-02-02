package com.fourtwosix.mono.webViewIntercept;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.widget.Toast;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.toolbox.RequestFuture;
import com.fourtwosix.mono.data.ORM.types.DatabaseHelper;
import com.fourtwosix.mono.utils.IOUtil;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.caching.CacheHelper;
import com.fourtwosix.mono.utils.caching.NoSpaceLeftOnDeviceException;
import com.fourtwosix.mono.utils.caching.PrioritizedWebResourceResponseRequest;
import com.fourtwosix.mono.utils.caching.VolleySingleton;
import com.fourtwosix.mono.webViewIntercept.json.CacheResponse;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import com.fourtwosix.mono.webViewIntercept.json.StatusResponse;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.Iterator;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ExecutionException;
import java.util.logging.Level;
import java.util.logging.Logger;

import static com.fourtwosix.mono.utils.caching.CacheHelper.dataIsCached;
import static com.fourtwosix.mono.utils.caching.CacheHelper.getCachedEntry;
import static com.fourtwosix.mono.utils.caching.CacheHelper.setCachedData;

/**
 * The handler between the web intercept and the cache layer.
 */
public class CacheWebViewAPI implements WebViewsAPI {
    private static Logger log = Logger.getLogger(CacheWebViewAPI.class.getName());

    private static final String JSON_MIME_TYPE = "text/json";
    private static final String UTF_8 = "UTF-8";

    private Context context;

    private DatabaseHelper helper;

    private static boolean forceNetworkConnectedToOff;
    private String instanceGuid;

    public CacheWebViewAPI(String instanceGuid) {
        forceNetworkConnectedToOff = false;
        if(instanceGuid == null) {
            throw new IllegalArgumentException("InstanceGuid cannot be null for the CacheWebViewAPI.");
        }
        this.instanceGuid = instanceGuid;
    }

    /**
     * Determines how best to respond to the provided URI.
     *
     * @param view The view that has pushed out the intercepted call.
     * @param methodName The method name which determines which functionality to perform.
     * @param fullUrl The full URL which is parsed to get the uriData from the query
     * @return A response based on which method was passed to the API.
     */
    public WebResourceResponse handle(WebView view, String methodName, URL fullUrl) {
        // Make sure a helper is instantiated
        if (helper == null) {
            helper = new DatabaseHelper(context);
        }
        URL originUrl = null;
        try {
            originUrl = new URL(getOriginUrl(view));
        } catch (MalformedURLException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        }
        // Use the origin url from the view combined with the fullURL which contains a JSON object to compose a final URL which will point to the data

        WebViewInterceptUrl wvUrls = new WebViewInterceptUrl(fullUrl.toString(), WebViewIntercept.OZONE_PREFIX);
        try {
            JSONObject inputJson = new JSONObject(URLDecoder.decode(wvUrls.remainder, "UTF-8"));
            JSONObject params = null;

            if(inputJson.has("params")) {
                params = inputJson.getJSONObject("params");
            }
            String url = inputJson.getString("url");
            String method = inputJson.optString("method");
            if(method.equals("")) {
                method = "GET";
            }
            String craftedUrl = originUrl.getProtocol() + "://" + originUrl.getAuthority() + originUrl.getPath();
            // Add trailing slash if necessary to put between the craftedUrl and the url
            if(craftedUrl.lastIndexOf("/") != craftedUrl.length()-1 && url.indexOf("/") != 0){
                craftedUrl += "/";
            }
            // clean up the URL so it's pretty again.
            URL finalUrl = new URL(new URL(craftedUrl), url);

            this.context = view.getContext();

            if (methodName.equalsIgnoreCase("store") || methodName.equalsIgnoreCase("update")) {
                long timeout = Long.parseLong(inputJson.getString("timeOut"));
                long expiration = Long.parseLong(inputJson.getString("expirationInMinutes"));
                return store(finalUrl, timeout, expiration);
            }
            else if (methodName.equalsIgnoreCase("retrieve")) {
                return retrieve(finalUrl);
            }
            else if (methodName.equalsIgnoreCase("getDataFromUrl")) {
                return getDataFromUrl(finalUrl.toString(), method, null);
            }
            else if (methodName.equalsIgnoreCase("status")) {
                // TODO: break this into a method
                String urlWithInstanceGuid = addWidgetGuidToUrl(url.toString(), instanceGuid);
                com.android.volley.Cache.Entry cacheEntry = getCachedEntry(context, urlWithInstanceGuid);
                if(cacheEntry == null) {
                    String failureJson = new CacheResponse.ExpirationResponse(Status.failure, finalUrl.toString(), true, 0, true, 0).toString();
                    return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(failureJson.getBytes()));
                } else {
                    boolean dataHasTimedOut = CacheHelper.dataHasTimedOut(cacheEntry);
                    long dataTimeout = cacheEntry.softTtl;
                    boolean dataIsExpired = CacheHelper.dataIsExpired(cacheEntry);
                    long dataExpiration = cacheEntry.ttl;
                    String successJson = new CacheResponse.ExpirationResponse(Status.success, finalUrl.toString(), dataHasTimedOut, dataTimeout, dataIsExpired, dataExpiration).toString();
                    return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(successJson.getBytes()));
                }
            }
            return null;
        } catch (UnsupportedEncodingException e) {
            LogManager.log(Level.SEVERE, "Error during URL decode.", e);
            String json = new StatusResponse(Status.failure, "UTF-8 not supported on this device!").toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        } catch(JSONException e) {
            LogManager.log(Level.SEVERE, "Error parsing JSON!", e);
            String json = new StatusResponse(Status.failure, "Error parsing JSON!").toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        } catch(MalformedURLException e){
            LogManager.log(Level.SEVERE, "Error generating URL", e);
            String json = new StatusResponse(Status.failure, "Error generating url!").toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        }
    }

    /**
     * Stores arbitrary data into the device side cache.
     * @param url The input url to parse.
     * @param refresh The specified refresh time in minutes for the data
     * @param expiration The specified expiration time in minutes for the data
     * @return A store response encoded as a WebResourceResponse object.
     */
    public WebResourceResponse store(URL url, long refresh, long expiration) {
        return getDataFromUrl(url.toString(), "GET", null, refresh, expiration);
    }

    /**
     * Retrieves arbitrary data from the device side cache.
     * @param url The input url to parse.
     * @return A retrieve response encoded as a WebResourceResponse object.
     */
    public WebResourceResponse retrieve(URL url) {
        String finalUrl = addWidgetGuidToUrl(url.toString(), instanceGuid);
        com.android.volley.Cache.Entry cachedEntry = CacheHelper.getCachedEntry(context, finalUrl);
        if(cachedEntry != null) {
            try {
                String content = new String(IOUtil.readBytes(new ByteArrayInputStream(cachedEntry.data)));
                String json = new CacheResponse.GetDataFromUrlResponse(Status.success, content).toString();
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
            } catch (IOException e) {
                String json = new StatusResponse(Status.failure, "URL not retrievable or available in the cache.").toString();
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
            }
        } else {
            String json = new StatusResponse(Status.failure, "URL not retrievable or available in the cache.").toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        }
    }

    /**
     *
     * @param url The full URL of the data
     * @param method The GET|POST method to call
     * @param params POST parameters
     * @return A getDataFromUrl response encoded as a WebResourceResponse.
     */
    public WebResourceResponse getDataFromUrl(String url, String method, JSONObject params) {
        return getDataFromUrl(url, method, params, CacheHelper.DEFAULT_REFRESH, CacheHelper.DEFAULT_EXPIRATION);
    }

    /**
     *
     * @param url The full URL of the data
     * @param method The GET|POST method to call
     * @param params POST parameters
     * @return A getDataFromUrl response encoded as a WebResourceResponse.
     */
    public WebResourceResponse getDataFromUrl(String url, String method, JSONObject params, long refresh, long expiration) {
        try {
            RequestQueue volleyQueue = VolleySingleton.getInstance(context.getApplicationContext()).getRequestQueue();

            String urlData = "";
            RequestFuture<WebResourceResponse> reqFuture = RequestFuture.newFuture();

            boolean dataIsCachedBoolean = dataIsCached(context, url);
            // If we're not connected to the net and we've got the data in cache
            if(!isConnectedToTheNet(context) && dataIsCachedBoolean) {
                String receivedData = new String(CacheHelper.getCachedData(context, url).data);
                String json = new CacheResponse.GetDataFromUrlResponse(Status.success, receivedData).toString();
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
            } else if(!isConnectedToTheNet(context) && !dataIsCachedBoolean){
                LogManager.log(Level.WARNING, "CacheWebViewAPI can't fetch desired URL, because we're offline, and it's not cached. url = " + url);
            }
            else if(isConnectedToTheNet(context)) {
                PrioritizedWebResourceResponseRequest request;

                // Make the request to the provided URL
                if(method.equalsIgnoreCase("GET")) {
                    request = new PrioritizedWebResourceResponseRequest(Request.Method.GET, url, reqFuture, reqFuture, context.getApplicationContext());
                    request.setPriority(Request.Priority.IMMEDIATE);
                }
                else if(method.equalsIgnoreCase("POST")) {
                    Map<String, String> paramMap = new TreeMap<String, String>();
                    if(params != null) {
                        Iterator<String> paramNames = params.keys();

                        while(paramNames.hasNext()) {
                            String paramName = paramNames.next();

                            paramMap.put(paramName, params.getString(paramName));
                        }
                    }

                    request = new PrioritizedWebResourceResponseRequest(Request.Method.POST, url, reqFuture, reqFuture, paramMap, context.getApplicationContext());
                }
                else {
                    String msg = "Unrecognized HTTP method!  Needs to be GET or POST!";
                    LogManager.log(Level.SEVERE, msg);
                    String json = new StatusResponse(Status.failure, msg).toString();
                    return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
                }

                volleyQueue.add(request);

                WebResourceResponse receivedData = reqFuture.get();
                String content = new String(IOUtil.readBytes(receivedData.getData()));

                // If data is null, there was a problem
                if(receivedData == null) {
                    LogManager.log(Level.SEVERE, "No response from the server specified!");
                    String json = new StatusResponse(Status.failure, "No response from the server at " + url).toString();
                    return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
                }

                // Success!
                String json = new CacheResponse.GetDataFromUrlResponse(Status.success, content).toString();
                String finalUrl = addWidgetGuidToUrl(url, instanceGuid);
                setCachedData(context, finalUrl, new ByteArrayInputStream(content.getBytes()), receivedData.getMimeType(), refresh, expiration);
                return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
            }
            // TODO: we should never get here, so what to do?
            String json = new CacheResponse.GetDataFromUrlResponse(Status.success, urlData).toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        } catch(ExecutionException e) {
            LogManager.log(Level.SEVERE, "Error during wait.", e);
            String json = new StatusResponse(Status.failure, "Retrieval was interrupted!").toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        } catch(JSONException e) {
            LogManager.log(Level.SEVERE, "Error parsing JSON!", e);
            String json = new StatusResponse(Status.failure, "Error parsing JSON!").toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        } catch (InterruptedException e) {
            LogManager.log(Level.SEVERE, "Error during wait.", e);
            String json = new StatusResponse(Status.failure, "Retrieval was interrupted!").toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        } catch (IOException e) {
            LogManager.log(Level.SEVERE, "Error during read.", e);
            String json = new StatusResponse(Status.failure, "Retrieval was interrupted!").toString();
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        } catch (NoSpaceLeftOnDeviceException e) {
            LogManager.log(Level.SEVERE, "No space left on device.", e);
            String json = new StatusResponse(Status.failure, "No space left on device!").toString();
            Toast.makeText(context, "No space left on device!", Toast.LENGTH_LONG);
            return new WebResourceResponse(JSON_MIME_TYPE, UTF_8, new ByteArrayInputStream(json.getBytes()));
        }
    }

    private String addWidgetGuidToUrl(String url, String instanceGuid){
        String param = "?";
        if(url.contains("?")){
            param = "&";
        }
        return url + param + "instanceGuid=" + instanceGuid;
    }

    /**
     * If set to true, the internal function "isConnectedToNet" will always return false.
     * Should be used for testing purposes only.
     * @param networkOff Whether or not to force the network off.
     */
    public void forceNetworkOff(boolean networkOff) {
        forceNetworkConnectedToOff = networkOff;
    }

    // Function that detects a connection to the internet
    private boolean isConnectedToTheNet(Context context) {
        if(forceNetworkConnectedToOff == true) {
            return false;
        }
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo ni = cm.getActiveNetworkInfo();

        if(ni != null && ni.isConnected()) {
            return true;
        }

        return false;
    }

    private String getOriginUrl(WebView view) {
        Looper looper = view.getContext().getApplicationContext().getMainLooper();
        UrlGet urlGet = new UrlGet(view);

        // Dispatch null message -- we don't care what the content is
        new Handler(looper).post(urlGet);
        while(urlGet.hasHandlerRun() == false) {
            // Do nothing and wait
        }
        log.log(Level.INFO, "Original URL: " + urlGet.getUrl());
        return (urlGet.getUrl());
    }

    class UrlGet implements Runnable {
        private boolean handlerRun = false;
        private String url;
        private WebView view;

        public UrlGet(WebView view) {
            this.view = view;
        }

        public boolean hasHandlerRun() {
            return handlerRun;
        }

        public String getUrl() {
            return url;
        }

        public void run() {
            url = view.getUrl();
            handlerRun = true;
        }
    }
}
