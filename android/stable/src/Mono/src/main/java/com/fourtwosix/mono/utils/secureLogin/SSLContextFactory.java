package com.fourtwosix.mono.utils.secureLogin;

import android.content.Context;
import android.util.Base64;

import com.fourtwosix.mono.utils.LogManager;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.logging.Level;

import javax.net.ssl.KeyManager;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;

import static com.fourtwosix.mono.utils.IOUtil.readBytes;

/**
 * Created by mschreiber on 1/13/14.
 */
public class SSLContextFactory {

    private static SSLContextFactory theInstance = null;

    private SSLContextFactory() {
    }

    public static SSLContextFactory getInstance() {
        if(theInstance == null) {
            theInstance = new SSLContextFactory();
        }
        return theInstance;
    }

    /**
     * Creates an SSLContext with the client and server certificates
     * @param clientCertFile A File containing the client certificate
     * @param clientCertPassword Password for the client certificate
     * @param caCertStream An InputStream containing the server certificate
     * @return An initialized SSLContext
     * @throws Exception
     */
    public SSLContext makeContext(InputStream clientCertFile, String clientCertPassword, InputStream caCertStream, Context context) throws IOException{
        final KeyStore keyStore = loadPKCS12KeyStore(clientCertFile, clientCertPassword);
        KeyManagerFactory kmf;
        SSLContext sslContext = null;
        try {
            kmf = KeyManagerFactory.getInstance("X509");
            kmf.init(keyStore, clientCertPassword.toCharArray());
            KeyManager[] keyManagers = kmf.getKeyManagers();
            final KeyStore trustStore = loadPEMTrustStore(caCertStream);
            TrustManager[] trustManagers = new TrustManager[0];
            trustManagers = new TrustManager[]{new CustomTrustManager(trustStore, context)};
            sslContext = SSLContext.getInstance("TLS");
            sslContext.init(keyManagers, trustManagers, null);
        } catch (NoSuchAlgorithmException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        } catch (UnrecoverableKeyException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        } catch (KeyStoreException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        } catch (KeyManagementException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        }

        return sslContext;
    }

    /**
     * Produces a KeyStore from a String containing a PEM certificate (typically, the server's CA certificate)
     * @param certificateStream An InputStream containing the PEM-encoded certificate
     * @return a KeyStore (to be used as a trust store) that contains the certificate
     * @throws Exception
     */
    private KeyStore loadPEMTrustStore(InputStream certificateStream) throws IOException {

        byte[] der = loadPemCertificate(new ByteArrayInputStream(readBytes(certificateStream)));
        ByteArrayInputStream derInputStream = new ByteArrayInputStream(der);
        CertificateFactory certificateFactory = null;
        KeyStore trustStore = null;
        try {
            certificateFactory = CertificateFactory.getInstance("X.509");
            assert certificateFactory != null;
            X509Certificate cert = null;
            cert = (X509Certificate) certificateFactory.generateCertificate(derInputStream);
            String alias = cert.getSubjectX500Principal().getName();
            trustStore = KeyStore.getInstance(KeyStore.getDefaultType());
            assert trustStore != null;
            trustStore.load(null);
            trustStore.setCertificateEntry(alias, cert);
        } catch (CertificateException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        } catch (KeyStoreException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        } catch (NoSuchAlgorithmException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        }

        return trustStore;
    }

    /**
     * Produces a KeyStore from a PKCS12 (.p12) certificate file, typically the client certificate
     * @param certificateFile A file containing the client certificate
     * @param clientCertPassword Password for the certificate
     * @return A KeyStore containing the certificate from the certificateFile
     * @throws Exception
     */
    private KeyStore loadPKCS12KeyStore(InputStream certificateFile, String clientCertPassword) throws IOException {
        KeyStore keyStore = null;
        InputStream inputStream = null;
        try {
            keyStore = KeyStore.getInstance("PKCS12");
            keyStore.load(certificateFile, clientCertPassword.toCharArray());
        } catch (CertificateException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        } catch (NoSuchAlgorithmException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        } catch (KeyStoreException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        } finally {
            try {
                if(inputStream != null) {
                    inputStream.close();
                }
            } catch(IOException ex) {
                LogManager.log(Level.SEVERE, ex.getMessage());
            }
        }
        return keyStore;
    }

    /**
     * Reads and decodes a base-64 encoded DER certificate (a .pem certificate), typically the server's CA cert.
     * @param certificateStream an InputStream from which to read the cert
     * @return a byte[] containing the decoded certificate
     * @throws IOException
     */
    byte[] loadPemCertificate(InputStream certificateStream) throws IOException {

        byte[] der = null;
        BufferedReader br = null;

        try {
            StringBuilder buf = new StringBuilder();
            br = new BufferedReader(new InputStreamReader(certificateStream));

            String line = br.readLine();
            while(line != null) {
                if(!line.startsWith("--")){
                    buf.append(line);
                }
                line = br.readLine();
            }

            String pem = buf.toString();
            der = Base64.decode(pem, Base64.DEFAULT);

        } finally {
            if(br != null) {
                br.close();
            }
        }

        return der;
    }
}