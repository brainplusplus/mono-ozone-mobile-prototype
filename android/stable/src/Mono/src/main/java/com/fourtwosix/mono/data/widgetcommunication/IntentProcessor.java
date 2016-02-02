package com.fourtwosix.mono.data.widgetcommunication;

import android.app.Fragment;
import android.app.FragmentTransaction;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;

import com.fourtwosix.mono.data.models.Dashboard;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.IDataService;
import com.fourtwosix.mono.data.services.IntentDataService;
import com.fourtwosix.mono.data.services.IntentPreferenceService;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.dialogs.IntentSelectionDialog;
import com.fourtwosix.mono.fragments.DashboardsWidgetsFragment;
import com.fourtwosix.mono.structures.OzoneIntent;
import com.fourtwosix.mono.structures.OzoneIntentPreference;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.views.WidgetWebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;

/**
 * This class represents a processor for handling Intents in a dashboard.
 * It will direct intents to the correct widgets, or prompt for widget selection if need be.
 * This class uses broadcast receivers so the using class must forward the onStart and onStop methods
 * Created by Eric on 3/26/14.
 */
public class IntentProcessor implements IntentSelectionDialog.IntentSelectionListener{
    private DashboardsWidgetsFragment fragment;
    private HashMap<String, WidgetRegistration> widgetMap;
    private ArrayList<OzoneIntent> intentQueue;
    private HashMap<String, OzoneIntent> processedIntents;

    public static String INTENT_QUEUE_BROADCAST = "com.fourtwosix.mono.intents.queueBroadcast";
    public static String INTENT_QUEUE_SIZE_KEY= "queueSize";

    /**
     * Default constructor
     * @param fragment dashboard widget fragment using this processor
     */
    public IntentProcessor(DashboardsWidgetsFragment fragment) {
        this.fragment = fragment;
        this.widgetMap = new HashMap<String, WidgetRegistration>();
        intentQueue = new ArrayList<OzoneIntent>();
        processedIntents = new HashMap<String, OzoneIntent>();
    }

    /**
     * Adds a widget to the intent processor
     * @param instanceId instance id of the new widget
     * @param webView webview containing the widget
     */
    public void addWidget(String instanceId, WidgetWebView webView) {
        WidgetRegistration registration = new WidgetRegistration();
        registration.setWebView(webView);
        widgetMap.put(instanceId, registration);
    }

    /**
     * Registers a javascript callback for when a widget receives an intent
     * @param instanceId The widget instance id
     * @param action The action of the intent
     * @param dataType The data type of the intent
     * @param javascript The javascript callback
     */
    public void registerReceiver(String instanceId, String action, String dataType, String javascript) {
        if(widgetMap.containsKey(instanceId)) {
            WidgetRegistration registration = widgetMap.get(instanceId);
            registration.getCallbacks().put(action + "/" + dataType, javascript);
            LogManager.log(Level.INFO, "Intents - Registering widget callback receiver");

            //send all intents that may have fired before we could register
            for(Map.Entry entry : processedIntents.entrySet()) {
                if(entry.getKey().equals(instanceId)) {
                    sendIntent(null, instanceId, (OzoneIntent)entry.getValue());
                    processedIntents.remove(instanceId);
                }
            }
        } else {
            LogManager.log(Level.INFO, "Intents - Unable to register receiver for widget instance id: " + instanceId);
        }
    }

    /**
     * Sends an intent to the list of destinations if available.
     * @param intent The intent to send
     * @param destinations (Optional) Widget instance ids to receive the intent
     */
    public void processIntent(OzoneIntent intent, List<String> destinations) {

        //Logic flow:
        //if destinations are set,
        //  send to destinations
        //else
        //  check preferences
        //      send to preference
        //  else
        //      check defaultsReg
        //          send to default
        //      else if no defaults
        //          prompt

        if(destinations != null) {
            for(int i = 0; i < destinations.size(); i++) {
                sendIntent(null, destinations.get(i), intent);
            }
        } else {
            if(!checkPreferences(intent)) {
                if(intent.getDefaultReceiver() != null && !intent.getDefaultReceiver().isEmpty()) {
                    sendIntent(null, intent.getDefaultReceiver(), intent);
                } else {
                    intentQueue.add(intent);
                    LogManager.log(Level.INFO, "Intents - Adding intent to the Queue. Queue size: " + intentQueue.size());

                    //check to see if the intent selection dialog is open, if not, prompt for the first in the queue
                    if(fragment.getFragmentManager()!=null) {
                        Fragment existingFragment = fragment.getFragmentManager().findFragmentByTag("intentDialog");
                        if(existingFragment == null && intentQueue.size() == 1) {
                            prompt(intentQueue.get(0));
                        } else {
                            Intent queueUpdateIntent = new Intent(INTENT_QUEUE_BROADCAST);
                            queueUpdateIntent.putExtra(INTENT_QUEUE_SIZE_KEY, intentQueue.size());
                            fragment.getActivity().sendBroadcast(queueUpdateIntent);
                        }
                    }
                }
            }
        }
    }

    /**
     * Checks the preferences to see if the given intent should be routed somewhere.
     * Will subsequently send the intent if a preference is found.
     * @param intent The intent to search for.
     * @return boolean whether we have found a preference and forwarded the intent
     */
    private boolean checkPreferences(OzoneIntent intent) {
        IntentPreferenceService service = (IntentPreferenceService) DataServiceFactory.getService(DataServiceFactory.Services.IntentPreferenceService);
        OzoneIntentPreference preference = service.findTarget(fragment.getDashboard().getGuid(), intent);
        if(preference != null) {
            sendIntent(null, preference.getReceiver(), intent);
            return true;
        }
        return false;
    }

    /**
     * prompts the user to select which widget to send an intent to.
     */
    private void prompt(final OzoneIntent intent) {

        IntentDataService intentDataService = (IntentDataService) DataServiceFactory.getService(DataServiceFactory.Services.IntentDataService);
        WidgetDataService widgetDataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);

        ArrayList<WidgetListItem> openWidgets = new ArrayList<WidgetListItem>();
        ArrayList<WidgetListItem> newInstances = new ArrayList<WidgetListItem>();

        //get the widget list items for the currently open widgets
        for(Dashboard.Widget widget : fragment.getDashboard().getWidgets()) {
            WidgetListItem widgetListItem = widgetDataService.find(widget.guid).clone();
            widgetListItem.setInstanceId(widget.instanceId);
            //make sure the widget can receive this intent
            if(intentDataService.canReceiveIntent(widgetListItem, intent)) {
                openWidgets.add(widgetListItem);
            }
        }

        //get all known intent registrations
        List<OzoneIntent> intentRegistrations = intentDataService.find(new IDataService.DataModelSearch<OzoneIntent>() {
            @Override
            public boolean search(OzoneIntent param) {
                if(param.getAction().equals(intent.getAction()) && param.getType().equals(intent.getType()) &&
                        OzoneIntent.IntentDirection.values()[param.getDirection()] == OzoneIntent.IntentDirection.RECEIVE) {
                    return true;
                }

                return false;
            }
        });

        //get the widgets from the registered intents
        for(OzoneIntent intentRegistration : intentRegistrations) {
            WidgetListItem newInstance = widgetDataService.find(intentRegistration.getGuid()).clone();
            newInstance.setInstanceId(UUID.randomUUID().toString());
            newInstances.add(newInstance);
        }

        //null check is necessary in case the fragment has been closed before this executes
        if(fragment != null) {
            IntentSelectionDialog intentSelectionDialog = IntentSelectionDialog.newInstance(intent, openWidgets, newInstances, intentQueue.size());
            intentSelectionDialog.setSelectionListener(this);

            FragmentTransaction ft = fragment.getFragmentManager().beginTransaction();
            intentSelectionDialog.show(ft, "intentDialog");
        }
    }

    /**
     * Send the intent to a webview
     * @param widgetGuid Widget guid of the receiving widget, used when launching a new widget
     * @param instanceId Instance id of the receiving widget, used to direct the intent to a specific widget
     * @param intent The intent to send
     */
    private void sendIntent(String widgetGuid, String instanceId, OzoneIntent intent) {
        LogManager.log(Level.INFO, "Intent Widget Guid: " + widgetGuid);
        LogManager.log(Level.INFO, "Intent Instance ID: " + instanceId);
        if(widgetMap.containsKey(instanceId)) {
            final WidgetRegistration registration = widgetMap.get(instanceId);
            final WidgetRegistration sender = widgetMap.get(intent.getGuid());

            String javascriptCallback = findCallback(registration, intent);
            if(javascriptCallback != null) {
                try {

                    JSONObject idJson = new JSONObject().put("id", intent.getGuid());
                    final String script = "javascript:Mono.Callbacks.Callback(\"" + javascriptCallback + "\", " + idJson + ", " + intent.getIntent() + ", " + intent.getData().toString() + ")";

                    //Create the array response of widgets that received the intent
                    JSONArray receivers = new JSONArray();
                    JSONObject response = new JSONObject();
                    response.put("id", new JSONObject().put("id", instanceId).toString());
                    response.put("isReady", false);
                    response.put("callbacks", new JSONObject());
                    receivers.put(response);

                    final String senderCallback = "javascript:Mono.Callbacks.Callback(\"" + intent.getJavascriptCallback() + "\", " + receivers + ")";

                    LogManager.log(Level.INFO, script);
                    LogManager.log(Level.INFO, intent.getJavascriptCallback());
                    fragment.getActivity().runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            //load the intent
                            registration.webView.loadUrl(script);

                            //load the senders callback with the guid of the widget receiving the intent
                            sender.webView.loadUrl(senderCallback);
                        }
                    });

                } catch (Exception exception) {
                    LogManager.log(Level.SEVERE, "Intents - Unable to load Intent into widget", exception);
                }
            } else {
                LogManager.log(Level.INFO, "Intents - No javascript callback for intent, adding to processed queue");
                processedIntents.put(instanceId, intent);

                //send a delayed message to timeout the intent
                Message message = new Message();
                Bundle bundle = new Bundle();
                bundle.putString("instanceId", instanceId);
                intentTimeoutHandler.sendMessageDelayed(message, 30*1000);
            }

            intentQueue.remove(intent);
            LogManager.log(Level.INFO, "Intents - Removing intent from the Queue. Queue size: " + intentQueue.size());
        } else {
            //launch the widget through the dashboard, which will indirectly call add widget here
            fragment.launchNewWidget(widgetGuid, instanceId);

            //has been loaded now, can send intent to it
            if(instanceId != null) {
                sendIntent(widgetGuid, instanceId, intent);
            } else {
                //This should not happen, error
                LogManager.log(Level.SEVERE, "Intents - Attempts to start a widget based off an intent have failed.");
            }
        }
    }

    /**
     * Finds the callback for a widget based on intent action and dataType
     * @param registration The widget registration receiving the intent
     * @param intent The intent to send
     * @return
     */
    private String findCallback(WidgetRegistration registration, OzoneIntent intent) {
        String key = new String(intent.getAction()+"/"+intent.getType());
        if(registration.getCallbacks().containsKey(key)) {
            return registration.getCallbacks().get(key);
        } else {
            return null;
        }
    }

    /**
     * Implement the intent selection dismissed event
     * @param clearQueue
     */
    public void dismissed(boolean clearQueue) {
        //no widget selected, drop the intent

        LogManager.log(Level.INFO, "Intents - Removing intent from the Queue. Queue size: " + intentQueue.size());
        intentQueue.remove(0);

        if(clearQueue) {
            intentQueue.clear();
        }

        processNextInQueue();
    }

    /**
     * Implement the widget selected event for the intent
     * @param ozoneIntent Intent being sent
     * @param selectionType the type of selection (once vs default)
     * @param widget The widget receiving the intent
     * @param clearQueue flag to clear the yet to be processed queue
     */
    public void selected(OzoneIntent ozoneIntent, IntentSelectionDialog.SelectionType selectionType, WidgetListItem widget, boolean clearQueue) {
        if(selectionType == IntentSelectionDialog.SelectionType.DEFAULT) {
            //create a preference
            OzoneIntentPreference preference = OzoneIntentPreference.createFromIntent(ozoneIntent, fragment.getDashboard().getGuid(), widget.getInstanceId());
            preference.setSender(ozoneIntent.getGuid());

            //save the preference
            IntentPreferenceService intentPreferenceService = (IntentPreferenceService)DataServiceFactory.getService(DataServiceFactory.Services.IntentPreferenceService);
            intentPreferenceService.put(preference);
        }

        sendIntent(widget.getGuid(), widget.getInstanceId(), ozoneIntent);

        if(clearQueue) {
            intentQueue.clear();
        }

        processNextInQueue();
    }

    /**
     * Starts processing the next item in the queue
     */
    private void processNextInQueue() {
        if(intentQueue.size() > 0) {
            //reprocess the intent because a default may have been added
            OzoneIntent intent = intentQueue.get(0);

            if(!checkPreferences(intent)) {
                prompt(intent);
            } else {
                processNextInQueue();
            }
        }
    }

    /**
     * Handler for intent timeouts
     */
    private Handler intentTimeoutHandler = new Handler() {
        @Override
        public void handleMessage(Message message) {
            Bundle bundle = message.getData();
            String instanceId = bundle.getString("instanceId");
            processedIntents.remove(instanceId);
            LogManager.log(Level.INFO, "Intents - Intent timed out, removing from queue. Queue size: " + processedIntents.size());
        }
    };

    /**
     * Class representing a widget and its callbacks for intents
     */
    public class WidgetRegistration {
        //the WidgetWebView
        private WidgetWebView webView;

        //Hashmap with "action/dataType" as key and javascript callbacks as value
        private HashMap<String, String> callbacks = new HashMap<String, String>();

        /**
         * Gets the webview related to this registration
         * @return Webview of the widget registration
         */
        public WidgetWebView getWebView() {
            return webView;
        }

        /**
         * Sets the webview related to this registration
         * @param webView Set the webview of the registration
         */
        public void setWebView(WidgetWebView webView) {
            this.webView = webView;
        }

        /**
         * Gets the hashmap containing the javascript callback methods.
         * Key is a composition of intent action/dataType
         * @return hashmap of action/dataType to javascript callbacks
         */
        public HashMap<String, String> getCallbacks() {
            return callbacks;
        }

        /**
         * Sets the javascript callback methods
         * Key should be a composition of intent action/dataType
         * @param callbacks hashmap of action/dataType to javascript callbacks
         */
        public void setCallbacks(HashMap<String, String> callbacks) {
            this.callbacks = callbacks;
        }
    }
}
