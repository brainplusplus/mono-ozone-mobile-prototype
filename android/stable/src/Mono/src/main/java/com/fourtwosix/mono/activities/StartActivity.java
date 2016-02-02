package com.fourtwosix.mono.activities;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.security.KeyChain;
import android.view.Menu;
import android.view.MenuItem;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.utils.AliasCallback;
import com.fourtwosix.mono.utils.LogManager;

import java.util.logging.Level;

public class StartActivity extends Activity {

    public static final String DEFAULT_ALIAS = "OWF Key Chain";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_start);
    }

    @Override
    protected void onResume() {
        super.onResume();
        chooseCert();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.start, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();
        if (id == R.id.action_settings) {
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void chooseCert() {
        LogManager.log(Level.INFO, "Choosing Cert");
        AliasCallback ac = AliasCallback.getInstance(getApplicationContext());

        KeyChain.choosePrivateKeyAlias(this,ac, // Callback
                new String[]{}, // Any key types.
                null, // Any issuers.
                "localhost", // Any host
                -1, // Any port
                DEFAULT_ALIAS);
        final SharedPreferences sharedPref = getSharedPreferences(getString(R.string.app_package), Context.MODE_PRIVATE);
        sharedPref.edit().putLong("cert_last_updated", System.currentTimeMillis()).commit();
    }
}
