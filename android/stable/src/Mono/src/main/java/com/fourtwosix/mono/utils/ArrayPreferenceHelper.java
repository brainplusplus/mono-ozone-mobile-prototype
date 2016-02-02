package com.fourtwosix.mono.utils;

import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.Set;

/**
 * Created by alerman on 4/7/14.
 */
public class ArrayPreferenceHelper {

    static Type typeOfSet = new TypeToken<Set<String>>() { }.getType();

    public static void storeStringArray(String name,SharedPreferences sharedPref,Set<String> array) {

        GsonBuilder gsonb = new GsonBuilder();
        Gson gson = gsonb.create();
        String value = gson.toJson(array,typeOfSet);
        SharedPreferences.Editor e = sharedPref.edit();
        e.putString(name, value);
        e.commit();
    }

    //   RETRIEVE YOUR ARRAY
    public static Set<String> retrieveStringArray(String name, SharedPreferences sharedPref) {
        String value = sharedPref.getString(name, null);

        GsonBuilder gsonb = new GsonBuilder();
        Gson gson = gsonb.create();
        Set<String> list = gson.fromJson(value, typeOfSet);
        return list;
    }
}
