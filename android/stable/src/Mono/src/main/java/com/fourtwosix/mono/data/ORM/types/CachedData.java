package com.fourtwosix.mono.data.ORM.types;

import com.fourtwosix.mono.utils.caching.CacheHelper;
import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

import java.util.Calendar;
import java.util.Date;

/**
 * Created by alerman on 1/28/14.
 */
@DatabaseTable(tableName = "cached_data")
public class CachedData {

    public CachedData() {

    }

    public static final String DATE_FIELD_NAME = "date_created";
    public static final String URL_FIELD_NAME = "url";
    public static final String REFRESH_TIME_FIELD_NAME = "refreshTime";

    public CachedData(Cache cache, String instanceId, String url, String contentType) {
        this.cache = cache;
        this.instanceId = instanceId;
        this.url = url;
        this.dateCreated = Calendar.getInstance().getTime();
        this.contentType = contentType;
        this.refreshTime = CacheHelper.DEFAULT_REFRESH;
        this.expirationTime = CacheHelper.DEFAULT_EXPIRATION;
        this.eTag = null;
    }

    public CachedData(Cache cache, String instanceId, String url, String contentType, Long refreshTime, Long expirationTime, String eTag) {
        this.cache = cache;
        this.instanceId = instanceId;
        this.url = url;
        this.dateCreated = Calendar.getInstance().getTime();
        this.contentType = contentType;
        this.refreshTime = refreshTime;
        this.expirationTime = expirationTime;
        this.eTag = eTag;
    }


    @DatabaseField(generatedId = true)
    private int id;

    @DatabaseField(foreign = true)
    Cache cache;

    @DatabaseField(index = true)
    String url;

    @DatabaseField(index = true)
    String instanceId;

    @DatabaseField(columnName = DATE_FIELD_NAME)
    Date dateCreated;

    @DatabaseField
    String contentType;

    @DatabaseField
    Long refreshTime;

    @DatabaseField
    Long expirationTime;

    @DatabaseField
    String eTag;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public Cache getCache() {
        return cache;
    }

    public String getInstanceId() { return instanceId; }

    public String getUrl() { return url; }

    public void setCache(Cache cache) {
        this.cache = cache;
    }

    public void setInstanceId(String instanceId) { this.instanceId = instanceId; }

    public void setUrl(String url) { this.url = url; }

    public Date getDateCreated() {
        return dateCreated;
    }

    public void setDateCreated(Date dateCreated) {
        this.dateCreated = dateCreated;
    }

    public String getContentType() { return contentType; }

    public void setRefreshTime(Long refreshTime) {
        this.refreshTime = refreshTime;
    }

    public Long getRefreshTime() {
        return refreshTime;
    }

    public void setExpirationTime(Long expirationTime) {
        this.expirationTime = expirationTime;
    }

    public Long getExpirationTime() {
        return expirationTime;
    }

    public void setETag(String eTag) {
        this.eTag = eTag;
    }

    public String getETag() {
        return eTag;
    }
}
