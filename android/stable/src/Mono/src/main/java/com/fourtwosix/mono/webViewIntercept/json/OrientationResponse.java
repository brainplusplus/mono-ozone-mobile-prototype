package com.fourtwosix.mono.webViewIntercept.json;

import com.google.gson.GsonBuilder;

/**
 * Created by alerman on 5/16/14.
 */
public class OrientationResponse {
    private Status status;
    private String orientation;

    public OrientationResponse(Status status, String orientation)
    {
        this.status = status;
        this.orientation = orientation;
    }

    @Override
    public String toString()
    {
        return new GsonBuilder().create().toJson(this,OrientationResponse.class).toString();
    }

}
