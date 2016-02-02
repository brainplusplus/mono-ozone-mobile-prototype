package com.fourtwosix.mono.utils;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;

import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.ImageRequest;
import com.fourtwosix.mono.R;
import com.fourtwosix.mono.structures.ImageDownload;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.caching.VolleySingleton;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.logging.Level;

/**
 * This class makes it easy to download the images from widgets with very little implementation.
 * Use a handler to listen for a response.
 * Created by Eric on 2/10/14.
 */
public class WidgetImageDownloadHelper {
    private Context context;
    private String baseUrl;
    private Handler handler;
    private RequestQueue volleyQueue;
    private int downloadCounter = 0;

    public WidgetImageDownloadHelper(Context context, Handler handler, String baseUrl) {
        this.context = context;
        this.handler = handler;
        this.baseUrl = baseUrl;

        volleyQueue = VolleySingleton.getInstance(context.getApplicationContext()).getRequestQueue();
    }

    public void downloadImages(Map<String, WidgetListItem> widgets) {
        LogManager.log(Level.INFO, "Downloading images for " + widgets.size() + " widgets.");

        if(widgets.size() == 0) {
            sendComplete();
            return;
        }

        downloadCounter = widgets.size() *2; // large and small images
        for(Map.Entry entry : widgets.entrySet()) {
            WidgetListItem item = (WidgetListItem)entry.getValue();
            String largeIconUrl = item.getLargeIcon();
            String smallIconUrl = item.getSmallIcon();

            if(!largeIconUrl.contains("http")) {
                largeIconUrl = baseUrl + largeIconUrl;
            }
            if(!smallIconUrl.contains("http")) {
                smallIconUrl = baseUrl + smallIconUrl;
            }

            String directory = IOUtil.getWidgetFilePath(context, item, IOUtil.WidgetDirectory.ICONS);
            ImageDownload largeImage = new ImageDownload(directory, largeIconUrl);
            ImageDownload smallImage = new ImageDownload(directory, smallIconUrl);

            LogManager.log(Level.INFO, "Downloading images for widget: " + item.getTitle());
            LogManager.log(Level.INFO, "Downloading images for widget: " + smallImage);
            LogManager.log(Level.INFO, "Downloading images for widget: " + largeImage);
            //download the images in separate try catches in case one succeeds and the other fails
            downloadImageContent(smallImage);
            downloadImageContent(largeImage);
        }
    }

    private void downloadImageContent(ImageDownload imageDownload) {
        //check if the file does not already exist
        File file = new File(imageDownload.getFullPath());
        if(!file.exists()) {
            final ImageDownload image = imageDownload;
            final ImageHelper iHelper = new ImageHelper(context);

            ImageRequest imgRequest = new ImageRequest(image.getPath(), new Response.Listener<Bitmap>() {
                @Override
                public void onResponse(Bitmap response) {
                    try {
                        iHelper.writeImage(response, image);
                    } catch (IOException e) {
                        LogManager.log(Level.SEVERE, e.getMessage());
                    }
                    downloadCounter--;
                    checkComplete();
                }
            }, 250, 250, Bitmap.Config.ALPHA_8, new Response.ErrorListener() {
                @Override
                public void onErrorResponse(VolleyError error) {
                    try {
                        iHelper.writeImage(BitmapFactory.decodeResource(context.getResources(), R.drawable.app_2x), image);
                    } catch (IOException e) {
                        LogManager.log(Level.SEVERE, e.getMessage());
                    }
                    downloadCounter--;
                    checkComplete();
                }
            });

            volleyQueue.add(imgRequest);
        } else {
            downloadCounter--;
            checkComplete();
        }
    }

    /**
     * Checks whether we are done downloading all of the images
     */
    private void checkComplete() {
        if(downloadCounter == 0) {
            sendComplete();
        }
    }

    /**
     * Sends an empty response to the handler that we have finished downloading all of the widget images
     */
    private void sendComplete() {
        handler.sendEmptyMessage(0);
    }
}
