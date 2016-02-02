package com.fourtwosix.mono.structures;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.net.URL;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

/**
 * Created by alerman on 5/13/14.
 */
public class AppsMall {
    private URL url;
    private String name;

    public AppsMall(String nameText, URL urlObj) {
        name = nameText;
        url = urlObj;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public URL getUrl() {
        return url;
    }

    public void setUrl(URL url) {
        this.url = url;
    }

    public static AppsMall fromString(String from)
    {
        Gson gson = new GsonBuilder().create();
        return gson.fromJson(from,AppsMall.class);
    }

    public String toJsonString()
    {
        Gson gson = new GsonBuilder().create();
        return gson.toJson(this, AppsMall.class);
    }

    public static Set<AppsMall> fromStringCollection(Collection<String> strings) {
        // If the input is null, return a null
        if(strings == null) {
            return null;
        }

        Set<AppsMall> results = new HashSet<AppsMall>();
        for(String string : strings)
        {
            results.add(AppsMall.fromString(string));
        }
        return results;
    }

    public static Set<String> toStringSet(Set<AppsMall> listItems) {
       Set<String> result = new HashSet<String>();
       for(AppsMall am : listItems)
       {
           result.add(am.toJsonString());
       }
        return result;
    }

    public String toString()
    {
        return getName() + ": " + getUrl();
    }

    @Override
    public boolean equals(Object other) {
        AppsMall otherMall = (AppsMall)other;
        return otherMall.toString().equals(toString());
    }

    @Override
    public int hashCode() {
        return toString().hashCode();
    }
}
