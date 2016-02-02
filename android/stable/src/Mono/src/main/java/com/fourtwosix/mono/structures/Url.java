package com.fourtwosix.mono.structures;

import android.os.Parcel;
import android.os.Parcelable;

import com.fourtwosix.mono.utils.LogManager;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.logging.Level;

public class Url implements Parcelable, Comparable<Url> {
    private URL url;

    public Url(URL url) {
        this.setUrl(url);
    }

    public Url(String url) {
        try {
            this.setUrl(new URL(url));
        } catch (MalformedURLException e) {
            LogManager.log(Level.SEVERE, "Url.java MalformedURLException, creating URL from " + url + "\n" + e.getStackTrace());
        }
    }

    public Url(Parcel parcel) {
        try {
            this.setUrl(new URL(parcel.readString()));
        } catch (MalformedURLException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        }
    }

    public URL getUrl() {
        return url;
    }

    @Override
    public int describeContents() {
        return 0;
    }

    /**
     * This method writes out the current object to a parcel.
     * This is necessary if you wish to retain all information from this object
     * when  you are sending it out.
     * @param out parcel to be written out to
     * @param flags additional parcel flags
     */
    @Override
    public void writeToParcel(Parcel out, int flags) {
        out.writeString(this.getUrl().toString());
    }

    @Override
    public int compareTo(Url url) {
        return url.compareTo(url);
    }

    public void setUrl(URL url) {
        this.url = url;
    }

    //parcelables need to have a "Creator" or else it will cause an exception
    public static final Parcelable.Creator<Url> CREATOR = new Parcelable.Creator<Url>() {
        public Url createFromParcel(Parcel in) {
            return new Url(in);
        }

        public Url[] newArray(int size) {
            return new Url[size];
        }
    };
}
