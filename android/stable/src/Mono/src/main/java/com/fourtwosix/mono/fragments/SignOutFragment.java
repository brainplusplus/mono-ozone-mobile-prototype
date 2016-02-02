package com.fourtwosix.mono.fragments;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.fourtwosix.mono.R;

/**
 * Created by Eric on 11/27/13.
 */
public class SignOutFragment extends BaseFragment {
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        SharedPreferences sharedPref = getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
        sharedPref.edit().putBoolean(getString(R.string.autoLoginPreference), false).commit();
        getActivity().finish();
        /*Intent intent = new Intent(getActivity(), LoginActivity.class);
        intent.setFlags(intent.getFlags() | Intent.FLAG_ACTIVITY_NO_HISTORY); //start the activity without saving the login activity into the backstack
        startActivity(intent);*/
        return null;
    }
}