package com.fourtwosix.mono.utils;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.security.KeyChainAliasCallback;

import com.fourtwosix.mono.activities.LoginActivity;
import com.fourtwosix.mono.utils.caching.VolleySingleton;

import java.util.logging.Level;

/**
 * Created by alerman on 5/27/14.
 */
public class AliasCallback implements KeyChainAliasCallback {

    private static AliasCallback instance = null;
    private static Context context;

    // Name of the application preference
    public static final String KEYCHAIN_PREF = "keychain";

    // Name of preference name that saves the alias
    public static final String KEYCHAIN_PREF_ALIAS = "alias";

    private AliasCallback(Context context)
    {
        this.context = context;
    }

    public static AliasCallback getInstance(Context context)
    {
        if(instance == null)
        {
            AliasCallback ac = new AliasCallback(context);
            instance = ac;
        }

        return instance;
    }

    /**
     * This implements the KeyChainAliasCallback
     */
    public void alias(String alias) {
        LogManager.log(Level.INFO,"ALIAS CALLBACK RECEIVED");
        if (alias != null) {
            setAlias(alias); // Set the alias in the application preference
            CertificatePackage cp = CertificatePackage.getUserCertificatePackage(alias, context);

            if(cp != null) {
                VolleySingleton.getInstance(context).initSslStack(alias, cp.getKey(), cp.getCertificateChain());
            }

            VolleySingleton.getInstance(context).getSslHttpStack().getUnderlyingHttpClient();

            //certFinishHandler.sendEmptyMessage(0); //start the login attempt
        } else {
            LogManager.log(Level.INFO, "User hit Disallow");
        }
    }

    /**
     * This method sets the alias of the key chain to the application preference
     */
    private void setAlias(String alias) {
        SharedPreferences pref = context.getSharedPreferences(KEYCHAIN_PREF, context.MODE_PRIVATE);
        SharedPreferences.Editor editor = pref.edit();
        editor.putString(KEYCHAIN_PREF_ALIAS, alias);
        editor.commit();

        Intent intent = new Intent(context, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }
}
