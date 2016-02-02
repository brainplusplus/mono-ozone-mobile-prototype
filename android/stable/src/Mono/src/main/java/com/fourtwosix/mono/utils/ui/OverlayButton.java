package com.fourtwosix.mono.utils.ui;

import android.graphics.Bitmap;
import android.graphics.Matrix;
import android.os.Parcel;
import android.os.Parcelable;

/**
 * This class represents a web view overlay button.
 * Created by Eric on 2/18/14.
 */
public class OverlayButton implements Parcelable {
    private String itemId;
    private int imageId = -1;
    private String imagePath;
    private String text;
    private String type;
    private String javascriptCallback;

    //default xtype is widgettool
    private XTYPE xtype = XTYPE.widgettool;

    public enum XTYPE {
        button,
        widgettool
    }

    public enum ExtJsType {
        close,
        minimize,
        maximize,
        restore,
        gear,
        toggle,
        prev,
        next,
        pin,
        unpin,
        right,
        left,
        up,
        down,
        refresh,
        plus,
        minus,
        search,
        save,
        help,
        print,
        expand,
        collapse
    }

    public OverlayButton() {

    }

    public OverlayButton(Parcel in) {
        setItemId(in.readString());
        setImageId(in.readInt());
        setImagePath(in.readString());
        setText(in.readString());
        setXtype(XTYPE.values()[in.readInt()]);
        setType(in.readString());
        setJavascriptCallback(in.readString());
    }

    @Override
    public void writeToParcel(Parcel out, int flags) {
        out.writeString(getItemId());
        out.writeInt(getImageId());
        out.writeString(getImagePath());
        out.writeString(getText());
        out.writeInt(getXtype().ordinal());
        out.writeString(getType());
        out.writeString(getJavascriptCallback());
    }

    //parcelables need to have a "Creator" or else it will cause an exception
    public static final Parcelable.Creator<OverlayButton> CREATOR = new Parcelable.Creator<OverlayButton>() {
        public OverlayButton createFromParcel(Parcel in) {
            return new OverlayButton(in);
        }

        public OverlayButton[] newArray(int size) {
            return new OverlayButton[size];
        }
    };

    @Override
    public int describeContents(){
        return 0;
    }

    @Override
    public String toString() {
        return "OverlayButton[" + getItemId() + ":" + getImageId() + "," + getImagePath() + "]";
    }

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
    }

    public int getImageId() {
        return imageId;
    }

    public void setImageId(int imageId) {
        this.imageId = imageId;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public XTYPE getXtype() {
        return xtype;
    }

    public void setXtype(XTYPE xtype) {
        this.xtype = xtype;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getJavascriptCallback() {
        return javascriptCallback;
    }

    public void setJavascriptCallback(String javascriptCallback) {
        this.javascriptCallback = javascriptCallback;
    }

    /**
     * Gets the y position on the ExtJS icon sheet
     * Each icon is half the width of the image
     * @param name type of icon
     * @return y position on the icon sheet, -1 if value not found
     */
    public static int getIconIndex(String name) {
        for(int i = 0; i< ExtJsType.values().length; i++) {
            String value = ExtJsType.values()[i].toString();
            if(value.equals(name)) {
                return i;
            }
        }
        return -1;
    }

    /**
     *
     * @param iconSheet Bitmap of the icon sheet
     * @param type ExtJs type name
     * @param width Width of the resulting image
     * @param height Height of the resulting image
     * @return
     */
    public static Bitmap createIcon(Bitmap iconSheet, String type, int width, int height) {

        //this is necessary depending on what resolution the icon sheet is
        //for example the true width of the icon sheet is 96, but when put into drawable-hdpi
        //the width becomes 128
        int iconSize = iconSheet.getWidth() / 2;

        //create a matrix so that we can transform the resulting icon to desired height and width
        Matrix transformation = new Matrix();
        transformation.setScale((float)width / (float)iconSize, (float)height / (float)iconSize);

        //get the position of the icon by name in the sheet
        int yPosition = getIconIndex(type);

        //create the bitmap using the specifications given
        return Bitmap.createBitmap(iconSheet, 0, yPosition * iconSize, iconSize, iconSize, transformation, true);
    }

    @Override
    public boolean equals(Object object) {
        OverlayButton other = (OverlayButton)object;
        return this.getItemId().equals(other.getItemId());
    }
}
