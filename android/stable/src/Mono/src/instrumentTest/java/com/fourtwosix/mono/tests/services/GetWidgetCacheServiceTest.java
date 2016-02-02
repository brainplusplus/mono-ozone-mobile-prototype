package com.fourtwosix.mono.tests.services;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Intent;
import android.content.Context;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Parcelable;
import android.test.ServiceTestCase;
import android.test.suitebuilder.annotation.MediumTest;
import android.test.suitebuilder.annotation.SmallTest;
import android.util.Log;

import com.fourtwosix.mono.services.UrlCachingService;
//import com.fourtwosix.mono.tests.utilities.AutoLogin;
import com.fourtwosix.mono.R;
import com.fourtwosix.mono.services.GetWidgetCacheService;
//import com.fourtwosix.mono.tests.utilities.AutoLogin;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.caching.VolleySingleton;
import com.fourtwosix.mono.controllers.GetWidgetCacheServiceController;
import java.util.Arrays;
import java.util.Date;
import java.util.logging.Level;

public class GetWidgetCacheServiceTest extends ServiceTestCase<GetWidgetCacheService> {
    Context context;
    final String WIDGETS_EXTRA = "widgets";
    final String WIDGET_URL_GET_PARAMS_EXTRA = "widgetUrlGetParams";

    volatile boolean testPassed=false;

    private BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {

                String[] urls = bundle.getStringArray(GetWidgetCacheService.URLS);
                if(urls != null) {
                    testPassed=true;
                }

            }
        }
    };


    public GetWidgetCacheServiceTest(Class<GetWidgetCacheService> serviceClass) {
        super(serviceClass);
    }

    public GetWidgetCacheServiceTest() {
        super(GetWidgetCacheService.class);
    }

    /**
     * Test basic startup/shutdown of the service
     */
    @SmallTest
    public void testStartable(){
        Intent startIntent = new Intent();
        startIntent.setClass(getContext(), GetWidgetCacheService.class);
        startService(startIntent);
    }


    protected void setUp() throws Exception {
        super.setUp();
        context = getContext();

    }

    private Intent getWidgetIntent2(int widgetCount) {
        Intent intent = new Intent("com.fourtwosix.mono.services.GetWidgetCacheService");
        intent.putExtra(WIDGETS_EXTRA, getParcelableWidgets(widgetCount));
        intent.putExtra(WIDGET_URL_GET_PARAMS_EXTRA, context.getString(R.string.widgetUrlGetParameters));
        return intent;
    }

    private Parcelable[] getParcelableWidgets(int count){
        Parcelable[] parcelableWidgets = new Parcelable[count];
        for(int i = 0; i < count; i++){
            WidgetListItem wli = new WidgetListItem("watchboard", "https://monover.42six.com/presentationGrails/watchboard", null, null, null, true);
            parcelableWidgets[i] = wli;
        }
        return parcelableWidgets;
    }

    @MediumTest
    public void testHandleInValidIntent() {
        Intent widgetIntent = new Intent();
        context.startService(widgetIntent);
        assertNull(widgetIntent.getParcelableArrayExtra(WIDGETS_EXTRA));
        assertNull(widgetIntent.getStringExtra(WIDGET_URL_GET_PARAMS_EXTRA));
        context.stopService(widgetIntent);
    }

    @MediumTest
    public void testHandleValidIntent() {
        Intent widgetIntent = getWidgetIntent2(2);
        context.startService(widgetIntent);
        assertNotNull(widgetIntent.getParcelableArrayExtra(WIDGETS_EXTRA));
        assertEquals(2, widgetIntent.getParcelableArrayExtra(WIDGETS_EXTRA).length);
        assertNotNull(widgetIntent.getStringExtra(WIDGET_URL_GET_PARAMS_EXTRA));
        context.stopService(widgetIntent);

    }


    @MediumTest
    public void testHandleCompletedIntent() {

        long startTime = new Date().getTime();
        int numWidgets = 0;
        int numSucceeded = 0;
        int numFailed =  0;
        long endTime = new Date().getTime();


        Intent widgetIntent = getWidgetIntent2(2);
        context.startService(widgetIntent);
        assertNotNull(widgetIntent.getParcelableArrayExtra(WIDGETS_EXTRA));
        assertEquals(2, widgetIntent.getParcelableArrayExtra(WIDGETS_EXTRA).length);
        assertNotNull(widgetIntent.getStringExtra(WIDGET_URL_GET_PARAMS_EXTRA));

        widgetIntent.getCharArrayExtra(GetWidgetCacheService.URLS);
        int totalUrls = widgetIntent.getIntExtra(GetWidgetCacheService.TOTAL_URLS,0);

        while ((!testPassed) && ((endTime - startTime) < 6000)) {
            endTime = new Date().getTime();
        }
        context.stopService(widgetIntent);
        assert(testPassed);
    }

    protected void tearDown() throws Exception {
        super.tearDown();

    }


}



