package com.fourtwosix.mono.tests.webViewIntercept;

import android.app.Activity;
import android.content.Context;
import android.test.ActivityInstrumentationTestCase2;
import android.webkit.WebResourceResponse;
import com.fourtwosix.mono.activities.LoginActivity;
import com.fourtwosix.mono.webViewIntercept.CacheWebViewAPI;
import junit.framework.Test;
import junit.framework.TestSuite;
import org.json.JSONException;
import org.json.JSONObject;
import org.simpleframework.http.Request;
import org.simpleframework.http.Response;
import org.simpleframework.http.core.Container;
import org.simpleframework.http.core.ContainerServer;
import org.simpleframework.transport.Server;
import org.simpleframework.transport.connect.Connection;
import org.simpleframework.transport.connect.SocketConnection;

import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;
import java.net.InetSocketAddress;
import java.net.SocketAddress;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Unit tests for the StorageWebViewAPI.
 */
public class CacheWebViewAPITest extends ActivityInstrumentationTestCase2<LoginActivity> {
    private static Logger log = Logger.getLogger(CacheWebViewAPITest.class.getName());
    private static final String APP_ID = "cacheWebView";

    private static final int TEST_PORT = 42345;

    private static final int BUF_LENGTH = 1024;

    private static final String INSTANCE_GUID = "WIDGET_INSTANCE_GUID";

    // Make these all static because we need them for all tests
    private static TestContainer container;
    private static Server httpServer;

    private static Context context;

    private static String serverAddress;

    private static int numTestCases = 0;
    private static boolean isInitialized = false;

    private class TestContainer implements Container {

        private String getMessage;

        public TestContainer() {
            getMessage = "Test data";
        }

        public void setGetMessage(String getMessage) {
            this.getMessage = getMessage;
        }

        @Override
        public void handle(Request request, Response response) {
            try {
                log.log(Level.INFO, "Test container request received.");
                PrintStream body = response.getPrintStream();
                long time = System.currentTimeMillis();

                response.setValue("Content-Type", "text/plain");
                response.setValue("Server", "TestServer/1.0 (Simple 5.1)");
                response.setDate("Date", time);
                response.setDate("Last-Modified", time);

                if(request.getMethod().equalsIgnoreCase("GET")) {
                    log.log(Level.INFO, "GET Method received.");
                    body.print(getMessage);
                    body.close();
                }
                else if(request.getMethod().equalsIgnoreCase("POST")) {
                    log.log(Level.INFO, "POST Method received.");
                    body.print("Test post data: " + request.getParameter("test1") + " " + request.getParameter("test2"));
                    body.close();
                }
            }
            catch(Exception e) {
                log.log(Level.SEVERE, "Error in test web server!", e);
            }
        }
    }

    public CacheWebViewAPITest() {
        super(LoginActivity.class);
    }

    protected void setUp() {
        if(isInitialized == true) {
            return;
        }

        log.log(Level.SEVERE, "Initializing test class!");

        Activity activity = getActivity();

        context = activity.getApplicationContext();

        serverAddress = "localhost:" + TEST_PORT;
        log.log(Level.INFO, "Using address: " + serverAddress);

        // Set up our Simple HTTP server
        container = new TestContainer();

        try {
            httpServer = new ContainerServer(container);
            Connection connection = new SocketConnection(httpServer);
            SocketAddress address = new InetSocketAddress(TEST_PORT);

            connection.connect(address);
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error setting up HTTP server.", e);
            fail();
        }

        isInitialized = true;
    }

    protected void tearDown() {
        if(numTestCases > 1) {
            numTestCases--;
            return;
        }

        try {
            log.log(Level.SEVERE, "Tearing down test class!");
            httpServer.stop();
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error shutting down HTTP server.", e);
        }
    }

    public void testGetDataFromUrl() {
        try {
            CacheWebViewAPI cache = new CacheWebViewAPI(INSTANCE_GUID);
            JSONObject jsonGetRequest = new JSONObject();

            jsonGetRequest.put("url", "http://" + serverAddress);
            jsonGetRequest.put("method", "GET");

            JSONObject jsonPostRequest = new JSONObject();

            jsonPostRequest.put("url", "http://" + serverAddress);
            jsonPostRequest.put("method", "POST");

            JSONObject jsonPostParams = new JSONObject();
            jsonPostParams.put("test1", "Test 1 data");
            jsonPostParams.put("test2", "Test 2 data");

            jsonPostRequest.put("params", jsonPostParams);

            WebResourceResponse response = cache.getDataFromUrl(jsonGetRequest.getString("url"), "GET",  jsonGetRequest);

            String responseString = inputStreamToString(response.getData());

            assertEquals("Test data", responseString);

            response = cache.getDataFromUrl(jsonPostRequest.getString("url"), "POST", jsonPostRequest);

            responseString = inputStreamToString(response.getData());

            // TODO: Fix
            //assertEquals("Test post data: Test 1 data Test 2 data", responseString);
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Exception encountered during testGetDataFromUrlCaching.", e);
            fail();
        }
    }

    public void testGetDataFromUrlCaching() {
        try {
            CacheWebViewAPI cache = new CacheWebViewAPI(INSTANCE_GUID);
            JSONObject jsonGetRequest = new JSONObject();

            container.setGetMessage("Caching test data");

            jsonGetRequest.put("url", "http://" + serverAddress + "?caching=" + UUID.randomUUID().toString());
            jsonGetRequest.put("method", "GET");

            // Get first response
            WebResourceResponse response = cache.getDataFromUrl(jsonGetRequest.getString("url"), "GET", jsonGetRequest);
            String responseString = inputStreamToString(response.getData());
            assertEquals("Caching test data", responseString);

            // Force the network off
            cache.forceNetworkOff(true);

            // Set the container for a new response message
            container.setGetMessage("Test data");

            // Get the second response.  Should be cached.
            response = cache.getDataFromUrl(jsonGetRequest.getString("url"), "GET", jsonGetRequest);
            responseString = inputStreamToString(response.getData());
            //assertEquals("Caching test data", responseString);

            // Turn the network back on
            cache.forceNetworkOff(false);

            // Get the third response.  Should not be cached.
            response = cache.getDataFromUrl(jsonGetRequest.getString("url"), "GET", jsonGetRequest);
            responseString = inputStreamToString(response.getData());
            assertEquals("Test data", responseString);

            // Set the container for a new response message
            //container.setGetMessage("Caching test data 2");

            // Turn the network off again
            cache.forceNetworkOff(true);

            // Get the fourth response.  Should be cached, but more recent.
            response = cache.getDataFromUrl(jsonGetRequest.getString("url"), "GET", jsonGetRequest);
            responseString = inputStreamToString(response.getData());
            //assertEquals("Test data", responseString);
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Exception encountered during testGetDataFromUrl.", e);
            // TODO: Fix
            //fail();
        }
        finally {
            container.setGetMessage("Test data");
        }
    }

    public static Test suite() {
        TestSuite suite = new TestSuite(CacheWebViewAPITest.class);

        CacheWebViewAPITest.numTestCases = suite.countTestCases();
        CacheWebViewAPITest.isInitialized = false;

        return suite;
    }

    public static String inputStreamToString(InputStream is) throws IOException, JSONException {
        StringBuilder sb = new StringBuilder();
        byte buf[] = new byte[BUF_LENGTH];

        int readLen = -1;
        while((readLen = is.read(buf)) != -1) {
            sb.append(new String(buf, 0, readLen));
        }

        is.close();

        JSONObject json = new JSONObject(sb.toString());

        return json.getString("data");
    }
}
