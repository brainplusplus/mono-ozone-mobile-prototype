package com.fourtwosix.mono.fragments;

import android.app.FragmentManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.CompoundButton;
import android.widget.GridView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.fourtwosix.mono.R;
import com.fourtwosix.mono.activities.MainActivity;
import com.fourtwosix.mono.adapters.DashboardAdapter;
import com.fourtwosix.mono.adapters.WidgetAdapter;
import com.fourtwosix.mono.data.services.DashboardsDataService;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.services.SyncDashboardsTask;
import com.fourtwosix.mono.utils.AppsMallWidgetDownloader;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.WidgetImageDownloadHelper;
import com.fourtwosix.mono.utils.caching.VolleySingleton;
import com.fourtwosix.mono.utils.ui.ActionBarHelper;

import org.json.JSONObject;

import java.util.logging.Level;

/**
 * Created by Eric on 11/27/13.
 */
public class DashboardsFragment extends BaseFragment {

    private GridView gridView;
    private View tabIndicator1, tabIndicator2;
    private TextView tab1, tab2;
    private CompoundButton mobileOnlySwitch;
    private DashboardAdapter dashboardAdapter;
    private WidgetAdapter widgetAdapter;
    private WidgetImageDownloadHelper widgetImageDownloadHelper;
    private int selectedTab = 1;

    private String baseUrl;
    private RequestQueue mVolleyQueue;

    public DashboardsFragment() {
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setHasOptionsMenu(true);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        mVolleyQueue = VolleySingleton.getInstance(getActivity().getApplicationContext()).getRequestQueue();

        SharedPreferences sharedPreferences = getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
        final LinearLayout rootView = (LinearLayout) inflater.inflate(R.layout.fragment_dashboards_layout, container, false);

        //set on clicks for the tabs and hold references to the indicators
        tab1 = (TextView)rootView.findViewById(R.id.txtTab1);
        tab2 = (TextView)rootView.findViewById(R.id.txtTab2);
        mobileOnlySwitch = (CompoundButton) rootView.findViewById(R.id.mobileOnlySwitch);
        mobileOnlySwitch.setChecked(!sharedPreferences.getBoolean(getString(R.string.showAllWidgetsPreference),false));
        mobileOnlySwitch.setOnCheckedChangeListener(switchListener);
        tab1.setOnClickListener(tabListener);
        tab2.setOnClickListener(tabListener);
        tabIndicator1 = rootView.findViewById(R.id.tab1);
        tabIndicator2 = rootView.findViewById(R.id.tab2);

        FragmentManager fragmentManager = getActivity().getFragmentManager();
        widgetAdapter = new WidgetAdapter(fragmentManager, getActivity());
        dashboardAdapter = new DashboardAdapter(fragmentManager, getActivity());

        setGridView((GridView) rootView.findViewById(R.id.apps));
        setTabActive(selectedTab);
        if (getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE) {
            getGridView().setNumColumns(4);
        } else {
            getGridView().setNumColumns(3);
        }


        baseUrl = sharedPreferences.getString(getString(R.string.serverUrlPreference), null);
        widgetImageDownloadHelper = new WidgetImageDownloadHelper(getActivity(), imagesDownloadHandler, baseUrl);

        return rootView;
    }

    @Override
    public void onResume() {
        super.onResume();
        ActionBarHelper actionBarHelper = ((MainActivity)getActivity()).getActionBarHelper();
        actionBarHelper.reset();
        actionBarHelper.registerRefreshListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (getActivity() != null) {
                    AppsMallWidgetDownloader.updateAppStoreWidgets(getActivity());
                    Toast.makeText(getActivity(), "Refreshing list...", Toast.LENGTH_SHORT).show();
                }

                switch (selectedTab) {
                    case 1:
                        String restUrl = baseUrl + getActivity().getString(R.string.widgetListPath);
                        mVolleyQueue.getCache().remove(restUrl);
                        JsonObjectRequest jsonObjRequest = new JsonObjectRequest(Request.Method.GET, restUrl, null,
                                createRequestWidgetItemSuccessListener(),
                                createRequestWidgetItemErrorListener());
                        mVolleyQueue.add(jsonObjRequest);
                        break;
                    case 2:
                        //TestFlight.passCheckpoint("Composite Apps Viewed");
                        DashboardsDataService dataService = (DashboardsDataService) DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService);
                        dataService.sync(dashboardsSyncHandler);
                        break;
                }
            }
        });

        new SyncDashboardsTask(dashboardsSyncHandler).execute();
    }

    private Handler dashboardsSyncHandler = new Handler() {
        @Override
        public void handleMessage(Message message) {
            Bundle bundle = message.getData();
            if(bundle.containsKey("success") && bundle.getBoolean("success")) {
                dashboardAdapter.refresh();
                Toast.makeText(getActivity(), "Finished composite apps refresh!", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(getActivity(), "Failed to retrieve composite apps", Toast.LENGTH_SHORT).show();
                LogManager.log(Level.SEVERE, "Failed to refresh composite apps list");
            }
        }
    };

    private void setTabActive(int tab) {
        switch(tab) {
            case 1:
                tabIndicator1.setVisibility(View.VISIBLE);
                tabIndicator2.setVisibility(View.INVISIBLE);
                tab1.setTextColor(getResources().getColor(R.color.primary3));
                tab2.setTextColor(Color.WHITE);
                getGridView().setAdapter(widgetAdapter);
                getGridView().setOnItemClickListener(widgetGridViewOnClickListener);
                selectedTab = 1;
                break;
            case 2:
                tabIndicator2.setVisibility(View.VISIBLE);
                tabIndicator1.setVisibility(View.INVISIBLE);
                tab2.setTextColor(getResources().getColor(R.color.primary3));
                tab1.setTextColor(Color.WHITE);
                getGridView().setAdapter(dashboardAdapter);
                getGridView().setOnItemClickListener(dashboardGridViewOnClickListener);
                getGridView().setOnItemLongClickListener(dashboardAdapter.onItemLongClickListener);
                selectedTab = 2;
                break;
        }
    }

    private AdapterView.OnItemClickListener widgetGridViewOnClickListener = new AdapterView.OnItemClickListener() {
        @Override
        public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
            //reset the action bar before forwarding the onclick which loads a new fragment
            ActionBarHelper actionBarHelper = ((MainActivity)getActivity()).getActionBarHelper();
            actionBarHelper.reset();

            widgetAdapter.onClickListener.onItemClick(parent, view, position, id);
        }
    };

    private AdapterView.OnItemClickListener dashboardGridViewOnClickListener = new AdapterView.OnItemClickListener() {
        @Override
        public void onItemClick(AdapterView<?> parent, View view, int position, long id) {

            //reset the action bar before forwarding the onclick which loads a new fragment
            ActionBarHelper actionBarHelper = ((MainActivity)getActivity()).getActionBarHelper();
            actionBarHelper.reset();
            dashboardAdapter.onClickListener.onItemClick(parent, view, position, id);
        }
    };

    private Response.Listener<JSONObject> createRequestWidgetItemSuccessListener() {
        return new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                //let the data service worry about insertion/deduplication
                WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
                dataService.put(baseUrl,response);

                //download the images
                widgetImageDownloadHelper.downloadImages(dataService.getWidgets());
            }
        };
    }

    private Response.ErrorListener createRequestWidgetItemErrorListener() {
        return new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                if(getActivity() != null) {
                    Toast.makeText(getActivity(), "Failed to retrieve components.", Toast.LENGTH_SHORT).show();
                }
                LogManager.log(Level.SEVERE, "Exception in getWidgetList", error);
            }
        };
    }

    /**
     * Handler that receives the empty response that downloading the new widget images has finished
     */
    private Handler imagesDownloadHandler = new Handler() {
        @Override
        public void handleMessage (Message message) {
            //refresh
            widgetAdapter.loadData();
            if(getActivity() != null) {
                Toast.makeText(getActivity(), "Finished components refresh!", Toast.LENGTH_SHORT).show();
            }
        }
    };

    //Onclick listener for the tabs.
    private View.OnClickListener tabListener = new View.OnClickListener() {
        @Override
        public void onClick(View view) {
            switch(view.getId()) {
                case R.id.txtTab1:
                    setTabActive(1);
                    break;
                case R.id.txtTab2:
                    setTabActive(2);
                    break;
            }
        }
    };

    private CompoundButton.OnCheckedChangeListener switchListener = new CompoundButton.OnCheckedChangeListener(){

        @Override
        public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
            SharedPreferences sharedPreferences = getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
            sharedPreferences.edit().putBoolean(getString(R.string.showAllWidgetsPreference), !isChecked).commit();
            widgetAdapter.loadData();
            dashboardAdapter.refresh();
            LogManager.log(Level.INFO,"Changing show all preference");
        }
    };



    public GridView getGridView() {
        return gridView;
    }

    public void setGridView(GridView gridView) {
        this.gridView = gridView;
    }
}