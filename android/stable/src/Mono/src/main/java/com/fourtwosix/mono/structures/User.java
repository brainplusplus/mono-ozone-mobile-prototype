package com.fourtwosix.mono.structures;

import android.os.Parcel;
import android.os.Parcelable;

/**
 * Created by Eric on 1/8/14.
 */
public class User implements Parcelable {

    private String userName;
    private String displayName;
    private String email;
    private String server;
    private int id;


    private WidgetListItem[] widgets;
    private String[] groupNames;

    public User() {
        widgets = new WidgetListItem[0];
        groupNames = new String[0];
    }

    public User(Parcel parcel) {
        userName = parcel.readString();
        displayName = parcel.readString();
        id = parcel.readInt();
        email = parcel.readString();
        server = parcel.readString();

        //read the parcelable array and convert to an WidgetListItemArray
        Parcelable[] parcelables = parcel.readParcelableArray(WidgetListItem.class.getClassLoader());
        widgets = new WidgetListItem[parcelables.length];
        for(int i = 0; i < parcelables.length; i++) {
            widgets[i] = (WidgetListItem)parcelables[i];
        }

        groupNames = parcel.createStringArray();
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
        out.writeString(userName);
        out.writeString(displayName);
        out.writeInt(id);
        out.writeString(email);
        out.writeString(server);
        out.writeParcelableArray(widgets, 0);
        out.writeStringArray(groupNames);
    }

    //parcelables need to have a "Creator" or else it will cause an exception
    public static final Parcelable.Creator<User> CREATOR = new Parcelable.Creator<User>() {
        public User createFromParcel(Parcel in) {
            return new User(in);
        }

        public User[] newArray(int size) {
            return new User[size];
        }
    };

    @Override
    public int describeContents(){
        return 0;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public WidgetListItem[] getWidgets() {
        return widgets;
    }

    public void setWidgets(WidgetListItem[] widgets) {
        this.widgets = widgets;
    }

    public String[] getGroupNames() {
        return groupNames;
    }

    public void setGroupNames(String[] groupNames) {
        this.groupNames = groupNames;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getServer() {
        return server;
    }

    public void setServer(String server) {
        this.server = server;
    }
}
