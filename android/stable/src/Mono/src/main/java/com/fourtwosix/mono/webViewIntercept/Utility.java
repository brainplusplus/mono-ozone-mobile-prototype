package com.fourtwosix.mono.webViewIntercept;

import com.fourtwosix.mono.utils.LogManager;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;

/**
 * Utility functions for use by the WebViewAPI implementing classes.
 */
public class Utility {

    /**
     * Takes the query string from a URL and parses it into a map form.
     * @param httpQueryString The httpQueryString from a URL.
     * @return A map of variables and values from the httpQueryString
     */
    public static Map<String, String> parseGetVariables(String httpQueryString) {
        Map<String, String> varPairs = new HashMap<String, String>();

        String [] splitQueryString = httpQueryString.split("&");

        try {
            // Split by the "&" characters
            for(String varString : splitQueryString) {
                // Locate the first =
                int firstEqualLoc = varString.indexOf("=");
                String key = varString.substring(0, firstEqualLoc);
                // URLDecode the value portion of the string -- gets rid of %20s and
                // other funky hex codes
                String value = URLDecoder.decode(varString.substring(firstEqualLoc + 1), "UTF-8");

                varPairs.put(key, value);
            }
        }
        catch(UnsupportedEncodingException e) {
            LogManager.log(Level.SEVERE, "Unable to location UTF-8 encoding.  Can't parse the query string!", e);
            throw new RuntimeException("Unable to location UTF-8 encoding.  Can't parse the query string!");
        }

        return varPairs;
    }

    /**
     * Looks for a required set of keys given a map.
     * @param map The map to look for keys in.
     * @param requiredKeys The keys to search for.
     * @return True if all keys are in the map, false otherwise
     */
    public static boolean mapContains(Map<String, String> map, String[] requiredKeys) {
        for(String requiredVar : requiredKeys) {
            if(map.containsKey(requiredVar) == false) {
                return false;
            }
        }

        return true;
    }
}
