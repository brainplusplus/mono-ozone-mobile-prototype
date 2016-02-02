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
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.ImageHelper;
import com.fourtwosix.mono.utils.LogManager;

import java.util.logging.Level;

public class AppsListAdapter extends BaseAdapter {
    private Context context;
    private WidgetListItem[] values;
    private ImageHelper imageHelper;

    public AppsListAdapter(Context context) {
        this.context = context;
        this.values = new WidgetListItem[0];
        this.imageHelper = new ImageHelper(context);
    }

    public void setData(WidgetListItem[] data){
        values = data;
    }

    public View getView(int position, View convertView, ViewGroup parent) {

        LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);

        View gridView;

        if (convertView == null) {
            // get layout from fragment_grid.xml
            gridView = inflater.inflate(R.layout.adapter_grid_entry, null);
        } else {
            gridView = convertView;
        }
        gridView.findViewById(R.id.grid_item_notification).setVisibility(View.INVISIBLE);
        ((TextView)gridView.findViewById(R.id.grid_item_label)).setTextColor(Color.BLACK);

        // set value into textview
        TextView textView = (TextView) gridView.findViewById(R.id.grid_item_label);
        textView.setText(values[position].getTitle());

        ImageView ic = (ImageView)gridView.findViewById(R.id.grid_item_image);
        try{
            Bitmap decoded = imageHelper.loadWidgetImage(values[position]);
            if(decoded != null)
                ic.setImageBitmap(decoded);
        }
        catch(Exception e){
            LogManager.log(Level.SEVERE, "Loading image for widget " + values[position].getTitle(), e);
            //We just display the default ic
        }

        return gridView;
    }

    @Override
    public int getCount() {
        return values.length;
    }

    @Override
    public Object getItem(int position) {
        return values[position];
    }

    @Override
    public long getItemId(int position) {
        return 0;
    }

}
