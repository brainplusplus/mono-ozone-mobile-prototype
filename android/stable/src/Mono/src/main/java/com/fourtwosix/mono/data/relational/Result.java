package com.fourtwosix.mono.data.relational;

import com.fourtwosix.mono.data.relational.exceptions.ColumnNotFound;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Results returned from a relational database.  Each result corresponds to a row returned from a query.
 * @author mwilson
 */
public class Result {
    private Map<String, Object> columnsAndValues;

    /**
     * Constructor.
     */
    public Result() {
        columnsAndValues = new TreeMap<String, Object>();
    }

    /**
     * Constructor that takes a map of values.
     * @param values The values to populate the result with.
     */
    public Result(Map<String, Object> values) {
        columnsAndValues = new TreeMap<String, Object>(values);
    }

    /**
     * Adds a column and blob (byte array) value to the result.
     * @param column The column to add.
     * @param value The blob value to add.
     */
    public void addBlob(String column, byte [] value) {
        columnsAndValues.put(column, value);
    }

    /**
     * Adds a column and float value to the result.
     * @param column The column to add.
     * @param value The float value to add.
     */
    public void addFloat(String column, Float value) {
        columnsAndValues.put(column, value);
    }

    /**
     * Adds a column and integer value to the result.
     * @param column The column to add.
     * @param value The integer value to add.
     */
    public void addInteger(String column, Integer value) {
        columnsAndValues.put(column, value);
    }

    /**
     * Adds a column and null value to the result.
     * @param column The column to add.  No value is needed.
     */
    public void addNull(String column) {
        columnsAndValues.put(column, null);
    }

    /**
     * Adds a column and String value to the result.
     * @param column The column to add.
     * @param value The String value to add.
     */
    public void addString(String column, String value) {
        columnsAndValues.put(column, value);
    }

    /**
     * A list of all valid columns for the result.
     * @return A list of columns.
     */
    public List<String> getColumns() {
        return new ArrayList(columnsAndValues.keySet());
    }

    /**
     * Gets the blob (byte array) value of a particular column.
     * @param columnName The name of the column to retrieve the value of.
     * @return The byte array value associated with the column.
     */
    public byte [] getBlob(String columnName)
            throws ColumnNotFound {
        return getObjectAndCast(columnName, byte[].class);
    }

    /**
     * Gets the float value of a particular column.
     * @param columnName The name of the column to retrieve the value of.
     * @return The float value associated with the column.
     */
    public Float getFloat(String columnName)
            throws ColumnNotFound {
        return getObjectAndCast(columnName, Float.class);
    }

    /**
     * Gets the integer value of a particular column.
     * @param columnName The name of the column to retrieve the value of.
     * @return The integer value associated with the column.
     */
    public Integer getInteger(String columnName)
            throws ColumnNotFound {
        return getObjectAndCast(columnName, Integer.class);
    }

    /**
     * Returns true if the value associated with the column is null.
     * @param columnName The name of the column to test.
     * @return True if the column value is null, false otherwise.
     */
    public boolean getIsNull(String columnName)
            throws ColumnNotFound {
        return getObjectAndCast(columnName, Object.class) == null;
    }

    /**
     * Gets the String value of a particular column.
     * @param columnName The name of the column to retrieve the value of.
     * @return The String value associated with the column.
     */
    public String getString(String columnName)
            throws ColumnNotFound {
        return getObjectAndCast(columnName, String.class);
    }

    /**
     * Gets the raw underlying object of a particular column.
     * @param columnName The columnName to retrieve the value of.
     * @return The Object value associated with the column.
     * @throws ColumnNotFound
     */
    public Object get(String columnName)
            throws ColumnNotFound {
        return getObjectAndCast(columnName, Object.class);
    }
    // Utility function for getting column values
    private <T>
    T getObjectAndCast(String columnName, Class<T> tClazz)
            throws ColumnNotFound {
        // If we have the key
        if(columnsAndValues.containsKey(columnName)) {
            Object value = columnsAndValues.get(columnName);

            // If the value is null, simply return null
            if(value == null) {
                return null;
            }

            // Otherwise, cast the class
            return tClazz.cast(value);
        }

        // Can't find the column, throw an exception
        throw new ColumnNotFound("Unable to find column " + columnName + " in the result!");
    }
}
