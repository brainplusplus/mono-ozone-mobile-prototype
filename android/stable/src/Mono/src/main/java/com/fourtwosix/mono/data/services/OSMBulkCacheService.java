package com.fourtwosix.mono.data.services;

import android.app.IntentService;
import android.content.Intent;
import android.graphics.Bitmap;

import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.ImageRequest;
import com.android.volley.toolbox.Volley;
import com.fourtwosix.mono.data.models.OSMMapTile;
import com.fourtwosix.mono.utils.LogManager;

import java.util.Date;
import java.util.HashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.logging.Level;

/**
 * Created by Corey on 2/20/14.
 * This is the bulk loader service for map tiles
 */
public class OSMBulkCacheService extends IntentService {
    public static final String TOP_LEFT_LON = "top_left_lon";
    public static final String TOP_LEFT_LAT = "top_left_lat";
    public static final String BOTTOM_RIGHT_LON = "bottom_right_lon";
    public static final String BOTTOM_RIGHT_LAT = "bottom_right_lat";
    public static final String ZOOM_MIN = "zoom_min";
    public static final String ZOOM_MAX = "zoom_max";
    public static boolean running = false;

    public static int numSlots = 10;

    RequestQueue rq;
    OSMCacheService svc;

    Semaphore semaphore;
    ExecutorService threadPool; // Necessary so we don't lock up the main thread

    static HashMap<String, OSMMapTile> cacheQueue;

    public static boolean isRunning(){
        return running;
    }

    public OSMBulkCacheService() {
        super("OSMBulkCacheService");
        OSMBulkCacheService.cacheQueue = new HashMap<String, OSMMapTile>();
        svc = (OSMCacheService)DataServiceFactory.getService(DataServiceFactory.Services.OSMCacheService);
        rq = Volley.newRequestQueue(svc.getContext());

        semaphore = new Semaphore(numSlots);
        threadPool = Executors.newFixedThreadPool(numSlots);
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        running = true;
        bulkCacheTiles(intent.getDoubleExtra(TOP_LEFT_LON, 0),
                intent.getDoubleExtra(TOP_LEFT_LAT, 0),
                intent.getDoubleExtra(BOTTOM_RIGHT_LON, 0),
                intent.getDoubleExtra(BOTTOM_RIGHT_LAT, 0),
                intent.getIntExtra(ZOOM_MIN, 0),
                intent.getIntExtra(ZOOM_MAX, 0));
    }

    public void cacheTile(final OSMMapTile point){
        cacheTile(point, OSMMapTile.TileType.STREET);
        cacheTile(point, OSMMapTile.TileType.AERIAL);
    }

    public void cacheTile(final OSMMapTile point, final OSMMapTile.TileType type){
        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                String url = type == OSMMapTile.TileType.STREET ? svc.getServiceUrl() :  svc.getAerialServiceUrl();
                ImageRequest request =
                        new ImageRequest(url + Integer.toString(point.getZ()) + "/" +
                                Integer.toString(point.getX()) + "/" +
                                Integer.toString(point.getY()) + ".png",
                                new Response.Listener<Bitmap>() {
                                    @Override
                                    public void onResponse(Bitmap response) {
                                        synchronized(OSMBulkCacheService.cacheQueue){
                                            LogManager.log(Level.SEVERE, "Caching map tile.");
                                            OSMMapTile tile = new OSMMapTile(OSMMapTile.hash(point.getX(),point.getY(),point.getZ(), type), response, new Date().getTime());
                                            svc.put(tile);
                                            OSMBulkCacheService.cacheQueue.remove(tile.getGuid());
                                            svc.logTracking(OSMBulkCacheService.cacheQueue.size());
                                            if(OSMBulkCacheService.cacheQueue.size() == 0) {
                                                running = false;
                                                svc.closeTracking();
                                            }
                                            semaphore.release();
                                        }
                                    }
                                }, 0, 0, null,
                                new Response.ErrorListener() {
                                    @Override
                                    public void onErrorResponse(VolleyError volleyError) {
                                        semaphore.release();
                                        LogManager.log(Level.SEVERE, "Error trying to cache map tile.");
                                    }
                                });

                try {
                    semaphore.acquire();
                    rq.add(request);
                }
                catch(InterruptedException e) {
                    LogManager.log(Level.SEVERE, "Unable to acquire semaphore -- interrupted.");
                }
            }
        };

        threadPool.execute(runnable);
    }

    public void bulkCacheTiles(double topLeftLon, double topLeftLat, double bottomRightLon, double bottomRightLat, int zoomStart, int zoomEnd){
        synchronized (OSMBulkCacheService.cacheQueue){
            for(int z = zoomStart; z <= zoomEnd; z++){
                //For each zoom level we get the bounds
                OSMMapTile b = OSMMapTile.loadFromLonLat(topLeftLon, topLeftLat, z);
                OSMMapTile e = OSMMapTile.loadFromLonLat(bottomRightLon, bottomRightLat, z);
                for(int x = Math.min(b.getX(), e.getX()); x <= Math.max(b.getX(), e.getX()); x++){
                    for(int y = Math.min(b.getY(), e.getY()); y <= Math.max(b.getY(), e.getY()); y++){
                        OSMMapTile tile = new OSMMapTile(x,y,z);
                        OSMBulkCacheService.cacheQueue.put(tile.getGuid(), tile);
                    }
                }
            }
            svc.startTracking(0, OSMBulkCacheService.cacheQueue.size(), new Date().getTime(), 0) ;
            //We do this below so that we can determine if the request is too large first
            if(OSMBulkCacheService.cacheQueue.size() < svc.MAX_REQUEST_TILES){
                for(OSMMapTile tile : OSMBulkCacheService.cacheQueue.values()){
                    cacheTile(tile);
                }
            }
            else {
                running = false;
                svc.logTracking(-1);
                svc.closeTracking();
            }
        }
    }
}
