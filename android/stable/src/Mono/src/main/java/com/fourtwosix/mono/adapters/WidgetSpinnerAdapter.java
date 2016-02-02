package com.fourtwosix.mono.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.structures.WidgetListItem;

import java.util.ArrayList;
import java.util.Iterator;

/**
 * Created by Eric on 2/4/14.
 */
public class WidgetSpinnerAdapter extends BaseAdapter {
    private Context context;
    private LayoutInflater inflater;
    private ArrayList<WidgetListItem> items;

    public WidgetSpinnerAdapter(Context context) {
        this.context = context;
        this.inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        this.items = new ArrayList<WidgetListItem>();

        loadData();
    }

    public void loadData() {
        items.clear();
        Iterator<WidgetListItem> iter = DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService).list().iterator();
        while (iter.hasNext()) {
            items.add(iter.next());
        }
    }

    public View getView(int position, View convertView, ViewGroup parent) {
        if(convertView == null) {
            convertView = inflater.inflate(R.layout.adapter_widget_spinner, null);
            convertView.setTag(items.get(position));
        }

        TextView txtTitle = (TextView)convertView.findViewById(R.id.txtTitle);
        txtTitle.setText(items.get(position).getTitle());

        return convertView;
    }

    @Override
    public int getCount() {
        return items.size();
    }

    @Override
    public Object getItem(int position) {
        return items.get(position);
    }

    @Override
    public long getItemId(int position) {
        return 0;
    }
}
