package com.fourtwosix.mono.tests.webViewIntercept.json;

import com.fourtwosix.mono.webViewIntercept.json.BatteryResponse;
import com.fourtwosix.mono.webViewIntercept.json.StatusResponse;
import com.fourtwosix.mono.webViewIntercept.json.Status;
import junit.framework.TestCase;
import org.json.JSONObject;

import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * JsonResponse unit tests.
 */
public class JsonResponseTestCase extends TestCase {
    private static Logger log = Logger.getLogger(JsonResponseTestCase.class.getName());

    public void testStatusResponse() {
        try {
            JSONObject expectedStatus = new JSONObject();
            expectedStatus.put("status", "success");

            StatusResponse jsonObject = new StatusResponse(Status.success);

            assert(expectedStatus.equals(new JSONObject(jsonObject.toString())));
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error during test.", e);
        }
    }

    public void testBatteryPercentage() {
        try {
            JSONObject expectedPercentage = new JSONObject();
            expectedPercentage.put("status", "success");
            expectedPercentage.put("batteryLevel", "34.0");

            BatteryResponse.Percentage jsonObject = new BatteryResponse.Percentage(Status.success, 34);

            assert(expectedPercentage.equals(new JSONObject(jsonObject.toString())));
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error during test.", e);
        }
    }

    public void testBatteryState() {
        try {
            JSONObject expectedState = new JSONObject();
            expectedState.put("status", "success");
            expectedState.put("batteryState", "charged");

            BatteryResponse.ChargingState jsonObject = new BatteryResponse.ChargingState(Status.success, BatteryResponse.BatteryState.charged);

            assert(expectedState.equals(new JSONObject(jsonObject.toString())));
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error during test.", e);
        }
    }

    public void testBatteryAllInfo() {
        try {
            JSONObject expectedAllInfo = new JSONObject();
            expectedAllInfo.put("status", "success");
            expectedAllInfo.put("batteryLevel", "34.0");
            expectedAllInfo.put("batteryState", "charged");

            BatteryResponse.AllInfo jsonObject = new BatteryResponse.AllInfo(Status.success, 34, BatteryResponse.BatteryState.charged);

            assert(expectedAllInfo.equals(new JSONObject(jsonObject.toString())));
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error during test.", e);
        }
    }
}
