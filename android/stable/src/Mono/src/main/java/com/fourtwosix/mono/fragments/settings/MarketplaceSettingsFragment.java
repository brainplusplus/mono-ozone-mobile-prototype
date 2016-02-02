package com.fourtwosix.mono.fragments.settings;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.webkit.URLUtil;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.fragments.BaseFragment;
import com.fourtwosix.mono.structures.AppsMall;
import com.fourtwosix.mono.utils.AppsMallWidgetDownloader;
import com.fourtwosix.mono.utils.ArrayPreferenceHelper;

import org.apache.commons.lang.StringUtils;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashSet;
import java.util.Set;

/**
 * Created by Eric on 5/7/2014.
 */
public class MarketplaceSettingsFragment extends BaseFragment {

    Set<AppsMall> listItems;
    ArrayAdapter<AppsMall> adapter;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        final View rootView = inflater.inflate(R.layout.fragment_settings_marketplace, container, false);
        final View headerView = inflater.inflate(R.layout.partial_settings_marketplace_header, null);

        //Set the back click for the title
        rootView.findViewById(R.id.rlTitle).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                InputMethodManager inputManager = (InputMethodManager) getActivity().getSystemService(Context.INPUT_METHOD_SERVICE);
                inputManager.hideSoftInputFromWindow(getActivity().getCurrentFocus().getWindowToken(), InputMethodManager.HIDE_NOT_ALWAYS);
                getActivity().getFragmentManager().popBackStack();
            }
        });

        final EditText editText = (EditText) headerView.findViewById(R.id.txtStoreUrl);
        editText.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                editText.setText("https://");
                editText.setSelection(8);
                return true;
            }
        });

        Button addButton = (Button) headerView.findViewById(R.id.btnAddStorefront);
        addButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                EditText urlText = (EditText) rootView.findViewById(R.id.txtStoreUrl);
                EditText nameText = (EditText) rootView.findViewById(R.id.txtStoreName);
                TextView errorText = (TextView) rootView.findViewById(R.id.txtStoreError);
                errorText.setVisibility(View.INVISIBLE);
                Set<String> storeList = ArrayPreferenceHelper.retrieveStringArray(getString(R.string.storeListPreference),getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE));
                if(storeList == null)
                {
                    storeList = new HashSet<String>();
                }
                String url = urlText.getText().toString();
                if(!URLUtil.isValidUrl(url.trim()) || StringUtils.isBlank(nameText.getText().toString()))
                {
                    if(!URLUtil.isValidUrl(url.trim()))
                    {
                        errorText.setText("Invalid URL!");
                    }else{
                        errorText.setText("Name must not be blank");
                    }
                    errorText.setVisibility(View.VISIBLE);

                }else {

                    AppsMall mall = null;
                    try {
                        URL urlObj = new URL(StringUtils.trim(url));
                        mall = new AppsMall(nameText.getText().toString(), urlObj);
                    } catch (MalformedURLException e) {
                        e.printStackTrace();
                    }

                    if (mall != null) {
                        if (storeList.add(mall.toJsonString())) {
                            ArrayPreferenceHelper.storeStringArray(getString(R.string.storeListPreference), getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE), storeList);
                            adapter.add(mall);
                            adapter.notifyDataSetChanged();
                            urlText.setText("");
                            nameText.setText("");
                            AppsMallWidgetDownloader.updateAppStoreWidgets(getActivity());
                            Toast.makeText(getActivity(), "Downloading Apps Mall Listings!", Toast.LENGTH_SHORT).show();
                            urlText.requestFocus();
                        } else {
                            //TODO Show dialog that the URL is already there
                        }

                        InputMethodManager inputManager = (InputMethodManager) getActivity().getSystemService(Context.INPUT_METHOD_SERVICE);
                        inputManager.hideSoftInputFromWindow(getActivity().getCurrentFocus().getWindowToken(), InputMethodManager.HIDE_NOT_ALWAYS);
                    }
                }
            }
        });

        SharedPreferences preferences = getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
        listItems = AppsMall.fromStringCollection(ArrayPreferenceHelper.retrieveStringArray(getString(R.string.storeListPreference), preferences));
        adapter = new ArrayAdapter<AppsMall>(this.getActivity().getApplicationContext(),R.layout.store_list_item);

        if(listItems == null)
        {
            listItems = new HashSet<AppsMall>();
        }

        adapter.addAll(listItems);

        ListView listView = (ListView) rootView.findViewById(R.id.storeList);
        listView.addHeaderView(headerView, null, false);
        listView.setOnItemLongClickListener(new AdapterView.OnItemLongClickListener() {
            @Override
            public boolean onItemLongClick(AdapterView<?> parent, View view, int position, long id) {
                AppsMall yourData = adapter.getItem(position-1);

                adapter.remove(yourData);
                adapter.notifyDataSetChanged();

                listItems = AppsMall.fromStringCollection(ArrayPreferenceHelper.retrieveStringArray(getString(R.string.storeListPreference), getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE)));
                listItems.remove(yourData);
                ArrayPreferenceHelper.storeStringArray(getString(R.string.storeListPreference), getActivity().getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE), AppsMall.toStringSet(listItems));

                return true;
            }
        });
        listView.setAdapter(adapter);

        return rootView;
    }

    @Override
    public void onBackPressed() {
        InputMethodManager inputManager = (InputMethodManager) getActivity().getSystemService(Context.INPUT_METHOD_SERVICE);
        inputManager.hideSoftInputFromWindow(getActivity().getCurrentFocus().getWindowToken(), InputMethodManager.HIDE_NOT_ALWAYS);
        getActivity().getFragmentManager().popBackStack();
    }
}
