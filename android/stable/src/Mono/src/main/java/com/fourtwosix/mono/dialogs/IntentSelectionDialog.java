package com.fourtwosix.mono.dialogs;

import android.app.DialogFragment;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.GridView;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.adapters.IntentSelectionAdapter;
import com.fourtwosix.mono.data.widgetcommunication.IntentProcessor;
import com.fourtwosix.mono.structures.OzoneIntent;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.LogManager;

import java.util.ArrayList;
import java.util.logging.Level;

/**
 * The intent selection dialog.
 */
public class IntentSelectionDialog extends DialogFragment {

    public enum SelectionType {
        ONCE,
        DEFAULT
    }
    public enum SelectionSource {
        EXISTING,
        NEWINSTANCE
    }

    private IntentSelectionListener selectionListener;
    private OzoneIntent intent;
    private IntentSelectionAdapter openAppsAdapter;
    private IntentSelectionAdapter newInstancesAdapter;
    private TextView txtIntentQueueNumber;
    private CheckBox chkClearQueue;

    private WidgetListItem selectedWidget;
    private boolean sentResponse = false;
    private boolean clearQueue = false;

    public static IntentSelectionDialog newInstance(OzoneIntent intent, ArrayList<WidgetListItem> openWidgets, ArrayList<WidgetListItem> newInstances, int queueSize) {
        IntentSelectionDialog dialog = new IntentSelectionDialog();
        Bundle args = new Bundle();
        args.putParcelable("intent", intent);
        args.putParcelableArrayList("openWidgets", openWidgets);
        args.putParcelableArrayList("newInstances", newInstances);
        args.putInt("queueSize", queueSize);
        dialog.setArguments(args);
        return dialog;
    }

    public IntentSelectionDialog() {

    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        intent = getArguments().getParcelable("intent");
        ArrayList<WidgetListItem> openWidgets = getArguments().getParcelableArrayList("openWidgets");
        ArrayList<WidgetListItem> newInstances = getArguments().getParcelableArrayList("newInstances");
        int queueSize = getArguments().getInt("queueSize");

        getDialog().getWindow().requestFeature(Window.FEATURE_NO_TITLE);
        View rootView = inflater.inflate(R.layout.dialog_intent_selection_layout, container);

        //create the two adapters we will use
        openAppsAdapter = new IntentSelectionAdapter(this, openWidgets, SelectionSource.EXISTING);
        newInstancesAdapter = new IntentSelectionAdapter(this, newInstances, SelectionSource.NEWINSTANCE);

        //set up the grids
        GridView grdOpenApps = (GridView)rootView.findViewById(R.id.grdOpenApps);
        GridView grdNewInstance = (GridView)rootView.findViewById(R.id.grdNewInstance);
        grdOpenApps.setAdapter(openAppsAdapter);
        grdNewInstance.setAdapter(newInstancesAdapter);

        //Setup our buttons to receive the result
        Button btnOnce = (Button)rootView.findViewById(R.id.intentOKButton);
        Button btnDefault = (Button)rootView.findViewById(R.id.intentDefaultButton);

        txtIntentQueueNumber = (TextView)rootView.findViewById(R.id.txtIntentQueueNumber);
        updateQueueNumber(queueSize);

        btnOnce.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sendResponse(SelectionType.ONCE);
            }
        });

        btnDefault.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sendResponse(SelectionType.DEFAULT);
            }
        });

        chkClearQueue = (CheckBox)rootView.findViewById(R.id.chkClearQueue);

        return rootView;
    }

    /**
     * Sets the selection listener
     * @param listener
     */
    public void setSelectionListener(IntentSelectionListener listener) {
        this.selectionListener = listener;
    }

    /**
     * Sets the selected widget
     * @param widgetListItem
     */
    public void setSelectedWidget(WidgetListItem widgetListItem, SelectionSource source) {
        selectedWidget = widgetListItem;
        switch(source) {
            case EXISTING:
                newInstancesAdapter.clearSelection();
                newInstancesAdapter.notifyDataSetChanged();
                break;
            case NEWINSTANCE:
                openAppsAdapter.clearSelection();
                openAppsAdapter.notifyDataSetChanged();
                break;
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        getActivity().registerReceiver(intentQueueUpdateReceiver, new IntentFilter(IntentProcessor.INTENT_QUEUE_BROADCAST));
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        getActivity().unregisterReceiver(intentQueueUpdateReceiver);

        //send dismissed response if we haven't sent a response yet
        if(sentResponse == false && selectionListener != null) {
            clearQueue = chkClearQueue.isChecked();
            selectionListener.dismissed(clearQueue);
        }
    }

    /**
     * Sends the response to the handler based on what selection type the user chose
     * @param type The selection type the user chose
     */
    private void sendResponse(SelectionType type) {
        if(selectedWidget == null) {
            LogManager.log(Level.INFO, "User did not select a widget");
            return;
        }

        clearQueue = chkClearQueue.isChecked();
        selectionListener.selected(intent, type, selectedWidget, clearQueue);
        sentResponse = true;
        this.dismiss();
    }

    /**
     * Sets the dialog message saying how many intents are in the queue
     * @param number number of intents in the queue
     */
    private void updateQueueNumber(int number) {
        String numText = getString(R.string.intents_queue_number);
        numText = numText.replace("{0}", "" + number);
        if(txtIntentQueueNumber != null && numText != null) {
            txtIntentQueueNumber.setText(numText);
        }
    }

    private BroadcastReceiver intentQueueUpdateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            updateQueueNumber(intent.getIntExtra("queueSize", 0));
        }
    };

    /**
     * Interface to receive the intent selection
     */
    public interface IntentSelectionListener {
        /**
         * Event notifying of the dialog being dismissed
         * @param clearQueue A boolean value determining if we should clear the queue or not
         */
        public void dismissed(boolean clearQueue);

        /**
         * Event notifying of the user having selected a widget
         * @param intent
         * @param selectionType
         * @param widget
         * @param clearQueue
         */
        public void selected(OzoneIntent intent, SelectionType selectionType, WidgetListItem widget, boolean clearQueue);
    }
}
