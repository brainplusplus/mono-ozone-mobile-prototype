package com.fourtwosix.mono.data.widgetcommunication;

import com.fourtwosix.mono.data.widgetcommunication.interfaces.Callback;
import com.fourtwosix.mono.utils.LogManager;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Vector;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;

/**
 * The publish subscribe agent class will allow widgets to publish or subscribe to one another.
 */
public class PublishSubscribeAgent {
    // Some constants
    private int MAX_NUM_PUBSUB_THREADS = 20;
    private long MAX_CALLBACK_WAIT_TIME = 10; // In seconds, the maximum amount of time to wait for all publish threads to complete
    private long SUBSCRIPTION_CLEANUP_RATE = 60; // In seconds, the number of seconds between subscription cleanup tasks
    private long SUBSCRIPTION_AGE_OFF = 600; // In seconds, how old a subscription can be with no runs before it's aged off

    // ExecutorServices for running threads
    private ExecutorService executorService;
    private ScheduledExecutorService scheduledExecutorService;

    Map<String, String> pubsubChannels;
    Map<String, Vector<CallbackWithMetadata>> wcCallbacks;

    ScheduledFuture subscriptionCleanupFuture;

    /**
     * Default constructor.
     */
    public PublishSubscribeAgent() {
        // Initialize the pubsubChannels nad executorService
        pubsubChannels = new HashMap<String, String>();
        wcCallbacks = new HashMap<String, Vector<CallbackWithMetadata>>();
        executorService = Executors.newFixedThreadPool(MAX_NUM_PUBSUB_THREADS);
        scheduledExecutorService = Executors.newSingleThreadScheduledExecutor();

        // Start the subscribe cleanup thread
        subscriptionCleanupFuture = scheduledExecutorService.scheduleAtFixedRate(new SubscribeCleanup(), SUBSCRIPTION_CLEANUP_RATE, SUBSCRIPTION_CLEANUP_RATE, TimeUnit.SECONDS);

        Runtime.getRuntime().addShutdownHook(new ExecutorCleanupThread());
    }

    /**
     * Make sure the agent cleans up after itself.
     */
    public void finalize() {
        executorService.shutdownNow();
        scheduledExecutorService.shutdownNow();
    }

    /**
     * Publishes a message to the specified channel and triggers the callbacks.
     * @param channelName The channel to publish to.
     * @param data The data to publish.
     */
    public void publish(String channelName, String data) {
        pubsubChannels.put(channelName, data);

        if(wcCallbacks.containsKey(channelName)) {
            runCallbacks(channelName);
        }
    }

    /**
     * Sets up a callback to be called when a publishing event occurs.
     * @param channelName The channel to subscribe to.
     * @param callback The callback to execute when a publishing event occurs.
     */
    public synchronized void subscribe(String channelName, Callback callback) {
        // Add the callback list if necessary
        if(wcCallbacks.containsKey(channelName) == false) {
            addCallbackList(channelName);
        }

        int numCallbacks = wcCallbacks.get(channelName).size();
        for(int i=0; i<numCallbacks; i++) {
            if(wcCallbacks.get(channelName).get(i).callback.getId().equals(callback.getId())) {
                LogManager.log(Level.INFO, "This ID is already subscribed to this channel.  Replacing this callback.");
                wcCallbacks.get(channelName).remove(i);
            }
        }

        wcCallbacks.get(channelName).add(new CallbackWithMetadata(callback));
    }

    /**
     * Unsubscribes a callback from the channel.
     * @param channelName The channel name to unsubscribe from.
     * @param callbackId The callbackId of the callback to unsubscribe.
     */
    public synchronized void unsubscribe(String channelName, String callbackId) {
        if(wcCallbacks.containsKey(channelName)) {
            Vector<CallbackWithMetadata> cwms = wcCallbacks.get(channelName);
            int numSubscriptions = cwms.size();
            for(int i=numSubscriptions-1; i>=0; i--) {
                CallbackWithMetadata cwm = cwms.get(i);
                if(cwm.callback.getId().equals(callbackId)) {
                    wcCallbacks.get(channelName).remove(i);
                }
            }
        }
    }

    /**
     * Gets the number of subscribers currently subscribed to a channel.
     * @param channelName The channel to get the number of subscriptions from.
     * @return The number of subscriptions in the specified channel.
     */
    public int getNumSubscribers(String channelName) {
        return (wcCallbacks.containsKey(channelName) ? wcCallbacks.get(channelName).size() : 0);
    }

    /**
     * Sets the max number of threads used by PublishSubscribeAgent.
     * @param maxNumberPubSubThreads The max number of threads.
     */
    public void setMaxNumPubsubThreads(int maxNumberPubSubThreads) {
        MAX_NUM_PUBSUB_THREADS = maxNumberPubSubThreads;
    }

    /**
     * Sets the max amount of time PublishSubscribeAgent will spend waiting for all callbacks to execute for a channel..
     * @param maxCallbackWaitTime The max wait time for all callbacks to return.
     */
    public void setMaxCallbackWaitTime(int maxCallbackWaitTime) {
        MAX_CALLBACK_WAIT_TIME = maxCallbackWaitTime;
    }

    /**
     * Sets the amount of time, in seconds, between runs of the subscription cleanup/expiration.
     * @param subscriptionCleanupRate The number of seconds between when subscription cleans.
     */
    public void setSubscriptionCleanupRate(int subscriptionCleanupRate) {
        SUBSCRIPTION_CLEANUP_RATE = subscriptionCleanupRate;
        subscriptionCleanupFuture.cancel(true);
        // Start the subscribe cleanup thread
        subscriptionCleanupFuture = scheduledExecutorService.scheduleAtFixedRate(newSubscribeCleanup(), subscriptionCleanupRate, subscriptionCleanupRate, TimeUnit.SECONDS);
    }

    /**
     * Sets the maximum age, in seconds, that a subscription will be kept without having been run.
     * @param subcriptionAgeOff The maximum age of a subscription.
     */
    public void setSubcriptionAgeOff(int subcriptionAgeOff) {
        SUBSCRIPTION_AGE_OFF = subcriptionAgeOff;
    }

    // Runs all of our callback in a Thread pool.  Returns immediately
    private void runCallbacks(String channelName) {
        executorService.execute(new CallbackRunner(channelName));
    }

    // Adds a callback vector to the callback map if necessary.
    // Synchronized to avoid overwriting an old callback vector.
    private synchronized void addCallbackList(String channelName) {
        if(wcCallbacks.containsKey(channelName) == false) {
            // Using vectors for the callback list because they're synchronized
            wcCallbacks.put(channelName, new Vector<CallbackWithMetadata>());
        }
    }


    private SubscribeCleanup newSubscribeCleanup() {
        return new SubscribeCleanup();
    }

    // A callback with lastRun information.  Used to expire callbacks after they have not been used for an extended
    // period of time.
    private class CallbackWithMetadata {
        public Callback callback;
        public long lastRun;

        public CallbackWithMetadata(Callback callback) {
            this.callback = callback;
            this.lastRun = System.currentTimeMillis(); // Current time to prevent immediate expiration
        }
    }

    // A callable interface to running callbacks.  All these do is run a callback and return.
    private class CallbackCallable implements Callable<Void> {
        private Callback callback;
        private String data;

        // Constructor takes a callback and the data to push to the callback.
        public CallbackCallable(Callback callback, String data) {
            this.callback = callback;
            this.data = data;
        }

        // Our call function.  Returns nothing.
        public Void call() {
            callback.run(data);

            return null;
        }
    }

    // A runnable class that runs all of our callbacks for us.
    private class CallbackRunner implements Runnable {
        private String channelName;

        // Constructor that takes a channelName.  Runs all callbacks subscribed to the channel.
        public CallbackRunner(String channelName) {
            this.channelName = channelName;
        }

        // Our run function.  Runs all of the callbacks with the initialized channelName.
        public void run() {
            // Get a list of callbacks and our data at the start.  This way, if it changes during the run,
            // we'll still publish our old copies.
            List<CallbackWithMetadata> cwms = wcCallbacks.get(channelName);
            String data = pubsubChannels.get(channelName);

            // A list of callables for our thread pool to run.
            List<CallbackCallable> callbackRunnables = new ArrayList<CallbackCallable>();

            // Wrap our callbacks in a callbackcallable.
            for(int i=0; i<cwms.size(); i++) {
                callbackRunnables.add(new CallbackCallable(cwms.get(i).callback, data));
                cwms.get(i).lastRun = System.currentTimeMillis(); // Update our lastRun time
            }

            // Run everything on our ThreadPool and wait for MAX_CALLBACK_WAIT_TIME seconds
            try {
                executorService.invokeAll(callbackRunnables, MAX_CALLBACK_WAIT_TIME, TimeUnit.SECONDS);
            }
            catch(InterruptedException e) {
                LogManager.log(Level.SEVERE, "Interrupted during callback run of " + channelName);
            }
        }
    }

    // Clean up unused subscriptions.
    private class SubscribeCleanup implements Runnable {
        public void run() {
            try {
                LogManager.log(Level.INFO, "Running subscription cleanup thread.");

                int numberCulledSubscribers = 0;
                // Iterate over channels.
                Set<String> keys = wcCallbacks.keySet();
                for(String key : keys) {

                    // Iterate over each callback subscription.
                    int numSubscriptions = wcCallbacks.get(key).size();
                    LogManager.log(Level.INFO, "Total subscriptions for channel " + key + ": " + numSubscriptions);
                    for(int i=numSubscriptions - 1; i>=0; i--) {
                        // If it's been too long since the callback was executed, remove it.
                        if((System.currentTimeMillis() - wcCallbacks.get(key).get(i).lastRun) >= SUBSCRIPTION_AGE_OFF * 1000) {
                            wcCallbacks.get(key).remove(i);
                            numberCulledSubscribers++;
                        }
                    }
                }
            }
            catch(Exception e) {
                LogManager.log(Level.SEVERE, "Error in subscription cleanup!", e);
            }
        }
    }

    // Clean up the executors.
    private class ExecutorCleanupThread extends Thread {
        public void run() {
            LogManager.log(Level.INFO, "Cleaning up executors used by PublishSubscribeAgent.");
            executorService.shutdownNow();
            scheduledExecutorService.shutdownNow();
        }
    }
}
