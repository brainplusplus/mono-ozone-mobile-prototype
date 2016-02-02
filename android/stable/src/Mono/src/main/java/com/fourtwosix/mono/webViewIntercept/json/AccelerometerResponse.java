package com.fourtwosix.mono.webViewIntercept.json;

import com.google.gson.GsonBuilder;

/**
 * Created by alerman on 5/16/14.
 */
public class AccelerometerResponse {

    private acceleration acceleration;

    private Status status;
    private String message;

    private class acceleration{
        private float x;
        private float y;
        private float z;

        public acceleration(float x, float y, float z)
        {
            this.x = x;
            this.y = y;
            this.z = z;
        }
    }

    public AccelerometerResponse(float x,float y, float z, StatusResponse status)
    {
        this.acceleration = new acceleration(x,y,z);
        this.status = status.getStatus();
        this.message = status.getMessage();
    }

    @Override
    public String toString()
    {
        return new GsonBuilder().create().toJson(this,AccelerometerResponse.class);
    }

}
