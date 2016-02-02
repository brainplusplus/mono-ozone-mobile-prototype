package com.fourtwosix.mono.utils.caching;

import android.content.Context;

import com.android.volley.NetworkResponse;
import com.android.volley.Request;
import com.android.volley.Response;
import com.android.volley.toolbox.StringRequest;
import com.fourtwosix.mono.utils.secureLogin.OpenAMAuthentication;

/**
 * Created by mschreiber on 2/23/14.
 */
public class PrioritizedStringRequest extends StringRequest {
    private Request.Priority mPriority = Priority.NORMAL;
    private Context context;

    public PrioritizedStringRequest(int method, String url, Response.Listener<String> listener, Response.ErrorListener errorListener, Context context) {
        super(method, url, listener, errorListener);

        this.context = context;
    }

    public PrioritizedStringRequest(String url, Response.Listener<String> listener, Response.ErrorListener errorListener, Context context) {
        super(url, listener, errorListener);

        this.context = context;
    }

    @Override
    protected Response<String> parseNetworkResponse(NetworkResponse networkResponse) {
        return super.parseNetworkResponse(OpenAMAuthentication.authorizeIfNecessary(getUrl(), networkResponse, context));
    }

    @Override
    public Request.Priority getPriority() {
        return mPriority;
    }

    public void setPriority(Request.Priority priority) {
        mPriority = priority;
    }
}
