package com.fourtwosix.mono.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.IntentDataService;
import com.fourtwosix.mono.structures.OzoneIntent;
import com.fourtwosix.mono.structures.WidgetListItem;

import java.util.ArrayList;

/**
 * Created by Eric on 2/6/14.
 */
public class IntentSpinnerAdapter extends BaseAdapter {
    private LayoutInflater inflater;
    private ArrayList<OzoneIntent> items;
    private int count = 0;

    public IntentSpinnerAdapter(Context context) {
        this.inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        this.items = new ArrayList<OzoneIntent>();
    }

    public void loadData(WidgetListItem item) {
        items.clear();
        IntentDataService dataService = (IntentDataService)DataServiceFactory.getService(DataServiceFactory.Services.IntentDataService);
        items = (ArrayList<OzoneIntent>)dataService.getWidgetIntents(item, OzoneIntent.IntentDirection.SEND);

        //used so that the blank does show this adapter as having an item
        count = items.size();

        OzoneIntent blankIntent = new OzoneIntent();
        items.add(0, blankIntent);
        notifyDataSetChanged();
    }

    public View getView(int position, View convertView, ViewGroup parent) {
        if(convertView == null) {
            convertView = inflater.inflate(R.layout.adapter_widget_spinner, null);
            convertView.setTag(items.get(position));
        }

        TextView txtTitle = (TextView)convertView.findViewById(R.id.txtTitle);
        if(position == 0) {
            txtTitle.setText("");
            return convertView;
        }
        OzoneIntent intent = items.get(position);
        String text = intent.getAction() + " - " + intent.getType() + ((intent.getDefaultReceiver() != null) ? " - " + intent.getDefaultReceiver() : "");
        txtTitle.setText(text);

        return convertView;
    }

    public int getIntentCount() {
        return count;
    }

    @Override
    public int getCount() {
        return items.size();
    }

    @Override
    public Object getItem(int position) {
        if(position == 0) {
            return null;
        }
        return items.get(position);
    }

    @Override
    public long getItemId(int position) {
        return 0;
    }
}
