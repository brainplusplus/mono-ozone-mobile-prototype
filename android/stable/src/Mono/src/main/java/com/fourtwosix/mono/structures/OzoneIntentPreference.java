package com.fourtwosix.mono.structures;

import com.fourtwosix.mono.data.models.IDataModel;

/**
 * This class represents an Ozone dashboard intent preference.
 * It is used in dashboards to represent which widget should receive an intent
 * Created by Eric on 2/4/14.
 */
public class OzoneIntentPreference implements IDataModel{
    private String dashboardGuid;
    private String sender;
    private String receiver;
    private String action;
    private String type;

    /**
     * Default constructor
     */
    public OzoneIntentPreference() {

    }

    /**
     * Gets the dashboard guid
     * @return guid of the dashboard for this preference
     */
    public String getDashboardGuid() {
        return dashboardGuid;
    }

    /**
     * Sets the dashboard guid for this preference
     * @param dashboardGuid guid representing the dashboard
     */
    public void setDashboardGuid(String dashboardGuid) {
        this.dashboardGuid = dashboardGuid;
    }

    /**
     * Gets the guid of the sender of the intent
     * @return guid representing the sender of the intent
     */
    public String getSender() {
        return sender;
    }

    /**
     * Sets the guid of the sender of the intent
     * @param sender guid representing the sender of the intent
     */
    public void setSender(String sender) {
        this.sender = sender;
    }

    /**
     * Gets the guid of the receiver of the intent
     * @return guid representing the receiver of the intent
     */
    public String getReceiver() {
        return receiver;
    }

    /**
     * Sets the guid of the receiver of the intent
     * @param receiver guid representing the receiver of the intent
     */
    public void setReceiver(String receiver) {
        this.receiver = receiver;
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
     * Gets the type of the preference
     * @return type of intent
     */
    public String getType() { return type; }

    /**
     * Sets the type of the preference
     * @param type type of intent
     */
    public void setType(String type) { this.type = type; }

    @Override
    public String toString() {
        return (getAction() != null && getType() != null) ? getAction() + " - " + getType() : "";
    }


    /**
     * Gets a composite key guid of multiple factors of the preference
     * @return String representing this preference
     */
    public String getGuid() {
        return getDashboardGuid() + "-" + getSender() + "-" + getReceiver() + "-" + getAction() + "-" + getType();
    }

    /**
     * Unsupported
     * @param guid
     */
    public void setGuid(String guid) {
        throw new UnsupportedOperationException("Cannot set intent preference guid");
    }

    /**
     * Unsupported
     * @return
     */
    public String getObjectDefinition() {
        throw new UnsupportedOperationException();
    }

    /**
     * Unsupported
     * @param objectDefinition
     */
    public void setObjectDefinition(String objectDefinition) {
        throw new UnsupportedOperationException();
    }

    /**
     * Merges two preferences
     * @param compare
     * @return
     */
    public IDataModel merge(IDataModel compare) {
        OzoneIntentPreference other = (OzoneIntentPreference)compare;
        this.receiver = other.getReceiver();
        return this;
    }

    /**
     * Unsupported
     * @param JSON
     * @return
     */
    public IDataModel fromJSON(String JSON){
        throw new UnsupportedOperationException();
    }

    /**
     * Unsupported
     * @return
     */
    public String toJSON() {
        throw new UnsupportedOperationException();
    }

    /**
     * Creates an OzoneIntentPreference from an intent
     * @param intent The intent being sent
     * @param dashboardGuid The current dashboard
     * @param receiver Widget instance ID receiving the intent
     * @return
     */
    public static OzoneIntentPreference createFromIntent(OzoneIntent intent, String dashboardGuid, String receiver) {
        OzoneIntentPreference preference = new OzoneIntentPreference();
        preference.setAction(intent.getAction());
        preference.setType(intent.getType());
        preference.setReceiver(receiver);
        preference.setDashboardGuid(dashboardGuid);
        return preference;
    }
}
