package com.fourtwosix.mono.data.models;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Date;

public class TrackingEntry {
    public int processed;
    public int total;
    public long startTime;
    public long endTime;

    public TrackingEntry(int processed, int total, long startTime, long endTime){
        this.processed = processed;
        this.total = total;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public Date getStartDate(){
        return new Date(startTime);
    }

    public int getRemaining(){
        return processed;
    }

    public int getCompletionPercent(){
        if(processed == 0) {
            return 0;
        }
        return (int)(((double)total - (double)processed)/(double)total * 100d);
    }

    public String toJSON(){
        int completionPercent = getCompletionPercent();

        String currentStatus = "running";
        if(completionPercent >= 100) {
            currentStatus = "complete";
        }
        else if(processed == 0) {
            currentStatus = "notRun";
        }

        JSONObject responseJson = new JSONObject();

        try {
            responseJson.put("startDate", getStartDate().toString());
            responseJson.put("processed", Integer.toString(processed));
            responseJson.put("remaining", Integer.toString(getRemaining()));
            responseJson.put("percentComplete", Integer.toString(completionPercent));
            responseJson.put("status", currentStatus);
        }
        catch(JSONException e) {
            return "{\"status\": \"complete\"}";
        }

        return responseJson.toString();
    }
}
