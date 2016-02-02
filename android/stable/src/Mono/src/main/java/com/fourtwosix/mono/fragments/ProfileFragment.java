package com.fourtwosix.mono.fragments;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.structures.User;

/**
 * Created by Eric on 11/27/13.
 */
public class ProfileFragment extends BaseFragment {
    private String baseUrl;
    private String profileRestUrl = "prefs/person/whoami";
    private String groupRestUrl = "group";
    private View rootView;

    //user information
    private User user;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        //TestFlight.passCheckpoint("Profile Viewed");
        SharedPreferences sharedPreferences = getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
        baseUrl = sharedPreferences.getString(getString(R.string.serverUrlPreference), null);

        rootView = inflater.inflate(R.layout.fragment_profile_layout, container, false);

        /*button btnRetrieve = (button) rootView.findViewById(R.id.btnDownload);
        btnRetrieve.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                retrieveProfileInformation();
            }
        });*/

        if(getUser() != null) {
            setProfileInfo();
            setGroupsInfo();
        }

        //retrieveProfileInformation();
        return rootView;
    }

    private Handler profileDownloadHandler = new Handler() {
        @Override
        public void handleMessage(Message message) {
            //TODO: handle results/errors of profile downloading
            //update the UI
            /*Bundle bundle = message.getData();
            String json = bundle.getString(RestTask.RESPONSE);

            try {
                JSONObject responseObject = new JSONObject(json);
                userName = responseObject.getString("currentUserName");
                user = responseObject.getString("currentUser");
                userId = responseObject.getInt("currentId");
                setProfileInfo();
            } catch (JSONException exception) {
                Logger.getLogger(getString(R.string.debug_tag)).log(Level.SEVERE, "Could not correctly handle Json: " + json);
                Logger.getLogger(getString(R.string.debug_tag)).log(Level.SEVERE, "Json parsing exception:", exception);
            } catch (Exception exception) {
                Logger.getLogger(getString(R.string.debug_tag)).log(Level.SEVERE, "Json parsing exception:", exception);
            }*/
        }
    };

    private Handler groupDownloadHandler = new Handler() {
        @Override
        public void handleMessage(Message message) {
            //TODO: handle results/errors of group downloading
            /*Bundle bundle = message.getData();
            String json = bundle.getString(RestTask.RESPONSE);

            try {
                JSONObject responseObject = new JSONObject(json);
                JSONArray jsonArray = responseObject.getJSONArray("data");
                groups = new String[jsonArray.length()];
                for(int i = 0; i < jsonArray.length(); i++) {
                    JSONObject containingObject = jsonArray.getJSONObject(i);
                    String item = containingObject.getString("displayName");
                    groups[i] = item;
                }
                setGroupsInfo();
            } catch (JSONException exception) {
                Logger.getLogger(getString(R.string.debug_tag)).log(Level.SEVERE, "Could not correctly handle Json: " + json);
                Logger.getLogger(getString(R.string.debug_tag)).log(Level.SEVERE, "Json parsing exception:", exception);
            } catch (Exception exception) {
                Logger.getLogger(getString(R.string.debug_tag)).log(Level.SEVERE, "Json parsing exception:", exception);
            }*/
        }
    };

    /**
     * Sets the profile information. Factored out so that it can be used from onCreate as well as refresh
     */
    private void setProfileInfo() {
        TextView txtCurrentUserName = (TextView) rootView.findViewById(R.id.txtUserName);
        txtCurrentUserName.setText(getUser().getUserName());
        TextView txtServer = (TextView)rootView.findViewById(R.id.txtServer);
        txtServer.setText(getUser().getServer());
        TextView txtEmail = (TextView)rootView.findViewById(R.id.txtUserEmail);
        txtEmail.setText(getUser().getEmail());
    }

    /**
     * Sets the groups information. Factored out so that it can be used from onCreate as well as refresh
     */
    private void setGroupsInfo() {
        TextView txtGroupResults = (TextView) rootView.findViewById(R.id.txtUserGroups);
        String[] groups = getUser().getGroupNames();
        String groupsList = "";
        if(groups.length == 0) {
            txtGroupResults.setText("No groups");
            return;
        } else {
            for(int i = 0; i < groups.length - 1; i++) {
                groupsList += groups[i] + ", ";
            }
            groupsList += groups[groups.length-1];
            txtGroupResults.setText("Member: " + groupsList);
        }
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
