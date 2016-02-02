package com.fourtwosix.mono.utils;

import android.os.AsyncTask;
import android.security.KeyChain;
import android.security.KeyChainException;

import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.logging.Level;

/**
 * Created by alerman on 5/27/14.
 */
public class GetCertificatesTask extends AsyncTask<CertificatePackage,Void,CertificatePackage> {
    @Override
    protected CertificatePackage doInBackground(CertificatePackage[] params) {
        if (params.length != 1) {
            throw new IllegalArgumentException("Exactly one package expected");
        }

        CertificatePackage pkg = params[0];

        try {

            PrivateKey key = KeyChain.getPrivateKey(pkg.getContext(), pkg.getAlias());

            X509Certificate[] certChain = KeyChain.getCertificateChain(pkg.getContext(), pkg.getAlias());

            pkg.setCertificateChain(certChain);
            pkg.setKey(key);
        } catch (KeyChainException e) {
            LogManager.log(Level.SEVERE, "Error getting certificate information");
        } catch (InterruptedException e) {
            LogManager.log(Level.SEVERE, "Error getting certificate information");
        }


        return pkg;
    }
}
