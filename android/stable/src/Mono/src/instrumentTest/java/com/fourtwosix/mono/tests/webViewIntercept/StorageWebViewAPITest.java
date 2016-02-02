package com.fourtwosix.mono.tests.webViewIntercept;

import android.app.Activity;
import android.test.ActivityInstrumentationTestCase2;
import android.test.suitebuilder.annotation.Suppress;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.fourtwosix.mono.activities.LoginActivity;
import com.fourtwosix.mono.data.relational.Database;
import com.fourtwosix.mono.data.relational.SQLite;
import com.fourtwosix.mono.data.relational.exceptions.BadSyntaxException;
import com.fourtwosix.mono.data.relational.exceptions.DBException;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.webViewIntercept.WebViewIntercept;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.UUID;
import java.util.logging.Level;

/**
 * Unit tests for the StorageWebViewAPI.
 */
public class StorageWebViewAPITest extends ActivityInstrumentationTestCase2<LoginActivity> {
    private static final String APP_ID = "storageWebViewTestDB";

    private Database db;
    private WebView webView;

    public StorageWebViewAPITest() {
        super(LoginActivity.class);
    }

    public void setUp() {
        Activity activity = getActivity();

        // Get a copy of the database for later cleanup
        db = new SQLite(activity.getApplicationContext(), APP_ID);

        webView = new WebView(activity.getApplicationContext());
    }

    public void testExec() {
        try {
            String url = createQueryURL("exec",
                    "CREATE TABLE storageExecTest (id INTEGER PRIMARY KEY AUTOINCREMENT, desc STRING)", null);
            WebResourceResponse response = WebViewIntercept.Intercept(url, APP_ID, UUID.randomUUID().toString(), webView);

            JSONObject json = getJsonObject(response);

            assert(json.getString("status").equals("success"));
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Exception encountered during testExec.", e);
            fail();
        }
        finally {
            try {
                db.exec("DROP TABLE storageExecTest", new String[] {});
            }
            catch(BadSyntaxException e) {
                // This shouldn't happen
                LogManager.log(Level.SEVERE, "Bad syntax error when it shouldn't have happened!", e);
            }
            catch(DBException e) {
                // This is okay
            }
        }
    }

    public void testBadExec() {
        try {
            String url = createQueryURL("exec",
                    "CREAT TABLE storageExecTest (id INTEGER PRIMARY KEY AUTOINEMENT, desc STRING)", null);
            WebResourceResponse response = WebViewIntercept.Intercept(url, APP_ID, UUID.randomUUID().toString(), webView);

            JSONObject json = getJsonObject(response);

            assert(json.getString("status").equals("failure"));
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Exception encountered during testBadExec.", e);
            fail();
        }
        finally {
            try {
                db.exec("DROP TABLE storageExecTest", new String[] {});
            }
            catch(BadSyntaxException e) {
                // This shouldn't happen
                LogManager.log(Level.SEVERE, "Bad syntax error when it shouldn't have happened!", e);
            }
            catch(DBException e) {
                // This is okay
            }
        }
    }

    public void testQuery() {
        try {
            // Create table
            String url = createQueryURL("exec",
                    "CREATE TABLE storageQueryTest (id INTEGER PRIMARY KEY AUTOINCREMENT, desc STRING)", null);
            WebResourceResponse response = WebViewIntercept.Intercept(url, APP_ID, UUID.randomUUID().toString(), webView);

            JSONObject json = getJsonObject(response);

            assert(json.getString("status").equals("success"));

            // Insert a test value
            url = createQueryURL("exec", "INSERT INTO storageQueryTest (desc) VALUES ('Testing testing.')", null);
            response = WebViewIntercept.Intercept(url, APP_ID, UUID.randomUUID().toString(), webView);
            json = getJsonObject(response);

            assert(json.getString("status").equals("success"));

            // Query the table
            url = createQueryURL("query", "SELECT * FROM storageQueryTest", null);
            response = WebViewIntercept.Intercept(url, APP_ID, UUID.randomUUID().toString(), webView);
            json = getJsonObject(response);

            assert(json.getString("status").equals("success"));
            JSONArray results = json.getJSONArray("results");

            assertEquals("Testing testing.", ((JSONObject) results.get(0)).getString("desc"));

            // Query the table
            url = createQueryURL("query", "SELECT * FROM storageQueryTest WHERE desc = ?", "Testing testing.");
            response = WebViewIntercept.Intercept(url, APP_ID, UUID.randomUUID().toString(), webView);
            json = getJsonObject(response);

            assert(json.getString("status").equals("success"));
            results = json.getJSONArray("results");

            assertEquals("Testing testing.", ((JSONObject) results.get(0)).getString("desc"));
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Exception encountered during testQuery.", e);
            fail();
        }
        finally {
            try {
                db.exec("DROP TABLE storageQueryTest", new String[] {});
            }
            catch(BadSyntaxException e) {
                // This shouldn't happen
                LogManager.log(Level.SEVERE, "Bad syntax error when it shouldn't have happened!", e);
            }
            catch(DBException e) {
                // This is okay
            }
        }
    }

    public void testBadQuery() {
        try {
            // Create table
            String url = createQueryURL("exec",
                    "CREATE TABLE storageQueryTest (id INTEGER PRIMARY KEY AUTOINCREMENT, desc STRING)", null);
            WebResourceResponse response = WebViewIntercept.Intercept(url, APP_ID, UUID.randomUUID().toString(), webView);

            JSONObject json = getJsonObject(response);

            assert(json.getString("status").equals("success"));

            // Insert a test value
            url = createQueryURL("exec", "INSERT INTO storageQueryTest (desc) VALUES ('Testing testing.')", null);
            response = WebViewIntercept.Intercept(url, APP_ID, UUID.randomUUID().toString(), webView);
            json = getJsonObject(response);

            assert(json.getString("status").equals("success"));

            // Query the table
            url = createQueryURL("query", "SELCT * FROM storageQueryTest", null);
            response = WebViewIntercept.Intercept(url, APP_ID, UUID.randomUUID().toString(), webView);
            json = getJsonObject(response);

            assert(json.getString("status").equals("failure"));
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Exception encountered during testBadQuery.", e);
            fail();
        }
        finally {
            try {
                db.exec("DROP TABLE storageQueryTest", new String[] {});
            }
            catch(BadSyntaxException e) {
                // This shouldn't happen
                LogManager.log(Level.SEVERE, "Bad syntax error when it shouldn't have happened!", e);
            }
            catch(DBException e) {
                // This is okay
            }
        }
    }

    @Suppress
    private String createQueryURL(String method, String query, String values)
            throws UnsupportedEncodingException {
        StringBuilder stringBuilder = new StringBuilder("http://monover.42six.com/ozone.gov/storage/persistent/" + method + "?{\"query\": \"" + URLEncoder.encode(query, "UTF-8") + "\"");

        if(values != null) {
            String [] valueSplits = values.split(",");
            stringBuilder.append(", \"values\": [");

            int splitCount = valueSplits.length;

            for(int i=0; i<splitCount - 1; i++) {
                stringBuilder.append("\"");
                stringBuilder.append(URLEncoder.encode(values, "UTF-8"));
                stringBuilder.append("\", ");
            }

            stringBuilder.append("\"");
            stringBuilder.append(URLEncoder.encode(values, "UTF-8"));
            stringBuilder.append("\"]");
        }

        stringBuilder.append("}");
        return stringBuilder.toString();
    }

    @Suppress
    private JSONObject getJsonObject(WebResourceResponse wrr) throws IOException, JSONException {
        BufferedReader br=new BufferedReader(new InputStreamReader(wrr.getData()));
        String s=br.readLine();

        return new JSONObject(s);
    }
}
