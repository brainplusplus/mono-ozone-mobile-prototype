package com.fourtwosix.mono.adapters;

import android.app.Activity;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.ImageView;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.activities.MainActivity;
import com.fourtwosix.mono.structures.NavItem;

import java.util.HashMap;

/**
 * Created by Eric on 11/27/13.
 */
public class NavAdapter extends BaseAdapter {
    private Activity activity;
    private HashMap<MainActivity.FragmentName, NavItem> navItems;
    private static LayoutInflater inflater=null;
    HashMap<Integer, View> views;

    public NavAdapter(Activity a, HashMap<MainActivity.FragmentName, NavItem> items) {
        activity = a;
        navItems = items;
        inflater = (LayoutInflater)activity.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        views = new HashMap<Integer, View>();
    }

    public int getCount() {
        return navItems.size();
    }

    public Object getItem(int position) {
        return position;
    }

    public long getItemId(int position) {
        return position;
    }

    public View getView(int position, View convertView, ViewGroup parent) {
        View vi;
        if(!views.containsKey(position))
        {
            NavItem item = navItems.get(MainActivity.FragmentName.values()[position]);
            vi = inflater.inflate(R.layout.adapter_nav_layout, null);

            ImageView imgIcon = (ImageView)vi.findViewById(R.id.imgIcon);
            if(item.getIconId() == 0) {
                imgIcon.setVisibility(View.GONE);
            } else {
                imgIcon.setImageResource(item.getIconId());
            }

            TextView txtTitle = (TextView)vi.findViewById(R.id.txtTitle);
            txtTitle.setText(item.getName());

            views.put(position, vi);
        }
        return views.get(position);
    }
}
