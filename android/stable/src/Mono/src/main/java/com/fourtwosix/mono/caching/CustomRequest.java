package com.fourtwosix.mono.caching;

import com.android.volley.Response;
import com.android.volley.toolbox.JsonObjectRequest;

import org.json.JSONObject;

/**
 * Created by mschreiber on 2/11/14.
 */
public class CustomRequest extends JsonObjectRequest {
    public CustomRequest(int method, String url, JSONObject jsonRequest, Response.Listener<JSONObject> listener, Response.ErrorListener errorListener) {
        super(method, url, jsonRequest, listener, errorListener);
    }
}
