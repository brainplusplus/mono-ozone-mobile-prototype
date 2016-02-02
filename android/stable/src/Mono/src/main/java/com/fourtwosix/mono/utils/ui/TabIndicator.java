package com.fourtwosix.mono.utils.ui;

import android.content.Context;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.fourtwosix.mono.R;

/**
 * Created by Eric on 1/16/14.
 */
public class TabIndicator {
    private int currentTabIndex = 0;

    private LinearLayout containerLayout;
    private Context context;

    private int numTabs;
    private String[] titles;
    private View[] tabs;

    /**
     *
     * @param context
     * @param titles
     * @param containerLayout
     */
    public TabIndicator(Context context, String[] titles, LinearLayout containerLayout) {
        this.context = context;
        this.titles = titles;
        this.containerLayout = containerLayout;
        this.numTabs = titles.length;

        tabs = new View[numTabs];

        setup();
        setTab(0);
    }

    //initializes the tabs programmatically
    private void setup() {
        //create the params we will reuse
        LayoutInflater inflater = LayoutInflater.from(context);
        LinearLayout.LayoutParams layoutParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);

        setupTitles(layoutParams);
        setupIndicators(inflater, layoutParams);
    }

    private void setupTitles(LinearLayout.LayoutParams layoutParams) {
        //create a linear layout to hold the titles
        LinearLayout layout = new LinearLayout(context);
        layout.setLayoutParams(layoutParams);
        layout.setOrientation(LinearLayout.HORIZONTAL);

        //setup the titles
        for(int i = 0; i < numTabs; i++) {
            TextView textView = new TextView(context);
            textView.setText(titles[i]);

            //setting the weight to 1 with the layout params
            textView.setLayoutParams(layoutParams);
            textView.setGravity(Gravity.CENTER_HORIZONTAL);
            layout.addView(textView);
        }

        containerLayout.addView(layout);
    }

    private void setupIndicators(LayoutInflater inflater, LinearLayout.LayoutParams layoutParams) {
        //create a linear layout to hold the tab indicators
        LinearLayout layout = new LinearLayout(context);
        layout.setLayoutParams(layoutParams);
        layout.setOrientation(LinearLayout.HORIZONTAL);

        //setup the tabs
        for(int i = 0; i < numTabs; i++) {
            LinearLayout tab = (LinearLayout) inflater.inflate(R.layout.partial_swipe_tab_layout, null);
            tab.setVisibility(View.VISIBLE);
            layout.addView(tab);
            tabs[i] = layout;
        }

        containerLayout.addView(layout);
    }

    /**
     * Sets the currently
     * @param index
     */
    public void setTab(int index) {
        tabs[currentTabIndex].setVisibility(View.INVISIBLE);
        tabs[index].setVisibility(View.VISIBLE);
        currentTabIndex = index;
    }
}
