package com.fourtwosix.mono.utils.ui;

import android.app.ActionBar;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.MenuInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.PopupMenu;
import android.widget.RelativeLayout;

import com.fourtwosix.mono.R;

/**
 * ActionBar helper class
 * Created by Eric on 6/9/2014.
 */
public class ActionBarHelper {

    //necessary components
    private ActionBar actionBar;
    private LayoutInflater inflater;

    //original layout
    private View rootLayout, divAppsBuilder;
    private RelativeLayout rlLogoLayout;
    private ImageView bannerLogo;
    private ImageView imgRefresh;
    private PopupMenu overflowMenu;

    /**
     * Default Constructor
     * @param actionBar The action bar
     * @param inflater layout inflater
     * @param navMenuListener Navigation menu listener
     * @param appsMallListener Apps Mall listener
     * @param appsBuilderListener Apps Builder listener
     */
    public ActionBarHelper(ActionBar actionBar, LayoutInflater inflater, View.OnClickListener navMenuListener, View.OnClickListener appsMallListener, View.OnClickListener appsBuilderListener) {
        this.actionBar = actionBar;
        this.inflater = inflater;

        //start creating the custom action bar
        rootLayout = inflater.inflate(R.layout.actionbar_layout, null);

        //Get the menu image
        ImageView imgMenu = (ImageView)rootLayout.findViewById(R.id.imgMenu);
        imgMenu.setOnClickListener(navMenuListener);

        //Get the apps mall image
        ImageView imgAppsMall = (ImageView)rootLayout.findViewById(R.id.imgAppsMall);
        imgAppsMall.setOnClickListener(appsMallListener);

        //Get the apps builder image
        ImageView imgAppsBuilder = (ImageView)rootLayout.findViewById(R.id.imgAppsBuilder);
        imgAppsBuilder.setOnClickListener(appsBuilderListener);

        //Get the banner logo
        rlLogoLayout = (RelativeLayout)rootLayout.findViewById(R.id.rlLogoLayout);
        bannerLogo = (ImageView)rlLogoLayout.findViewById(R.id.imgBanner);

        //get the overflow icon
        imgRefresh = (ImageView)rootLayout.findViewById(R.id.imgRefresh);
        divAppsBuilder = rootLayout.findViewById(R.id.divAppsBuilder);
    }

    /**
     * Resets the action bar to the original
     */
    public void reset() {
        //reset the title
        rlLogoLayout.removeAllViews();
        rlLogoLayout.addView(bannerLogo);

        //set the action bar
        actionBar.setDisplayShowHomeEnabled(false);
        actionBar.setDisplayShowTitleEnabled(false);
        actionBar.setCustomView(rootLayout);
        actionBar.setDisplayShowCustomEnabled(true);

        //unset the onclick listener
        imgRefresh.setOnClickListener(null);
        imgRefresh.setVisibility(View.GONE);
        divAppsBuilder.setVisibility(View.GONE);
    }

    /**
     * Sets a layout to replace the title
     * @param view
     */
    public void setTitleLayout(View view) {
        rlLogoLayout.removeAllViews();
        rlLogoLayout.addView(view);
    }

    /**
     * Set the overflow menu
     * @param context
     * @return
     */
    public PopupMenu createOverflowMenu(Context context, int menuResource) {
        overflowMenu = new PopupMenu(context, imgRefresh);
        MenuInflater menuInflater = overflowMenu.getMenuInflater();
        menuInflater.inflate(menuResource, null);
        imgRefresh.setOnClickListener(overflowClickListener);
        return overflowMenu;
    }

    private View.OnClickListener overflowClickListener = new View.OnClickListener() {
        @Override
        public void onClick(View v) {
            overflowMenu.show();
        }
    };

    /**
     * Sets the onclick listener for the refresh button
     * @param onClickListener
     */
    public void registerRefreshListener(View.OnClickListener onClickListener) {
        imgRefresh.setOnClickListener(onClickListener);
        imgRefresh.setVisibility(View.VISIBLE);
        divAppsBuilder.setVisibility(View.VISIBLE);
    }
}
