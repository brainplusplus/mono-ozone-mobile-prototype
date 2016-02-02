package com.fourtwosix.mono.utils.caching;

import android.content.Context;

import com.android.volley.NetworkResponse;
import com.android.volley.Response;
import com.android.volley.toolbox.StringRequest;
import com.fourtwosix.mono.utils.secureLogin.OpenAMAuthentication;

/**
 * Created by mschreiber on 2/23/14.
 */
public class PrioritizedJsonRequest extends StringRequest {
    private Priority mPriority = Priority.NORMAL;
    private Context context;

    public PrioritizedJsonRequest(int method, String url, Response.Listener<String> listener, Response.ErrorListener errorListener, Context context) {
        super(method, url, listener, errorListener);

        this.context = context;
    }

    public PrioritizedJsonRequest(String url, Response.Listener<String> listener, Response.ErrorListener errorListener, Context context) {
        super(url, listener, errorListener);

        this.context = context;
    }

    @Override
    protected Response<String> parseNetworkResponse(NetworkResponse networkResponse) {
        return super.parseNetworkResponse(OpenAMAuthentication.authorizeIfNecessary(getUrl(), networkResponse, context));
    }

    @Override
    public Priority getPriority() {
        return mPriority;
    }

    public void setPriority(Priority priority) {
        mPriority = priority;
    }
}
