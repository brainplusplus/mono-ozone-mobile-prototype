package com.fourtwosix.mono.webViewIntercept;

import android.content.Context;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.utils.caching.CacheHelper;

import java.net.URL;

/**
 * This class intercepts disguised HTTP calls and translates them into native Android
 * calls.  This will be used by applications deployed on the Mono framework.
 */
public class WebViewIntercept {
    private static Context context;
    public static final String OZONE_PREFIX = "ozone.gov/";

    /**
     * Default constructor.  Not used.
     */
    public WebViewIntercept() {
    }

    /**
     * The interception function.  Will parse the URL and determine
     * what APIs need to be called.  Uses a guid to separate application
     * specific functionality from other Mono deployed applications.
     * @param url The URL to parse.
     * @param guid The guid identifier for the application.
     * @param instanceGuid The guid identifier for the instance.
     * @param view The view where the call originated from.
     * @return A web response based on the parsed URL.
     */
    public static WebResourceResponse Intercept(String url, String guid, String instanceGuid, WebView view) {
        // Make sure the URL received is valid
        if (!checkApiCall(url)) {
            return CacheHelper.returnCachedWebResourceResponseOrNull(view.getContext(), url);
        } else {
            WebViewInterceptUrl wvUrls = new WebViewInterceptUrl(url, OZONE_PREFIX);
            String methodName = wvUrls.methodName;
            URL fullUrl = wvUrls.fullUrl;

            // Determine which API to call
            switch (APIPackage.valueOf(wvUrls.apiPackageName.toUpperCase())) {
                case ACCELEROMETER:
                    return new AccelerometerWebViewAPI(view.getContext()).handle(view, methodName, fullUrl);

                case BATTERY:
                    return new BatteryWebViewAPI().handle(view, methodName, fullUrl);

                case CACHING:
                    return new CacheWebViewAPI(instanceGuid).handle(view, methodName, fullUrl);

                case CONNECTIVITY:
                    return new ConnectivityWebViewAPI().handle(view, methodName, fullUrl);

                case STORAGE:
                    return new StorageWebViewAPI(guid).handle(view, methodName, fullUrl);

                case MAPCACHE:
                    return new MapCacheWebViewAPI().handle(view, methodName, fullUrl);

                case MODALS:
                    return new ModalWebViewAPI().handle(view, methodName, fullUrl);

                case NOTIFICATIONS:
                    return new NotificationWebViewAPI(instanceGuid).handle(view, methodName, fullUrl);

                case LOCATION:
                    return new LocationWebViewAPI(view.getContext()).handle(view, methodName, fullUrl);

                case PUBSUB:
                    return new PublishSubscribeWebViewAPI(instanceGuid).handle(view, methodName, fullUrl);

                case INTENTS:
                    return new IntentWebViewAPI(instanceGuid, guid).handle(view, methodName, fullUrl);

                case HEADERBAR:
                    return new HeaderBarAPI(view.getContext()).handle(view, methodName, fullUrl);

                default:
                    throw new IllegalArgumentException("Error unsupported api");
            }
        }
    }

    // Helper function to ensure the URL is valid
    private static boolean checkApiCall(String url) {
        return url.contains(OZONE_PREFIX);
    }
}
