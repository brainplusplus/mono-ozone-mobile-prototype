package com.fourtwosix.mono.fragments;

import android.app.Fragment;

import com.fourtwosix.mono.activities.MainActivity;

/**
 * Created by Eric on 1/28/14.
 */
public class BaseFragment extends Fragment {
    public void onBackPressed() {
        MainActivity activity = (MainActivity)getActivity();
        NavigationDrawerFragment navFragment = activity.getNavigationDrawerFragment();
        if(navFragment.isDrawerOpen()) {
            navFragment.close();
        } else {
            navFragment.open();
        }
    }

    @Override
    public void onDetach() {
        super.onDetach();
    }
}
