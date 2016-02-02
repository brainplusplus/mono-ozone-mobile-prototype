package com.fourtwosix.mono.webViewIntercept.json;

import com.fourtwosix.mono.utils.LogManager;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Date;
import java.util.logging.Level;

/**
 * All the possible responses from the CacheWebViewAPI
 */
public class CacheResponse {
     /**
     * Returns a status message and cache Id.
     */
    public static class InitResponse extends StatusResponse {
        private int cacheId;

        public InitResponse(Status status, int dataId) {
            super(status);
            this.cacheId = dataId;
        }

        public void setCacheId(int cacheId) {
            this.cacheId = cacheId;
        }

        public int getCacheId() {
            return cacheId;
        }

        @Override
        public String toString() {
            JSONObject json = new JSONObject();

            try {
                json.put("status", getStatus().toString());
                json.put("cacheId", cacheId);
            }
            catch(JSONException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
                return "{\"errorMessage\":\"Error making JSON output.\"}";
            }

            return json.toString();
        }
    }

    /**
     * Returns a status message and cache Id.
     */
    public static class ExpirationResponse extends StatusResponse {
        private String url;
        private boolean timedOut;
        private long timeOut;
        private boolean expired;
        private long expiredTime;

        public ExpirationResponse(Status status, String url, boolean timedOut, long timeOut, boolean expired, long expiredTime) {
            super(status);
            this.timedOut = timedOut;
            this.timeOut = timeOut;
            this.expired = expired;
            this.expiredTime = expiredTime;
            this.url = url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public void setTimedOut(boolean timedOut) { this.timedOut = timedOut; }

        public void setTimeOut(long timeOut) { this.timeOut = timeOut; }

        public void setExpired(boolean expired) { this.expired= expired; }

        public void setExpiredTime(long expiredTime) {
            this.expiredTime= expiredTime;
        }

        public String getUrl() {
            return url;
        }

        public boolean getTimedOut() { return timedOut; }

        public long getTimeOut() { return timeOut; }

        public boolean getExpired() {
            return expired;
        }

        public long getExpiredTime() { return expiredTime; }

        @Override
        public String toString() {
            JSONObject json = new JSONObject();

            try {
                json.put("status", getStatus().toString());
                json.put("url", url);
                json.put("timedOut", timedOut);
                json.put("timeout", timeOut);
                json.put("timeoutDate", new Date(timeOut));
                json.put("expired", expired);
                json.put("expiration", expiredTime);
                json.put("expirationDate", new Date(expiredTime));
            }
            catch(JSONException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
                return "{\"errorMessage\":\"Error making JSON output.\"}";
            }

            return json.toString();
        }
    }

    /**
     * Returns a status message and data Id.
     */
    public static class StoreResponse extends StatusResponse {
        private int dataId;

        public StoreResponse(Status status, int dataId) {
            super(status);
            this.dataId = dataId;
        }

        public void setDataId(int dataId) {
            this.dataId = dataId;
        }

        public int getDataId() {
            return dataId;
        }

        @Override
        public String toString() {
            JSONObject json = new JSONObject();

            try {
                json.put("status", getStatus().toString());
                json.put("cacheId", dataId);
            }
            catch(JSONException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
                return "{\"errorMessage\":\"Error making JSON output.\"}";
            }

            return json.toString();
        }
    }

    /**
     * Returns a status message and the raw data from the URL called.
     */
    public static class GetDataFromUrlResponse extends StatusResponse {
        private String data;

        public GetDataFromUrlResponse(Status status, String data) {
            super(status);
            this.data = data;
        }

        public void setDataObject(String data) {
            this.data  = data;
        }

        public String getData() {
            return data;
        }

        @Override
        public String toString() {
            JSONObject json = new JSONObject();

            try {
                json.put("status", getStatus().toString());
                json.put("data", data);
            }
            catch(JSONException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
                return "{\"errorMessage\":\"Error making JSON output.\"}";
            }

            return json.toString();
        }
    }
}
