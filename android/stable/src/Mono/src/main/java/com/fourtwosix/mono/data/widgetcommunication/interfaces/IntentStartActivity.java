package com.fourtwosix.mono.data.widgetcommunication.interfaces;

import java.util.List;

/**
 * An intent start activity class.
 */
public interface IntentStartActivity {
    /**
     * Runs the appropriate action given an intent and data
     * @param dest A list of destination widget IDs.
     */
    public void run(List<String> dest);

    public String getOutput();
}
