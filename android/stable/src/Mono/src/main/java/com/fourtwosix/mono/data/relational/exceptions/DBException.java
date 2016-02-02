package com.fourtwosix.mono.data.relational.exceptions;

/**
 * An exception class for Bad SQL/DB syntax.
 */
public class DBException extends Exception {
    /**
     * Creates the exception with a message.
     * @param msg The message for the exception.
     */
    public DBException(String msg) {
        super(msg);
    }

    /**
     * Passes the top level exception to the ColumnNotFound exception.
     * @param e The top level exception.
     */
    public DBException(Exception e) {
        super(e);
    }

    /**
     * Passes both a message and a top level exception to the ColumnNotFoundException.
     * @param msg The message for the exception.
     * @param e The top level exception.
     */
    public DBException(String msg, Exception e) {
        super(msg, e);
    }
}
