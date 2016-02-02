package com.fourtwosix.mono.tests.services;

import android.content.Context;
import android.os.Parcelable;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.controllers.GetWidgetCacheServiceController;
import com.fourtwosix.mono.structures.WidgetListItem;
//import com.fourtwosix.mono.tests.utilities.AutoLogin;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Date;
import java.util.List;

import android.os.Parcelable;
import android.test.ServiceTestCase;

import com.fourtwosix.mono.services.GetWidgetCacheService;
import com.fourtwosix.mono.tests.utilities.Useful;

import com.fourtwosix.mono.utils.WebHelper;
import com.fourtwosix.mono.utils.caching.CacheHelper;

/**
 * Created by dchambers on 4/9/14.
 */
public class GetWidgetCacheControllerTest extends ServiceTestCase<GetWidgetCacheService> {

    private String serverUrl = "";
    private String baseServerUrl = "";
    private Context context;

    public GetWidgetCacheControllerTest() {
        super(GetWidgetCacheService.class);
    }

    @Override
    protected void setUp() throws Exception {
        super.setUp();

        //   AutoLogin.Login(getActivity());
        context = getContext();
        serverUrl = Useful.findKey(Useful.serverPropKey);
        baseServerUrl=Useful.findKey(Useful.baseServerPropKey);
    }

    private Parcelable[] getParcelableWidgets(int count) {
        Parcelable[] parcelableWidgets = new Parcelable[count];
        for (int i = 0; i < count; i++) {
            WidgetListItem wli = new WidgetListItem("watchboard", baseServerUrl + "presentationGrails/watchboard", null, null, null, true);
            parcelableWidgets[i] = wli;
        }
        return parcelableWidgets;
    }

    public void testWidgetItemResponse() {
        String widgetResponse = "";
        String url;
        try {
            InputStream is = GetWidgetCacheControllerTest.class.getResourceAsStream("/widgetResponse.html");
            InputStreamReader isr = new InputStreamReader(is);
            char fileText[] = new char[is.available()];
            isr.read(fileText, 0, is.available());
            widgetResponse = String.copyValueOf(fileText);
        } catch (IOException io) {
            System.out.println("error reading widgetResponse.html test data");
            System.out.println(io.getMessage());
        }
        GetWidgetCacheServiceController controller = new GetWidgetCacheServiceController(context);

        if (WebHelper.endsWithFileOrSlash(baseServerUrl)) {
            url = baseServerUrl + "presentationGrails/watchboard";
        } else {
            url = baseServerUrl + "/presentationGrails/watchboard";
        }
        String finalUrl = controller.handleWidgetItemResponse(url, widgetResponse);

        assertEquals(finalUrl, url + "/config/cache.manifest");

        String cachedData = CacheHelper.getCachedStringData(context, url);
        assertEquals(cachedData, widgetResponse);

    }

    public void testHandleMonoData() {
        String Response = "";
        try {
            InputStream is = GetWidgetCacheControllerTest.class.getResourceAsStream("/cacheManifest.txt");
            InputStreamReader isr = new InputStreamReader(is);
            char fileText[] = new char[is.available()];
            isr.read(fileText, 0, is.available());
            Response = String.copyValueOf(fileText);
        } catch (IOException io) {
            System.out.println("error reading cacheManifest.txt test data");
            System.out.println(io.getMessage());
        }
        GetWidgetCacheServiceController controller = new GetWidgetCacheServiceController(context);

        List<String> urlList = controller.handleMonoData(serverUrl, Response);
        assertEquals(78, urlList.size());

    }

    public void testControllerDownload() {
        long startTime = new Date().getTime();
        long endTime = new Date().getTime();

        GetWidgetCacheServiceController controller = new GetWidgetCacheServiceController(context,
                getParcelableWidgets(1), context.getString(R.string.widgetUrlGetParameters));

        while ((!controller.completed()) && ((endTime - startTime) < 80000)) {
            endTime = new Date().getTime();
        }
        assert(controller.completed());
    }

    protected void tearDown() throws Exception {
        super.tearDown();

    }
}