package com.fourtwosix.mono.structures;

import android.graphics.Bitmap;

public class StackItem {

    public String text;
    public Bitmap img;

    public StackItem(String text, Bitmap photo)
    {
        this.img = photo;
        this.text = text;
    }
}