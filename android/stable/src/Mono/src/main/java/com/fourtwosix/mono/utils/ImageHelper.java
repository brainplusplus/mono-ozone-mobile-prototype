package com.fourtwosix.mono.utils;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Log;

import com.fourtwosix.mono.structures.ImageDownload;
import com.fourtwosix.mono.structures.WidgetListItem;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.logging.Level;

public class ImageHelper {
    File directory;
    Context ctx;

    public ImageHelper(Context ctx){
        this.ctx = ctx;
        directory = new File(ctx.getFilesDir().toString());
    }

    public void writeImage(InputStream image, ImageDownload metadata) throws IOException{
        Bitmap bitmap = BitmapFactory.decodeStream(image);
        writeImage(bitmap, metadata);
    }

    public void writeImage(Bitmap bitmap, ImageDownload metadata) throws IOException{
        File imageFile = new File(metadata.getPath());
        File path = new File(metadata.getDirectory());
        //save image to disk
        if(!path.exists()) {
            path.mkdirs();
        }
        FileOutputStream outputStream =  new FileOutputStream(path.getPath() + File.separator + imageFile.getName());
        Log.d("writing image",path.getPath() + File.separator + imageFile.getName());

        if(outputStream != null) {
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, outputStream);
            outputStream.close();
        }
    }

    public Bitmap loadWidgetImage(WidgetListItem widget){
        return loadWidgetImage(widget, false);
    }

    public Bitmap loadWidgetImage(WidgetListItem widget, boolean small){
        try {
            String url = small ? widget.getSmallIconFileName() : widget.getLargeIconFileName();
            if(url != null) {
                String path = IOUtil.getWidgetFilePath(ctx, widget, IOUtil.WidgetDirectory.ICONS) + new File(url).getName();
                LogManager.log(Level.INFO, "loading image:" + path);
                return BitmapFactory.decodeFile(path);
            }
        } catch (Exception exception) {
            LogManager.log(Level.SEVERE, "Unable to load widget image");
        }
        return null;
    }
}
