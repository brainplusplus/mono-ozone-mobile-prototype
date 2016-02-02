package com.fourtwosix.mono.tests.data.relational;

import android.database.sqlite.SQLiteException;
import android.test.AndroidTestCase;
import com.fourtwosix.mono.data.relational.Result;
import com.fourtwosix.mono.data.relational.ResultList;
import com.fourtwosix.mono.data.relational.SQLite;
import com.fourtwosix.mono.data.relational.exceptions.BadSyntaxException;
import com.fourtwosix.mono.data.relational.exceptions.DBException;

import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Unit tests for the SQLite database implementation.
 */
public class SQLiteTestCase extends AndroidTestCase {
    private static Logger log = Logger.getLogger(SQLiteTestCase.class.getName());

    private SQLite db;
    private String identifier;

    public void setUp() {
        identifier = "unitTestDB";
        db = new SQLite(getContext(), identifier);
        String [] empty = {};
        try {
            db.exec("DROP TABLE fourtwosixTest", empty);
        }
        catch(DBException e) {
            log.info("fourtwosixTest doesn't exist, no need to drop.");
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Exception while trying to remove old test table.", e);
            fail();
        }

        try {
            db.exec("CREATE TABLE fourtwosixTest (id INTEGER PRIMARY KEY AUTOINCREMENT, title STRING, rating FLOAT, image BLOB)", empty);
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Exception while trying to create test table.", e);
            fail();
        }
    }

    public void tearDown() {
        String [] empty = {};
        try {
            db.exec("DROP TABLE fourtwosixTest", empty);
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Exception while trying to create test table.", e);
            fail();
        }
    }

    public void testTableExists() {
        try {
            assertTrue(db.tableExists("fourtwosixTest"));
            assertFalse(db.tableExists("nonExistentTable"));
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error during testTableExists.", e);
            fail();
        }
    }

    public void testInsert() {
        try {
            String [] vars = new String[]{"Test title", "5.0"};
            db.exec("INSERT INTO fourtwosixTest (title, rating, image) values (?, ?, x'ffffffffff')", vars);
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error during testInsert.", e);
            fail();
        }
    }

    public void testSelect() {
        try {
            String [] vars = new String[]{"Test Title2", "5.0"};
            db.exec("INSERT INTO fourtwosixTest (title, rating, image) values (?, ?, x'ffffffffff')", vars);
            ResultList results = db.query("SELECT * FROM fourtwosixTest WHERE title = ?", new String [] {"Test Title2"});

            assertEquals(1, results.getCount());

            Result result = results.get(0);

            List<String> columns = result.getColumns();

            assertEquals(4, columns.size());

            assertEquals("Test Title2", result.getString("title"));
            assertEquals(5.0, result.getFloat("rating"), 0.0001);

            byte [] refArray = new byte[] {(byte)0xff, (byte)0xff, (byte)0xff, (byte)0xff, (byte)0xff};
            byte [] testArray = result.getBlob("image");

            assertEquals(refArray.length, testArray.length);
            for(int i=0; i<refArray.length; i++) {
                assertEquals(refArray[i], testArray[i]);
            }
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error during testSelect.", e);
            fail();
        }
    }

    public void testBadExec() {
        try {
            try {
                db.exec("creat table fourtwosixTestBad", new String[] {});
            }
            catch(BadSyntaxException e) {
                // Success!
            }
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error during testBadExec.", e);
            fail();
        }
    }

    public void testBadQuery() {
        try {
            try {
                ResultList results = db.query("slect * from fourtwosixTest", null);
            }
            catch(BadSyntaxException e) {
                // Success!
            }
        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error during testBadQuery.", e);
            fail();
        }
    }

    public void testAppIdentiferSeparation() {
        SQLite db1 = null;
        SQLite db2 = null;
        String [] empty = {};

        try {
            db1 = new SQLite(getContext(), "testAppIdSepTest1");
            db2 = new SQLite(getContext(), "testAppIdSepTest2");

            db1.exec("CREATE TABLE sepTest1 (id INTEGER PRIMARY KEY AUTOINCREMENT, desc STRING)", new String[] {});
            db2.exec("CREATE TABLE sepTest2 (id INTEGER PRIMARY KEY AUTOINCREMENT, rating FLOAT)", new String[] {});

            assertFalse(db1.tableExists("sepTest2"));
            assertFalse(db2.tableExists("sepTest1"));

        }
        catch(Exception e) {
            log.log(Level.SEVERE, "Error during testAppIdentifierSeparation.", e);
            fail();
        }
        finally {
            if(db1 != null) {
                try {
                    db1.exec("DROP TABLE sepTest1", empty);
                }
                catch(Exception e) {
                    // Do nothing
                }
                try {
                    db1.exec("DROP TABLE sepTest2", empty);
                }
                catch(Exception e) {
                    // Do nothing
                }
            }

            if(db2 != null) {
                try {
                    db2.exec("DROP TABLE sepTest1", empty);
                }
                catch(Exception e) {
                    // Do nothing
                }
                try {
                    db2.exec("DROP TABLE sepTest2", empty);
                }
                catch(Exception e) {
                    // Do nothing
                }
            }
        }
    }
}
