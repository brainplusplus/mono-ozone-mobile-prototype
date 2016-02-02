package com.fourtwosix.mono.webViewIntercept.json;

import com.fourtwosix.mono.data.relational.Result;
import com.fourtwosix.mono.data.relational.ResultList;
import com.fourtwosix.mono.data.relational.exceptions.ColumnNotFound;
import com.fourtwosix.mono.utils.LogManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;
import java.util.logging.Level;

/**
 * All of the possible responses from the StorageWebViewAPI.
 */
public class StorageResponse {
    /**
     * Returns results from the query response.
     */
    public static class QueryResponse extends StatusResponse {
        private ResultList results;

        /**
         * Default constructor.
         * @param status Status of the response.
         * @param results The results object to fill the response with.
         */
        public QueryResponse(Status status, ResultList results) {
            super(status);

            this.results = results;
        }

        /**
         * Sets the result list for the object.
         * @param results The result list to populate the object with.
         */
        public void setResults(ResultList results) {
            this.results = results;
        }

        /**
         * Returns the result list from the object.
         * @return The result list current in the object.
         */
        public ResultList getResults() {
            return results;
        }

        @Override
        public String toString() {
            JSONObject json = new JSONObject();

            try {
                // Add the status
                json.put("status", getStatus().toString());

                // Gather the results into an array
                JSONArray resultArray = new JSONArray();

                // Iterate through results
                for(Result result : results) {
                    // Make an individual item
                    JSONObject arrayItem = new JSONObject();

                    List<String> columns = result.getColumns();
                    int numCols = columns.size();

                    // Put each column and column value into the item
                    for(int i=0; i<numCols; i++) {
                        String columnName = columns.get(i);
                        try {
                            arrayItem.put(columnName, result.get(columnName));
                        }
                        catch(ColumnNotFound e) {
                            LogManager.log(Level.SEVERE, e.getMessage());
                            // This should not happen
                        }
                    }

                    // Add the item to the array
                    resultArray.put(arrayItem);
                }

                // Add the array to the base object
                json.put("results", resultArray);
            }
            catch(JSONException e) {
                LogManager.log(Level.SEVERE, e.getMessage());
                return "{\"errorMessage\":\"Error making JSON output.\"}";
            }

            return json.toString();
        }
    }
}
