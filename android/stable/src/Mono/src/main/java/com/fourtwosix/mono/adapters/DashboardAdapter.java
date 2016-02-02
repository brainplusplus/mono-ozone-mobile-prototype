package com.fourtwosix.mono.adapters;

import android.app.FragmentManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.BaseAdapter;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.models.Dashboard;
import com.fourtwosix.mono.data.services.DashboardsDataService;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.IDataService;
import com.fourtwosix.mono.fragments.DashboardsWidgetsFragment;
import com.fourtwosix.mono.structures.WidgetListItem;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

public class DashboardAdapter extends BaseAdapter {
    private Context context;
    private FragmentManager fragmentManager;
    private List<Dashboard> values;

    public DashboardAdapter(FragmentManager fragmentManager, Context context) {
        this.context = context;
        this.fragmentManager = fragmentManager;
        this.values = new ArrayList<Dashboard>();
        refresh();
    }

    public View getView(int position, View convertView, ViewGroup parent) {
        LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        View gridView = inflater.inflate(R.layout.adapter_grid_entry, null);

        // set value into textview
        TextView textView = (TextView) gridView.findViewById(R.id.grid_item_label);
        textView.setText(values.get(position).getName());

        View remove = gridView.findViewById(R.id.imageRemove);
        remove.setOnClickListener(onDeleteClickListener);
        remove.setTag(R.id.imageRemove, position);

        // set value into notification
        TextView countView = (TextView) gridView.findViewById(R.id.grid_item_notification);
        String count = Integer.toString(values.get(position).getWidgets().length);
        countView.setText(count);

        return gridView;
    }

    @Override
    public int getCount() {
        return values.size();
    }

    @Override
    public Object getItem(int position) {
        return values.get(position);
    }

    @Override
    public long getItemId(int position) {
        return 0;
    }

    public AdapterView.OnItemClickListener onClickListener = new AdapterView.OnItemClickListener() {
        public void onItemClick(AdapterView<?> parent, View v, int position, long id) {
            Dashboard dashboard = values.get(position);
            if(dashboard != null){
                fragmentManager.beginTransaction().replace(R.id.container, DashboardsWidgetsFragment.newInstance(dashboard)).commit();
            }
        }
    };

    public AdapterView.OnClickListener onDeleteClickListener = new AdapterView.OnClickListener() {
        public void onClick(View view) {
            if(view.getTag(R.id.imageRemove) != null){
                int position = (Integer)view.getTag(R.id.imageRemove);
                DashboardsDataService svc = (DashboardsDataService)DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService);
                svc.remove(values.get(position));
                refresh();
            }
        }
    };

    public AdapterView.OnFocusChangeListener onFocusChangeListener = new AdapterView.OnFocusChangeListener(){
        @Override
        public void onFocusChange(View view, boolean b) {
            if (!b){
                View clicker = view.findViewById(R.id.imageRemove);
                View notifications = view.findViewById(R.id.grid_item_notification);
                if(clicker != null && notifications != null){
                    clicker.setVisibility(View.INVISIBLE);
                    notifications.setVisibility(View.VISIBLE);
                }
            }
        }
    };

    public AdapterView.OnItemLongClickListener onItemLongClickListener = new AdapterView.OnItemLongClickListener() {
        @Override
        public boolean onItemLongClick(AdapterView<?> adapterView, View view, int i, long l) {
            View clicker = view.findViewById(R.id.imageRemove);
            View notifications = view.findViewById(R.id.grid_item_notification);
            clicker.setVisibility(View.VISIBLE);
            notifications.setVisibility(View.INVISIBLE);
            view.setOnFocusChangeListener(onFocusChangeListener);
            return true;
        }
    };

    public void refresh() {
        values.clear();

        SharedPreferences sharedPreferences = context.getSharedPreferences(context.getString(R.string.app_package), Context.MODE_PRIVATE);
        boolean showAll = sharedPreferences.getBoolean(context.getString(R.string.showAllWidgetsPreference), false);
        Iterator<Dashboard> iter = showAll ?
                DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService).list().iterator() :
                DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService).find(new IDataService.DataModelSearch<Dashboard>() {
                    @Override
                    public boolean search(Dashboard param) {
                        boolean hasMobileReady = false;
                        for (Dashboard.Widget curr : param.getWidgets()) {
                            WidgetListItem widget = (WidgetListItem)DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService).find(curr.guid);
                            if (widget != null && widget.getMobileReady())
                                hasMobileReady = true;
                        }
                        return hasMobileReady;
                    }
                }).iterator();
        while (iter.hasNext())
            values.add(iter.next());
        Collections.sort(values);
        this.notifyDataSetChanged();
    }
}
