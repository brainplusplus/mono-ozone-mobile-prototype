package com.fourtwosix.mono.utils.secureLogin;

import android.content.Context;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.NetworkResponse;
import com.android.volley.Response;
import com.android.volley.toolbox.JsonObjectRequest;

import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

/**
 * Created by mwilson on 4/1/14.
 */
public class AuthJsonRequest extends JsonObjectRequest {
    private Map<String, String> params;
    private Map<String, String> headers;
    private Context context;

    public AuthJsonRequest(int method, String url, JSONObject jsonRequest, Response.Listener<JSONObject> listener, Response.ErrorListener errorListener, Context context) {
        super(method, url, jsonRequest, listener, errorListener);

        this.params = new HashMap<String, String>();
        this.context = context;
        this.headers = new HashMap<String, String>();

        setRetryPolicy(new DefaultRetryPolicy(60000, DefaultRetryPolicy.DEFAULT_MAX_RETRIES, DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));
    }

    @Override
    public Map<String, String> getParams() {
        return params;
    }

    @Override
    protected Response<JSONObject> parseNetworkResponse(NetworkResponse networkResponse) {
        return super.parseNetworkResponse(OpenAMAuthentication.authorizeIfNecessary(getUrl(), networkResponse, context));
    }
}
