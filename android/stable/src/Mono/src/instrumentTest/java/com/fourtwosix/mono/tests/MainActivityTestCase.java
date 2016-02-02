package com.fourtwosix.mono.tests;

import android.test.ActivityInstrumentationTestCase2;
import android.view.View;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.activities.MainActivity;
import com.fourtwosix.mono.utils.LogManager;

import java.util.logging.Level;

/**
 * Created by Eric on 12/2/13.
 */
public class MainActivityTestCase extends ActivityInstrumentationTestCase2<MainActivity> {

    private MainActivity mainActivity;
    private View drawerLayout;
    private View navigationDrawer;
    private View notificationDrawer;

    public MainActivityTestCase() {
        super(MainActivity.class);
    }

    @Override
    public void setUp() throws Exception {
        try {
            super.setUp();

            //set this value to allow for UI testing to sendKeys
            setActivityInitialTouchMode(false);
            mainActivity = getActivity();
            drawerLayout = mainActivity.findViewById(R.id.drawer_layout);
            navigationDrawer = mainActivity.findViewById(R.id.navigation_drawer_left);

            //TestHelper.unlockKeyGuard(this, mainActivity);
        } catch (Exception e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        }
    }

    @Override
    public void tearDown() throws Exception {
        super.tearDown();

        //relock the keyguard
        //TestHelper.relockKeyGuard();
    }

    // public void testVisibility() {
    //      ViewAsserts.assertHasScreenCoordinates(drawerLayout, navigationDrawer, -119, 0);
    //      ViewAsserts.assertHasScreenCoordinates(drawerLayout, notificationDrawer, drawerLayout.getWidth(), 0);
    //   }

//    public void testNavigationOpen() {
//        mainActivity.runOnUiThread(new Runnable() {
//            @Override`
//            public void run() {
//                mainActivity.getNavigationDrawerFragment().open();
//            }
//        });
//
//        getInstrumentation().waitForIdleSync();
//        ViewAsserts.assertOnScreen(drawerLayout, navigationDrawer);
//    }
}
