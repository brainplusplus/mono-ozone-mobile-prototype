package com.fourtwosix.mono.views;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.http.SslError;
import android.util.AttributeSet;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.toolbox.RequestFuture;
import com.fourtwosix.mono.R;
import com.fourtwosix.mono.fragments.BaseFragment;
import com.fourtwosix.mono.utils.ConnectivityHelper;
import com.fourtwosix.mono.utils.IOUtil;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.caching.CacheHelper;
import com.fourtwosix.mono.utils.caching.PrioritizedWebResourceResponseRequest;
import com.fourtwosix.mono.utils.caching.VolleySingleton;
import com.fourtwosix.mono.utils.ui.IWebViewObserver;
import com.fourtwosix.mono.webViewIntercept.AccelerometerWebViewAPI;
import com.fourtwosix.mono.webViewIntercept.BatteryWebViewAPI;
import com.fourtwosix.mono.webViewIntercept.LocationWebViewAPI;
import com.fourtwosix.mono.webViewIntercept.ModalExecutor;
import com.fourtwosix.mono.webViewIntercept.WebViewIntercept;

import org.json.JSONException;
import org.json.JSONObject;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashSet;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Level;

/**
 * A WebView class that sets up the web client and web chrome client for widget usage.
 */
public class WidgetWebView extends WebView {
    private BaseFragment fragment;

    private String widgetGuid;
    private String instanceGuid;
    private HashSet<IWebViewObserver> observers = new HashSet<IWebViewObserver>();
    private AtomicBoolean errorReceived = new AtomicBoolean(false);


    /**
     * Constructs a new WebView with a Context object.
     * @param context The context object to initialize with.
     */
    public WidgetWebView(Context context) {
        super(context);
    }

    /**
     * Constructs a new WebView with a Context object.
     * @param context The context object to initialize with.
     */
    public WidgetWebView(Context context, String instanceGuid) {
        super(context);

        this.instanceGuid = instanceGuid;
    }

    /**
     * Constructs a new WebView with a Context object.
     * @param context The context object to initialize with.
     * @param widgetGuid The guid for the widget.
     */
    public WidgetWebView(Context context, String instanceGuid, String widgetGuid) {
        super(context);

        this.instanceGuid = instanceGuid;
        this.widgetGuid = widgetGuid;
    }

    /**
     * Constructs a new webview with a context, and attribute set.
     * @param context The context object to initialize with.
     * @param attrs The attributes to apply to the web view.
     */
    public WidgetWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    /**
     * Constructs a new webview with a context, attribute set, and style.
     * @param context The context object to initialize with.
     * @param attrs The attributes to apply to the web view.
     * @param defStyle The style to apply to the web view.
     */
    public WidgetWebView(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);

        instanceGuid = null;
    }

    /**
     * Constructs a new webview with a context, attribute set, style, and private browsing flag.
     * @param context The context object to initialize with.
     * @param attrs The attributes to apply to the web view.
     * @param defStyle The style to apply to the web view.
     * @param privateBrowsing The private browsing flag.
     */
    @Deprecated
    public WidgetWebView(Context context, AttributeSet attrs, int defStyle, boolean privateBrowsing) {
        super(context, attrs, defStyle, privateBrowsing);

        instanceGuid = null;
    }

    /**
     * An initialization function.
     * Assumes a widget guid has already been set
     * @param parentDashboard
     */
    public void init(BaseFragment parentDashboard) {
        init(this.widgetGuid, parentDashboard);
    }

    /**
     * An initialization function. Takes the widget's guid.
     * @param widgetGuid The guid for the widget.
     * @param parentDashboard The containing fragment
     */
    public void init(final String widgetGuid, BaseFragment parentDashboard) {
        instanceGuid = instanceGuid != null ? instanceGuid : UUID.randomUUID().toString();
        this.fragment = parentDashboard;
        this.widgetGuid = widgetGuid;

        WebViewClient client = new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(final WebView view, String url) {
                SharedPreferences sharedPreferences = getContext().getSharedPreferences(getResources().getString(R.string.app_package), Context.MODE_PRIVATE);
                String baseUrl = sharedPreferences.getString(getResources().getString(R.string.serverUrlPreference), null);
                // rewrite url to fetch getConfig without any parameters to pull the version we pulled down when we first loaded the app
                if(url.contains(baseUrl + "access/getConfig")) {
                    url = baseUrl + getResources().getString(R.string.configPath);
                }
                WebResourceResponse wvIntercept = WebViewIntercept.Intercept(url, widgetGuid, instanceGuid, view);
                Context applicationContext = getContext().getApplicationContext();
                if(wvIntercept == null){
                    RequestQueue mVolleyQueue = VolleySingleton.getInstance(applicationContext).getRequestQueue();
                    if(ConnectivityHelper.isNetworkAvailable(applicationContext)) {
                        RequestFuture<WebResourceResponse> requestFuture = RequestFuture.newFuture();

                        PrioritizedWebResourceResponseRequest webResourceResponseRequest = new PrioritizedWebResourceResponseRequest(Request.Method.GET, url,
                                requestFuture, requestFuture, applicationContext);
                        webResourceResponseRequest.setPriority(Request.Priority.IMMEDIATE);
                        mVolleyQueue.add(webResourceResponseRequest);
                        try {
                            wvIntercept = requestFuture.get();
                            // Cache the data. This will be used for offline usage.
                            CacheHelper.setCachedData(applicationContext,
                                                        url,
                                                        IOUtil.readBytes(wvIntercept.getData()),
                                                        wvIntercept.getMimeType());
                            wvIntercept.getData().reset(); // Reset the buffer for a successful read later
//                            LogManager.log(Level.INFO, "Successfully cached response: " + url);
                        }
                        catch(Exception e) {
                            errorReceived.set(true);
                            LogManager.log(Level.SEVERE, "Error encoding response!  Returning null, using normal Android webView path.");
                            return null;
                        }
                    } else {
                        if(CacheHelper.dataIsCachedForOfflineUse(applicationContext, url)) {
                            //LogManager.log(Level.INFO, "WidgetFragment: using cached version of url: " + url);
                            wvIntercept = CacheHelper.returnCachedWebResourceResponseOrNull(applicationContext, url);
                        } else {
                            LogManager.log(Level.INFO, "WidgetFragment failed to get cached version of " + url);
                        }
                    }
                }
                return wvIntercept;
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.proceed();
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                SharedPreferences sharedPreferences = getContext().getSharedPreferences(getResources().getString(R.string.app_package), Context.MODE_PRIVATE);
                // Make the preferences string that Ozone depends on
                JSONObject widgetPreferences = null;
                try {
                    widgetPreferences = new JSONObject();

                    URL baseUrl = new URL(sharedPreferences.getString(getResources().getString(R.string.serverUrlPreference), null));

                    widgetPreferences.put("id", instanceGuid);
                    widgetPreferences.put("containerVersion", "7.1.0-GA");
                    widgetPreferences.put("webContextPath", "/owf");
                    widgetPreferences.put("preferenceLocation", new URL(baseUrl, "/owf/prefs"));
                    widgetPreferences.put("relayUrl", new URL(baseUrl, "/owf/js/eventing/rpc_relay.uncompressed.html"));
                    widgetPreferences.put("lang", "en_US");
                    widgetPreferences.put("currentTheme", new JSONObject().put("themeName", "a_default").put("themeContrast", "standard").put("themeFontSize", 12));
                    widgetPreferences.put("owf", true);
                    widgetPreferences.put("layout", "tabbed");
                    widgetPreferences.put("url", url);
                    widgetPreferences.put("guid", widgetGuid);
                    widgetPreferences.put("version", 1);
                    widgetPreferences.put("locked", false);
                }
                catch(JSONException e) {
                    LogManager.log(Level.SEVERE, "Issue making preferences object for window title in widget fragment!", e);
                } catch (MalformedURLException e) {
                    LogManager.log(Level.SEVERE, "Error getting the base URL!", e);
                }

                // Set the window.name to the preferences string
                if(widgetPreferences != null) {
                    String jsScript = "window.name=JSON.stringify(" + widgetPreferences.toString() + ")";
                    LogManager.log(Level.INFO, jsScript);
                    view.loadUrl("javascript: (function(){" + jsScript + ";})()");
                }
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                errorReceived.set(true);
                LogManager.log(Level.SEVERE, "error code: " + errorCode + ", failing url: " + failingUrl + ", description: " + description);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if(errorReceived.getAndSet(false)) {
                    ModalExecutor modalExecutor = new ModalExecutor(view);
                    modalExecutor.launchModal("Error loading resources.", "Page may not render correctly. Please check the log for details.");
                }
                for(IWebViewObserver obs : observers){
                    obs.notifyPageFinished();
                }
            }
        };
        setWebViewClient(client);
        setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                LogManager.log(Level.INFO, "Javascript console message line: " + message.lineNumber() + ", source: " + message.sourceId() + ", message: " + message.message());

                return true;
            }
        });

      //  if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
      //      setWebContentsDebuggingEnabled(true);
      //  }

        setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        getSettings().setJavaScriptEnabled(true);
        getSettings().setAppCacheEnabled(true);
        setVerticalScrollBarEnabled(false);
        setHorizontalScrollBarEnabled(false);
        getSettings().setBuiltInZoomControls(true);
        getSettings().setDisplayZoomControls(false);
        getSettings().setSupportZoom(true);
        getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
    }

    /**
     * Returns true if the webview is currently executing, false otherwise.
     * @return Whether or not the webview is currently executing.
     */
    public boolean currentlyExecuting() {
        return getSettings().getJavaScriptEnabled();
    }

    /**
     * Sets the instance guid
     * @param instanceGuid
     */
    public void setInstanceGuid(String instanceGuid) {
        this.instanceGuid = instanceGuid;
    }

    /**
     * Returns the instance guid currently associated with this webview.
     * @return The instance guid.
     */
    public String getInstanceGuid() {
        return instanceGuid;
    }

    /**
     * Sets the widget guid
     * @param widgetGuid
     */
    public void setWidgetGuid(String widgetGuid) {
        this.widgetGuid = widgetGuid;
    }

    /**
     * Gets the widget guid
     * @return
     */
    public String getWidgetGuid() {
        return this.widgetGuid;
    }

    /**
     * Returns the widget's parent dashboard, or null if it is not part of a dashboard.
     * @return The parent widget's dashboard.
     */
    public BaseFragment getFragment() {
        return fragment;
    }

    @Override
    public void onDetachedFromWindow() {
        // If we're no longer attached to a window, stop JavaScript from executing
        getSettings().setJavaScriptEnabled(false);
        new AccelerometerWebViewAPI(getContext()).UnregisterAll(this);
        new LocationWebViewAPI(getContext()).Unregister(this);
        BatteryWebViewAPI.UnregisterForUpdate(this);
    }

    public void registerIWebViewObserver(IWebViewObserver observer) {
        observers.add(observer);
    }
}
