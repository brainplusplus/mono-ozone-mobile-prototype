package com.fourtwosix.mono.utils.caching;

import android.content.Context;
import android.graphics.Bitmap;
import android.util.LruCache;

import com.android.volley.RequestQueue;
import com.android.volley.toolbox.ImageLoader;
import com.android.volley.toolbox.Volley;
import com.fourtwosix.mono.utils.secureLogin.SslHttpStack;

import java.security.PrivateKey;
import java.security.cert.X509Certificate;

public class VolleySingleton {
    private static VolleySingleton mInstance = null;
    private static RequestQueue mRequestQueue;
    private static ImageLoader mImageLoader;
    private static SslHttpStack mSslHttpStack;

    private VolleySingleton(Context context){
        mSslHttpStack = new SslHttpStack(context);
        mRequestQueue = Volley.newRequestQueue(context, mSslHttpStack);
        mImageLoader = new ImageLoader(this.mRequestQueue, new ImageLoader.ImageCache() {
            private final LruCache<String, Bitmap> mCache = new LruCache<String, Bitmap>(10);
            public void putBitmap(String url, Bitmap bitmap) {
                mCache.put(url, bitmap);
            }
            public Bitmap getBitmap(String url) {
                return mCache.get(url);
            }
        });
    }

    public static VolleySingleton getInstance(Context context){
        if(mInstance == null){
            mInstance = new VolleySingleton(context.getApplicationContext());
            mRequestQueue = mInstance.getRequestQueue();
            mImageLoader = mInstance.getImageLoader();
        }
        return mInstance;
    }

    public RequestQueue getRequestQueue(){
        return this.mRequestQueue;
    }

    public ImageLoader getImageLoader(){
        return this.mImageLoader;
    }

    public SslHttpStack getSslHttpStack() {
        return this.mSslHttpStack;
    }

    public void initSslStack(String alias, PrivateKey key, X509Certificate [] chain) {
        this.mSslHttpStack.init(alias, key, chain);
    }
}