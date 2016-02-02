package com.fourtwosix.mono.tests.data.widgetcommunication;

import com.fourtwosix.mono.data.widgetcommunication.IntentProcessor;
import com.fourtwosix.mono.data.widgetcommunication.interfaces.Intent;
import com.fourtwosix.mono.data.widgetcommunication.IntentAgent;
import com.fourtwosix.mono.data.widgetcommunication.interfaces.IntentStartActivity;
import com.fourtwosix.mono.utils.LogManager;
import junit.framework.TestCase;
import org.apache.commons.lang.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;
import java.util.logging.Level;

/**
 * Unit tests for the IntentAgent framework.
 */
public class IntentAgentTest extends TestCase {
    private class IntentAgentIntent extends Intent {
        private String output = null;

        @Override
        public void run(JSONObject sender, JSONObject intent, JSONObject data) {
            LogManager.log(Level.INFO, "Intent working!");
            LogManager.log(Level.INFO, "Sender: " + sender);
            LogManager.log(Level.INFO, "Intent: " + intent);
            LogManager.log(Level.INFO, "Data: " + data);

            try {
                output = sender.getString("id") + "," + intent + "," + data;
                setHasRun(true);
            }
            catch(JSONException e) {
                LogManager.log(Level.SEVERE, "Error during Intent Agent Intent run!", e);
                setHasRun(false);
                fail();
            }
        }

        @Override
        public String getOutput() {
            return output;
        }
    }

    private class IntentAgentStartActivity implements IntentStartActivity {
        private String output = null;

        @Override
        public void run(List<String> dest) {
            String successfulWidgets = StringUtils.join(dest, ",");
            LogManager.log(Level.INFO, "Start activity callback!");
            LogManager.log(Level.INFO, "Successful widgets: " + successfulWidgets);
            output = successfulWidgets;
        }

        @Override
        public String getOutput() {
            return output;
        }
    }

    public void testIntent() {
        try {
            IntentProcessor intentAgent = new IntentProcessor(null);

            // Send regular intent
            IntentAgentIntent iai = new IntentAgentIntent();
            IntentStartActivity saIntent = new IntentAgentStartActivity();

            intentAgent.receive("TEST-receiver", "1", new JSONObject().put("action", "test").put("dataType", "data/type"), iai);

            intentAgent.startActivity("TEST-sender", null, new JSONObject().put("action", "test").put("dataType", "data/type"), new JSONObject().put("data", "some-data"), saIntent);

            String regIntent = "TEST-sender" + "," + new JSONObject().put("action", "test").put("dataType", "data/type") + "," + new JSONObject().put("data", "some-data");
            assertEquals(regIntent, getOutputFromIntent(iai));
            assertEquals("TEST-receiver", getOutputFromSAIntent(saIntent));

            // Send out intent that should not return
            IntentAgentIntent iai2 = new IntentAgentIntent();
            IntentStartActivity saIntent2 = new IntentAgentStartActivity();

            intentAgent.receive("TEST-receiver2", "1", new JSONObject().put("action", "test").put("dataType", "data/type"), iai2);

            intentAgent.startActivity("TEST-sender2", null, new JSONObject().put("action", "not-test").put("dataType", "data/type"), new JSONObject().put("data", "some-data"), saIntent2);

            assertEquals(null, getOutputFromIntent(iai2));
            assertEquals(null, getOutputFromSAIntent(saIntent2));

            // Send out another intent that should not return
            IntentAgentIntent iai3 = new IntentAgentIntent();
            IntentStartActivity saIntent3 = new IntentAgentStartActivity();

            intentAgent.receive("TEST-receiver2", "1", new JSONObject().put("action", "test").put("dataType", "data/type"), iai3);

            intentAgent.startActivity("TEST-sender2", null, new JSONObject().put("action", "test").put("dataType", "another/data.type"), new JSONObject().put("data", "some-data"), saIntent3);

            assertEquals(null, getOutputFromIntent(iai2));
            assertEquals(null, getOutputFromSAIntent(saIntent2));
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Error during testIntent.", e);
            fail();
        }
    }

    public void testMultiIntent() {
        try {
            IntentAgent intentAgent = new IntentAgent(null);

            // Send regular intent
            IntentAgentIntent iai = new IntentAgentIntent();
            IntentAgentIntent iai2 = new IntentAgentIntent();
            IntentAgentIntent iai3 = new IntentAgentIntent();
            IntentAgentIntent iai4 = new IntentAgentIntent();
            IntentStartActivity saIntent = new IntentAgentStartActivity();

            intentAgent.receive("MULTITEST-receiver1", "1", new JSONObject().put("action", "multi-test").put("dataType", "data/type"), iai);
            intentAgent.receive("MULTITEST-receiver2", "1", new JSONObject().put("action", "multi-test").put("dataType", "data/type"), iai2);
            intentAgent.receive("MULTITEST-receiver3", "1", new JSONObject().put("action", "multi-not-test").put("dataType", "data/type"), iai3);
            intentAgent.receive("MULTITEST-receiver4", "1", new JSONObject().put("action", "multi-test").put("dataType", "data/type"), iai4);

            intentAgent.startActivity("MULTITEST-sender", null, new JSONObject().put("action", "multi-test").put("dataType", "data/type"), new JSONObject().put("data", "some-data"), saIntent);

            String regIntent = "MULTITEST-sender" + "," + new JSONObject().put("action", "multi-test").put("dataType", "data/type") + "," + new JSONObject().put("data", "some-data");
            assertEquals(regIntent, getOutputFromIntent(iai));
            String saOutput = getOutputFromSAIntent(saIntent);
            assert(saOutput.contains("MULTITEST-receiver1"));
            assert(saOutput.contains("MULTITEST-receiver2"));
            assertFalse(saOutput.contains("MULTITEST-receiver3"));
            assert(saOutput.contains("MULTITEST-receiver4"));
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Error during testMultiIntent.", e);
            fail();
        }
    }

    private String getOutputFromIntent(Intent intent) throws InterruptedException {
        long startTime = System.currentTimeMillis();
        while(intent.getOutput() == null) {
            if(System.currentTimeMillis() - startTime > 5000) {
                break;
            }
            Thread.sleep(500);
        }

        return intent.getOutput();
    }

    private String getOutputFromSAIntent(IntentStartActivity saIntent) throws InterruptedException {
        long startTime = System.currentTimeMillis();
        while(saIntent.getOutput() == null) {
            if(System.currentTimeMillis() - startTime > 5000) {
                break;
            }
            Thread.sleep(500);
        }

        return saIntent.getOutput();
    }
}
