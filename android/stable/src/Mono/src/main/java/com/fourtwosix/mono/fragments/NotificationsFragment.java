package com.fourtwosix.mono.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.fourtwosix.mono.R;

/**
 * Created by Eric on 1/13/14.
 */
public class NotificationsFragment extends BaseFragment {
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_notifications_layout, container, false);
    }
}