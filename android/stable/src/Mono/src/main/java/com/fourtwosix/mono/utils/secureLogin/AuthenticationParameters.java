package com.fourtwosix.mono.utils.secureLogin;

import java.io.InputStream;

/**
 * Created by mschreiber on 1/13/14.
 */
public class AuthenticationParameters {
    private InputStream clientCertificate = null;
    private String clientCertificatePassword = null;
    private InputStream caCertificate = null;

    public InputStream getClientCertificate() {
        return clientCertificate;
    }

    public void setClientCertificate(InputStream clientCertificate) {
        this.clientCertificate = clientCertificate;
    }

    public String getClientCertificatePassword() {
        return clientCertificatePassword;
    }

    public void setClientCertificatePassword(String clientCertificatePassword) {
        this.clientCertificatePassword = clientCertificatePassword;
    }

    public InputStream getCaCertificate() {
        return caCertificate;
    }

    public void setCaCertificate(InputStream caCertificate) {
        this.caCertificate = caCertificate;
    }
}
