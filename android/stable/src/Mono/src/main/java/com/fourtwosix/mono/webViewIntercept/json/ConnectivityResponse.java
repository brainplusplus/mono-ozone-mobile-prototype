package com.fourtwosix.mono.webViewIntercept.json;

import com.google.gson.GsonBuilder;

/**
 * Created by alerman on 5/14/14.
 */
public class ConnectivityResponse {
    private boolean isOnline = true;
    private Status status;
    private String message;

    public ConnectivityResponse(boolean isOnline, StatusResponse sr)
    {
        this.isOnline = isOnline;
        status = sr.getStatus();
        message = sr.getMessage();
    }

    @Override
    public String toString()
    {
        return new GsonBuilder().create().toJson(this,ConnectivityResponse.class);
    }

}
