package com.fourtwosix.mono.structures;

import android.os.Parcel;
import android.os.Parcelable;

import com.fourtwosix.mono.data.models.IDataModel;

import java.io.File;

/**
 * Created by Eric on 12/5/13.
 */
public class WidgetListItem implements Parcelable, Comparable<WidgetListItem>, IDataModel {
    private String smallIcon;
    private String largeIcon;
    private String title = "";
    private String description;
    private String url;
    private String guid;
    private String instanceId;
    private int mobileReady;
    private boolean appsMall = false;
    private WidgetSource widgetSource;
    private boolean installed = false;

    public WidgetListItem() {
    }

    public WidgetListItem(String title, String url, String smallIcon, String largeIcon, String path, boolean mobileReady) {
        this.title = title;
        this.setUrl(url);
        this.setSmallIcon(smallIcon);
        this.setLargeIcon(largeIcon);
        this.setGuid(path);
        this.setMobileReady(mobileReady);
    }

    public WidgetListItem(Parcel parcel) {
        this.title = parcel.readString();
        this.setUrl(parcel.readString());
        this.setSmallIcon(parcel.readString());
        this.setLargeIcon(parcel.readString());
        this.setDescription(parcel.readString());
        this.setGuid(parcel.readString());
        this.setInstanceId(parcel.readString());
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    @Override
    public int describeContents(){
        return 0;
    }

    /**
     * This method writes out the current object to a parcel.
     * This is necessary if you wish to retain all information from this object
     * when  you are sending it out.
     * @param out
     * @param flags
     */
    @Override
    public void writeToParcel(Parcel out, int flags) {
        out.writeString(this.title);
        out.writeString(this.getUrl());
        out.writeString(this.getSmallIcon());
        out.writeString(this.getLargeIcon());
        out.writeString(this.getDescription());
        out.writeString(this.getGuid());
        out.writeString(this.getInstanceId());
    }

    @Override
    public int compareTo(WidgetListItem item) {
        return title.compareToIgnoreCase(item.getTitle());
    }

    //parcelables need to have a "Creator" or else it will cause an exception
    public static final Parcelable.Creator<WidgetListItem> CREATOR = new Parcelable.Creator<WidgetListItem>() {
        public WidgetListItem createFromParcel(Parcel in) {
            return new WidgetListItem(in);
        }

        public WidgetListItem[] newArray(int size) {
            return new WidgetListItem[size];
        }
    };

    public String getSmallIcon() {
        return smallIcon;
    }
    public String getSmallIconFileName() {
        if(smallIcon == null)
            return null;
        File file = new File(smallIcon);
        return file.getName();
    }

    public void setSmallIcon(String smallIcon) {
        this.smallIcon = smallIcon;
    }

    public String getLargeIcon() {
        return largeIcon;
    }
    public String getLargeIconFileName() {
        if(largeIcon == null)
            return null;
        File file = new File(largeIcon);
        return file.getName();
    }

    public void setLargeIcon(String largeIcon) {
        this.largeIcon = largeIcon;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    @Override
    public String getGuid() {
        return this.guid;
    }

    @Override
    public void setGuid(String guid) {
        this.guid = guid;
    }

    @Override
    public String getObjectDefinition() {
        throw new UnsupportedOperationException();
    }

    @Override
    public void setObjectDefinition(String objectDefinition) {
        throw new UnsupportedOperationException();
    }

    @Override
    public IDataModel merge(IDataModel compare) {
        throw new UnsupportedOperationException();
    }

    @Override
    public WidgetListItem fromJSON(String JSON) {
        throw new UnsupportedOperationException();
    }

    @Override
    public String toJSON() {
        throw new UnsupportedOperationException();
    }

    public boolean getMobileReady() {
        return mobileReady == 1;
    }

    public void setMobileReady(boolean mobileReady) {
        this.mobileReady = mobileReady? 1:0;
    }

    public void setAppsMall(boolean aMall) {
        appsMall = aMall;
    }

    public boolean isAppsMall() {
        return appsMall;
    }

//    public void setAppsMallUrl(String appsMallUrl) {
//        this.appsMallUrl = appsMallUrl;
//    }
//    public String getAppsMallUrl()
//    {
//        return this.appsMallUrl;
//    }

    public WidgetSource getWidgetSource() {
        return widgetSource;
    }

    public void setWidgetSource(WidgetSource widgetSource) {
        this.widgetSource = widgetSource;
    }

    public String getInstanceId() {
        return instanceId;
    }

    public void setInstanceId(String instanceId) {
        this.instanceId = instanceId;
    }

    public WidgetListItem clone() {
        WidgetListItem cloneItem = new WidgetListItem();

        cloneItem.smallIcon = this.smallIcon;
        cloneItem.largeIcon = this.largeIcon;
        cloneItem.title = this.title;
        cloneItem.description = this.description;
        cloneItem.url = this.url;
        cloneItem.guid = this.guid;
        cloneItem.instanceId = this.instanceId;
        cloneItem.mobileReady = this.mobileReady;

        return cloneItem;
    }


    public void setInstalled(boolean installed) {
        this.installed = installed;
    }

    public boolean isInstalled() {
        return installed;
    }
    @Override
    public String toString() {
        return this.getTitle();
    }
}
