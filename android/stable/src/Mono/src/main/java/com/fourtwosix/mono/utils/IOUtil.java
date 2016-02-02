package com.fourtwosix.mono.utils;

/**
 * Created by mschreiber on 1/13/14.
 */

import android.content.Context;

import com.fourtwosix.mono.structures.WidgetListItem;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.logging.Level;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

public class IOUtil {
    public enum WidgetDirectory {
        ICONS("Icons"),
        CACHE("Cache"),
        FILES("Files"),
        ;

        private final String text;
        private WidgetDirectory(final String text){
            this.text = text;
        }

        @Override
        public String toString(){
            return this.text;
        }
    }

    static final int BUFFER_SIZE = 1024;

    public static byte[] readBytes(InputStream inputStream) throws IOException {
        // this dynamically extends to take the bytes you read
        ByteArrayOutputStream byteBuffer = new ByteArrayOutputStream();

        // this is storage overwritten on each iteration with bytes
        byte[] buffer = new byte[BUFFER_SIZE];

        // we need to know how may bytes were read to write them to the byteBuffer
        int len = 0;
        while ((len = inputStream.read(buffer)) != -1) {
            byteBuffer.write(buffer, 0, len);
        }
        byteBuffer.close();

        // and then we can return your byte array.
        return byteBuffer.toByteArray();
    }

    public static String inputStreamToString(InputStream is) throws IOException{
        return inputStreamToString(is, "UTF-8");
    }

    public static String inputStreamToString(InputStream is, String encoding) throws IOException{
        return new String(readBytes(is), encoding);
    }

    /**
     * Gets the full path to the directory containing a widgets images/files
     * @param context
     * @param item
     * @return
     */
    public static String getWidgetFilePath(Context context, WidgetListItem item) {
        return context.getFilesDir() + File.separator + item.getGuid() + File.separator;
    }

    public static String getWidgetFilePath(Context context, WidgetListItem item, WidgetDirectory subdirectory) {
        return context.getFilesDir() + File.separator + item.getGuid() + File.separator + subdirectory.toString() + File.separator;
    }

    public static void zip(String[] files, String zipFile) throws IOException {
        BufferedInputStream origin = null;
        ZipOutputStream out = new ZipOutputStream(new BufferedOutputStream(new FileOutputStream(zipFile)));
        try {
            byte data[] = new byte[BUFFER_SIZE];

            for (int i = 0; i < files.length; i++) {
                FileInputStream fi = new FileInputStream(files[i]);
                origin = new BufferedInputStream(fi, BUFFER_SIZE);
                try {
                    ZipEntry entry = new ZipEntry(files[i].substring(files[i].lastIndexOf("/") + 1));
                    out.putNextEntry(entry);
                    int count;
                    while ((count = origin.read(data, 0, BUFFER_SIZE)) != -1) {
                        out.write(data, 0, count);
                    }
                }
                finally {
                    origin.close();
                }
            }
        }
        finally {
            out.close();
        }
    }

    public static void unzip(InputStream zipFile, String location) throws IOException {
        int size;
        byte[] buffer = new byte[BUFFER_SIZE];

        try {
            if ( !location.endsWith(File.separator) ) {
                location += File.separator;
            }
            File f = new File(location);
            if(!f.isDirectory()) {
                f.mkdirs();
            }
            ZipInputStream zin = new ZipInputStream(new BufferedInputStream(zipFile, BUFFER_SIZE));
            try {
                ZipEntry ze = null;
                while ((ze = zin.getNextEntry()) != null) {
                    String path = location + ze.getName();
                    File unzipFile = new File(path);

                    if (ze.isDirectory()) {
                        if(!unzipFile.isDirectory()) {
                            unzipFile.mkdirs();
                        }
                    } else {
                        // check for and create parent directories if they don't exist
                        File parentDir = unzipFile.getParentFile();
                        if ( null != parentDir ) {
                            if ( !parentDir.isDirectory() ) {
                                parentDir.mkdirs();
                            }
                        }

                        // unzip the file
                        FileOutputStream out = new FileOutputStream(unzipFile, false);
                        BufferedOutputStream fout = new BufferedOutputStream(out, BUFFER_SIZE);
                        try {
                            while ( (size = zin.read(buffer, 0, BUFFER_SIZE)) != -1 ) {
                                fout.write(buffer, 0, size);
                            }

                            zin.closeEntry();
                        }
                        finally {
                            fout.flush();
                            fout.close();
                        }
                    }
                }
            }
            finally {
                zin.close();
            }
        }
        catch (Exception e) {
            LogManager.log(Level.SEVERE, "Unzip exception", e);
        }
    }

    /**
     * Copy a file to a new location
     * @param source source file to copy
     * @param destination destination to copy
     * @throws IOException
     */
    public static void copy(File source, File destination) throws IOException {
        if(!destination.exists()) {
            //make sure the parent directory exists
            File parentFile = destination.getParentFile();
            parentFile.mkdirs();

            //create the file itself
            destination.createNewFile();
        }

        FileInputStream in = new FileInputStream(source);
        FileOutputStream out = new FileOutputStream(destination);

        // Copy the bits from instream to outstream
        byte[] buf = new byte[1024];
        int len;

        while ((len = in.read(buf)) > 0) {
            out.write(buf, 0, len);
        }

        in.close();
        out.close();
    }
}
