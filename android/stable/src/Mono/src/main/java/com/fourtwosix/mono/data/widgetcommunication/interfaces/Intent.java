package com.fourtwosix.mono.data.widgetcommunication.interfaces;

import org.json.JSONObject;

/**
 * An intent receiver class.
 */
public abstract class Intent {
    private boolean hasRun;

    /**
     * Default constructor.
     */
    public Intent() {
        hasRun = false;
    }

    /**
     * Runs the appropriate action given an intent and data
     * @param sender The sending guid.
     * @param intent The intent JSON.
     * @param data The data JSON.
     */
    abstract public void run(JSONObject sender, JSONObject intent, JSONObject data);

    /**
     * Returns true if the intent has run, false otherwise.
     * @return A boolean representing whether the intent has run.
     */
    public boolean hasRun() {
        return hasRun;
    }

    /**
     * Sets the hasRun variable.
     * @param hasRun True if the intent has run, false otherwise.
     */
    protected void setHasRun(boolean hasRun) {
        this.hasRun = hasRun;
    }

    abstract public String getOutput();
}
