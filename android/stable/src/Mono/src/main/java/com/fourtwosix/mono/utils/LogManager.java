package com.fourtwosix.mono.utils;

import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Created by alerman on 1/20/14.
 */
public class LogManager {
    public static final String DEBUG_TAG = "Ozone Mobile";

    /**
     * Logs a message to the console and to TestFlight
     * @param level level of the message
     * @param msg the message to log
     */
    public static void log(Level level,String msg)
    {
        Logger.getLogger(DEBUG_TAG).log(level,msg);
        if(level.intValue() >= Level.INFO.intValue())
        {
            //TestFlight.log(level.getName() + ": " + msg);
        }
    }

    /**
     * Logs a message to the console and to TestFlight
     * @param level level of the message
     * @param msg the message to log
     * @param exception the exception related to the message
     */
    public static void log(Level level,String msg, Exception exception)
    {
        Logger.getLogger(DEBUG_TAG).log(level,msg, exception);
        if(level.intValue() >= Level.INFO.intValue())
        {
            //TestFlight.log(level.getName() + ": " + msg + " - " + exception.getMessage());
        }
    }
}
