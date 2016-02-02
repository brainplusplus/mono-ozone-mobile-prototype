package com.fourtwosix.mono.data.ORM.types;

import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

/**
 * Created by alerman on 1/22/14.
 */
@DatabaseTable(tableName = "cache")
public class Cache {

    @DatabaseField(generatedId = true)
    private int id;

    public BackingStore getBackingStore() {
        return backingStore;
    }

    public void setBackingStore(BackingStore backingStore) {
        this.backingStore = backingStore;
    }

    @DatabaseField(foreign = true)
    BackingStore backingStore;
    @DatabaseField
    private long timeout;
    @DatabaseField
    private long expirationInMinutes;

    public Cache()
    {

    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public long getTimeout() { return timeout; }

    public void setTimeout(long timeout) {
        this.timeout = timeout;
    }

    public long getExpirationInMinutes() {
        return expirationInMinutes;
    }

    public void setExpirationInMinutes(long expirationInMinutes) {
        this.expirationInMinutes = expirationInMinutes;
    }

}


