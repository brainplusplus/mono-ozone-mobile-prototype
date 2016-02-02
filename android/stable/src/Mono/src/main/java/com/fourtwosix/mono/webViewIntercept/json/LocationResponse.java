package com.fourtwosix.mono.webViewIntercept.json;

import android.location.Location;

import com.google.gson.GsonBuilder;

/**
 * Created by alerman on 5/15/14.
 */
public class LocationResponse {
    public LocationResponse(Status success, Location location) {
       this.status = success;
       this.coords = new Coords(location);
    }

    @Override
    public String toString()
    {
       return new GsonBuilder().create().toJson(this,LocationResponse.class);
    }

    private Status status;
    private Coords coords;

    private class Coords {
        private double lat;
        private double lon;
        public Coords(double lat,double lon)
        {
            this.lat = lat;
            this.lon = lon;
        }
        public Coords(Location location)
        {
            this.lat = location.getLatitude();
            this.lon = location.getLongitude();
        }
    }
}
