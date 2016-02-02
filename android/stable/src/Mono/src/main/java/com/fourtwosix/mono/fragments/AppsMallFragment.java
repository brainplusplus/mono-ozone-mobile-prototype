package com.fourtwosix.mono.fragments;

import android.app.DialogFragment;
import android.app.FragmentManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.os.Bundle;
import android.os.Handler;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.AdapterView;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.GridView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.adapters.AppsMallAdapter;
import com.fourtwosix.mono.data.models.Dashboard;
import com.fourtwosix.mono.data.services.DashboardsDataService;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.listeners.DialogClickListener;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.WidgetImageDownloadHelper;

import org.apache.commons.lang.StringUtils;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Level;

/*
 * Fragment to display the apps mall
 */
public class AppsMallFragment extends BaseFragment implements DialogClickListener {
    static final String DASHBOARD_GUID_ARGUMENT = "dashboard_guid";
    private static final String LOCAL_WIDGET_SOURCE_URL = "local";
    GridView gridView;
    String selectedAppDetail;
    DashboardsDataService dashboardService;
    WidgetDataService widgetService;


    private CompoundButton mobileOnlySwitch;

    String dashboardGuid;
    AppsMallAdapter adapter;

    public AppsMallFragmentType getAppsMallType() {
        return appsMallType;
    }

    public void setAppsMallType(AppsMallFragmentType appsMallType) {
        this.appsMallType = appsMallType;
    }

    AppsMallFragmentType appsMallType;

    public static AppsMallFragment newInstance(String dashboardGuid, AppsMallFragmentType type){
        AppsMallFragment frag = new AppsMallFragment();
        frag.setRetainInstance(true);
        frag.setAppsMallType(type);
        Bundle args = new Bundle();
        args.putString(DASHBOARD_GUID_ARGUMENT, dashboardGuid);
        frag.setArguments(args);

        return frag;
    }

    public AppsMallFragment(){
        dashboardService = (DashboardsDataService) DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService);
        appsMallType = AppsMallFragmentType.MALL;
        widgetService = (WidgetDataService)DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
        dashboardGuid = "";

    }

    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putString("dashboard_guid", dashboardGuid);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        final LinearLayout rootView = (LinearLayout) inflater.inflate(R.layout.fragment_apps_mall_layout, container, false);
        gridView = (GridView) rootView.findViewById(R.id.apps);
        if(appsMallType.equals(AppsMallFragmentType.BUILDER))
        {
            TextView label = (TextView) rootView.findViewById(R.id.appsListTitle);
            label.setText("Apps Builder");
        }
        adapter = new AppsMallAdapter(rootView.getContext(), this);
        gridView.setAdapter(adapter);

        SharedPreferences sharedPreferences = getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);

        mobileOnlySwitch = (CompoundButton) rootView.findViewById(R.id.mobileOnlySwitch);
        mobileOnlySwitch.setChecked(!sharedPreferences.getBoolean(getString(R.string.showAllWidgetsPreference),false));
        mobileOnlySwitch.setOnCheckedChangeListener(switchListener);


        Button doneButton = (Button) rootView.findViewById(R.id.buttonDone);
        doneButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                LogManager.log(Level.INFO, "Done button pressed");
                FragmentManager fragmentManager = getFragmentManager();
                fragmentManager.beginTransaction().replace(R.id.container, new DashboardsFragment()).commit();
            }
        });

        if (savedInstanceState != null) {
            // Restore last state
            dashboardGuid = savedInstanceState.getString("dashboard_guid");
        } else {
            if (getArguments() != null && getArguments().containsKey(DASHBOARD_GUID_ARGUMENT)) {
                dashboardGuid = getArguments().getString(DASHBOARD_GUID_ARGUMENT);
            }
        }

        if (StringUtils.isNotBlank(dashboardGuid)){
            adapter.setAdded(getGuidsFromDashboard(dashboardService.find(dashboardGuid)));
        }

        adapter.notifyDataSetChanged();
        //Here we hide the keyboard
        if(getActivity().getCurrentFocus() != null) {
            InputMethodManager inputManager = (InputMethodManager)getActivity().getSystemService(Context.INPUT_METHOD_SERVICE);
            inputManager.hideSoftInputFromWindow(getActivity().getCurrentFocus().getWindowToken(),
            InputMethodManager.HIDE_NOT_ALWAYS);
        }

        if (getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE) {
            gridView.setNumColumns(4);
        } else {
            gridView.setNumColumns(3);
        }

        gridView.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            public void onItemClick(AdapterView<?> parent, View v, int position, long id) {
                View icon = v.findViewById(R.id.image_app_icon);
                String tag = (String) icon.getTag(R.id.image_app_icon);
                Integer counter = (Integer) icon.getTag();
                if(counter != null) {
                    counter++;
                    icon.setTag(counter);
                } else {
                    icon.setTag(1);
                }
                adapter.setAdded(toggleSelected(tag));
                adapter.notifyDataSetChanged();

                if(appsMallType.equals(AppsMallFragmentType.MALL)) {
                    boolean addWidget = true;
                    String addedRemoved = "Added";
                    if(!adapter.getAdded().contains(tag)) {
                        addWidget = false;
                        addedRemoved = "Removed";
                    }
                    WidgetListItem widget = (WidgetListItem) adapter.getItem(position);
                    WidgetImageDownloadHelper widgetImageDownloadHelper = new WidgetImageDownloadHelper(getActivity().getApplicationContext(), new Handler(), widget.getWidgetSource().getUrl());
                    Map<String, WidgetListItem> widgetList = new HashMap<String, WidgetListItem>();

                    if(addWidget) {
                        widgetList.put(widget.getGuid(), widget);
                        widget.setInstalled(true);
                        LogManager.log(Level.INFO, "Adding AppsMall widget to widget list:" + widget.getTitle());
                    } else {
                        widget.setInstalled(false);
                        LogManager.log(Level.INFO, "Removing AppsMall widget from widget list:" + widget.getTitle());
                    }

                    widgetImageDownloadHelper.downloadImages(widgetList);
                    //set the widget to not apps mall. Until when?
                    //TODO 1) until when. 2) how to handle redownload?
                    WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
                    widget.setWidgetSource(dataService.getWidgetSource(LOCAL_WIDGET_SOURCE_URL, false));
                    dataService.put(widget);


                    Toast.makeText(getActivity(), "Component " + addedRemoved + ".", Toast.LENGTH_SHORT).show();
                }

            }
        });

        return rootView;
    }

    protected Set<String> toggleSelected(String guid){
        Dashboard current_dashboard = null;
        if(appsMallType.equals(AppsMallFragmentType.BUILDER))
        {
            if (!dashboardGuid.isEmpty()) {
                LogManager.log(Level.INFO, "apps mall click: " + guid);
                //find the widget definition
                WidgetListItem current_widget = widgetService.find(guid).clone();

                //assign it a new instance ID
                current_widget.setInstanceId(UUID.randomUUID().toString());

                //get the current dashboard
                current_dashboard = dashboardService.find(dashboardGuid);
                current_dashboard.addWidget(current_widget);

                Toast.makeText(getActivity(), "Component Added.", Toast.LENGTH_SHORT).show();

                dashboardService.put(current_dashboard);
            }
        }else
        {
            Set<String> added = adapter.getAdded();
            if(adapter.getAdded().contains(guid)){
                added.remove(guid);
            } else {
                added.add(guid);
            }
            return added;
        }
        return getGuidsFromDashboard(current_dashboard);
    }

    protected Set<String> getGuidsFromDashboard(Dashboard d){
        Set<String> toReturn = new HashSet<String>();
        if(d != null){
            Dashboard.Widget[] wList = d.getWidgets();
            for(int i = 0; i < wList.length; i++){
                toReturn.add(wList[i].guid);
            }
        }
        return toReturn;
    }

    public void showNoticeDialog(String guid) {
        // DialogFragment.show() will take care of adding the fragment
        // in a transaction.  We also want to remove any currently showing
        // dialog, so make our own transaction and take care of that here.
        android.app.FragmentTransaction ft = getActivity().getFragmentManager().beginTransaction();
        android.app.Fragment prev = getActivity().getFragmentManager().findFragmentByTag("dialog");
        if (prev != null) {
            ft.remove(prev);
        }
        ft.addToBackStack(null);

        this.selectedAppDetail = guid;
        // Create and show the dialog.
        DialogFragment dialog = AppsMallDetailDialogFragment.newInstance(guid);
        dialog.setTargetFragment(this, 0);
        dialog.show(ft, "dialog");
    }

    @Override
    public void onBackPressed() {
        //TODO: if coming from apps builder pop backstack, otherwise do not
        getActivity().getFragmentManager().popBackStack();
    }

    @Override
    public void onYesClick() {
        adapter.setAdded(toggleSelected(selectedAppDetail));
        adapter.notifyDataSetChanged();
        android.app.FragmentTransaction ft = getActivity().getFragmentManager().beginTransaction();
        android.app.DialogFragment prev = (DialogFragment)getActivity().getFragmentManager().findFragmentByTag("dialog");
        ft.commit();
        prev.dismiss();
    }

    @Override
    public void onNoClick() {
        android.app.FragmentTransaction ft = getActivity().getFragmentManager().beginTransaction();
        android.app.DialogFragment prev = (DialogFragment)getActivity().getFragmentManager().findFragmentByTag("dialog");
        ft.commit();
        prev.dismiss();
    }

    @Override
    public String getYesText() {
        return dashboardService.find(dashboardGuid).hasWidget(
                widgetService.find(this.selectedAppDetail)) ? "Remove" : "Add";
    }

    @Override
    public String getNoText() {
        return "Cancel";
    }

    public enum AppsMallFragmentType {
        BUILDER,
        MALL
    }

    private CompoundButton.OnCheckedChangeListener switchListener = new CompoundButton.OnCheckedChangeListener(){

        @Override
        public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
            SharedPreferences sharedPreferences = getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
            sharedPreferences.edit().putBoolean(getString(R.string.showAllWidgetsPreference), !isChecked).commit();
            adapter.loadData();
            LogManager.log(Level.INFO,"Changing show all preference");
        }
    };
}