package com.fourtwosix.mono.webViewIntercept;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.fourtwosix.mono.data.models.OSMMapTile;
import com.fourtwosix.mono.data.models.TrackingEntry;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.data.services.OSMBulkCacheService;
import com.fourtwosix.mono.data.services.OSMCacheService;
import com.fourtwosix.mono.utils.LogManager;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URL;
import java.util.List;
import java.util.logging.Level;

/**
 * Created by cherbert.
 */
public class MapCacheWebViewAPI implements WebViewsAPI {


    public WebResourceResponse handle(WebView view, String methodName, URL fullUrl) {
        try{
            Uri path = Uri.parse(fullUrl.toString());
            List<String> pathSegments = path.getPathSegments();
            String method = pathSegments.get(2);
            if(method == null || method.isEmpty() || method.equalsIgnoreCase("serve")){
                return serveTile(path);
            }
            if(method.equalsIgnoreCase("sat")){
                return serveAerial(path);
            }
            else if(method.equalsIgnoreCase("cache") &&
                    path.getQueryParameter("tllon") != null &&
                    path.getQueryParameter("tllat") != null &&
                    path.getQueryParameter("brlon") != null &&
                    path.getQueryParameter("brlat") != null &&
                    path.getQueryParameter("zoommin") != null &&
                    path.getQueryParameter("zoommax") != null ){
                return cacheTiles(view.getContext(),
                        Double.parseDouble(path.getQueryParameter("tllon")),
                        Double.parseDouble(path.getQueryParameter("tllat")),
                        Double.parseDouble(path.getQueryParameter("brlon")),
                        Double.parseDouble(path.getQueryParameter("brlat")),
                        Integer.parseInt(path.getQueryParameter("zoommin")),
                        Integer.parseInt(path.getQueryParameter("zoommax")));
            }
            else if(method.equalsIgnoreCase("status")){
                return cacheStatus();
            }

        } catch (Exception e){
            LogManager.log(Level.SEVERE, "Error during map caching.", e);
            return null;
        }
        return null;
    }

    private WebResourceResponse cacheStatus() {
        TrackingEntry tracking = ((OSMCacheService)DataServiceFactory.getService(DataServiceFactory.Services.OSMCacheService)).getTracking();

        String json;
        if(OSMBulkCacheService.isRunning())
            json = tracking.toJSON();
        else if (tracking.processed == -1)
           json = "{\"status\":\"Request too large\",\"total\":" + tracking.total + "\"}";
        else
            json = "{\"status\":\"complete\",\"total\":\"" + tracking.total + "\"}";
        LogManager.log(Level.INFO, "MAPSTATUS" + " : " + json);
        return new WebResourceResponse("application/json", "UTF-8", new ByteArrayInputStream(json.getBytes()));
    }

    private WebResourceResponse cacheTiles(Context ctx, double topLeftLon, double topLeftLat, double bottomRightLon, double bottomRightLat, int zoomMin, int zoomMax) {
        Intent mapCacheIntent = new Intent(ctx, OSMBulkCacheService.class);
        mapCacheIntent.putExtra(OSMBulkCacheService.TOP_LEFT_LON, topLeftLon);
        mapCacheIntent.putExtra(OSMBulkCacheService.TOP_LEFT_LAT, topLeftLat);
        mapCacheIntent.putExtra(OSMBulkCacheService.BOTTOM_RIGHT_LON, bottomRightLon);
        mapCacheIntent.putExtra(OSMBulkCacheService.BOTTOM_RIGHT_LAT, bottomRightLat);
        mapCacheIntent.putExtra(OSMBulkCacheService.ZOOM_MIN, zoomMin);
        mapCacheIntent.putExtra(OSMBulkCacheService.ZOOM_MAX, zoomMax);

        ctx.startService(mapCacheIntent);

        String json = "{\"status\":\"failure\",\"cacheId\":\"\"}";
        return new WebResourceResponse("application/json", "UTF-8", new ByteArrayInputStream(json.getBytes()));
    }

    private WebResourceResponse serveTile(Uri path) {
        OSMMapTile tile = parseUri(path);
        OSMCacheService svc = (OSMCacheService)DataServiceFactory.getService(DataServiceFactory.Services.OSMCacheService);
        OSMMapTile retrieved = svc.serveTile(tile.getX(), tile.getY(), tile.getZ(), true);
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        retrieved.getTile().compress(Bitmap.CompressFormat.PNG, 100, stream);
        byte[] byteArray = stream.toByteArray();

        return new WebResourceResponse("image/*", "base64", new ByteArrayInputStream(byteArray));
    }

    private WebResourceResponse serveAerial(Uri path) {
        OSMMapTile tile = parseUri(path);
        OSMCacheService svc = (OSMCacheService)DataServiceFactory.getService(DataServiceFactory.Services.OSMCacheService);
        OSMMapTile retrieved = svc.serveTile(tile.getX(), tile.getY(), tile.getZ(), true, OSMMapTile.TileType.AERIAL);
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        retrieved.getTile().compress(Bitmap.CompressFormat.PNG, 100, stream);
        byte[] byteArray = stream.toByteArray();

        return new WebResourceResponse("image/*", "base64", new ByteArrayInputStream(byteArray));
    }

    private OSMMapTile parseUri(Uri l){
        OSMMapTile tile = null;
        String[] p = l.getPath().replace(".png", "").split("/");
        if(p != null && p.length >=3){
            tile = new OSMMapTile(Integer.parseInt(p[p.length - 2]),
                    Integer.parseInt(p[p.length - 1]),
                    Integer.parseInt(p[p.length - 3]));
        }
        return tile;
    }
}
