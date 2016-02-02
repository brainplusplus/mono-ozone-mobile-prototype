package com.fourtwosix.mono.listeners;

/**
 * Created by Corey on 1/30/14.
 */
public interface DialogClickListener {
    public void onYesClick();
    public void onNoClick();
    public String getYesText();
    public String getNoText();
}
