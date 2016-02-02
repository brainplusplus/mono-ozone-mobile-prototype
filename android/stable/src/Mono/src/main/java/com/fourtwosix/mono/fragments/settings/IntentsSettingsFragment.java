package com.fourtwosix.mono.fragments.settings;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.Spinner;
import android.widget.TableRow;
import android.widget.TextView;
import android.widget.Toast;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.adapters.BasicStyledSpinnerAdapter;
import com.fourtwosix.mono.data.models.Dashboard;
import com.fourtwosix.mono.data.services.DashboardsDataService;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.IDataService;
import com.fourtwosix.mono.data.services.IntentPreferenceService;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.fragments.BaseFragment;
import com.fourtwosix.mono.structures.OzoneIntentPreference;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * Created by Eric on 5/7/2014.
 */
public class IntentsSettingsFragment extends BaseFragment {
    private SharedPreferences sharedPreferences;
    private String clearMessage;

    //services
    private DashboardsDataService dashboardsDataService;
    private WidgetDataService widgetDataService;
    private IntentPreferenceService intentPreferenceService;

    //view references
    private Spinner spnDashboards;
    private Spinner spnApp;
    private Spinner spnAction;
    private TableRow tblRowApps;
    private TableRow tblRowActions;
    private TextView txtIntentClear;

    //adapters
    private BasicStyledSpinnerAdapter<Dashboard> dashboardAdapter;
    private BasicStyledSpinnerAdapter<Dashboard.Widget> appAdapter;
    private BasicStyledSpinnerAdapter<OzoneIntentPreference> actionAdapter;

    //selected items
    private Dashboard selectedDashboard;
    private Dashboard.Widget selectedWidget;
    private OzoneIntentPreference selectedIntent;

    private int clearStep = 0; //0 for dashboard, 1 for apps, 2 for intents/actions

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_settings_intents, container, false);

        //Set the back click for the title
        rootView.findViewById(R.id.rlTitle).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                getActivity().getFragmentManager().popBackStack();
            }
        });

        //set the enable intents checkbox
        sharedPreferences = getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
        CheckBox chkIntents = (CheckBox)rootView.findViewById(R.id.chkIntents);
        chkIntents.setChecked(sharedPreferences.getBoolean(getString(R.string.enableIntentsPreference), true));
        chkIntents.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                sharedPreferences.edit().putBoolean(getString(R.string.enableIntentsPreference), b).commit();
            }
        });

        //view references
        spnDashboards = (Spinner)rootView.findViewById(R.id.spnDashboards);
        spnApp = (Spinner)rootView.findViewById(R.id.spnApp);
        spnAction = (Spinner)rootView.findViewById(R.id.spnAction);

        //table rows which are initially hidden
        tblRowApps = (TableRow)rootView.findViewById(R.id.tblRowApps);
        tblRowActions = (TableRow)rootView.findViewById(R.id.tblRowActions);
        txtIntentClear = (TextView)rootView.findViewById(R.id.txtClear);


        //get the data services we will use
        dashboardsDataService = (DashboardsDataService)DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService);
        widgetDataService = (WidgetDataService)DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
        intentPreferenceService = (IntentPreferenceService)DataServiceFactory.getService(DataServiceFactory.Services.IntentPreferenceService);

        //get the dashboards
        final ArrayList<Dashboard> dashboards = new ArrayList<Dashboard>();
        Iterator<Dashboard> iterator = dashboardsDataService.list().iterator();
        while(iterator.hasNext()) {
            dashboards.add(iterator.next());
        }

        //setup the dashboard drop down spinner
        dashboardAdapter = new BasicStyledSpinnerAdapter<Dashboard>(getActivity(), dashboards);
        spnDashboards.setAdapter(dashboardAdapter);
        spnDashboards.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> adapterView, View view, int i, long l) {
                selectedIntent = null;
                selectedWidget = null;

                selectedDashboard = dashboards.get(i);

                updateApps();

                setClearMessage();
            }

            @Override
            public void onNothingSelected(AdapterView<?> adapterView) {

            }
        });

        //setup the app drop down spinner
        appAdapter = new BasicStyledSpinnerAdapter<Dashboard.Widget>(getActivity(), new ArrayList<Dashboard.Widget>()); //passing in empty list because it will be populated by dashboards
        spnApp.setAdapter(appAdapter);
        spnApp.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> adapterView, View view, int position, long l) {
                selectedWidget = (Dashboard.Widget)appAdapter.getItem(position);

                //account for the "extra" blank one
                if(position > 0) {
                    updateActions();

                    selectedIntent = null;
                    clearStep = 1; //for widgets

                } else {
                    tblRowActions.setVisibility(View.GONE);
                    selectedIntent = null;
                    clearStep = 0; //revert back to dashboards
                }

                setClearMessage();
            }

            @Override
            public void onNothingSelected(AdapterView<?> adapterView) {

            }
        });

        //setup the action drop down spinner
        actionAdapter = new BasicStyledSpinnerAdapter<OzoneIntentPreference>(getActivity(), new ArrayList<OzoneIntentPreference>());
        spnAction.setAdapter(actionAdapter);
        spnAction.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> adapterView, View view, int i, long l) {
                if(i > 0) {
                    selectedIntent = (OzoneIntentPreference)actionAdapter.getItem(i);
                    clearStep = 2;
                } else {
                    clearStep = 1;
                }
                setClearMessage();
            }

            @Override
            public void onNothingSelected(AdapterView<?> adapterView) {

            }
        });


        Button btnDelete = (Button)rootView.findViewById(R.id.btnDelete);
        btnDelete.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                List<OzoneIntentPreference> preferencesToDelete = new ArrayList<OzoneIntentPreference>();
                switch(clearStep) {
                    case 0:
                        preferencesToDelete = intentPreferenceService.find(new IDataService.DataModelSearch<OzoneIntentPreference>() {
                            @Override
                            public boolean search(OzoneIntentPreference param) {
                                if(param.getDashboardGuid().equals(selectedDashboard.getGuid())) {
                                    return true;
                                }
                                return false;
                            }
                        });
                        break;
                    case 1:
                        preferencesToDelete = intentPreferenceService.find(new IDataService.DataModelSearch<OzoneIntentPreference>() {
                            @Override
                            public boolean search(OzoneIntentPreference param) {
                                if(param.getDashboardGuid().equals(selectedDashboard.getGuid()) && param.getSender().equals(selectedWidget.instanceId)) {
                                    return true;
                                }
                                return false;
                            }
                        });
                        break;
                    case 2:
                        preferencesToDelete = new ArrayList<OzoneIntentPreference>();
                        preferencesToDelete.add(selectedIntent);
                        break;
                }

                for(OzoneIntentPreference preference : preferencesToDelete) {
                    intentPreferenceService.remove(preference);
                }

                Toast.makeText(getActivity(), "Preferences cleared!", Toast.LENGTH_SHORT).show();
                updateApps();
                updateActions();
            }
        });

        setClearMessage();

        return rootView;
    }

    /**
     * Sets the clear message
     */
    private void setClearMessage() {
        clearMessage = getString(R.string.intents_clear_text);
        switch(clearStep) {
            case 0:
                clearMessage = clearMessage.replace("{0}", "composite app");
                break;
            case 1:
                clearMessage = clearMessage.replace("{0}", "app");
                break;
            case 2:
                clearMessage = clearMessage.replace("{0}", "intent");
                break;
        }

        txtIntentClear.setText(clearMessage);
    }


    private void updateApps() {
        //populate the apps row
        ArrayList<Dashboard.Widget> widgetListItems = new ArrayList<Dashboard.Widget>();
        for(Dashboard.Widget widget : selectedDashboard.getWidgets()) {
            widgetListItems.add(widget);
        }

        //show the next steps if need be
        if(widgetListItems.size() > 0) {
            tblRowApps.setVisibility(View.VISIBLE);

            //add a blank widget
            widgetListItems.add(0, new Dashboard.Widget());
            appAdapter.setData(widgetListItems);
        } else {
            tblRowApps.setVisibility(View.GONE);
            tblRowActions.setVisibility(View.GONE);
        }
    }

    /**
     * Updates the actions adapter
     */
    private void updateActions() {
        //load intents in the selected dashboard for the selected widget
        List<OzoneIntentPreference> preferences = intentPreferenceService.find(new IDataService.DataModelSearch<OzoneIntentPreference>() {
            @Override
            public boolean search(OzoneIntentPreference param) {
                if(param.getDashboardGuid().equals(selectedDashboard.getGuid()) &&  param.getSender().equals(selectedWidget.instanceId)) {
                    return true;
                }
                return false;
            }
        });

        if(preferences.size() > 0) {
            tblRowActions.setVisibility(View.VISIBLE);
        } else {
            tblRowActions.setVisibility(View.GONE);
        }

        //add blank preference
        preferences.add(0, new OzoneIntentPreference());
        actionAdapter.setData(preferences);
    }

    @Override
    public void onBackPressed() {
        getActivity().getFragmentManager().popBackStack();
    }
}