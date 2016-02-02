package com.fourtwosix.mono.data.models;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import java.util.Date;

public class OSMMapTile implements IDataModel {

    public static enum TileType {
        STREET,
        AERIAL;
    }

    String tileHash;
    TileType _type;
    Bitmap tile;
    Date cacheDate;
    int x;
    int y;
    int z;

    public int getX() {
        return x;
    }

    public void setX(int x) {
        this.x = x;
    }

    public int getY() {
        return y;
    }

    public void setY(int y) {
        this.y = y;
    }

    public int getZ() {
        return z;
    }

    public void setZ(int z) {
        this.z = z;
    }

    public OSMMapTile(){}

    public OSMMapTile(int x, int y, int z){
        setGuid(x,y,z);
    }

    public OSMMapTile(int x, int y, int z, TileType type){
        setGuid(x,y,z, type);
    }

    public OSMMapTile(String guid, byte[] tile, long timestamp){
        setGuid(guid);
        setTile(tile);
        setCacheDate(timestamp);
    }

    public OSMMapTile(String guid, Bitmap tile, long timestamp){
        setGuid(guid);
        setTile(tile);
        setCacheDate(timestamp);
    }

    @Override
    public String getGuid() {
        return tileHash;
    }

    @Override
    public void setGuid(String guid) {
        tileHash = guid;
        String[] parsed = guid.split(",");
        if (parsed.length == 3 || parsed.length == 4){
            this.z = Integer.parseInt(parsed[0]);
            this.x = Integer.parseInt(parsed[1]);
            this.y = Integer.parseInt(parsed[2]);
            if(parsed.length == 4)
                this._type = Enum.valueOf(TileType.class, parsed[3]);
        }
        else throw new IllegalArgumentException("Guid could not be parsed into tile");
    }

    public static OSMMapTile loadFromLonLat(double lon, double lat, int zoom){
        OSMMapTile tile = new OSMMapTile();
        int xtile = (int)Math.floor( (lon + 180) / 360 * (1<<zoom) ) ;
        int ytile = (int)Math.floor( (1 - Math.log(Math.tan(Math.toRadians(lat)) + 1 / Math.cos(Math.toRadians(lat))) / Math.PI) / 2 * (1<<zoom) ) ;
        if (xtile < 0)
            xtile=0;
        if (xtile >= (1<<zoom))
            xtile=((1<<zoom)-1);
        if (ytile < 0)
            ytile=0;
        if (ytile >= (1<<zoom))
            ytile=((1<<zoom)-1);
        tile.setGuid(xtile, ytile, zoom);
        return tile;
    }

    public void setGuid(int x, int y, int z){
        this.x = x;
        this.y = y;
        this.z = z;
        tileHash = OSMMapTile.hash(x, y, z);
    }

    public void setGuid(int x, int y, int z, TileType type){
        this.x = x;
        this.y = y;
        this.z = z;
        this._type = type;
        tileHash = OSMMapTile.hash(x, y, z, type);
    }

    public Date getCacheDate() {
        return cacheDate;
    }

    public void setCacheDate(Date cacheDate) {
        this.cacheDate = cacheDate;
    }

    public void setCacheDate(long epoch) {
        this.cacheDate = new Date(epoch);
    }

    public Bitmap getTile() {
        return tile;
    }

    public void setTile(Bitmap tile) {
        this.tile = tile;
    }

    public void setTile(byte[] tile) {
        this.tile = BitmapFactory.decodeByteArray(tile,
                0, tile.length);
    }

    public static String hash(int x, int y, int z){
        return Integer.toString(z) + "," + Integer.toString(x) + "," + Integer.toString(y);
    }

    public static String hash(int x, int y, int z, TileType type){
        String base = Integer.toString(z) + "," + Integer.toString(x) + "," + Integer.toString(y);
        return type == TileType.STREET ? base : base + "," + type.toString();
    }

    //TODO: These are not currently needed but they might prove useful in the future
    @Override
    public String getObjectDefinition() {
        return null;
    }

    @Override
    public void setObjectDefinition(String objectDefinition) {

    }

    @Override
    public IDataModel merge(IDataModel compare) {
        return null;
    }

    @Override
    public IDataModel fromJSON(String JSON) {
        return null;
    }

    @Override
    public String toJSON() {
        return null;
    }
}
