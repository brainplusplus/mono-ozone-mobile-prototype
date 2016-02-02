package com.fourtwosix.mono.tests.utilities;

/**
 * Created by dchambers on 4/2/14.
 */


import java.io.*;
import java.util.*;

import org.apache.commons.lang.StringEscapeUtils;

public class Useful {
    public static final String serverPropKey = "serverUrl";
    public static final String baseServerPropKey = "baseServerUrl";
    public static final String certFileKey = "certFile";

    static public String findKey(String key) throws IOException
    {
        String value="";
        HashMap<String, String> config = null;
        value = System.getProperty(key);
        if (value==null)
        {
            InputStream is = Useful.class.getResourceAsStream("/test.properties");
            if (is!=null)
            {
                config = Useful.readConfigFile(is);
                if (config.containsKey(key))
                {
                    value = config.get(key);
                }
                else
                {
                    System.out.print("Can't find " + key + " in system properties or test.properties");
                }
            }
            else
            {
                System.out.print("Can't find test.properties file");
            }
        }
        else
        {
            System.out.print("Using system property" + key + " = " + value);
        }
        return value;
    }

    static public HashMap<String, String> readConfigFile(InputStream is) throws IOException
    {
        DataInputStream dis = null;
        HashMap<String,String> configFile = new HashMap<String,String>();

        // Load the configuration file from the last invocation
        try {

            dis = new DataInputStream(is);
            BufferedReader br = new BufferedReader(new InputStreamReader(dis));

            // Read the config file line by line and store the key:value pair in our
            // collection.
            String strLine;
            while ((strLine = br.readLine()) != null)   {
                StringTokenizer st = new StringTokenizer(strLine, "=");
                String key = st.nextToken();
                String value = st.nextToken();

                configFile.put(key,value);
            }
        }

        catch (FileNotFoundException e) {
            throw e;
        }

        catch (IOException e) {
            throw e;
        }

        finally {
            try {
                if (dis != null)
                    dis.close();
            }

            catch (IOException e) {
            }
        }

        return configFile;
    }

    static public String getStackTrace(Throwable aThrowable) {
        final Writer result = new StringWriter();
        final PrintWriter printWriter = new PrintWriter(result);
        aThrowable.printStackTrace(printWriter);
        return result.toString();
    }

    static public String getXmlSafeStackTrace(Throwable aThrowable) {
        final Writer result = new StringWriter();
        final PrintWriter printWriter = new PrintWriter(result);
        aThrowable.printStackTrace(printWriter);
        return StringEscapeUtils.escapeHtml(result.toString());

    }
}
