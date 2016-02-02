package com.fourtwosix.mono.data.models;

import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.LogManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;

/**
 * Created by Corey on 1/8/14.
 */
public class Dashboard implements IDataModel, Serializable, Comparable {
    String guid;
    String name;
    String description;
    Date createdDate;
    String prettyCreatedDate;
    String prettyEditedDate;
    Date editedDate;
    int dashboardPosition;
    String objectDefinition;
    JSONObject layoutConfig;
    boolean nativeCreated;
    static final JSONObject DEFAULT_LAYOUT_JSON;

    static {
        try {
            DEFAULT_LAYOUT_JSON = new JSONObject();

            DEFAULT_LAYOUT_JSON.put("xtype", "container");
            DEFAULT_LAYOUT_JSON.put("cls", "vbox ");
            DEFAULT_LAYOUT_JSON.put("layout", new JSONObject().put("type", "vbox").put("align", "stretch"));
            DEFAULT_LAYOUT_JSON.put("items", new JSONArray().put(
                    new JSONObject().put("xtype", "tabbedpane")
                        .put("cls", "top")
                        .put("htmlText", "48%")
                        .put("items", new JSONArray())
                        .put("widgets", new JSONArray())
                        .put("defaultSettings", new JSONObject())
                        .put("flex", 0.52)));
            DEFAULT_LAYOUT_JSON.put("flex", 3);
        }
        catch(JSONException e) {
            throw new RuntimeException("Error constructing default layout!");
        }
    }

    public static class Widget{
        public String guid;
        public String instanceId;
        public String name;

        @Override
        public String toString() {
            return this.name;
        }
    }

    //TODO: Placeholder until widgets gets brought into this
    Map<String, Widget> widgets;

    public Dashboard(){
        this.guid = UUID.randomUUID().toString();
        this.widgets = new HashMap<String, Widget>();
        this.createdDate = new Date();
        this.editedDate = new Date();
        this.objectDefinition = "{}";
        this.layoutConfig =  DEFAULT_LAYOUT_JSON;
        this.nativeCreated = false;
    }

    @Override
    public String getGuid() {
        return guid;
    }

    @Override
    public void setGuid(String guid) {
        this.guid = guid;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) { this.description = description.equals("null") ? null : description;
    }

    public boolean getNativeCreated() { return nativeCreated; }

    public void setNativeCreated(boolean nativeCreated) { this.nativeCreated = nativeCreated; }

    public void addWidget(WidgetListItem toAdd){
        if(!this.widgets.containsKey(toAdd.getInstanceId())){
            Widget ww = new Widget();
            ww.guid = toAdd.getGuid();
            ww.instanceId = toAdd.getInstanceId();
            ww.name = toAdd.getTitle();

            widgets.put(toAdd.getInstanceId(), ww);
            setEditedDate(new Date());
            writeWidgets();
        }
    }

    public boolean hasWidget(WidgetListItem toCheck){
         return this.widgets.containsKey(toCheck.getGuid());
    }

    public void removeWidget(WidgetListItem toRemove){
        if(this.widgets.containsKey(toRemove.getInstanceId())){
            this.widgets.remove(toRemove.getInstanceId());
            setEditedDate(new Date());
            writeWidgets();
        }
    }

    public Date getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(Date createdDate) {
        this.createdDate = createdDate;
    }

    public void setCreatedDate(String createdDate) {
        this.createdDate = parseDate(createdDate);
    }

    public Widget[] getWidgets(){
        return this.widgets.values().toArray(new Widget[this.widgets.size()]);
    }

    public String getPrettyCreatedDate() {
        return prettyCreatedDate;
    }

    public void setPrettyCreatedDate(String prettyCreatedDate) {
        this.prettyCreatedDate = prettyCreatedDate;
    }

    public String getPrettyEditedDate() {
        return prettyEditedDate;
    }

    public void setPrettyEditedDate(String prettyEditedDate) {
        this.prettyEditedDate = prettyEditedDate;
    }

    public Date getEditedDate() {
        return editedDate;
    }

    public void setEditedDate(Date editedDate) {
        this.editedDate = editedDate;
    }

    public void setEditedDate(String editedDate) {
        this.editedDate = parseDate(editedDate);
    }

    public int getDashboardPosition() {
        return dashboardPosition;
    }

    public void setDashboardPosition(int dashboardPosition) {
        this.dashboardPosition = dashboardPosition;
    }
    public void setDashboardPosition(String dashboardPosition) {
        this.dashboardPosition = Integer.parseInt(dashboardPosition);
    }

    @Override
    public String getObjectDefinition() {
        return objectDefinition;
    }

    @Override
    public void setObjectDefinition(String objectDefinition) {
        this.objectDefinition = objectDefinition;
    }

    @Override
    public IDataModel merge(IDataModel compare) {
        throw new UnsupportedOperationException();
    }

    @Override
    public Dashboard fromJSON(String jsonText) {
        try{
            JSONObject json = new JSONObject(jsonText);
            this.setObjectDefinition(jsonText);
            this.setCreatedDate(json.getString("createdDate"));
            this.setDashboardPosition(json.getString("dashboardPosition"));
            this.setDescription(json.getString("description"));
            this.setEditedDate(json.getString("editedDate"));
            this.setName(json.getString("name"));
            this.setGuid(json.getString("guid"));
            this.setPrettyCreatedDate(json.getString("prettyCreatedDate"));
            this.setPrettyEditedDate(json.getString("prettyEditedDate"));
            this.setNativeCreated(json.optBoolean("nativelyCreated"));
            this.layoutConfig =  new JSONObject(json.getString("layoutConfig"));
            if(this.layoutConfig.has("widgets"))
                parseWidgets(this.layoutConfig);
            else if (this.layoutConfig.has("items")) {
                JSONArray items = this.layoutConfig.getJSONArray("items");
                for(int i=0;i<items.length();i++){
                    parseWidgets(items.getJSONObject(i));
                }
            }

        } catch (JSONException exception) {
            LogManager.log(Level.SEVERE, "Dashboard could not correctly handle Json: " + jsonText);
            LogManager.log(Level.SEVERE, "Dashboard Json parsing exception:", exception);
        } catch (Exception exception) {
            LogManager.log(Level.SEVERE, "Dashboard Json parsing exception:", exception);
        }
        return this;
    }

    @Override
    public String toJSON() {
        try{
            JSONObject json = new JSONObject(this.objectDefinition);
            json.put("createdDate", getNullable(getWriteableDateFormat().format(this.createdDate)));
            json.put("dashboardPosition", this.getDashboardPosition());
            json.put("description", getNullable(this.getDescription()));
            json.put("editedDate", getNullable(getWriteableDateFormat().format(this.getEditedDate())));
            json.put("name", getNullable(this.getName()));
            json.put("guid", this.getGuid());
            json.put("prettyCreatedDate", getNullable(this.getPrettyCreatedDate()));
            json.put("prettyEditedDate", getNullable(this.getPrettyEditedDate()));
            json.put("layoutConfig", this.layoutConfig.toString());
            json.put("nativelyCreated", this.nativeCreated);
            //Now write the widgets
            this.objectDefinition = json.toString();
        } catch (JSONException e) {
            LogManager.log(Level.SEVERE, "Could not parse Json: " + this.objectDefinition);
        }
        return this.objectDefinition;
    }

    public SimpleDateFormat getWriteableDateFormat(){
        return new SimpleDateFormat("MM/dd/yyyy hh:mm a zzz");
    }

    private void parseWidgets(JSONObject wList){
        try{
            if(wList.has("widgets")){
                JSONArray w = wList.getJSONArray("widgets");
                for(int i=0;i<w.length();i++){
                    if(w.getJSONObject(i).has("widgetGuid")){
                        Widget toAdd = new Widget();
                        toAdd.guid = w.getJSONObject(i).getString("widgetGuid");
                        toAdd.instanceId = w.getJSONObject(i).getString("uniqueId");
                        toAdd.name = w.getJSONObject(i).getString("name");
                        this.widgets.put(toAdd.instanceId, toAdd);
                    }
                }
            }
        } catch (JSONException e) {
            LogManager.log(Level.SEVERE,  "Could not parse Json: " + wList.toString(), e);
        }
    }

    private Date parseDate(String toParse){
        SimpleDateFormat parserSDF = getWriteableDateFormat();
        try {
            return parserSDF.parse(toParse);
        } catch (ParseException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
            //TODO:
           return null;
        }
    }

    private void writeWidgets(){
        //TODO: This won't work for editing existing server widgets as it will lose all existing layout data
        try {
            this.layoutConfig = DEFAULT_LAYOUT_JSON;
            JSONArray arr = layoutConfig.getJSONArray("items").getJSONObject(0).getJSONArray("widgets");
            for(Widget v : this.widgets.values()){
                arr.put(createWidgetJSON(v));
            }

            LogManager.log(Level.INFO, this.layoutConfig.toString());
        } catch (JSONException e) {
            LogManager.log(Level.SEVERE, e.getMessage());
        }
    }

    private JSONObject createWidgetJSON(Widget toCreateFrom) throws JSONException {
        //TODO: This makes me sad. I will do this better.
        JSONObject new_widget = new JSONObject();
        new_widget.put("universalName", null);
        new_widget.put("widgetGuid", toCreateFrom.guid);
        new_widget.put("uniqueId", toCreateFrom.instanceId);
        new_widget.put("dashboardGuid", this.getGuid());
        new_widget.put("intentConfig", null);
        new_widget.put("launchData", null);
        new_widget.put("name", toCreateFrom.name);
        new_widget.put("active", true);
        new_widget.put("x", 0);
        new_widget.put("y", 82);
        new_widget.put("zIndex", 0);
        new_widget.put("minimized", false);
        new_widget.put("maximized", false);
        new_widget.put("pinned", false);
        new_widget.put("collapsed", false);
        new_widget.put("columnPos", 0);
        new_widget.put("buttonId", null);
        new_widget.put("buttonOpened", false);
        new_widget.put("region", "none");
        new_widget.put("statePosition", 4);
        new_widget.put("singleton", false);
        new_widget.put("floatingWidget", false);
        new_widget.put("height", 394);
        new_widget.put("width", 1920);
        return new_widget;
    }

    private Object getNullable(String src){
        return src == null ? JSONObject.NULL : src;
    }

    private void writeObject(ObjectOutputStream outStream)
        throws IOException{
        outStream.writeObject(guid);
        outStream.writeObject(name);
        outStream.writeObject(description);
        outStream.writeObject(createdDate);
        outStream.writeObject(prettyCreatedDate);
        outStream.writeObject(prettyEditedDate);
        outStream.writeObject(editedDate);
        outStream.writeInt(dashboardPosition);
        outStream.writeObject(objectDefinition);
        outStream.writeObject(layoutConfig.toString());
    }

    private void readObject(ObjectInputStream inStream)
        throws IOException, ClassNotFoundException {
        guid = (String)inStream.readObject();
        name = (String)inStream.readObject();
        description = (String)inStream.readObject();
        createdDate = (Date)inStream.readObject();
        prettyCreatedDate = (String)inStream.readObject();
        prettyEditedDate = (String)inStream.readObject();
        editedDate = (Date)inStream.readObject();
        dashboardPosition = inStream.readInt();
        objectDefinition = (String)inStream.readObject();
        try {
            layoutConfig = new JSONObject((String)inStream.readObject());
        }
        catch(JSONException e) {
            throw new IOException("Error deserializing JSON object.");
        }
    }

    @Override
    public int compareTo(Object other) {
        Dashboard compare = (Dashboard)other;
        return this.getName().compareToIgnoreCase(compare.getName());
    }

    @Override
    public String toString() {
        return this.getName();
    }
}
