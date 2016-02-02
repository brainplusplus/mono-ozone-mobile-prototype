package com.fourtwosix.mono.adapters;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.ImageView;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.fragments.AppsMallFragment;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.ImageHelper;
import com.fourtwosix.mono.utils.LogManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;

public class AppsMallAdapter extends BaseAdapter {
    private Context context;
    private WidgetListItem[] values;
    private Set<String> added;
    private ImageHelper imageHelper;
    private AppsMallFragment frag;


    public void loadData() {
        Iterable<WidgetListItem> widgetList =  ((WidgetDataService)DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService)).appsMallList(frag.getAppsMallType());
        List<WidgetListItem> copy = new ArrayList<WidgetListItem>();
        SharedPreferences sharedPreferences = context.getSharedPreferences(context.getString(R.string.app_package), Context.MODE_PRIVATE);
        boolean showAll = sharedPreferences.getBoolean(context.getString(R.string.showAllWidgetsPreference), false);
        for(WidgetListItem item : widgetList){
            if(item.isAppsMall() || ((item.isInstalled() || !item.isAppsMall())  && frag.getAppsMallType().equals(AppsMallFragment.AppsMallFragmentType.BUILDER)))
            {
                if(showAll || item.getMobileReady())
                    copy.add(item);
            }
        }
        Collections.sort(copy);
        this.values = copy.toArray(new WidgetListItem[copy.size()]);

        notifyDataSetChanged();
    }

    public AppsMallAdapter(Context context, AppsMallFragment frag) {
        this.context = context;
        this.added = new HashSet<String>();
        //TODO breaking inteface here. I dont want to add this method to interface, i dont think.
        Iterable<WidgetListItem> list = ((WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService)).appsMallList(frag.getAppsMallType());
        List<WidgetListItem> filtered = new ArrayList<WidgetListItem>();
        for (WidgetListItem item : list) {
            if (item.isAppsMall() || ((item.isInstalled() || !item.isAppsMall()) && frag.getAppsMallType().equals(AppsMallFragment.AppsMallFragmentType.BUILDER))) {
                filtered.add(item);
                if(frag.getAppsMallType().equals(AppsMallFragment.AppsMallFragmentType.MALL))
                {
                    if(item.isInstalled())
                    {
                        added.add(item.getGuid());
                    }
                }
            }
        }
        Iterator<WidgetListItem> iter = filtered.iterator();
        List<WidgetListItem> copy = new ArrayList<WidgetListItem>();
        while (iter.hasNext()) {
            copy.add(iter.next());
        }

        Collections.sort(copy);

        this.values = copy.toArray(new WidgetListItem[copy.size()]);
        this.imageHelper = new ImageHelper(context);
        this.frag = frag;
    }

    public void setData(WidgetListItem[] data) {
        values = data;
    }

    public void setAdded(Set<String> added) { this.added = added; }

    public Set<String> getAdded()
    {
        return added;
    }

    public View getView(int position, View convertView, ViewGroup parent) {

        LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);

        View appView;

        if (convertView == null) {
            // get layout from fragment_grid.xml
            appView = inflater.inflate(R.layout.adapter_apps_mall_entry_grid, null);
        } else {
            appView = convertView;
        }
        // set value into textview
        TextView textView = (TextView) appView.findViewById(R.id.app_name);

        textView.setText(values[position].getTitle());
        ImageView ic = (ImageView) appView.findViewById(R.id.image_app_icon);

        //set the guid of the widget
        ic.setTag(R.id.image_app_icon, values[position].getGuid());
        try {
            Bitmap bmp = imageHelper.loadWidgetImage(values[position]);
            if (bmp != null) {
                ic.setImageBitmap(imageHelper.loadWidgetImage(values[position]));
            }
        } catch (Exception e) {
            LogManager.log(Level.SEVERE, "Loading image for widget " + values[position].getTitle(), e);
            //We just display the default ic
        }

        int visibility = added.contains(values[position].getGuid()) ? View.VISIBLE : View.INVISIBLE;

        if(!frag.getAppsMallType().equals(AppsMallFragment.AppsMallFragmentType.MALL)) {
            appView.findViewById(R.id.textSelected).setVisibility(visibility);
            TextView txtAddedNumber = (TextView) appView.findViewById(R.id.txtAddedNumber);

            Integer addedNumber = (Integer) ic.getTag();
            if (addedNumber != null && addedNumber > 0) {
                txtAddedNumber.setText(addedNumber.toString());
                txtAddedNumber.setVisibility(visibility);
            }
        }else
        {
            TextView added = (TextView) appView.findViewById(R.id.textSelected);
            added.setText("ADDED");
            added.setVisibility(visibility);
        }

        return appView;
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
