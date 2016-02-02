package com.fourtwosix.mono.activities;

import android.app.Fragment;
import android.app.FragmentManager;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.location.LocationListener;
import android.os.Bundle;
import android.os.Environment;
import android.os.IBinder;
import android.support.v4.widget.DrawerLayout;
import android.support.v7.app.ActionBarActivity;
import android.view.Menu;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.fragments.AppsBuilderFragment;
import com.fourtwosix.mono.fragments.AppsMallFragment;
import com.fourtwosix.mono.fragments.BaseFragment;
import com.fourtwosix.mono.fragments.DashboardsFragment;
import com.fourtwosix.mono.fragments.NavigationDrawerFragment;
import com.fourtwosix.mono.fragments.ProfileFragment;
import com.fourtwosix.mono.fragments.SettingsFragment;
import com.fourtwosix.mono.fragments.SignOutFragment;
import com.fourtwosix.mono.structures.NavItem;
import com.fourtwosix.mono.structures.User;
import com.fourtwosix.mono.utils.IOUtil;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.ui.ActionBarHelper;
import com.fourtwosix.mono.webViewIntercept.NotificationExecutor;

import java.io.File;
import java.util.HashMap;
import java.util.logging.Level;

public class MainActivity extends ActionBarActivity implements NavigationDrawerFragment.NavigationDrawerCallbacks {

    private NavigationDrawerFragment navigationDrawerFragment;
    private DashboardsFragment dashboardsFragment;
    private AppsBuilderFragment appsBuilderFragment;
    private AppsMallFragment appsMallFragment;
    private ProfileFragment profileFragment;

    private HashMap<FragmentName, NavItem> navItems;
    private User user;

    private ActionBarHelper actionBarHelper;

    public enum FragmentName { DASHBOARD, /*CHAT, NOTIFICATIONS,*/ SETTINGS, PROFILE, SIGNOUT };

    public MainActivity() {

    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        //TestFlight.passCheckpoint("Logged in");

        Intent callingIntent = getIntent();
        if(callingIntent.hasExtra("user")) {
            //convert the parceled extra into a User
            user = callingIntent.getParcelableExtra("user");
        }

        if(user == null) {
            //should always have a user object, if we do not have one then we should exit back to login
            finish();
            return;
        }

        DataServiceFactory.create(this, user.getServer());

        dashboardsFragment = new DashboardsFragment();
        appsMallFragment = new AppsMallFragment();
        appsBuilderFragment = new AppsBuilderFragment();
        profileFragment = new ProfileFragment();
        profileFragment.setUser(user);

        navItems = new HashMap<FragmentName, NavItem>();
        navItems.put(FragmentName.DASHBOARD, new NavItem(dashboardsFragment, R.drawable.applauncher_2x, "App Launcher"));
        /*navItems.put(FragmentName.CHAT, new NavItem(new ChatFragment(), R.drawable.icon_chat_small));
        navItems.put(FragmentName.NOTIFICATIONS, new NavItem(new NotificationsFragment(), R.drawable.icon_notification_small));*/
        navItems.put(FragmentName.SETTINGS, new NavItem(new SettingsFragment(), R.drawable.settings_2x, "Settings"));
        navItems.put(FragmentName.PROFILE, new NavItem(profileFragment, R.drawable.icon_user_small, "My Account"));
        navItems.put(FragmentName.SIGNOUT, new NavItem(new SignOutFragment(), R.drawable.signout_2x, "Sign Out"));

        //set all the fragments to retain instance except for the sign out fragment which should be last.
        for(int i = 0; i < navItems.size() - 1; i++) {
            navItems.get(FragmentName.values()[i]).getFragment().setRetainInstance(true);
        }
        dashboardsFragment.setRetainInstance(true);

        setNavigationDrawerFragment((NavigationDrawerFragment)getFragmentManager().findFragmentById(R.id.navigation_drawer_left));
        getNavigationDrawerFragment().setUp(R.id.navigation_drawer_left, navItems, (DrawerLayout) findViewById(R.id.drawer_layout));

        actionBarHelper = new ActionBarHelper(getActionBar(), getLayoutInflater(), new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                navigationDrawerFragment.toggle();
            }
        }, new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                actionBarHelper.reset();
                FragmentManager fragmentManager = getFragmentManager();
                fragmentManager.beginTransaction().replace(R.id.container, appsMallFragment).commit();
                LogManager.log(Level.INFO, "Got AppsMall Request");
            }
        }, new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                actionBarHelper.reset();
                FragmentManager fragmentManager = getFragmentManager();
                fragmentManager.beginTransaction().replace(R.id.container, appsBuilderFragment).commit();
                LogManager.log(Level.INFO, "Got AppBuilder Request");
            }
        });

        loadFragment(FragmentName.DASHBOARD);

        //PopupMenu menu = actionBarHelper.createOverflowMenu(this, R.menu.actionbar_overflow_menu);
        //menu.show();

        //TODO: Remove before release, this is for debugging ONLY
        //exportDatabase();
    }

    @Override
    public void onNavigationDrawerItemSelected(int position) {
           loadFragment(FragmentName.values()[position]);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        Intent callingIntent = getIntent();
        if(callingIntent.hasExtra(NotificationExecutor.CALLBACK_INTENT)) {
            //exec the callback function
            WebView original = (WebView)findViewById(R.id.webView);
            if(original != null){
                original.loadUrl("javascript:Mono.EventBus.runEvents('" + callingIntent.getStringExtra(NotificationExecutor.CALLBACK_INTENT) + "', {status: 'success'})");
            }
        }
    }

    /**
     * Loads a fragment to the main view
     * @param name
     */
    public void loadFragment(FragmentName name) {
        if(navItems != null) {

            if(actionBarHelper != null && name != FragmentName.DASHBOARD)
                actionBarHelper.reset();

            // update the main content by replacing fragments
            FragmentManager fragmentManager = getFragmentManager();
            fragmentManager.beginTransaction().replace(R.id.container, navItems.get(name).getFragment()).commit();

            //anytime we switch fragments we should make sure the keyboard closes
            InputMethodManager inputManager = (InputMethodManager)MainActivity.this.getSystemService(Context.INPUT_METHOD_SERVICE);
            View currentFocus = MainActivity.this.getCurrentFocus();
            if(currentFocus != null) {
                IBinder windowToken = currentFocus.getWindowToken();
                inputManager.hideSoftInputFromWindow(windowToken, InputMethodManager.HIDE_NOT_ALWAYS);
            }
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        //reset the action bar
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public void onBackPressed() {
        Fragment fragment = getFragmentManager().findFragmentById(R.id.container);
        ((BaseFragment)fragment).onBackPressed();
    }

    /**
     * Fragment managing the behaviors, interactions and presentation of the navigation drawer.
     */
    public NavigationDrawerFragment getNavigationDrawerFragment() {
        return navigationDrawerFragment;
    }

    public void setNavigationDrawerFragment(NavigationDrawerFragment navigationDrawerFragment) {
        this.navigationDrawerFragment = navigationDrawerFragment;
    }

    /**
     * This method is for debugging purposes only. It will copy out the mono sqlite db file
     * so that external tools can be used to inspect it.
     */
    private void exportDatabase() {
        File externalDirectory = Environment.getExternalStorageDirectory();
        File monoDB = new File("/data/data/com.fourtwosix.mono/databases/mono");
        File destination = new File(externalDirectory + File.separator + "mono" + File.separator + "mono.db");

        try {
            IOUtil.copy(monoDB, destination);
            LogManager.log(Level.INFO, "Exporting database to: " + destination.getAbsolutePath());
        } catch (Exception exception) {
            LogManager.log(Level.SEVERE, "Unable to export database", exception);
        }
    }

    private LocationListener getDummyLocationListener(){
        LocationListener listener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                //NO-OP Just keeping location up to date
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {
                //NO-OP Just keeping location up to date
            }

            @Override
            public void onProviderEnabled(String provider) {
                //NO-OP Just keeping location up to date
            }

            @Override
            public void onProviderDisabled(String provider) {
                //NO-OP Just keeping location up to date
            }
        };
        return listener;
    }

    /**
     * Gets the action bar helper
     * @return
     */
    public ActionBarHelper getActionBarHelper() {
        return actionBarHelper;
    }
}
