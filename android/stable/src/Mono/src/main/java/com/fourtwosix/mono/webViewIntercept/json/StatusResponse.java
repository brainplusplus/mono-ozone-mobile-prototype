package com.fourtwosix.mono.webViewIntercept.json;

import com.fourtwosix.mono.utils.LogManager;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.logging.Level;

/**
 * Status response.
 */
public class StatusResponse extends JSONResponse {
    private Status status;
    private String message;

    public StatusResponse() {
        status = Status.success;
        message = "";
    }

    /**
     * Constructor that takes a status.
     * @param status The status to set the object to.
     */
    public StatusResponse(Status status) {
        this.status = status;
        message = "";
    }

    /**
     * Constructor that takes a status and a message.
     * @param status The status to set the object to.
     */
    public StatusResponse(Status status, String message) {
        this.status = status;
        this.message = message;
    }

    /**
     * Sets the status for this object.
     * @param status Status of the resulting object.
     */
    public void setStatus(Status status) {
        this.status = status;
    }

    /**
     * Returns the status of this object.
     * @return The status of this object.
     */
    public Status getStatus() {
        return status;
    }

    /**
     * Sets the message of this object.
     * @param message The message of this object.
     */
    public void setMessage(String message) {
        this.message = message;
    }

    /**
     * Returns the message associated with this status response object.
     * @return The status response's message.
     */
    public String getMessage() {
        return message;
    }

    @Override
    public String toString() {
        JSONObject json = new JSONObject();

        try {
            json.put("status", status.toString());
            json.put("message", message);
        }
        catch(JSONException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
            return "{\"errorMessage\":\"Error making JSON output.\"}";
        }

        return json.toString();
    }
}
