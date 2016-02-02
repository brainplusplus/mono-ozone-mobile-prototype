package com.fourtwosix.mono.webViewIntercept;


import android.content.Context;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.data.relational.Database;
import com.fourtwosix.mono.data.relational.ResultList;
import com.fourtwosix.mono.data.relational.SQLite;
import com.fourtwosix.mono.data.relational.exceptions.BadSyntaxException;
import com.fourtwosix.mono.data.relational.exceptions.DBException;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import com.fourtwosix.mono.webViewIntercept.json.StatusResponse;
import com.fourtwosix.mono.webViewIntercept.json.StorageResponse;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * The handler between the web intercept and the storage layer.
 */
public class StorageWebViewAPI implements WebViewsAPI {
    private static Logger log = Logger.getLogger(StorageWebViewAPI.class.getName());
    private static HashMap<String, Database> liteDBCache;

    private String guid;

    static {
        liteDBCache = new HashMap<String, Database>();
    }

    /**
     * Default constructor.  Takes a guid to determine which database
     * the application will be accessing.
     * @param guid Identifying guid.
     */
    public StorageWebViewAPI(String guid) {
        if(guid == null) {
            throw new IllegalArgumentException("Guid cannot be null for the StorageWebViewAPI.");
        }
        this.guid = guid;
    }

    /**
     * Determines how best to respond to the provided URI.
     *
     * @param view The view that has pushed out the intercepted call.
     * @param methodName The URI to parse to determine which functionality to perform.
     * @param fullUrl
     * @return A response based on which method was passed to the API.
     */
    @Override
    public WebResourceResponse handle(WebView view, String methodName, URL fullUrl) {
        String urlString = fullUrl.toString();
        int questionMarkLoc = urlString.indexOf('?');
        String data = urlString.substring(questionMarkLoc + 1);

        if(methodName.endsWith("/")) {
            methodName = methodName.substring(0, methodName.length() - 1);
        }

        JSONObject json = null;
        try {
            json = new JSONObject(URLDecoder.decode(data, "UTF-8"));
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, "Can't create JSON object from input data!", e);
            throw new IllegalArgumentException(e);
        }
        catch(UnsupportedEncodingException e) {
            LogManager.log(Level.SEVERE, "Can't create JSON object from input data, unsupported encoding!", e);
            throw new IllegalArgumentException(e);
        }

        // Parse method calls
        if(methodName.equalsIgnoreCase("persistent/exec")) {
            return relationalExec(json, view.getContext());
        }
        else if(methodName.equalsIgnoreCase("persistent/query")) {
            return relationalQuery(json, view.getContext());
        }
        else {
            return null;
        }
    }

    /**
     * Performs a SQL query and returns only a status message as to
     * whether it was successful or not.
     * @param inputData The URI to parse.  It should be formatted as a series of GET variables.  It needs:
     *            query - An SQL query to perform.
     * @param context The Android application context.
     * @return A status response encoded as a WebResourceResponse object.
     */
    public WebResourceResponse relationalExec(JSONObject inputData, Context context) {
        WebResourceResponse response = null;

        // Parse out the get variables
        String query = null;
        String [] values = null;

        try {
            query = inputData.getString("query");

            if(inputData.has("values")) {
                JSONArray valueJsonArray = inputData.getJSONArray("values");

                if(valueJsonArray != null) {
                    int arraySize = valueJsonArray.length();
                    values = new String[arraySize];
                    for(int i=0; i<arraySize; i++) {
                        values[i] = valueJsonArray.getString(i);
                    }
                }
            }
        }
        catch(JSONException e) {
            log.log(Level.SEVERE, "Unable to parse input JSON! " + inputData.toString());
            StatusResponse statusResponse = new StatusResponse(Status.failure, "Unable to parse input JSON: " + inputData.toString());

            return new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        }

        boolean requiredPresent = query != null;

        if(requiredPresent == false) {
            StatusResponse statusResponse = new StatusResponse(Status.failure, "Required variables: {query} not present.");

            return new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        }

        try {
            // Get the database
            Database db = getDatabase(guid, context);

            db.exec(query, values);

            // If we get here, we haven't errored out.  Success!
            StatusResponse statusResponse = new StatusResponse(Status.success);

            response = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        }
        catch(BadSyntaxException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
            StatusResponse statusResponse = new StatusResponse(Status.failure, "Bad syntax in query.");

            response = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        }
        catch(DBException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
            StatusResponse statusResponse = new StatusResponse(Status.failure, "Error accessing database!");

            response = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        }

        return response;
    }

    /**
     * Performs a SQL query and returns the results from it.
     * @param inputData The URI to parse.  It should be formatted as a series of GET variables.  It needs:
     *            query - An SQL query to perform.
     *            values (optional) - a comma delimited list of values to inject into the above query
     * @param context The Android application context.
     * @return A status response encoded as a WebResourceResponse object.
     */
    public WebResourceResponse relationalQuery(JSONObject inputData, Context context) {
        WebResourceResponse response = null;

        // Parse out the get variables
        String query = null;
        String [] values = null;

        try {
            query = inputData.getString("query");

            if(inputData.has("values")) {
                JSONArray valueJsonArray = inputData.getJSONArray("values");

                if(valueJsonArray != null) {
                    int arraySize = valueJsonArray.length();
                    values = new String[arraySize];
                    for(int i=0; i<arraySize; i++) {
                        values[i] = valueJsonArray.getString(i);
                    }
                }
            }
        }
        catch(JSONException e) {
            log.log(Level.SEVERE, "Unable to parse input JSON! " + inputData.toString());
            StatusResponse statusResponse = new StatusResponse(Status.failure, "Unable to parse input JSON: " + inputData.toString());

             return new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        }

        boolean requiredPresent = query != null;

        if(requiredPresent == false) {
            StatusResponse statusResponse = new StatusResponse(Status.failure, "Required variables: {query} not present.");

            return new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        }

        try {
            Database db = getDatabase(guid, context);

            // Grab a list of results
            ResultList results = db.query(query, values);

            StorageResponse.QueryResponse queryResponse = new StorageResponse.QueryResponse(Status.success, results);

            response = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(queryResponse.toString().getBytes()));
        }
        catch(BadSyntaxException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
            StatusResponse statusResponse = new StatusResponse(Status.failure, "Bad syntax in query.");

            response = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        }
        catch(DBException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
            StatusResponse statusResponse = new StatusResponse(Status.failure, "Error accessing database!");

            response = new WebResourceResponse("text/json", "UTF-8", new ByteArrayInputStream(statusResponse.toString().getBytes()));
        }

        return response;
    }

    // Helper function to retrieve database file if we already know about it and create it if we don't
    private static synchronized Database getDatabase(String guid, Context context) {
        if(liteDBCache.containsKey(guid) == false) {
            liteDBCache.put(guid, new SQLite(context, guid));
        }

        return liteDBCache.get(guid);
    }
}
