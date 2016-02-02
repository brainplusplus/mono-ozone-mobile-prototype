package com.fourtwosix.mono.data.ORM.types;

import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

/**
 * Created by alerman on 1/22/14.
 */
@DatabaseTable(tableName = "backing_store")
public class BackingStore {

    @DatabaseField(generatedId = true)
    private int id;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    @DatabaseField
    private String saveUrl;
    @DatabaseField
    private String instanceId;

    public String getSaveUrl() {
        return saveUrl;
    }

    public void setSaveUrl(String saveUrl) {
        this.saveUrl = saveUrl;
    }

    public String getInstanceId() {
        return instanceId;
    }

    public void setInstanceId(String instanceId) {
        this.instanceId = instanceId;
    }

}
