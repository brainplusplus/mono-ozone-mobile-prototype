package com.fourtwosix.mono.data.relational;

import com.fourtwosix.mono.data.relational.exceptions.BadSyntaxException;
import com.fourtwosix.mono.data.relational.exceptions.DBException;

/**
 * Generic database interface for future database implementations.
 */
public interface Database {
    /**
     * Returns true if the table exists.
     * @param tableName The table to test against.
     * @return True if the table exists, false otherwise.
     */
    public boolean tableExists(String tableName);

    /**
     * Executes a single query.
     * Meant for queries that require no result.
     * @param query The query to execute.
     * @param selectionArgs The arguments that the query should be using.
     */
    public void exec(String query, String [] selectionArgs) throws BadSyntaxException, DBException;

    /**
     * Executes a query and returns the results.  This is not meant for queries that modify the table.
     * For those queries, use {@link #exec(String, String[])}
     *
     * @param query The query to execute.
     * @param selectionArgs The arguments that the query should be using.
     * @return A ResultList object populated with the rows from the query.
     */
    public ResultList query(String query, String [] selectionArgs) throws BadSyntaxException, DBException;
}
