package com.fourtwosix.mono.tests;

import android.test.InstrumentationTestCase;

import com.fourtwosix.mono.utils.IOUtil;

import java.io.File;
import java.io.InputStream;

/**
 * Created by Corey on 1/30/14.
 */
public class IOUtilTest extends InstrumentationTestCase {
    static final String output_dir = "test_output";
    static String outputDir;

    protected void setUp() throws Exception {
        outputDir = getInstrumentation().getTargetContext().getFilesDir().getPath() + output_dir;
        super.setUp();
    }

    public void testUnzipFiles() throws Exception {
        final int expectedCount = 16;

        InputStream asset = getInstrumentation().getContext().getAssets().open("certs.zip");
        IOUtil.unzip(asset, outputDir);

        int actual = new File(outputDir).listFiles().length;
        assertEquals(expectedCount, actual);
    }

    protected void tearDown() throws Exception {
        new File(outputDir).delete();
        super.tearDown();
    }
}
