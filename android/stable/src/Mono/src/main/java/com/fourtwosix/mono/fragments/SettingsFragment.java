package com.fourtwosix.mono.fragments;

import android.app.Fragment;
import android.app.FragmentManager;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.RelativeLayout;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.fragments.settings.IntentsSettingsFragment;
import com.fourtwosix.mono.fragments.settings.MarketplaceSettingsFragment;
import com.fourtwosix.mono.fragments.settings.OfflineSettingsFragment;
import com.fourtwosix.mono.fragments.settings.SyncSettingsFragment;

/**
 * Created by Eric on 11/27/13.
 */
public class SettingsFragment extends BaseFragment {

    public SettingsFragment() {}

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        //TestFlight.passCheckpoint("Settings Viewed");

        View rootView = inflater.inflate(R.layout.fragment_settings_layout, container, false);

        View rlSync = rootView.findViewById(R.id.rlSync);
        rlSync.setOnClickListener(clickListener);

        View rlIntents = rootView.findViewById(R.id.rlIntents);
        rlIntents.setOnClickListener(clickListener);

        View rlMarketplace = rootView.findViewById(R.id.rlMarketplace);
        rlMarketplace.setOnClickListener(clickListener);

        View rlOffline = rootView.findViewById(R.id.rlOffline);
        rlOffline.setOnClickListener(clickListener);

        return rootView;
    }

    //Shared onclick listener
    private RelativeLayout.OnClickListener clickListener = new RelativeLayout.OnClickListener() {
        @Override
        public void onClick(View view) {
            switch(view.getId()) {
                case R.id.rlSync:
                    loadSettingsFragment(new SyncSettingsFragment());
                    break;
                case R.id.rlIntents:
                    loadSettingsFragment(new IntentsSettingsFragment());
                    break;
                case R.id.rlMarketplace:
                    loadSettingsFragment(new MarketplaceSettingsFragment());
                    break;
                case R.id.rlOffline:
                    loadSettingsFragment(new OfflineSettingsFragment());
                    break;
            }
        }
    };

    /**
     * Loads the settings fragment passed in
     * @param fragment
     */
    private void loadSettingsFragment(Fragment fragment) {
        FragmentManager fragmentManager = getActivity().getFragmentManager();
        fragmentManager.beginTransaction().replace(R.id.container, fragment).addToBackStack(null).commit();
    }
}