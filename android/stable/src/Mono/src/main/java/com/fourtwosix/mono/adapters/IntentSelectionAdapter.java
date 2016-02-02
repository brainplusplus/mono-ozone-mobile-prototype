package com.fourtwosix.mono.adapters;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.ImageView;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.dialogs.IntentSelectionDialog;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.ImageHelper;

import java.util.ArrayList;

/**
 * Created by Eric on 4/1/14.
 */
public class IntentSelectionAdapter extends BaseAdapter {
    private IntentSelectionDialog intentSelectionDialog;
    private IntentSelectionDialog.SelectionSource source;
    private LayoutInflater inflater;
    private ArrayList<WidgetListItem> widgets;
    private int selectedIndex = -1;

    public IntentSelectionAdapter(IntentSelectionDialog intentSelectionDialog, ArrayList<WidgetListItem> widgets, IntentSelectionDialog.SelectionSource source) {
        this.intentSelectionDialog = intentSelectionDialog;
        this.source = source;
        this.inflater = (LayoutInflater) intentSelectionDialog.getActivity().getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        this.widgets = widgets;
    }

    @Override
    public int getCount() {
        return widgets.size();
    }

    @Override
    public Object getItem(int position) {
        return widgets.get(position);
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public View getView(final int position, View convertView, ViewGroup parent) {
        View rootView;

        if (convertView == null) {
            // get layout from fragment_grid.xml
            rootView = inflater.inflate(R.layout.adapter_widget_selector, null);
        } else {
            rootView = convertView;
        }

        WidgetListItem item = widgets.get(position);
        Bitmap bitmap = new ImageHelper(intentSelectionDialog.getActivity()).loadWidgetImage(item);

        if(bitmap != null) {
            ImageView imageView = (ImageView)rootView.findViewById(R.id.imgWidget);
            imageView.setImageBitmap(bitmap);
        }

        // set value into textview
        TextView textView = (TextView) rootView.findViewById(R.id.txtTitle);
        textView.setText(widgets.get(position).getTitle());

        if(getSelectedIndex() == position) {
            rootView.setBackgroundColor(Color.rgb(127,182,66));
        } else {
            rootView.setBackgroundColor(Color.TRANSPARENT);
        }

        rootView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                setSelectedIndex(position);
                notifyDataSetChanged();
            }
        });

        return rootView;
    }

    public WidgetListItem getSelectedItem() {
        return widgets.get(selectedIndex);
    }

    public int getSelectedIndex() {
        return selectedIndex;
    }

    public void clearSelection() {
        selectedIndex = -1;
    }

    private void setSelectedIndex(int selectedIndex) {
        this.selectedIndex = selectedIndex;
        intentSelectionDialog.setSelectedWidget(widgets.get(selectedIndex), source);
    }
}
