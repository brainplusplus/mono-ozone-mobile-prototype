package com.fourtwosix.mono.utils.secureLogin;

import android.content.Context;

import com.android.volley.NetworkResponse;
import com.fourtwosix.mono.utils.IOUtil;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.caching.VolleySingleton;

import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.conn.EofSensorInputStream;
import org.apache.http.conn.EofSensorWatcher;
import org.apache.http.entity.BasicHttpEntity;
import org.apache.http.message.BasicNameValuePair;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;

class ByteEofSensorWatcher implements EofSensorWatcher {

    @Override
    public boolean eofDetected(InputStream inputStream) throws IOException {
        ByteArrayInputStream byteArrayInputStream = (ByteArrayInputStream) inputStream;

        if(byteArrayInputStream.available() > 0) {
            return false;
        }

        return true;
    }

    @Override
    public boolean streamClosed(InputStream inputStream) throws IOException {
        return false;
    }

    @Override
    public boolean streamAbort(InputStream inputStream) throws IOException {
        return false;
    }
}

/**
 * Created by mwilson on 4/2/14.
 */
public class OpenAMAuthentication {
    /**
     * This function will attempt to determine whether a response is from
     * an OpenAM service and authenticate if necessary.  This will happen when attempting
     * to access an OWF resource, so this function will go and retrieve the intended
     * response as well.
     * @param originalUrl The original URL that was trying to be retrieved.
     * @param response The network response received by volley.
     * @param context The application's context.
     * @return The intended response from the original request.
     */
    public static NetworkResponse authorizeIfNecessary(String originalUrl, NetworkResponse response, Context context) {
        if(response.data.length > 1024 * 1024) { // if data is > 1MB then just return the response
            return response;
        }
        String data = new String(response.data);

        // Test to see if this is an OpenAM authentication page
        if (data.contains("<title>Access rights validated</title>")) {
            try {
                // We think it is.  Attempt to parse the whole thing
                HttpResponse trueResponse = parseOpenAMHtml(originalUrl, response.data, context);
                InputStream openAmStream = trueResponse.getEntity().getContent();
                byte [] content = IOUtil.readBytes(openAmStream);
                openAmStream.close();

                // Return a new network response
                Map<String, String> newHeaders = new HashMap<String, String>();
                Header [] trueHeaders = trueResponse.getAllHeaders();

                for(Header header : trueHeaders) {
                    newHeaders.put(header.getName(), header.getValue());
                }

                return new NetworkResponse(trueResponse.getStatusLine().getStatusCode(), content, newHeaders, response.notModified);
            }
            catch(IOException e) {
                LogManager.log(Level.SEVERE, "Error trying to parse out OpenAM authentication data.  Treating as regular response.", e);
            }
        }

        return response;
    }

    public static HttpResponse authorizeIfNecessary(String originalUrl, HttpResponse response, Context context) {
        HttpEntity originalEntity = response.getEntity();

        // Save off values to recreate later if necessary
        long contentLength = originalEntity.getContentLength();
        Header contentEncoding = originalEntity.getContentEncoding();
        Header contentType = originalEntity.getContentType();
        boolean chunked = originalEntity.isChunked();

        boolean contentStreamClosed = false;

        byte [] originalData = null;

        try {

            if(contentLength > 1024 * 1024) { // if data is > 1MB then just return the response
                return response;
            }

            InputStream contentStream = response.getEntity().getContent();
            originalData = IOUtil.readBytes(contentStream);
            contentStream.close();
            contentStreamClosed = true;
            boolean tooBigForOpenAM = false;

            String data = new String(originalData);

            // Test to see if this is an OpenAM authentication page
            if (tooBigForOpenAM == false && data.contains("<title>Access rights validated</title>")) {
                // We think it is.  Attempt to parse the whole thing
                HttpResponse trueResponse = parseOpenAMHtml(originalUrl, originalData, context);

                // Return a new network response
                return trueResponse;
            }

        }
        catch(IOException e) {
            LogManager.log(Level.SEVERE, "Error trying to parse out OpenAM authentication data.  Treating as regular response.", e);
        }

        if(contentStreamClosed == true && originalData != null) {
            // We need to recreate the old content stream because we've already closed it

            // Restore saved values
            BasicHttpEntity duplicateEntity = new BasicHttpEntity();
            duplicateEntity.setContentLength(contentLength);
            duplicateEntity.setContentEncoding(contentEncoding);
            duplicateEntity.setContentType(contentType);
            duplicateEntity.setChunked(chunked);

            EofSensorInputStream newContentStream = new EofSensorInputStream(new ByteArrayInputStream(originalData), new ByteEofSensorWatcher());
            duplicateEntity.setContent(newContentStream);

            response.setEntity(duplicateEntity);
        }


        return response;
    }

    private static HttpResponse parseOpenAMHtml(String originalUrl, byte [] inputData, Context context) throws IOException {
        String data = new String(inputData);

        // We think it is.  Attempt to parse the whole thing
        Document doc = Jsoup.parse(data);
        Elements forms = doc.getElementsByTag("form");

        // Parse out the generated form and get the action and inputs
        URL forwardUrl = new URL(new URL(originalUrl), forms.get(0).attr("action"));
        Elements inputs = forms.get(0).getElementsByTag("input");
        int numInputs = inputs.size();

        // Pack them into an HTTP client recognized structure
        List<NameValuePair> result = new ArrayList<NameValuePair>();

        for (int i = 0; i < numInputs; i++) {
            if (inputs.get(i).attr("type").equals("submit") == false) {
                result.add(new BasicNameValuePair(inputs.get(i).attr("name"), inputs.get(i).attr("value")));
            }
        }

        // Get the HTTP client used by volley
        HttpClient client = VolleySingleton.getInstance(context).getSslHttpStack().getUnderlyingHttpClient();

        // Make a new POST request and pack the form variables into it
        HttpPost httpPost = new HttpPost(forwardUrl.toString());
        httpPost.addHeader("Context-Type", "application/x-www-form-urlencoded");
        httpPost.setEntity(new UrlEncodedFormEntity(result));

        // Get the response and read it into a string
        return client.execute(httpPost);
    }
}
