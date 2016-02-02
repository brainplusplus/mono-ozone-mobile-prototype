package com.fourtwosix.mono.utils;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;

import org.apache.http.client.HttpResponseException;
import org.apache.http.client.ResponseHandler;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.conn.ConnectTimeoutException;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.BasicResponseHandler;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.HttpConnectionParams;
import org.apache.http.params.HttpParams;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.logging.Level;

/**
 * This class acts as a helper to facilitate the sending of HTTP requests while staying free of
 * using networking on the main UI thread.
 *
 * There are two modes available for receiving responses: Handlers and Broadcast receivers.
 * The mode used depends on which constructor is used, and that determines how the response will be sent.
 *
 * User: Eric Chaney echaney@42six.com
 * Date: 5/2/13
 * Time: 1:06 PM
 */
public class WebHelper
{
    public static final String RESPONSE_KEY = "RESPONSE";
    public static final String EXTRA_KEY = "EXTRA_DATA";
    public static final int TIMEOUT_LENGTH = 3000;

    //for using handlers
    private Handler handler;

    //for using broadcasts
    private Context context;
    private String broadcastString;

    //shared variables between two modes
    private String path;
    private JSONObject data;
    private JSONObject extraData;


    /**
     * Constructor for using handlers to receive responses.
     * @param handler
     * @param path
     */
    public WebHelper(Handler handler, String path) {
        this.handler = handler;
        this.path = path;
    }

    /**
     * The constructor for using broadcasts to receive responses.
     * @param context
     * @param broadcastString
     * @param path
     */
    public WebHelper(Context context, String broadcastString, String path) {
        this.context = context;
        this.broadcastString = broadcastString;
        this.path = path;
    }

    /**
     * Sets the data sent to the server in the case of POST requests.
     * This will not be used in GET requests. Please encode your data into the path.
     * @param data
     */
    public void SetData(JSONObject data) {
        this.data = data;
    }

    /**
     * Sets the extra data to be passed along if needed.
     * @param extraData
     */
    public void SetExtraData(JSONObject extraData) {
        this.extraData = extraData;
    }

    /**
     * Sends the post request.
     * PRECONDITION: data for the request has already been set using setData
     * @throws Exception
     */
    public void sendPostRequest()
    {
        Thread t = new Thread() {
            public void run() {
                try {
                    //url with the post data
                    HttpPost httpRequest = new HttpPost(path);
                    prepareRequest(httpRequest);

                    // Sets the data for the post request
                    String dataString = data.toString();
                    StringEntity se = new StringEntity(dataString);
                    httpRequest.setEntity(se);

                    sendRequest(httpRequest);
                } catch (Exception exception) {
                    LogManager.log(Level.SEVERE, "An exception occurred in sending a web request: ", exception);
                }
            }
        };
        t.start();
    }

    /**
     * Sends the GET request.
     * PRECONDITION: data sent to the server has already been encoded into the URL
     * @throws Exception
     */
    public void sendGetRequest()
    {
        Thread t = new Thread() {
            public void run() {
                //url with the post data
                HttpGet httpRequest = new HttpGet(path);
                prepareRequest(httpRequest);
                sendRequest(httpRequest);
            }
        };
        t.start();
    }

    /**
     * sets common request parameters for both GET and POST requests
     * @param request
     */
    private void prepareRequest(HttpRequestBase request) {
        HttpParams httpParameters = new BasicHttpParams();

        // Set the timeout in milliseconds until a connection is established.
        int timeoutConnection = TIMEOUT_LENGTH;
        HttpConnectionParams.setConnectionTimeout(httpParameters, timeoutConnection);

        // Set the default socket timeout (SO_TIMEOUT)
        // in milliseconds which is the timeout for waiting for data.
        int timeoutSocket = TIMEOUT_LENGTH;
        HttpConnectionParams.setSoTimeout(httpParameters, timeoutSocket);

        request.setParams(httpParameters);

        //sets a request header so the page receiving the request
        //will know what to do with it
        request.setHeader("Accept", "application/json");
        request.setHeader("Content-type", "application/json");
    }

    private void sendRequest(HttpRequestBase request) {
        try {
            try {
                //instantiates httpclient to make request
                DefaultHttpClient httpclient = new DefaultHttpClient();

                //Handles what is returned from the page
                ResponseHandler responseHandler = new BasicResponseHandler();
                String r = (String)httpclient.execute(request, responseHandler);

                sendResponse(r);

                LogManager.log(Level.INFO, "WebHelper received response: " + r);
            } catch (HttpResponseException exception) {
                sendResponse(exception.getMessage());
                LogManager.log(Level.SEVERE, "An HTTP exception occurred in sending a web request: ", exception);
            } catch (ConnectTimeoutException exception) {
                sendResponse("Connection timed out");
                LogManager.log(Level.SEVERE, "Unable to connect to server: ", exception);
            } catch (SocketTimeoutException exception) {
                sendResponse("Timeout exception occurred.");
                LogManager.log(Level.SEVERE, "An exception occurred in sending a web request: ", exception);
            } catch (Exception exception) {
                if(exception.getMessage().contains("refused")) {
                    sendResponse("Connection refused");
                } else {
                    sendResponse("General exception occurred.");
                }
                LogManager.log(Level.SEVERE, "An exception occurred in sending a web request: ", exception);
            }
        } catch (Exception exception) {
            LogManager.log(Level.SEVERE, "An exception occurred in sending a web request: ", exception);
        }
    }

    private void sendResponse(String message) {
        if(handler!= null) {
            sendHandlerResponse(message);
        } else if(context != null) {
            sendBroadcastResponse(message);
        }
    }

    private void sendHandlerResponse(String message) {

        Bundle bundle = new Bundle();
        bundle.putString(RESPONSE_KEY, message);
        if(extraData != null) {
            bundle.putString(EXTRA_KEY, extraData.toString());
        }

        Message response = new Message();
        response.setData(bundle);

        handler.sendMessage(response);
    }

    private void sendBroadcastResponse(String message) {
        Intent response = new Intent(broadcastString);
        response.putExtra(RESPONSE_KEY, message);
        if(extraData != null) {
            response.putExtra(EXTRA_KEY, extraData.toString());
        }
        context.sendBroadcast(response);
    }

    public static Map<String, String> splitQuery(URL url) throws UnsupportedEncodingException {
        Map<String, String> query_pairs = new LinkedHashMap<String, String>();
        String query = url.getQuery();
        if(query != null){
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                int idx = pair.indexOf("=");
                if(idx != -1) {
                    query_pairs.put(URLDecoder.decode(pair.substring(0, idx), "UTF-8"), URLDecoder.decode(pair.substring(idx + 1), "UTF-8"));
                }
            }
        }
        return query_pairs;
    }

    public static boolean endsWithFileOrSlash(String url){
        int lastDotIndex = url.lastIndexOf(".");
        return (lastDotIndex == url.length() - 4 || lastDotIndex == url.length() - 5 || url.lastIndexOf("/") == url.length()-1);
    }

    public static URL addTrailingSlashBeforeGetParams(URL url){
        try {
            String partialUrl = url.getProtocol() + "://" + url.getAuthority() + url.getPath();
            if(!endsWithFileOrSlash(partialUrl)){
                partialUrl += "/";
            }
            return new URL(partialUrl + url.getQuery() + url.getRef());
        } catch (MalformedURLException e) {
            LogManager.log(Level.SEVERE, "WebHelper.addTrailingSlashBeforeGetParams - MalformedURLException: ", e);
            return url;
        }
    }
}
