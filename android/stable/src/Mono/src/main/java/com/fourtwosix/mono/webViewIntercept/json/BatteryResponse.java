package com.fourtwosix.mono.webViewIntercept.json;

import com.fourtwosix.mono.utils.LogManager;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.logging.Level;

/**
 * All of the possible responses from the BatteryWebViewAPI.
 */
public class BatteryResponse {
    public enum BatteryState {
        discharging, charging, charged
    }

    /**
     * Returns all info for the battery in a response.
     */
    public static class AllInfo extends StatusResponse {
        private double batteryLevel;
        private BatteryState batteryState;

        /**
         * Consturctor.
         * @param status Initial status.
         * @param batteryLevel The batteryLevel to set.
         * @param batteryState The batteryState to set.
         */
        public AllInfo(Status status, double batteryLevel, BatteryState batteryState) {
            super(status);
            this.batteryLevel = batteryLevel;
            this.batteryState = batteryState;
        }

        /**
         * Sets the batteryLevel.
         * @param batteryLevel The batteryLevel to set.
         */
        public void setBatteryLevel(double batteryLevel) {
            this.batteryLevel = batteryLevel;
        }

        /**
         * Gets the batteryLevel.
         * @return The batteryLevel.
         */
        public double getBatteryLevel() {
            return batteryLevel;
        }

        /**
         * Sets the batteryState.
         * @param batteryState The batteryState to set.
         */
        public void setBatteryState(BatteryState batteryState) {
            this.batteryState = batteryState;
        }

        /**
         * Gets the batteryState.
         * @return The batteryState.
         */
        public BatteryState getBatteryState() {
            return batteryState;
        }

        @Override
        public String toString() {
            JSONObject json = new JSONObject();

            try {
                json.put("status", getStatus().toString());
                json.put("batteryLevel", Double.toString(batteryLevel));
                json.put("batteryState", batteryState.toString());
            }
            catch(JSONException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
                return "{\"errorMessage\":\"Error making JSON output.\"}";
            }

            return json.toString();
        }
    }

    /**
     * A battery percentage response.
     */
    public static class Percentage extends StatusResponse {
        private double batteryLevel;

        /**
         * Constructor.
         * @param status Initial status.
         * @param batteryLevel The batteryLevel to set.
         */
        public Percentage(Status status, double batteryLevel) {
            super(status);
            this.batteryLevel = batteryLevel;
        }

        /**
         * Sets the batteryLevel.
         * @param batteryLevel The batteryLevel to set.
         */
        public void setBatteryLevel(double batteryLevel) {
            this.batteryLevel = batteryLevel;
        }

        /**
         * Gets the batteryLevel.
         * @return The batteryLevel.
         */
        public double getBatteryLevel() {
            return batteryLevel;
        }

        @Override
        public String toString() {
            JSONObject json = new JSONObject();

            try {
                json.put("status", getStatus().toString());
                json.put("batteryLevel", Double.toString(batteryLevel));
            }
            catch(JSONException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
                return "{\"errorMessage\":\"Error making JSON output.\"}";
            }

            return json.toString();
        }
    }

    /**
     * A charging state response.
     */
    public static class ChargingState extends StatusResponse {
        private BatteryState batteryState;

        /**
         * Constructor.
         * @param status Initial status.
         * @param batteryState The batteryState to set.
         */
        public ChargingState(Status status, BatteryState batteryState) {
            super(status);
            this.batteryState = batteryState;
        }

        /**
         * Sets the batteryState.
         * @param batteryState The batteryState to set.
         */
        public void setBatteryState(BatteryState batteryState) {
            this.batteryState = batteryState;
        }

        /**
         * Gets the batteryState.
         * @return The batteryState.
         */
        public BatteryState getBatteryState() {
            return batteryState;
        }

        @Override
        public String toString() {
            JSONObject json = new JSONObject();

            try {
                json.put("status", getStatus().toString());
                json.put("batteryState", batteryState.toString());
            }
            catch(JSONException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
                return "{\"errorMessage\":\"Error making JSON output.\"}";
            }

            return json.toString();
        }
    }
}
