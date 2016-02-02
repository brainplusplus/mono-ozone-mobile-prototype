package com.fourtwosix.mono.data.widgetcommunication.interfaces;

/**
* Callback interface to be implemented by subscribing classes.
*/
public interface Callback {
    public String getId();
    public String getOutput();

    public void run(String data);
}
