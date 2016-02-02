package com.fourtwosix.mono.data.relational.exceptions;

/**
 * Exception class if a requested column was not found.
 */
public class ColumnNotFound extends Exception {
    /**
     * Creates the exception with a message.
     * @param msg The message for the exception.
     */
    public ColumnNotFound(String msg) {
        super(msg);
    }

    /**
     * Passes the top level exception to the ColumnNotFound exception.
     * @param e The top level exception.
     */
    public ColumnNotFound(Exception e) {
        super(e);
    }

    /**
     * Passes both a message and a top level exception to the ColumnNotFoundException.
     * @param msg The message for the exception.
     * @param e The top level exception.
     */
    public ColumnNotFound(String msg, Exception e) {
        super(msg, e);
    }
}
