package com.fourtwosix.mono.activities;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.annotation.TargetApi;
import android.app.ActionBar;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.text.TextUtils;
import android.view.ContextThemeWrapper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.fourtwosix.mono.R;
import com.fourtwosix.mono.caching.CacheExpirationReceiver;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.WidgetDataService;
import com.fourtwosix.mono.structures.User;
import com.fourtwosix.mono.utils.AppsMallWidgetDownloader;
import com.fourtwosix.mono.utils.ArrayPreferenceHelper;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.WidgetImageDownloadHelper;
import com.fourtwosix.mono.utils.caching.NoSpaceLeftOnDeviceException;
import com.fourtwosix.mono.utils.caching.VolleySingleton;
import com.fourtwosix.mono.utils.secureLogin.AuthJsonRequest;
import com.fourtwosix.mono.webViewIntercept.NotificationExecutor;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;
import java.util.logging.Level;

import static com.fourtwosix.mono.utils.caching.CacheHelper.dataIsCached;
import static com.fourtwosix.mono.utils.caching.CacheHelper.getCachedJson;
import static com.fourtwosix.mono.utils.caching.CacheHelper.setCachedData;

//import com.testflightapp.lib.TestFlight;

/**
 * Activity which displays a login screen to the user, offering registration as
 * well.
 */
public class LoginActivity extends Activity {
    private String baseUrl;
    private String profileUrl;
    private String groupUrl;
    private String configUrl;
    private RequestQueue mVolleyQueue;

    public Context getContext() {
        return context;
    }

    public void setContext(Context context) {
        this.context = context;
    }

    private Context context;

    private User user;


    // Name of preference name that saves the alias
    public static final String KEYCHAIN_PREF_ALIAS = "alias";

    // Request code used when starting the activity using the KeyChain install intent
    private static final int INSTALL_KEYCHAIN_CODE = 1;

    private static final String APPLICATION_JSON = "application/json";

    // UI references.
    private EditText txtServer;
    private View mLoginFormView;
    private View mLoginStatusView;
    private TextView mLoginStatusMessageView;
    private TextView txtError;

    // Completion Statuses
    private boolean profileDownloadRequestComplete = false;
    private boolean groupDownloadRequestComplete = false;
    private boolean configDownloadRequestComplete = false;
    private boolean widgetDownloadRequestComplete = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_login);
        this.context = getApplicationContext();

        mVolleyQueue = VolleySingleton.getInstance(context).getRequestQueue();


        //no action bar for the login page
        ActionBar actionBar = getActionBar();
        actionBar.setTitle(null);
        actionBar.hide();

        Intent n = getIntent();

        AlarmManager alarmMgr = (AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
        Intent cacheExpirationIntent = new Intent(CacheExpirationReceiver.EXPIRE_INTENT);
        PendingIntent cacheExpirationAlarmIntent = PendingIntent.getBroadcast(getApplicationContext(), 0, cacheExpirationIntent, 0);
        alarmMgr.setInexactRepeating(AlarmManager.ELAPSED_REALTIME, CacheExpirationReceiver.RUN_INTERVAL, CacheExpirationReceiver.RUN_INTERVAL, cacheExpirationAlarmIntent);

        getApplicationContext().registerReceiver(CacheExpirationReceiver.getInstance(), new IntentFilter(CacheExpirationReceiver.EXPIRE_INTENT));

        profileUrl = getString(R.string.profilePath);
        groupUrl = getString(R.string.groupsPath);
        configUrl = getString(R.string.configPath);

        txtServer = (EditText) findViewById(R.id.txtServer);

        mLoginFormView = findViewById(R.id.login_form);
        mLoginStatusView = findViewById(R.id.login_status);
        mLoginStatusMessageView = (TextView) findViewById(R.id.login_status_message);

        txtError = (TextView)findViewById(R.id.txtError);

        findViewById(R.id.sign_in_button).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                    attemptLogin();
            }
        });

    }



    @Override
    public void onSaveInstanceState(Bundle savedInstanceState) {
        super.onSaveInstanceState(savedInstanceState);
    }

    @Override
    public void onRestoreInstanceState(Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
    }


    public void attemptLogin() {

        attemptLogin(txtServer.getText().toString());
    }

    public void attemptLogin(String Url) {

        baseUrl = Url;
        //save the baseUrl in preferences so that it can be referenced from other places in the app.
        final SharedPreferences sharedPref = getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
        sharedPref.edit().putString(getString(R.string.serverUrlPreference), baseUrl).commit();

        showProgress(true, "Verifying server trust");
        AuthJsonRequest baseUrlRequest = new AuthJsonRequest(Request.Method.GET, baseUrl + profileUrl, null,
                baseUrlSuccessListener(),
                baseUrlErrorListener(),
                context);

        mVolleyQueue.add(baseUrlRequest);
    }

    private Response.Listener<JSONObject> baseUrlSuccessListener() {
        return new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                final SharedPreferences sharedPref = getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
                Set<String> serverSet = ArrayPreferenceHelper.retrieveStringArray(getString(R.string.trustedServerListPreference), sharedPref);

                if(serverSet == null || !serverSet.contains(baseUrl))
                {
                    LayoutInflater inflater = (LayoutInflater) context.getSystemService(LAYOUT_INFLATER_SERVICE);
                    View layout = inflater.inflate(R.layout.dialog_prompt_layout, (ViewGroup) findViewById(R.layout.activity_login));

                    TextView textTitle = (TextView) layout.findViewById(R.id.txtTitle);
                    TextView textPrompt = (TextView) layout.findViewById(R.id.txtPrompt);
                    Button btnNegative = (Button) layout.findViewById(R.id.btnNegative);
                    Button btnPositive = (Button) layout.findViewById(R.id.btnPositive);

                    textTitle.setText("Verify server trust");
                    textPrompt.setText("Do you want to trust the server:\n" + baseUrl + "?");
                    btnNegative.setText("Don't trust");
                    btnPositive.setText("Trust");

                    final AlertDialog alertDialog = new AlertDialog.Builder(LoginActivity.this)
                            .setView(layout)
                            .show();

                    btnPositive.setOnClickListener(new View.OnClickListener() {
                        @Override
                        public void onClick(View view) {
                            Set<String> serverSet = ArrayPreferenceHelper.retrieveStringArray(getString(R.string.trustedServerListPreference),sharedPref);
                            if(serverSet == null)
                            {
                                serverSet = new HashSet<String>();
                            }
                            serverSet.add(baseUrl);
                            ArrayPreferenceHelper.storeStringArray(getString(R.string.trustedServerListPreference), sharedPref, serverSet);
                            alertDialog.hide();
                            beginLogin();
                        }
                    });

                    btnNegative.setOnClickListener(new View.OnClickListener() {
                        @Override
                        public void onClick(View view) {
                            alertDialog.hide();
                            abortLogin("Failed to install certificate");
                        }
                    });

                } else {
                    beginLogin();
                }
            }
        };
    }

    private Response.ErrorListener baseUrlErrorListener() {
        return new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                abortLogin("Failed to connect to server");
                LogManager.log(Level.SEVERE, "Volley BaseUrl Download Error: " + error);
            }
        };
    }

   public void beginLogin() {
        if (isValidInput()) {
            showProgress(true, "Logging in");

            user = new User();
            user.setServer(baseUrl);

            DataServiceFactory.create(this, baseUrl);
            DataServiceFactory.getService(DataServiceFactory.Services.DashboardsDataService);

            makeProfileDownloadRequest();
            makeGroupDownloadRequest();
            getWidgetList();
            AppsMallWidgetDownloader.updateAppStoreWidgets(this);
            getConfig();
        }
    }

    public void makeProfileDownloadRequest() {
        String url = baseUrl + profileUrl;

        if (dataIsCached(context, url)) {
            handleProfileResponse(url, getCachedJson(context, url));
        } else {
            AuthJsonRequest jsonObjRequest = new AuthJsonRequest(Request.Method.GET, url, null,
                    profileSuccessListener(url),
                    profileErrorListener(),
                    context);
            mVolleyQueue.add(jsonObjRequest);
        }
    }

    private Response.Listener<JSONObject> profileSuccessListener(String url) {
        final String finalUrl = url;
        return new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                handleProfileResponse(finalUrl, response);
            }
        };
    }

    private void handleProfileResponse(String url, JSONObject response) {
        try {
            // TODO: is this necessary?
            setCachedData(context, url, response.toString().getBytes(), APPLICATION_JSON);
            int id = Integer.parseInt(response.getString("currentId"));
            String userName = response.getString("currentUser");
            String displayName = response.getString("currentUserName");
            String userEmail = response.optString("currentEmail");

            user.setId(id);
            user.setUserName(userName);
            user.setDisplayName(displayName);
            user.setEmail(userEmail);

            showProgress(true, "Retrieving user groups");
            profileDownloadRequestComplete = true;
            ifDownloadsCompleteFinishLogin();
        } catch (JSONException exception) {
            LogManager.log(Level.SEVERE, "Could not correctly handle Json: " + response);
            LogManager.log(Level.SEVERE, "Json parsing exception:", exception);
            abortLogin("Failed to download profile");
        } catch (NoSpaceLeftOnDeviceException e) {
            Toast.makeText(context, "Device out of storage space!", Toast.LENGTH_LONG).show();
        }
    }

    private Response.ErrorListener profileErrorListener() {
        return new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                abortLogin("Failed to download profile");
                LogManager.log(Level.SEVERE, "Volley Profile Download Error: " + error.getMessage());
            }
        };
    }

    private void getConfig() {
        final String url = baseUrl + configUrl;
        if (dataIsCached(context, url)) {
            configDownloadRequestComplete = true;
            ifDownloadsCompleteFinishLogin();
        } else {
            AuthJsonRequest jsonObjRequest = new AuthJsonRequest(Request.Method.GET, url, null,
                    new Response.Listener<JSONObject>() {
                        @Override
                        public void onResponse(JSONObject response) {
                            try {
                                setCachedData(LoginActivity.this, url, response.toString().getBytes(), APPLICATION_JSON);
                            } catch (NoSpaceLeftOnDeviceException e) {
                                Toast.makeText(context, "Device out of storage space!", Toast.LENGTH_LONG).show();
                            }
                            configDownloadRequestComplete = true;
                            ifDownloadsCompleteFinishLogin();
                        }
                    },
                    new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            LogManager.log(Level.SEVERE, "Volley get config request error: " + error.getMessage());
                        }
                    },
                    context
            );
            mVolleyQueue.add(jsonObjRequest);
        }
    }


    public void makeGroupDownloadRequest() {
        String url = baseUrl + groupUrl;

        if (dataIsCached(context, url)) {
            handleGroupResponse(url, getCachedJson(context, url));
        } else {
            AuthJsonRequest jsonObjRequest = new AuthJsonRequest(Request.Method.GET, url, null,
                    createRequestGroupSuccessListener(url),
                    createRequestGroupErrorListener(),
                    context);
            mVolleyQueue.add(jsonObjRequest);
        }
    }

    private Response.Listener<JSONObject> createRequestGroupSuccessListener(String url) {
        final String finalUrl = url;
        return new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                handleGroupResponse(finalUrl, response);
            }
        };
    }

    private void handleGroupResponse(String url, JSONObject response) {
        try {
            // TODO: is this necessary?
            setCachedData(context, url, response.toString().getBytes(), APPLICATION_JSON);
            JSONArray jsonArray = response.getJSONArray("data");
            String[] groups = new String[jsonArray.length()];

            for (int i = 0; i < jsonArray.length(); i++) {
                JSONObject containingObject = jsonArray.getJSONObject(i);
                String item = containingObject.getString("displayName");
                groups[i] = item;
            }
            LogManager.log(Level.INFO, "Finished retrieving groups");
            groupDownloadRequestComplete = true;
            user.setGroupNames(groups);
            ifDownloadsCompleteFinishLogin();
        } catch (JSONException exception) {
            LogManager.log(Level.SEVERE, "Could not correctly handle Json: " + response);
            LogManager.log(Level.SEVERE, "Json parsing exception:", exception);
            abortLogin("Failed to download groups");
        } catch (Exception exception) {
            LogManager.log(Level.SEVERE, "Json parsing exception:", exception);
            abortLogin("Failed to download groups");
        }
        showProgress(true, "Retrieving widgets");
        ifDownloadsCompleteFinishLogin();
    }

    private Response.ErrorListener createRequestGroupErrorListener() {
        return new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                LogManager.log(Level.SEVERE, "Volley Group request error: " + error.getMessage());
            }
        };
    }

    public void getWidgetList() {
        String url = baseUrl + context.getString(R.string.widgetListPath);

        if (dataIsCached(context, url)) {
            handleWidgetItemResponse(url, getCachedJson(context, url));
        } else {
            AuthJsonRequest jsonObjRequest = new AuthJsonRequest(Request.Method.GET, url, null,
                    widgetItemSuccessListener(url),
                    widgetItemErrorListener(),
                    context);
            mVolleyQueue.add(jsonObjRequest);
        }
    }


    //TODO this should get moved to when the app store button is clicked

    private Response.Listener<JSONObject> widgetItemSuccessListener(String url) {
        final String finalUrl = url;
        return new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                handleWidgetItemResponse(finalUrl, response);
            }
        };
    }


    @Override
    public void onResume()
    {
        super.onResume();
    }

    private void handleWidgetItemResponse(String url, JSONObject response) {
        //let the data service worry about insertion/deduplication
        WidgetDataService dataService = (WidgetDataService) DataServiceFactory.getService(DataServiceFactory.Services.WidgetsDataService);
        dataService.put(baseUrl,response);
        // TODO: is this necessary?
        try {
            setCachedData(context, url, response.toString().getBytes(), APPLICATION_JSON);
        } catch (NoSpaceLeftOnDeviceException e) {
            Toast.makeText(context, "Device out of storage space!", Toast.LENGTH_LONG).show();
        }

        LogManager.log(Level.INFO, "Finished Retrieving the widget list, downloading images now");
        downloadImages(dataService);
    }

    private void downloadImages(WidgetDataService dataService) {
        //download the images
        WidgetImageDownloadHelper widgetImageDownloadHelper = new WidgetImageDownloadHelper(LoginActivity.this, imagesDownloadHandler, baseUrl);
        widgetImageDownloadHelper.downloadImages(dataService.getWidgets());
    }

    private Response.ErrorListener widgetItemErrorListener() {
        return new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                abortLogin("Failed to download the widgets");
                LogManager.log(Level.SEVERE, "Exception in getWidgetList", error);
            }
        };
    }

    /**
     * Handler that receives the empty response that downloading the new widget images has finished
     */
    private Handler imagesDownloadHandler = new Handler() {
        @Override
        public void handleMessage(Message message) {
            LogManager.log(Level.INFO, "Finished retrieving widgets");
            widgetDownloadRequestComplete = true;
            ifDownloadsCompleteFinishLogin();
        }
    };

    /**
     * Validates the input of the email and password
     *
     * @return
     */
    private boolean isValidInput() {
        if (TextUtils.isEmpty(baseUrl)) {
            return false;
        }
        return true;
    }

    public boolean ifDownloadsCompleteFinishLogin() {
        if (profileDownloadRequestComplete && groupDownloadRequestComplete && widgetDownloadRequestComplete && configDownloadRequestComplete) {
            finishLogin();
            return true;
        }
        return false;
    }

    /**
     * Finishes the login and starts the main activity
     */
    private void finishLogin() {
        // Reset initial booleans to false, since we never reload this activity
        profileDownloadRequestComplete = false;
        groupDownloadRequestComplete = false;
        configDownloadRequestComplete = false;
        widgetDownloadRequestComplete = false;

        SharedPreferences sharedPref = getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
        sharedPref.edit().putBoolean(getString(R.string.autoLoginPreference), true).commit();

        //close the login overlay
        showProgress(false, null);

        Intent callingIntent = getIntent();
        //login successful/ready
        Intent intent = new Intent(LoginActivity.this, MainActivity.class);
        intent.putExtra("user", user);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
	    if(callingIntent.hasExtra(NotificationExecutor.CALLBACK_INTENT)) {
            intent.putExtra(NotificationExecutor.CALLBACK_INTENT, callingIntent.getStringExtra(NotificationExecutor.CALLBACK_INTENT));
        }
        finish();
	    startActivity(intent);
    }

    /**
     * Aborts the login and displays a message if given.
     * @param message
     */
    private void abortLogin(String message) {
        SharedPreferences sharedPref = getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
        sharedPref.edit().putBoolean(getString(R.string.autoLoginPreference), false).commit();
        showProgress(false, null);

        if(message != null && !message.isEmpty()) {
            txtError.setVisibility(View.VISIBLE);
            txtError.setText(message);
        } else {
            txtError.setVisibility(View.GONE);
        }
    }

    /**
     * Shows the progress UI and hides the login form.
     */
    @TargetApi(Build.VERSION_CODES.HONEYCOMB_MR2)
    private void showProgress(final boolean show, String task) {
        // On Honeycomb MR2 we have the ViewPropertyAnimator APIs, which allow
        // for very easy animations. If available, use these APIs to fade-in
        // the progress spinner.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB_MR2) {
            int shortAnimTime = getResources().getInteger(android.R.integer.config_shortAnimTime);

            mLoginStatusView.setVisibility(View.VISIBLE);
            mLoginStatusView.animate().setDuration(shortAnimTime).alpha(show ? 1 : 0).setListener(new AnimatorListenerAdapter() {
                @Override
                public void onAnimationEnd(Animator animation) {
                    mLoginStatusView.setVisibility(show ? View.VISIBLE : View.GONE);
                }
            });

            mLoginFormView.setVisibility(View.VISIBLE);
            mLoginFormView.animate().setDuration(shortAnimTime).alpha(show ? 0 : 1).setListener(new AnimatorListenerAdapter() {
                @Override
                public void onAnimationEnd(Animator animation) {
                    mLoginFormView.setVisibility(show ? View.GONE : View.VISIBLE);
                }
            });
        } else {
            // The ViewPropertyAnimator APIs are not available, so simply show
            // and hide the relevant UI components.
            mLoginStatusView.setVisibility(show ? View.VISIBLE : View.GONE);
            mLoginFormView.setVisibility(show ? View.GONE : View.VISIBLE);
        }

        if (show && task != null)
            mLoginStatusMessageView.setText(task);
    }



    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        LogManager.log(Level.INFO, "Received requestCode: " + requestCode);
        if (requestCode == INSTALL_KEYCHAIN_CODE) {

            switch (resultCode) {
                case Activity.RESULT_OK:
                    break;
            }
        }
    }




}
