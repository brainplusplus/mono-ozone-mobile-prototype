package com.fourtwosix.mono.adapters;

import android.app.FragmentManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.BaseAdapter;
import android.widget.ImageView;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.fragments.WidgetFragment;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.ImageHelper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

/**
 * Created by Eric on 1/20/14.
 */
public class WidgetAdapter extends BaseAdapter {
    private Context context;
    private WidgetListItem[] widgetListItems;
    private FragmentManager fragmentManager;
    private LayoutInflater inflater;

    public WidgetAdapter(FragmentManager fragmentManager, Context context) {
        this.context = context;
        this.fragmentManager = fragmentManager;
        inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);

        loadData();
    }

    public void loadData() {
        Iterator<WidgetListItem> iter = DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService).list().iterator();
        List<WidgetListItem> copy = new ArrayList<WidgetListItem>();
        while (iter.hasNext())
            copy.add(iter.next());
        Collections.sort(copy);
        this.widgetListItems = copy.toArray(new WidgetListItem[copy.size()]);

        notifyDataSetChanged();
    }

    public View getView(int position, View convertView, ViewGroup parent) {

        //implementing the view holder pattern
        WidgetListItem item = widgetListItems[position];
        WidgetHolder holder;

        if(convertView == null) {
            convertView = inflater.inflate(R.layout.adapter_grid_entry, null);

            holder = new WidgetHolder();
            holder.title = (TextView)convertView.findViewById(R.id.grid_item_label);
            holder.image = (ImageView)convertView.findViewById(R.id.grid_item_image);
            holder.numberIcon = convertView.findViewById(R.id.grid_item_notification);
            holder.numberIcon.setVisibility(View.GONE);

            convertView.setTag(holder);
        } else {
            holder = (WidgetHolder)convertView.getTag();
        }

        holder.title.setText(item.getTitle());

        Bitmap bmImg = new ImageHelper(context).loadWidgetImage(item);
        if(bmImg != null) {
            holder.image.setImageBitmap(bmImg);
        } else {
            holder.image.setImageResource(R.drawable.app_2x);
        }

        return convertView;
    }

    @Override
    public int getCount() {
        return widgetListItems.length;
    }

    @Override
    public Object getItem(int position) {
        return widgetListItems[position];
    }

    @Override
    public long getItemId(int position) {
        return 0;
    }

    public AdapterView.OnItemClickListener onClickListener = new AdapterView.OnItemClickListener() {
        public void onItemClick(AdapterView<?> parent, View v, int position, long id) {
            WidgetListItem item = widgetListItems[position];
            if(item != null){
                WidgetFragment widgetFragment = new WidgetFragment();
                Bundle bundle = new Bundle();
                bundle.putParcelable(WidgetFragment.ITEM_KEY, item);
                widgetFragment.setArguments(bundle);

                fragmentManager.beginTransaction().replace(R.id.container, widgetFragment).addToBackStack("widgetFragment").commit();
            }
        }
    };

    //For the view holder pattern
    class WidgetHolder {
        public TextView title;
        public ImageView image;
        public View numberIcon;
    }
}
