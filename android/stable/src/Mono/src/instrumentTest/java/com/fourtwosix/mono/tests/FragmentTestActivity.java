package com.fourtwosix.mono.tests;

import android.app.Fragment;
import android.os.Bundle;
import android.support.v7.app.ActionBarActivity;
import android.view.Menu;
import android.view.MenuItem;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.fragments.NavigationDrawerFragment;
import com.fourtwosix.mono.structures.User;

/**
 * This class will help to facilitate testing fragments as they require an activity.
 * This will be achieved by creating a standard fragment which creates a sample user object.
 * Created by Eric on 1/31/14.
 */
public class FragmentTestActivity extends ActionBarActivity implements NavigationDrawerFragment.NavigationDrawerCallbacks {
    public Fragment fragment;

    public User user;
    public static final int USERID = 1;
    public static final String USERNAME="testUser";
    public static final String EMAIL="testUser@testing.com";
    public static final String DISPLAYNAME = "Test User";
    public static final String[] GROUPS = {"Users", "Admins"};
    public static final String SERVER = "https://monover.42six.com/owf/";

    public FragmentTestActivity() {

    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        //Create our sample user
        user = new User();
        user.setId(USERID);
        user.setUserName(USERNAME);
        user.setEmail(EMAIL);
        user.setDisplayName(DISPLAYNAME);
        user.setServer(SERVER);
        user.setGroupNames(GROUPS);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        return super.onOptionsItemSelected(item);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public void onNavigationDrawerItemSelected(int position) {

    }
}
