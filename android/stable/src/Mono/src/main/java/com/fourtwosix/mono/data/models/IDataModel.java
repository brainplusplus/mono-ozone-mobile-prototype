package com.fourtwosix.mono.data.models;

/**
 * Created by Corey on 1/8/14.
 */
public interface IDataModel {

    public String getGuid();
    public void setGuid(String guid);
    public String getObjectDefinition();
    public void setObjectDefinition(String objectDefinition);

    public IDataModel merge(IDataModel compare);
    public IDataModel fromJSON(String JSON);
    public String toJSON();
}
