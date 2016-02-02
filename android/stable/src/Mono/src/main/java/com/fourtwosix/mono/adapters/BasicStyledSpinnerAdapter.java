package com.fourtwosix.mono.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.TextView;

import com.fourtwosix.mono.R;

import java.util.List;

/**
 * Generic, toString based adapter with a specific layout for ease of use.
 * Created by Eric on 2/26/14.
 */
public class BasicStyledSpinnerAdapter<T> extends BaseAdapter {
    private LayoutInflater inflater;
    private List<T> items;

    /**
     * Default constructor
     * @param context
     * @param items
     */
    public BasicStyledSpinnerAdapter(Context context, List<T> items) {
        this.inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        this.items = items;
    }

    public View getView(int position, View convertView, ViewGroup parent) {
        if(convertView == null) {
            convertView = inflater.inflate(R.layout.adapter_widget_spinner, null);
            //convertView.setTag(items.get(position));
        }

        TextView txtTitle = (TextView)convertView.findViewById(R.id.txtTitle);
        if(items.get(position).toString() == null) {
            txtTitle.setText("Select");
        } else {
            txtTitle.setText(items.get(position).toString());
        }


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

    /**
     * Sets a new set of data
     * @param items
     */
    public void setData(List<T> items) {
        this.items = items;
        notifyDataSetChanged();
    }
}