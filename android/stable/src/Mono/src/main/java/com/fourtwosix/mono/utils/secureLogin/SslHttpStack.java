package com.fourtwosix.mono.utils.secureLogin;

/**
 * Custom implementation of com.android.volley.toolboox.HttpStack
 * Uses apache HttpClient-4.2.5 jar to take care of . You can download it from here
 * http://hc.apache.org/downloads.cgi
 *
 * @author Mani Selvaraj
 *
 */

import android.content.Context;
import android.os.AsyncTask;

import com.android.volley.AuthFailureError;
import com.android.volley.Request;
import com.android.volley.Request.Method;
import com.android.volley.toolbox.HttpStack;
import com.fourtwosix.mono.utils.CertificatePackage;
import com.fourtwosix.mono.utils.LogManager;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpEntityEnclosingRequestBase;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpPut;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.conn.scheme.PlainSocketFactory;
import org.apache.http.conn.scheme.Scheme;
import org.apache.http.conn.scheme.SchemeRegistry;
import org.apache.http.entity.ByteArrayEntity;
import org.apache.http.entity.mime.HttpMultipartMode;
import org.apache.http.entity.mime.MultipartEntity;
import org.apache.http.entity.mime.content.FileBody;
import org.apache.http.entity.mime.content.StringBody;
import org.apache.http.impl.client.BasicCookieStore;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.impl.conn.tsccm.ThreadSafeClientConnManager;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.HttpConnectionParams;
import org.apache.http.params.HttpParams;

import java.io.File;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;

import javax.net.ssl.KeyManager;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;


public class SslHttpStack implements HttpStack {

    private final static String HEADER_CONTENT_TYPE = "Content-Type";
    private Context context;

    static private DefaultHttpClient sslClient;

    private BasicCookieStore cookieStore;

    public SslHttpStack(Context context) {
        // Make the http client persist as per the recommendations on Jakarta's HttpClient
        // Also, we need this for authorized logon
        this.context = context;

        cookieStore = new BasicCookieStore();
    }

    public void init(final String alias, final PrivateKey key, final X509Certificate[] chain) {

        try {
            SchemeRegistry registry = new SchemeRegistry();
            registry.register(new Scheme("http", new PlainSocketFactory(), 80));
            AsyncTask<Void,Void, SSLSocketFactory> asyncTask = new AsyncTask<Void, Void, SSLSocketFactory>() {
                @Override
                protected SSLSocketFactory doInBackground(Void... params) {
                   // android.os.Debug.waitForDebugger();
                    try {
                        KeyManager manager = new SSLUtils.KeyChainKeyManager(alias, chain, key);
                        SSLContext context = SSLContext.getInstance("TLS");
                        context.init(new KeyManager[] {manager}, new TrustManager[] {new TrustEveryone()}, null);
                        return new SSLSocketFactory(context.getSocketFactory());
                    }
                    catch(Exception e) {
                        throw new RuntimeException("Error trying to initialize SSLSocketFactory!");
                    }
                }
            };

            asyncTask.execute();

            SSLSocketFactory sslf = asyncTask.get();
            registry.register(new Scheme("https", sslf, 443));

            // Basic parameters for now
            HttpParams params = new BasicHttpParams();
            ThreadSafeClientConnManager manager = new ThreadSafeClientConnManager(params, registry);
            this.sslClient = new DefaultHttpClient(manager, params);

            // Set a cookie store -- this helps OpenAM authenticate
            sslClient.setCookieStore(cookieStore);
        } catch (Exception e) {
            LogManager.log(Level.SEVERE, "Error setting up SSL Context!", e);
            throw new RuntimeException("Unable to set up SSL Context!");
        }
    }

    private static void addHeaders(HttpUriRequest httpRequest, Map<String, String> headers) {
        for (String key : headers.keySet()) {
            httpRequest.setHeader(key, headers.get(key));
        }
    }

    @SuppressWarnings("unused")
    private static List<NameValuePair> getPostParameterPairs(Map<String, String> postParams) {
        List<NameValuePair> result = new ArrayList<NameValuePair>(postParams.size());
        for (String key : postParams.keySet()) {
            result.add(new BasicNameValuePair(key, postParams.get(key)));
        }
        return result;
    }

    @Override
    public HttpResponse performRequest(Request<?> request, Map<String, String> additionalHeaders)
            throws IOException, AuthFailureError {
        HttpUriRequest httpRequest = createHttpRequest(request, additionalHeaders);
        addHeaders(httpRequest, additionalHeaders);
        addHeaders(httpRequest, request.getHeaders());
        onPrepareRequest(httpRequest);
        HttpParams httpParams = httpRequest.getParams();
        int timeoutMs = request.getTimeoutMs();

        // TODO: Reevaluate this connection timeout based on more wide-scale
        // data collection and possibly different for wifi vs. 3G.
        HttpConnectionParams.setConnectionTimeout(httpParams, 5000);
        HttpConnectionParams.setSoTimeout(httpParams, timeoutMs);

        // Reuse existing httpClient
        DefaultHttpClient client = (DefaultHttpClient)getUnderlyingHttpClient();
        client.setParams(httpParams);

        return client.execute(httpRequest);
    }

    public HttpClient getUnderlyingHttpClient() {
        // If the client is null, attempt to initialize it
        if(sslClient == null) {
            CertificatePackage cp = CertificatePackage.getUserCertificatePackage(context);

            if(cp != null) {
                init(cp.getAlias(), cp.getKey(), cp.getCertificateChain());
            }
        }
        return sslClient;
    }

    /**
     * Creates the appropriate subclass of HttpUriRequest for passed in request.
     */
    @SuppressWarnings("deprecation")
    /* protected */ static HttpUriRequest createHttpRequest(Request<?> request,
                                                            Map<String, String> additionalHeaders) throws AuthFailureError {
        switch (request.getMethod()) {
            case Method.DEPRECATED_GET_OR_POST: {
                // This is the deprecated way that needs to be handled for backwards compatibility.
                // If the requests' post body is null, then the assumption is that the request is
                // GET.  Otherwise, it is assumed that the request is a POST.
                byte[] postBody = request.getPostBody();
                if (postBody != null) {
                    HttpPost postRequest = new HttpPost(request.getUrl());
                    postRequest.addHeader(HEADER_CONTENT_TYPE, request.getPostBodyContentType());
                    HttpEntity entity;
                    entity = new ByteArrayEntity(postBody);
                    postRequest.setEntity(entity);
                    return postRequest;
                } else {
                    return new HttpGet(request.getUrl());
                }
            }
            case Method.GET:
                return new HttpGet(request.getUrl());
            case Method.DELETE:
                return new HttpDelete(request.getUrl());
            case Method.POST: {
                HttpPost postRequest = new HttpPost(request.getUrl());
                postRequest.addHeader(HEADER_CONTENT_TYPE, request.getBodyContentType());
                setMultiPartBody(postRequest,request);
                setEntityIfNonEmptyBody(postRequest, request);
                return postRequest;
            }
            case Method.PUT: {
                HttpPut putRequest = new HttpPut(request.getUrl());
                putRequest.addHeader(HEADER_CONTENT_TYPE, request.getBodyContentType());
                setMultiPartBody(putRequest,request);
                setEntityIfNonEmptyBody(putRequest, request);
                return putRequest;
            }
            default:
                throw new IllegalStateException("Unknown request method.");
        }
    }

    private static void setEntityIfNonEmptyBody(HttpEntityEnclosingRequestBase httpRequest,
                                                Request<?> request) throws AuthFailureError {
        // If this is an AuthJsonRequest, then we're most likely posting
        // If this is the case, just post
        if(request instanceof AuthJsonRequest) {
            List<NameValuePair> postParameterPairs = getPostParameterPairs(((AuthJsonRequest) request).getParams());

            try {
                httpRequest.setEntity(new UrlEncodedFormEntity(postParameterPairs));
            }
            catch(UnsupportedEncodingException e) {
                LogManager.log(Level.SEVERE, "Unsupported form encoding.", e);
            }
        }
        else {
            byte[] body = request.getBody();
            if (body != null) {
                HttpEntity entity = new ByteArrayEntity(body);
                httpRequest.setEntity(entity);
            }
        }
    }

    /**
     * If Request is MultiPartRequest type, then set Multi-part Entity in the httpRequest object.
     * @param httpRequest
     * @param request
     * @throws AuthFailureError
     */
    private static void setMultiPartBody(HttpEntityEnclosingRequestBase httpRequest,
                                         Request<?> request) throws AuthFailureError {

        // Return if Request is not MultiPartRequest
        if(!(request instanceof MultiPartRequest)) {
            return;
        }

        MultipartEntity multipartEntity = new MultipartEntity(HttpMultipartMode.BROWSER_COMPATIBLE);
        //Iterate the fileUploads
        Map<String,File> fileUpload = ((MultiPartRequest)request).getFileUploads();
        for (Map.Entry<String, File> entry : fileUpload.entrySet()) {
            System.out.println("Key = " + entry.getKey() + ", Value = " + entry.getValue());
            multipartEntity.addPart((entry.getKey()), new FileBody(entry.getValue()));
        }

        //Iterate the stringUploads
        Map<String,String> stringUpload = ((MultiPartRequest)request).getStringUploads();
        for (Map.Entry<String, String> entry : stringUpload.entrySet()) {
            System.out.println("Key = " + entry.getKey() + ", Value = " + entry.getValue());
            try {
                multipartEntity.addPart((entry.getKey()), new StringBody(entry.getValue()));
            } catch (Exception e) {
                LogManager.log(Level.SEVERE, e.getMessage());
            }
        }

        httpRequest.setEntity(multipartEntity);
    }

    /**
     * Called before the request is executed using the underlying HttpClient.
     *
     * <p>Overwrite in subclasses to augment the request.</p>
     */
    protected void onPrepareRequest(HttpUriRequest request) throws IOException {
        // Nothing.
    }
}
