package com.fourtwosix.mono.data.relational.exceptions;

/**
 * An exception class for Bad SQL/DB syntax.
 */
public class BadSyntaxException extends Exception {
    /**
     * Creates the exception with a message.
     * @param msg The message for the exception.
     */
    public BadSyntaxException(String msg) {
        super(msg);
    }

    /**
     * Passes the top level exception to the BadSyntaxException.
     * @param e The top level exception.
     */
    public BadSyntaxException(Exception e) {
        super(e);
    }

    /**
     * Passes both a message and a top level exception to the BadSyntaxException.
     * @param msg The message for the exception.
     * @param e The top level exception.
     */
    public BadSyntaxException(String msg, Exception e) {
        super(msg, e);
    }
}
