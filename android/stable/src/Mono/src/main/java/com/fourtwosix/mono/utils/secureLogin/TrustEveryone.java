package com.fourtwosix.mono.utils.secureLogin;

import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

import javax.net.ssl.X509TrustManager;

public class TrustEveryone implements X509TrustManager
{
    public java.security.cert.X509Certificate[] getAcceptedIssuers() {
        return new X509Certificate[0];
    }

    public void checkClientTrusted(X509Certificate[] certs, String authType) throws CertificateException
    {
        // no exception means it's okay
    }

    public void checkServerTrusted(X509Certificate[] certs, String authType) throws CertificateException {
        // no exception means it's okay
    }
}
