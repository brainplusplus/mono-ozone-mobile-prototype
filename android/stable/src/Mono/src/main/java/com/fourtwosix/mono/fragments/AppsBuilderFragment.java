package com.fourtwosix.mono.fragments;

import android.app.FragmentManager;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.EditText;
import android.widget.GridView;
import android.widget.RelativeLayout;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.adapters.AppsListAdapter;
import com.fourtwosix.mono.data.models.Dashboard;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.structures.WidgetListItem;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/*
 * Fragment to display the apps mall
 * Created by Corey Herbert on
 */
public class AppsBuilderFragment extends BaseFragment {
    static final String DASHBOARD_GUID_ARGUMENT = "dashboard_guid";
    AppsListAdapter adapter;
    Dashboard current_dashboard;
    GridView gridView;

    public static AppsBuilderFragment newInstance(String dashboardGuid){
        AppsBuilderFragment frag = new AppsBuilderFragment();
        Bundle args = new Bundle();
        args.putString(DASHBOARD_GUID_ARGUMENT, dashboardGuid);
        frag.setArguments(args);

        return frag;
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        //TestFlight.passCheckpoint("Dashboard Builder Viewed");

        final RelativeLayout rootView = (RelativeLayout) inflater.inflate(R.layout.fragment_app_builder, container, false);
        gridView = (GridView) rootView.findViewById(R.id.apps_in_composite);

        adapter = new AppsListAdapter(rootView.getContext());

        if (getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE) {
            gridView.setNumColumns(5);
        } else {
            gridView.setNumColumns(4);
        }

        if(getArguments() != null && getArguments().containsKey(DASHBOARD_GUID_ARGUMENT)){
            current_dashboard = (Dashboard)DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService).find(getArguments().getString(DASHBOARD_GUID_ARGUMENT));

            //Have to get the actual widgetlistitems now
            adapter.setData(getWidgetsForDashboard());
            ((EditText)rootView.findViewById(R.id.editText)).setText(current_dashboard.getName());
            //Hide the notice if we already have widgets
            if(adapter.getCount() > 0)
                rootView.findViewById(R.id.textAddLabel).setVisibility(View.INVISIBLE);
            else
                rootView.findViewById(R.id.textAddLabel).setVisibility(View.VISIBLE);
        }

        gridView.setAdapter(adapter);
        gridView.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            public void onItemClick(AdapterView<?> parent, View v,
                                    int position, long id) {
                toggleSelected(v.findViewById(R.id.grid_item));
            }
        });

        rootView.findViewById(R.id.rlAddApps).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                // update the main content by replacing fragments
                String d;
                if(getArguments() != null && getArguments().containsKey(DASHBOARD_GUID_ARGUMENT))
                    d = getArguments().getString(DASHBOARD_GUID_ARGUMENT);
                else
                    d = createComposite(rootView);

                FragmentManager fragmentManager = getActivity().getFragmentManager();
                fragmentManager.beginTransaction().replace(R.id.container, AppsMallFragment.newInstance(d,AppsMallFragment.AppsMallFragmentType.BUILDER)).addToBackStack(null).commit();
            }
        });

        rootView.findViewById(R.id.rlRemoveapps).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                for(int i=0; i<gridView.getChildCount(); i++) {
                    View child = gridView.getChildAt(i).findViewById(R.id.grid_item);
                    if(child.getTag(child.getId()) != null && current_dashboard != null){
                        current_dashboard.removeWidget(((WidgetListItem)adapter.getItem(i)));
                    }
                }
                adapter.setData(getWidgetsForDashboard());
                adapter.notifyDataSetChanged();
            }
        });

        return rootView;
    }

    private String createComposite(View root){
        Dashboard d = new Dashboard();
        String name = ((EditText)root.findViewById(R.id.editText)).getText().toString();
        d.setName(name.isEmpty() ? "Untitled" : name);
        d.setNativeCreated(true);
        DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService).put(d);
        return d.getGuid();
    }

    private WidgetListItem[] getWidgetsForDashboard(){
        if(current_dashboard != null) {
            //Create a widget data service for information lookup
            WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);

            Dashboard.Widget[] dash_wi = current_dashboard.getWidgets();
            List<WidgetListItem> copy = new ArrayList<WidgetListItem>();

            for (int i = 0; i < dash_wi.length; i++) {
                //find widget definition
                WidgetListItem item = dataService.find(dash_wi[i].guid);

                //set the instance Id
                item.setInstanceId(dash_wi[i].instanceId);

                //add to the array
                copy.add(item);
            }
            Collections.sort(copy);
            return copy.toArray(new WidgetListItem[copy.size()]);
        } else {
            return new WidgetListItem[0];
        }
    }

    private void toggleSelected(View clicked){
        if(clicked.getTag(clicked.getId()) == null){
            clicked.setTag(clicked.getId(), true);
        }
        else{
            clicked.setTag(clicked.getId(), null);
        }
    }
}