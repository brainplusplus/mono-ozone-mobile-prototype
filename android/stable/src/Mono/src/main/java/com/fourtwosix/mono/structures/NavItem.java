package com.fourtwosix.mono.structures;

import com.fourtwosix.mono.fragments.BaseFragment;

/**
 * Created by Eric on 11/27/13.
 */
public class NavItem {
    private int iconId = 0;
    private String name;
    private BaseFragment fragment;

    public NavItem(BaseFragment fragment) {
        this.setFragment(fragment);
    }

    public NavItem(BaseFragment fragment, int iconId, String name) {
        this.setFragment(fragment);
        this.iconId = iconId;
        this.name = name;
    }

    public BaseFragment getFragment() {
        return fragment;
    }

    public void setFragment(BaseFragment fragment) {
        this.fragment = fragment;
    }

    public int getIconId() {
        return iconId;
    }

    public void setIconId(int iconId) {
        this.iconId = iconId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
