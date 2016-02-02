package com.fourtwosix.mono.tests;

import android.app.Fragment;
import android.app.FragmentManager;
import android.content.res.Configuration;
import android.test.ActivityInstrumentationTestCase2;
import android.test.ViewAsserts;
import android.view.View;
import android.widget.GridView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.fragments.DashboardsFragment;
import com.fourtwosix.mono.fragments.WidgetFragment;
import com.fourtwosix.mono.structures.WidgetListItem;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.UUID;

/**
 * Created by Eric on 1/31/14.
 */
public class WidgetsFragmentTestCase extends ActivityInstrumentationTestCase2<FragmentTestActivity> {

    private FragmentTestActivity activity;
    private DataServiceFactory factory;
    private WidgetDataService dataService;

    private View rootView;
    private View fragmentContainer;

    private int numWidgetsToTest = 10;

    public WidgetsFragmentTestCase() {
        super(FragmentTestActivity.class);
    }

    @Override
    protected void setUp() throws Exception {
        super.setUp();

        factory = DataServiceFactory.create(getActivity(), "https://monover.42six.com/owf/");
        dataService = (WidgetDataService)factory.getService(DataServiceFactory.Services.WidgetsDataService);

        //create sample "widgets"
        for(int i = 0; i < numWidgetsToTest; i++) {
            WidgetListItem item = new WidgetListItem();
            item.setTitle("Widget " + i);
            item.setDescription("The widget at index " + i);
            item.setGuid(UUID.randomUUID().toString());
            item.setUrl("http://www.42six.com/");

            dataService.put(item);
        }

        setActivityInitialTouchMode(false);

        DashboardsFragment fragment = new DashboardsFragment();
        activity = getActivity();
        activity.fragment = fragment;

        rootView = activity.findViewById(R.id.drawer_layout);
        fragmentContainer = activity.findViewById(R.id.container);

        FragmentManager fragmentManager = getActivity().getFragmentManager();
        fragmentManager.beginTransaction().replace(R.id.container, fragment).commit();
    }

    @Override
    public void tearDown() throws Exception {
        super.tearDown();

        //clear the database
        ArrayList<WidgetListItem> itemsToRemove = new ArrayList<WidgetListItem>();

        //read back the list just in case extras were added somewhere
        dataService = (WidgetDataService)factory.getService(DataServiceFactory.Services.WidgetsDataService);
        Iterator<WidgetListItem> iterator = dataService.list().iterator();
        while(iterator.hasNext()) {
            WidgetListItem item = iterator.next();
            itemsToRemove.add(item);
        }

        //remove them from the database
        for(WidgetListItem item : itemsToRemove) {
            dataService.remove(item);
        }
    }

    /**
     * Test that the grid view is visible upon load
     */
    public void testVisibility() {
        getInstrumentation().waitForIdleSync();
        ViewAsserts.assertOnScreen(rootView, fragmentContainer);

    }

    /**
     * Test that the number of columns depends on the orientation of the device
     */
    public void testColumns() {
        getInstrumentation().waitForIdleSync();
        final DashboardsFragment fragment = (DashboardsFragment)activity.fragment;
        int numColumns = fragment.getGridView().getNumColumns();

        if (getInstrumentation().getTargetContext().getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE) {
            assertEquals(4, numColumns);
        } else {
            assertEquals(3, numColumns);
        }
    }

    /**
     * Test that the number of widgets in the list is equal to the number we created in setup
     */
    public void testCount() {
        getInstrumentation().waitForIdleSync();
        DashboardsFragment fragment = (DashboardsFragment)activity.fragment;
        int count = fragment.getGridView().getAdapter().getCount();
        assertEquals(numWidgetsToTest, count);
    }

    /**
     * Test a click event on the widget list to make sure that a WidgetFragment gets loaded
     */
    public void testClick() {
        getInstrumentation().waitForIdleSync();
        final DashboardsFragment fragment = (DashboardsFragment)activity.fragment;

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                //call touch on the grid view to "load" a widget fragment
                GridView gridView = fragment.getGridView();
                gridView.requestFocusFromTouch();
                gridView.setSelection(0);
                gridView.performItemClick(gridView.getAdapter().getView(0, null, null), 0, gridView.getAdapter().getItemId(0));
            }
        });

        getInstrumentation().waitForIdleSync();

        //should have loaded a widget fragment
        Fragment widgetFragment = activity.getFragmentManager().findFragmentById(R.id.container);
        assertSame(WidgetFragment.class, widgetFragment.getClass());
    }
}
