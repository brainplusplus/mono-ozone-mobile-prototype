package com.fourtwosix.mono.structures;

import android.os.Parcel;
import android.os.Parcelable;

import com.fourtwosix.mono.data.models.IDataModel;
import com.fourtwosix.mono.utils.LogManager;

import org.json.JSONObject;

import java.util.logging.Level;

/**
 * This class represents an Ozone intent. It contains properties needed to implement intents.
 * Created by Eric on 2/4/14.
 */
public class OzoneIntent implements Parcelable, IDataModel {
    //widget specific variables
    private String guid;
    private String action;
    private String type;
    private int direction; //0 equals in, 1 equals out
    private String defaultReceiver;

    private String intent;
    private JSONObject data;
    private String javascriptCallback;

    /**
     * Enum representing which direction the intent is going.
     */
    public enum IntentDirection {RECEIVE, SEND}

    /**
     * Default constructor
     */
    public OzoneIntent() {

    }

    /**
     * Constructor for parcelable interface
     * @param in Parcel containing the OzoneIntent
     */
    public OzoneIntent(Parcel in) {
        setGuid(in.readString());
        setAction(in.readString());
        setType(in.readString());
        setDirection(in.readInt());
        setDefaultReceiver(in.readString());
        setIntent(in.readString());

        try {
            data = new JSONObject(in.readString());
        } catch (Exception e) {
            LogManager.log(Level.SEVERE, "Unable to unparcel OzoneIntent data: " + e.getMessage());
        }

        setJavascriptCallback(in.readString());
    }

    /**
     * Writes the current OzoneIntent to a parcel
     * @param out The parcel to write this object to
     * @param flags
     */
    @Override
    public void writeToParcel(Parcel out, int flags) {
        out.writeString(getGuid());
        out.writeString(getAction());
        out.writeString(getType());
        out.writeInt(getDirection());
        out.writeString(getDefaultReceiver());
        out.writeString(getIntent());
        out.writeString(getData().toString());
        out.writeString(getJavascriptCallback());
    }

    //parcelables need to have a "Creator" or else it will cause an exception
    public static final Parcelable.Creator<OzoneIntent> CREATOR = new Parcelable.Creator<OzoneIntent>() {
        public OzoneIntent createFromParcel(Parcel in) {
            return new OzoneIntent(in);
        }

        public OzoneIntent[] newArray(int size) {
            return new OzoneIntent[size];
        }
    };

    @Override
    public int describeContents(){
        return 0;
    }

    /**
     * Gets the guid of the sending widget
     * @return guid of the sending widget.
     */
    public String getGuid() {
        return guid;
    }

    /**
     * Sets the guid of the sending widget
     * @param guid GUID of the sending widget
     */
    public void setGuid(String guid) {
        this.guid = guid;
    }

    /**
     * Gets the action of the intent
     * @return action of the intent
     */
    public String getAction() {
        return action;
    }

    /**
     * Sets the action of the intent
     * @param action action of the intent
     */
    public void setAction(String action) {
        this.action = action;
    }

    /**
     * Gets the type of the intent
     * @return the type of the intent
     */
    public String getType() {
        return type;
    }

    /**
     * Sets the type of the intent
     * @param type type of the intent
     */
    public void setType(String type) {
        this.type = type;
    }

    public IntentDirection getIntentDirection() {
        return IntentDirection.values()[direction];
    }

    /**
     * Gets the direction of intent
     * @return integer representation of the intent direction, 0 equals receive, 1 equals send
     */
    public int getDirection() {
        return direction;
    }

    /**
     * Sets the direction based off the enum IntentDirection
     * @param direction direction of the intent
     */
    public void setDirection(IntentDirection direction) {
        setDirection(direction.ordinal());
    }

    /**
     * Sets the direction
     * @param direction 0 equals receive, 1 equals send
     */
    private void setDirection(int direction)
    {
        if(direction <0 || direction > 1) {
            this.direction = 0;
        } else {
            this.direction = direction;
        }
    }

    /**
     * Gets the data of the intent
     * @return JSONObject of the intent data
     */
    public JSONObject getData() {
        return data;
    }

    /**
     * Sets the data of the intent
     * @param data JSONObject of the intent data
     */
    public void setData(JSONObject data) {
        this.data = data;
    }

    /**
     * Gets the default receiver
     * @return GUID of the default receiver
     */
    public String getDefaultReceiver() {
        return defaultReceiver;
    }

    /**
     * Sets the default receiver
     * @param defaultReceiver GUID of the default receiver
     */
    public void setDefaultReceiver(String defaultReceiver) {
        this.defaultReceiver = defaultReceiver;
    }

    /**
     * Gets the string representation of the intent
     * @return string representation of the intent
     */
    public String getIntent() {
        return intent;
    }

    /**
     * Sets the string representation of the intent
     * @param intent string representation of the intent
     */
    public void setIntent(String intent) {
        this.intent = intent;

    }

    /**
     * Gets the javascript callback
     * @return string representation of the javascript callback
     */
    public String getJavascriptCallback() {
        return javascriptCallback;
    }

    /**
     * Sets the javascript callback
     * @param javascriptCallback String representation of the javascript callback
     */
    public void setJavascriptCallback(String javascriptCallback) {
        this.javascriptCallback = javascriptCallback;
    }

    /**
     * Unsupported
     * @return
     */
    @Override
    public String getObjectDefinition() {
        throw new UnsupportedOperationException();
    }

    /**
     * Unsupported
     * @return
     */
    @Override
    public void setObjectDefinition(String objectDefinition) {
        throw new UnsupportedOperationException();
    }

    @Override
    public IDataModel merge(IDataModel compare) {
        OzoneIntent intent = (OzoneIntent)compare;
        this.guid = intent.getGuid();
        this.action = intent.getAction();
        this.type = intent.getType();
        this.direction = intent.getDirection();
        //do not overwrite the default receiver as that could have been overwritten/cleared
        return this;
    }

    /**
     * Unsupported
     * @return
     */
    @Override
    public OzoneIntent fromJSON(String JSON) {
        throw new UnsupportedOperationException();
    }

    /**
     * Unsupported
     * @return
     */
    @Override
    public String toJSON() {
        throw new UnsupportedOperationException();
    }
}
