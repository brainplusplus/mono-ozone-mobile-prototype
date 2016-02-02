package com.fourtwosix.mono.utils;

import android.webkit.WebResourceResponse;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.logging.Level;

public class JSONHelper {

    /**
     * Checks whether an objects exists at a given dotpath
     * ie checking for test: com.example.test would return true
     * @param root the containing json object
     * @param dotPath the path to the desired object
     * @return whether an object exists at the given path.
     */
    public static boolean existsAtPath(JSONObject root, String dotPath)
    {
        String[] jsonPaths = dotPath.split(".");

        JSONObject localObj = null;
        String path = "";
        int i = 0;

        try {
            if (jsonPaths.length > 1)
            {
                localObj = root.getJSONObject(jsonPaths[0]);

                for (i = 1; i < jsonPaths.length - 1; i++)
                {
                    path = jsonPaths[i];
                    localObj = localObj.getJSONObject(path);
                }
                path = jsonPaths[i];
            }
            else
            {
                localObj = root;
                path = jsonPaths[0];
            }
        }
        catch (Exception ex)
        {
            LogManager.log(Level.INFO, "Failed trying to get path " + dotPath);
            return false;
        }

        return localObj.has(path);
    }

    /**
     * Gets a string from a given path.
     * @param root the containing json object
     * @param dotPath the path to the desired object
     * @param defaultValue the default value in case of failure
     * @return a string from the given path, or defaultValue if null
     */
    public static String getStringAtPath(JSONObject root, String dotPath, String defaultValue)
    {
        String[] jsonPaths = dotPath.split(".");

        JSONObject localObj = null;
        String path = "";

        try {
            if (jsonPaths.length > 1)
            {
                localObj = root.getJSONObject(jsonPaths[0]);
                int i = 1;

                for (i = 1; i < jsonPaths.length - 1; i++)
                {
                    path = jsonPaths[i];
                    localObj = localObj.getJSONObject(path);
                }
                path = jsonPaths[i];
            }
            else
            {
                localObj = root;
                path = jsonPaths[0];
            }
        }
        catch (Exception ex)
        {
            LogManager.log(Level.SEVERE, ex.getMessage());
            return defaultValue;
        }

        String s = localObj.optString(path);
        return (s != null && !s.equals("null") ? s : defaultValue);
    }

    /**
     * Gets an integer from a given path
     * @param root the containing json object
     * @param dotPath the path to the desired object
     * @param defaultValue the default value in case of failure
     * @return an integer at the given path otherwise defaultValue in case of failure
     */
    public static int getIntegerAtPath(JSONObject root, String dotPath, int defaultValue)
    {
        String[] jsonPaths = dotPath.split(".");

        JSONObject localObj = null;
        String path = "";

        try {
            if (jsonPaths.length > 1)
            {
                localObj = root.getJSONObject(jsonPaths[0]);
                int i = 1;

                for (i = 1; i < jsonPaths.length - 1; i++)
                {
                    path = jsonPaths[i];
                    localObj = localObj.getJSONObject(path);
                }
                path = jsonPaths[i];
            }
            else
            {
                localObj = root;
                path = jsonPaths[0];
            }
        }
        catch (Exception ex)
        {
            LogManager.log(Level.SEVERE, ex.getMessage());
            return defaultValue;
        }

        int s = (localObj.has(path))?localObj.optInt(path):defaultValue;
        return s;
    }

    /**
     * Gets a json object at a given dot path
     * @param root the containing json object
     * @param dotPath the path to the desired object
     * @return A json object from a desired path, otherwise null in case of failure
     */
    public static JSONObject getJSONObjectAtPath(JSONObject root, String dotPath)
    {
        String[] jsonPaths = dotPath.split(".");

        JSONObject localObj = null;
        String path = "";

        try {
            if (jsonPaths.length > 1)
            {
                localObj = root.getJSONObject(jsonPaths[0]);
                int i = 1;

                for (i = 1; i < jsonPaths.length - 1; i++)
                {
                    path = jsonPaths[i];
                    localObj = localObj.getJSONObject(path);
                }
                path = jsonPaths[i];
            }
            else
            {
                localObj = root;
                path = jsonPaths[0];
            }
        }
        catch (Exception ex)
        {
            LogManager.log(Level.SEVERE, "getJSONObjectAtPath failed with dotPath " + dotPath);
            return null;
        }

        return localObj.optJSONObject(path);
    }

    /**
     * Gets a JSONArray from a given dot path
     * @param root the containing json object
     * @param dotPath the path to the desired object
     * @return a JSONArray from the dot path, otherwise null
     */
    public static JSONArray getJSONArrayAtPath(JSONObject root, String dotPath)
    {
        String[] jsonPaths = dotPath.split(".");

        JSONObject localObj = null;
        String path = "";

        try {
            if (jsonPaths.length > 1)
            {
                localObj = root.getJSONObject(jsonPaths[0]);
                int i = 1;

                for (i = 1; i < jsonPaths.length - 1; i++)
                {
                    path = jsonPaths[i];
                    if (localObj.has(path))
                        localObj = localObj.getJSONObject(path);
                    else
                    {
                        return null; // no more logging as this is normal. this was put in bc its probably faster not to use an exception to catch a normal condition
                    }
                }
                path = jsonPaths[i];
            }
            else
            {
                localObj = root;
                path = jsonPaths[0];
            }
        }
        catch (Exception ex)
        {
            LogManager.log(Level.SEVERE, "getJSONArrayAtPath failed with dotPath " + dotPath);
            return null;
        }

        return getArrayFromObject(localObj, path);
                //localObj.optJSONArray(path);
    }


    /**
     * Sets a value at a given path. Creates the path if it does not exist
     * @param dotPath
     * @param value
     */
    public static void putStringAtPath(JSONObject jsonObject, String dotPath, String value) {
        String[] splits = dotPath.split("\\.");
        JSONObject currentObject = jsonObject;

        try {
            //go down the object tree until it reaches the end.
            for(int i = 0; i < splits.length - 1; i++) {
                String s = splits[i];

                if(!currentObject.has(s)) {
                    JSONObject newObj = new JSONObject();
                    currentObject.put(s, newObj);
                    currentObject = newObj;
                } else {
                    // need to handle the case where attempting to insert a.b.c.d.e.f
                    // where anything before f is not an object
                    if(currentObject.opt(s) instanceof JSONObject) {
                        currentObject = currentObject.getJSONObject(s);
                    } else {
                        JSONObject newObj = new JSONObject();
                        currentObject.put(s, newObj);
                        currentObject = newObj;
                    }
                }
            }

            //add last one
            currentObject.put(splits[splits.length - 1], value);

        } catch(JSONException e) {
            LogManager.log(Level.SEVERE, "putStringAtPath failed with dotPath " + dotPath, e);
        }
    }

    /**
     * Sets an object at a given path. Creates the path if it does not exist
     * @param jsonObject
     * @param dotPath
     * @param newObject
     */
    public static void putObjectAtPath(JSONObject jsonObject, String dotPath, JSONObject newObject) {
        String[] splits = dotPath.split("\\.");
        JSONObject currentObject = jsonObject;

        try {
            for(int i = 0; i < splits.length-1; i++) {
                String s = splits[i];

                if(!currentObject.has(s)) {
                    JSONObject newObj = new JSONObject();
                    currentObject.put(s, newObj);
                    currentObject = newObj;
                } else {
                    currentObject = currentObject.getJSONObject(s);
                }
            }

            currentObject.put(splits[splits.length-1], newObject);

        } catch(JSONException e) {
            LogManager.log(Level.SEVERE, "putObjectAtPath failed with dotPath " + dotPath, e);
        }
    }

    /**
     * Gets a boolean from a given dot path
     * @param root the containing json object
     * @param dotPath
     * @return
     */
    public static Boolean getBooleanAtPath(JSONObject root, String dotPath)
    {
        String[] jsonPaths = dotPath.split(".");

        JSONObject localObj = null;
        String path = "";

        try {
            if (jsonPaths.length > 1)
            {
                localObj = root.getJSONObject(jsonPaths[0]);
                int i = 1;

                for (i = 1; i < jsonPaths.length - 1; i++)
                {
                    path = jsonPaths[i];
                    localObj = localObj.getJSONObject(path);
                }
                path = jsonPaths[i];
            }
            else
            {
                localObj = root;
                path = jsonPaths[0];
            }
        }
        catch (Exception ex)
        {
            LogManager.log(Level.SEVERE, ex.getMessage());
            return null;
        }

        return localObj.optBoolean(path);

    }

    /**
     * Concatenates multiple JSONArrays into single array
     * @param arrays
     * @return
     * @throws JSONException
     */
    public static JSONArray concatArrays(JSONArray... arrays) throws JSONException {
        JSONArray result = new JSONArray();
        for (JSONArray array : arrays) {
            if (array != null)
            {
                for (int i = 0; i < array.length(); i++) { // need check of array not being null apparently here
                    if (array.optJSONObject(i) != null)
                        result.put(array.optJSONObject(i));
                }
            }
        }
        return result;
    }

    /**
     * Gets an
     * @param obj
     * @param key
     * @return
     */
    public static JSONArray getArrayFromObject(JSONObject obj, String key)
    {
        if (obj.optJSONArray(key) != null)
            return obj.optJSONArray(key);
        else
        {
            JSONArray returnObj = new JSONArray();
            returnObj.put(obj.opt(key));
            return returnObj;
        }
    }

    public static JSONObject getJsonObject(WebResourceResponse wrr) throws IOException, JSONException {
        BufferedReader br=new BufferedReader(new InputStreamReader(wrr.getData()));
        String s=br.readLine();

        return new JSONObject(s);
    }
}
