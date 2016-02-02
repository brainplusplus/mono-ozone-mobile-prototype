package com.fourtwosix.mono.tests;

import android.content.res.AssetManager;
import android.test.ActivityInstrumentationTestCase2;
import android.test.UiThreadTest;
import android.widget.Button;
import android.widget.Spinner;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.activities.LoginActivity;
import com.fourtwosix.mono.adapters.BasicStyledSpinnerAdapter;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.tests.utilities.Useful;

import java.util.ArrayList;
import java.util.Date;
import java.util.Map;

/**
 * Created by Eric on 12/2/13.
 */
public class LoginActivityTestCase extends ActivityInstrumentationTestCase2<LoginActivity> {


    private LoginActivity loginActivity;

    private String serverUrl="";
    private String certFile = "";
    //references to the views
    private TextView txtLoginUrl;
    private Button btnLogin;
    private Spinner spnCertificate;
    private Object lock= new Object();
    ArrayList<String> p12Files = new ArrayList<String>();

    public LoginActivityTestCase() {
        super(LoginActivity.class);
    }

    @Override
    protected void setUp() throws Exception {
        super.setUp();

        loginActivity = getActivity();

        txtLoginUrl = (TextView)loginActivity.findViewById(R.id.txtServer);
        btnLogin = (Button)loginActivity.findViewById(R.id.sign_in_button);

        spnCertificate = (Spinner) loginActivity.findViewById(R.id.spnCertificate);

        serverUrl = Useful.findKey(Useful.serverPropKey);
        certFile = Useful.findKey(Useful.certFileKey);

        checkPreconditions();

        AssetManager assetManager = loginActivity.getAssets();
        String[] files = assetManager.list("");

        p12Files.clear();
        for (String file : files) {
            if (file.contains(certFile)) {
                p12Files.add(file);
            }
        }
        assert(p12Files.size()==1);
    }

    protected void removeWidgets()
    {
        synchronized(lock)
        {
            // ensure no widget present when we start our test
            DataServiceFactory.create(loginActivity, serverUrl);
            WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
            Map<String, WidgetListItem> map =  dataService.getWidgets();
            for (WidgetListItem item : map.values())
            {
                dataService.remove(item);
            }
        }
    }

    protected void checkPreconditions()
    {
        assertNotNull("LoginActivity is null", loginActivity);
        assertNotNull("txtLoginUrl is null", txtLoginUrl);
        assertNotNull("cert spinner is null", spnCertificate);
        assertNotNull("sign_in_button is null", btnLogin);
        assertNotNull("login url",serverUrl);
        assertNotNull("cert file",certFile);

    }

    @UiThreadTest
    public void testLoginOK()
    {
        BasicStyledSpinnerAdapter<String> adapter = new BasicStyledSpinnerAdapter<String>(loginActivity, p12Files);

        txtLoginUrl.setText(serverUrl);
        spnCertificate.setAdapter(adapter);
        spnCertificate.requestFocus();
        spnCertificate.setSelection(0);

        assertEquals(p12Files.get(0), loginActivity.getP12Filename());
        try{
            long startTime = new Date().getTime();
            loginActivity.attemptLogin(); // gets user profile
            loginActivity.beginLogin();
            long endTime = new Date().getTime();

            while (!loginActivity.ifDownloadsCompleteFinishLogin() && ((endTime - startTime) < 20000))
            {
                 endTime = new Date().getTime();
            }

            synchronized(lock)
            {
                DataServiceFactory.create(loginActivity, serverUrl);
                WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
                Map<String, WidgetListItem> map =  dataService.getWidgets();

                assert(!map.isEmpty());
            }
            removeWidgets();

        }catch (Exception ex)
        {
            System.out.print(ex.getMessage());
        }

    }

    @UiThreadTest
    public void testLoginFailByUrl() throws Exception
    {
        serverUrl = "https://11.1.10.132:8443/owf/"; // bogus url

        txtLoginUrl.setText(serverUrl);

        assertEquals(p12Files.get(0), loginActivity.getP12Filename());

        long startTime = new Date().getTime();
        loginActivity.attemptLogin();
        loginActivity.beginLogin();
        long endTime = new Date().getTime();

        while (!loginActivity.ifDownloadsCompleteFinishLogin() && ((endTime - startTime) < 20000))
            endTime = new Date().getTime();

        DataServiceFactory.create(loginActivity, serverUrl);
        synchronized(lock)
        {
            WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);

            Map<String, WidgetListItem> map =  dataService.getWidgets();
            assert(map==null || map.isEmpty());
        }

    }


    protected void tearDown() throws Exception {
        super.tearDown();

    }

}
