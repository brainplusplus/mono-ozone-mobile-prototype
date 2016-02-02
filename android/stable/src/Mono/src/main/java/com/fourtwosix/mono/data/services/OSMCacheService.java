package com.fourtwosix.mono.data.services;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.graphics.Bitmap;

import com.android.volley.RequestQueue;
import com.android.volley.toolbox.ImageRequest;
import com.android.volley.toolbox.RequestFuture;
import com.android.volley.toolbox.Volley;
import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.models.OSMMapTile;
import com.fourtwosix.mono.data.models.TrackingEntry;
import com.fourtwosix.mono.utils.LogManager;

import java.io.ByteArrayOutputStream;
import java.util.Date;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.logging.Level;

/**
 * Created by Corey
 */
//TODO: This is a stub to be replaced with the data access layer
public class OSMCacheService implements IDataService<OSMMapTile> {

    final static String tableName = "mapcache";
    final static String trackingTableName = "mapcachetracker";
    public final int MAX_REQUEST_TILES;

    TrackingEntry currentEntry;

    String serviceUrl, aerialServiceUrl;
    SQLiteOpenHelper dbHelper;

    Context ctx;
    RequestQueue rq;

    public String getServiceUrl() {
        return serviceUrl;
    }

    public String getAerialServiceUrl() {
        return aerialServiceUrl;
    }

    public Context getContext() {
        return this.ctx;
    }

    public OSMCacheService(SQLiteOpenHelper dbHelper, Context ctx) {
        this.dbHelper = dbHelper;
        String serviceUrl = ctx.getString(R.string.tile_cache_service);
        String aerialServiceUrl = ctx.getString(R.string.aerial_cache_service);
        MAX_REQUEST_TILES = Integer.parseInt(ctx.getString(R.string.max_request_tiles));
        if (!serviceUrl.endsWith("/"))
            serviceUrl = serviceUrl + "/";
        if (!aerialServiceUrl.endsWith("/"))
            aerialServiceUrl = aerialServiceUrl + "/";
        this.serviceUrl = serviceUrl;
        this.aerialServiceUrl = aerialServiceUrl;
        this.ctx = ctx;
        rq = Volley.newRequestQueue(ctx);

        currentEntry = new TrackingEntry(0, 0, 0, 0);
    }

    @Override
    public Iterable list() {
        throw new UnsupportedOperationException();
    }

    @Override
    public OSMMapTile find(String guid) {
        synchronized(this.dbHelper){
            SQLiteDatabase db = dbHelper.getReadableDatabase();
            OSMMapTile tile = null;
            Cursor c = db.query(this.tableName, new String[] {"guid", "tileData", "timeStamp"}, "guid = '" + guid + "'", null, null, null, null);
            if(c != null && c.getCount() > 0){
                c.moveToFirst();
                tile = new OSMMapTile(c.getString(c.getColumnIndex("guid")), c.getBlob(c.getColumnIndex("tileData")), c.getLong(c.getColumnIndex("timeStamp")));
            }
            return tile;
        }
    }

    public OSMMapTile find(int x, int y, int z){
        return find(OSMMapTile.hash(x,y,z));
    }

    public OSMMapTile find(int x, int y, int z, OSMMapTile.TileType type){
        return find(OSMMapTile.hash(x,y,z,type));
    }

    @Override
    public List<OSMMapTile> find(DataModelSearch<OSMMapTile> matcher) {
        //TODO: do these
        throw new UnsupportedOperationException();
    }

    @Override
    public int size() {
        synchronized(this.dbHelper){
            SQLiteDatabase db = this.dbHelper.getReadableDatabase();
            Cursor c = db.rawQuery("SELECT COUNT(guid) as co FROM  "
                    + this.tableName, null);
            c.moveToFirst();
            db.close();
            return c.getInt(c.getColumnIndex("co"));
        }
    }

    public OSMMapTile serveTile(final int x, final int y, final int z, final boolean cache){
        serveTile(x,y,z,cache, OSMMapTile.TileType.AERIAL);
        return serveTile(x,y,z,cache, OSMMapTile.TileType.STREET);
    }

    public OSMMapTile serveTile(final int x, final int y, final int z, final boolean cache, final OSMMapTile.TileType type){
        OSMMapTile tile = find(x, y, z, type);
        if(tile == null){
            String url = type == OSMMapTile.TileType.STREET ? this.serviceUrl : this.aerialServiceUrl;
            RequestFuture<Bitmap> future = RequestFuture.newFuture();
            ImageRequest request = new ImageRequest(url + Integer.toString(z) + "/" + Integer.toString(x) + "/" + Integer.toString(y) + ".png",  future, 0, 0, null, future);
            rq.add(request);
            try {
                Bitmap response = future.get(); // this will block
                tile = new OSMMapTile(OSMMapTile.hash(x,y,z, type), response, new Date().getTime());
                if(cache){
                    put(tile);
                }
            } catch (InterruptedException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
                // we broke something
            } catch (ExecutionException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
                // we broke something
            }
        }
        return tile;
    }

    @Override
    public void put(OSMMapTile it) {
        synchronized(this.dbHelper){
            SQLiteDatabase db = this.dbHelper.getWritableDatabase();
            if(find(it.getGuid()) == null) {
                db.insert(tableName, null, getContentValues(it));
            }
            else
                db.update(tableName, getContentValues(it), "guid=?", new String[] {it.getGuid()});
            db.close();
        }
    }

    public void startTracking(int processed, int total, long startTime, long endTime){
        synchronized (currentEntry) {
            currentEntry = new TrackingEntry(processed, total, startTime, endTime);
        }
    }

    public void logTracking(int processed){
        synchronized(currentEntry){
            currentEntry.processed = processed;
        }

    }

    public void closeTracking(){
        synchronized(currentEntry){
            currentEntry.endTime = System.currentTimeMillis();
        }
    }

    public TrackingEntry getTracking(){
        synchronized(this.dbHelper){
            return currentEntry;
        }
    }

    @Override
    public void put(Iterable<OSMMapTile> list) {
        for(OSMMapTile it : list) {
            put(it);
        }
    }

    @Override
    public void remove(OSMMapTile it) {
        synchronized(this.dbHelper){
            SQLiteDatabase db = this.dbHelper.getReadableDatabase();
            db.delete(tableName, "guid=?", new String[]{it.getGuid()});
            db.close();
        }
    }

    @Override
    public void sync() {
        throw new UnsupportedOperationException();
    }

    private ContentValues getContentValues(OSMMapTile it){
        ContentValues cv = new ContentValues();
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        it.getTile().compress(Bitmap.CompressFormat.PNG, 100, stream);
        byte[] byteArray = stream.toByteArray();
        cv.put("guid", it.getGuid());
        cv.put("tileData", byteArray);
        cv.put("timeStamp", it.getCacheDate().getTime());
        return cv;
    }
}
