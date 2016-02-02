package com.fourtwosix.mono.structures;

import java.io.File;

/**
 * Created by Eric on 12/10/13.
 */
public class ImageDownload {
    private String directory;
    private String path;
    private String fileName;
    private String fullPath;

    public ImageDownload(String directory, String path) {
        this.directory = directory;
        this.path = path;

        String[] splits = path.split(File.separator);
        setFileName(splits[splits.length - 1]);

        this.setFullPath(directory + fileName);
    }

    public String getDirectory() {
        return directory;
    }

    public void setDirectory(String directory) {
        this.directory = directory;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFullPath() {
        return fullPath;
    }

    public void setFullPath(String fullPath) {
        this.fullPath = fullPath;
    }

    @Override
    public String toString() {
        return "[" + path + "," + fullPath + "]";
    }
}
