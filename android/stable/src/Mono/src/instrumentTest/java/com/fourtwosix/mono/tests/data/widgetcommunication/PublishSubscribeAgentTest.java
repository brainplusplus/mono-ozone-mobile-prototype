package com.fourtwosix.mono.tests.data.widgetcommunication;

import com.fourtwosix.mono.data.widgetcommunication.interfaces.Callback;
import com.fourtwosix.mono.data.widgetcommunication.PublishSubscribeAgent;
import com.fourtwosix.mono.utils.LogManager;
import junit.framework.TestCase;

import java.util.logging.Level;

/**
 * Unit tests for the PublishSubscribeAgent framework.
 */
public class PublishSubscribeAgentTest extends TestCase {
    private class PubSubTestCallback implements Callback {
        private String output = null;
        private String id;

        public PubSubTestCallback() {
            id = "testId";
        }

        public PubSubTestCallback(String id) {
            this.id = id;
        }

        @Override
        public String getId() {
            return id;
        }

        @Override
        public void run(String data) {
            LogManager.log(Level.INFO, "Subscription working!");
            LogManager.log(Level.INFO, "Data: " + data);
            output = data;
        }

        @Override
        public String getOutput() {
            return output;
        }
    }

    public void testPubSub() {
        try {
            PublishSubscribeAgent pubsub = new PublishSubscribeAgent();

            Callback testCallback = new PubSubTestCallback();

            pubsub.subscribe("testChannel", testCallback);

            pubsub.publish("testChannel", "testing1");

            assertEquals("testing1", getOutputFromCallback(testCallback));
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Error during testPubSub.", e);
            fail();
        }
    }

    public void testPubSubMultiChannel() {
        try {
            PublishSubscribeAgent pubsub = new PublishSubscribeAgent();

            Callback testCallback = new PubSubTestCallback();
            Callback testCallback2 = new PubSubTestCallback();

            pubsub.subscribe("testChannel", testCallback);

            pubsub.publish("testChannel", "testing1");

            assertEquals("testing1", getOutputFromCallback(testCallback));
            assertNull(testCallback2.getOutput());
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Error during testPubSub.", e);
            fail();
        }
    }

    public void testPubSubExpiration() {
        try {
            int timeToSleep = 6;
            PublishSubscribeAgent pubsub = new PublishSubscribeAgent();

            Callback testCallback = new PubSubTestCallback();
            Callback testCallback2 = new PubSubTestCallback();

            pubsub.setSubcriptionAgeOff(5);
            pubsub.setSubscriptionCleanupRate(5);

            pubsub.subscribe("expirationChannel", testCallback);

            assertEquals(1, pubsub.getNumSubscribers("expirationChannel"));

            LogManager.log(Level.INFO, "Sleeping for " + timeToSleep + " seconds!");
            Thread.sleep(timeToSleep * 1000);
            assertEquals(0, pubsub.getNumSubscribers("expirationChannel"));

            // Subscribe another entry which we don't want to expire
            pubsub.subscribe("expirationChannel", testCallback2);
            assertEquals(1, pubsub.getNumSubscribers("expirationChannel"));

            for(int i=0; i<10; i++) {
                Thread.sleep(1000);
                pubsub.publish("expirationChannel", "testing");
            }

            assertEquals(1, pubsub.getNumSubscribers("expirationChannel"));
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Error during testPubSub.", e);
            fail();
        }
    }

    public void testPubSubUnsubscribe() {
        try {
            int timeToSleep = 6;
            PublishSubscribeAgent pubsub = new PublishSubscribeAgent();

            Callback testCallback = new PubSubTestCallback("testId1");
            Callback testCallback2 = new PubSubTestCallback("testId2");

            pubsub.subscribe("unsubscribeChannel", testCallback);
            pubsub.subscribe("unsubscribeChannel", testCallback2);

            assertEquals(2, pubsub.getNumSubscribers("unsubscribeChannel"));

            pubsub.unsubscribe("unsubscribeChannel", "testId1");
            pubsub.unsubscribe("unsubscribeChannel", "testId2");

            assertEquals(0, pubsub.getNumSubscribers("unsubscribeChannel"));
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Error during testPubSub.", e);
            fail();
        }
    }

    private String getOutputFromCallback(Callback callback) throws InterruptedException {
        long startTime = System.currentTimeMillis();
        while(callback.getOutput() == null) {
            if(System.currentTimeMillis() - startTime > 60000) {
                break;
            }
            Thread.sleep(500);
        }

        if(callback.getOutput() == null) {
            fail();
        }
        else
        {
            LogManager.log(Level.INFO, "Received info back from callback!");
        }

        return callback.getOutput();
    }
}
