package com.fourtwosix.mono.tests.webViewIntercept;

import android.app.Activity;
import android.content.Context;
import android.test.ActivityInstrumentationTestCase2;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.activities.LoginActivity;
import com.fourtwosix.mono.webViewIntercept.CacheWebViewAPI;
import com.fourtwosix.mono.webViewIntercept.ModalWebViewAPI;

import org.json.JSONException;
import org.json.JSONObject;
import org.msgpack.annotation.Ignore;
import org.simpleframework.http.Request;
import org.simpleframework.http.Response;
import org.simpleframework.http.core.Container;
import org.simpleframework.http.core.ContainerServer;
import org.simpleframework.transport.Server;
import org.simpleframework.transport.connect.Connection;
import org.simpleframework.transport.connect.SocketConnection;

import java.io.IOException;
import java.io.PrintStream;
import java.net.InetSocketAddress;
import java.net.SocketAddress;
import java.net.URL;
import java.util.logging.Level;
import java.util.logging.Logger;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class ModalWebViewAPITest extends ActivityInstrumentationTestCase2<LoginActivity> {

    private static Logger log = Logger.getLogger(CacheWebViewAPITest.class.getName());
    private static final String APP_ID = "cacheWebView";

    private static final int TEST_PORT = 42345;

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
            }
            catch(Exception e) {
                log.log(Level.SEVERE, "Error in test web server!", e);
            }
        }
    }

    public ModalWebViewAPITest() {
        super(LoginActivity.class);
    }

    protected void setUp() {
        if(isInitialized) {
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

    @Ignore // We can't mock the WebView.class
    public void testCallDisplayWebContentDialogWithResponseDataFromUrl() {
        try {
            CacheWebViewAPI cacheWebViewAPI = mock(CacheWebViewAPI.class);
//            ModalWebViewAPI modalWebViewAPI = mock(ModalWebViewAPI.class);
            WebView webView = mock(WebView.class);
            when(webView.getContext()).thenReturn(context);
            ModalWebViewAPI modalWebViewAPI = new ModalWebViewAPI();

            String url = "http://" + serverAddress;
            String method = "GET";
            String title = "Test title";

            JSONObject modalJSON = new JSONObject();
            modalJSON.put("url", url);
            modalJSON.put("method", method);
            modalJSON.put("title", title);

            WebResourceResponse webResourceResponse = modalWebViewAPI.handle(webView, "url", new URL(url));
            WebResourceResponse response = cacheWebViewAPI.getDataFromUrl(url, method, null);
            String responseString = CacheWebViewAPITest.inputStreamToString(response.getData());
            //Mockito.verify(cacheWebViewAPI, times(1)).getDataFromUrl(context, url, method, null);
            //Mockito.verify(modalWebViewAPI, times(1)).displayWebContentDialog(title, responseString);
        }
        catch(JSONException e) {
            log.log(Level.SEVERE, "JSON Exception encountered during testCallDisplayWebContentDialogWithResponseDataFromUrl.", e);
            fail();
        } catch (IOException ioe) {
            log.log(Level.SEVERE, "IO Exception encountered during testCallDisplayWebContentDialogWithResponseDataFromUrl.", ioe);
            fail();
        }
    }
}
