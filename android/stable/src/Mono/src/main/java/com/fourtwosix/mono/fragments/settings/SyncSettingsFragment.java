package com.fourtwosix.mono.fragments.settings;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CompoundButton;
import android.widget.Switch;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.fragments.BaseFragment;

/**
 * Created by Eric on 5/7/2014.
 */
public class SyncSettingsFragment extends BaseFragment {
    private SharedPreferences sharedPreferences;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_settings_sync, container, false);

        //Set the back click for the title
        rootView.findViewById(R.id.rlTitle).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                getActivity().getFragmentManager().popBackStack();
            }
        });

        sharedPreferences = getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);

        //set the sync apps switch
        Switch swSync = (Switch)rootView.findViewById(R.id.swSync);
        swSync.setChecked(sharedPreferences.getBoolean(getString(R.string.syncAppsPreference), true));
        swSync.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                sharedPreferences.edit().putBoolean(getString(R.string.syncAppsPreference),isChecked).commit();
            }
        });

        return rootView;
    }

    @Override
    public void onBackPressed() {
        getActivity().getFragmentManager().popBackStack();
    }
}