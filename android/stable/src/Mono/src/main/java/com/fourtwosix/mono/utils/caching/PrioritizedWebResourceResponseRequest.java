package com.fourtwosix.mono.utils.caching;

import android.content.Context;
import android.webkit.WebResourceResponse;

import com.android.volley.NetworkResponse;
import com.android.volley.Request;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.HttpHeaderParser;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.secureLogin.OpenAMAuthentication;

import java.io.ByteArrayInputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;

/**
 * This returns a raw web resource response using volley.  This is for the WidgetWebView, as it has a need to
 * retrieve various sorts of data (text/css, javascript, etc.)
 */
public class PrioritizedWebResourceResponseRequest extends Request<WebResourceResponse> {
    private Priority mPriority = Priority.NORMAL;
    private Context context;
    private Response.Listener<WebResourceResponse> listener;
    private Map<String, String> params;

    public PrioritizedWebResourceResponseRequest(int method, String url, Response.Listener<WebResourceResponse> listener, Response.ErrorListener errorListener, Context context) {
        super(method, url, errorListener);
        this.context = context;
        this.listener = listener;
        this.params = new HashMap<String, String>();
    }

    public PrioritizedWebResourceResponseRequest(int method, String url, Response.Listener<WebResourceResponse> listener, Response.ErrorListener errorListener, Map<String, String> params, Context context) {
        super(method, url, errorListener);
        this.context = context;
        this.listener = listener;
        this.params = params;
    }

    public Map<String, String> getParams() {
        return params;
    }

    @Override
    protected Response<WebResourceResponse> parseNetworkResponse(NetworkResponse networkResponse) {
        NetworkResponse trueResponse = OpenAMAuthentication.authorizeIfNecessary(getUrl(), networkResponse, context);

        try {
            String contentType = null;
            String encoding = "UTF-8";

            // Find the content type and encoding type
            for(String key : trueResponse.headers.keySet()) {
                if(key.equalsIgnoreCase("content-type")) {
                    String [] contentTypeHeaderSplit = trueResponse.headers.get(key).split(";");
                    contentType = contentTypeHeaderSplit[0];

                    if(contentTypeHeaderSplit.length > 1) {
                        encoding = contentTypeHeaderSplit[1];
                    }
                }
            }

            WebResourceResponse webResourceResponse = new WebResourceResponse(contentType, encoding, new ByteArrayInputStream(trueResponse.data));
            return Response.success(webResourceResponse, HttpHeaderParser.parseCacheHeaders(trueResponse));
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Error generating response.", e);
            return Response.error(new VolleyError("Error generating response."));
        }
    }

    @Override
    protected void deliverResponse(WebResourceResponse webResourceResponse) {
        listener.onResponse(webResourceResponse);
    }

    @Override
    public Priority getPriority() {
        return mPriority;
    }

    public void setPriority(Priority priority) {
        mPriority = priority;
    }
}
