package com.fourtwosix.mono.data.relational;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * A list of results from a relational query.
 */
public class ResultList implements Iterable<Result> {
    private List<Result> results;

    /**
     * Constructor.
     */
    public ResultList() {
        results = new ArrayList<Result>();
    }

    /**
     * Adds a result to the result list.
     * @param result The result to add.
     */
    public void addResult(Result result) {
        results.add(result);
    }

    /**
     * Gets the number of all results in the list.
     * @return The number of results.
     */
    public int getCount() {
        return results.size();
    }

    /**
     * Gets a result at the specified index.
     * @param index The index of the result to get.
     * @return A result associated with the index.
     */
    public Result get(int index) {
        return results.get(index);
    }

    @Override
    public Iterator<Result> iterator() {
        return results.iterator();
    }
}
