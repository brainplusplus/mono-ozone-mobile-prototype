package com.fourtwosix.mono.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.activities.LoginActivity;

import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.logging.Level;

/**
 * Created by alerman on 5/27/14.
 */
public class CertificatePackage {
    private PrivateKey key;
    private X509Certificate[] certificateChain;
    private String alias;
    private Context context;

    private static CertificatePackage lastPackage;

    public PrivateKey getKey() {
        return key;
    }

    public void setKey(PrivateKey key) {
        this.key = key;
    }

    public X509Certificate[] getCertificateChain() {
        return certificateChain;
    }

    public void setCertificateChain(X509Certificate[] certificateChain) {
        this.certificateChain = certificateChain;
    }

    public String getAlias() {
        return alias;
    }

    public void setAlias(String alias) {
        this.alias = alias;
    }

    public Context getContext() {
        return context;
    }

    public void setContext(Context context) {
        this.context = context;
    }

    public static CertificatePackage getUserCertificatePackage(Context context) {
        final SharedPreferences sharedPref = context.getSharedPreferences(context.getString(R.string.app_package), Context.MODE_PRIVATE);
        String alias = sharedPref.getString(LoginActivity.KEYCHAIN_PREF_ALIAS, "");

        return getUserCertificatePackage(alias, context);
    }

    public static CertificatePackage getUserCertificatePackage(String alias, Context context) {
        try {
            CertificatePackage cp = new CertificatePackage();
            cp.setAlias(alias);
            cp.setContext(context);

            GetCertificatesTask certsTask = new GetCertificatesTask();
            certsTask.execute(cp);

            lastPackage = certsTask.get();

            return lastPackage;
        }
        catch(Exception e) {
            LogManager.log(Level.SEVERE, "Error getting certificate package.  Returning null.", e);
            return null;
        }
    }

    public static CertificatePackage getLastPackage() {
        return lastPackage;
    }
}
