package com.fourtwosix.mono.webViewIntercept;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.support.v4.app.NotificationCompat;
import android.support.v4.app.TaskStackBuilder;
import android.webkit.WebView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.activities.LoginActivity;

/**
 * Permits running modal actions on the same runnable UI thread as the application
 */
public class NotificationExecutor {
    WebView view;
    WebView root;
    public static String CALLBACK_INTENT = "callbackName";
    private static int NOTIFICATION_ID = 0;

    /**
     * Creates a new WebViewExecutor that can load URLs into the view.
     *
     * @param view The view to load URLs into.
     */
    public NotificationExecutor(WebView view) {
        this.view = this.root = view;
    }

    public void notify(String title, String text, String callbackName, String instanceGuid) {
        LaunchNotification n = new LaunchNotification(title, text, callbackName, instanceGuid);
        Looper looper = view.getContext().getMainLooper();

        new Handler(looper).post(n);
    }

    private class LaunchNotification implements Runnable {
        private String title;
        private String text;
        private String callbackName;
        private String instanceGuid;
        private Context context;

        public LaunchNotification(String title, String text, String callbackName, String instanceGuid) {
            this.title = title;
            this.text = text;
            this.callbackName = callbackName;
            this.instanceGuid = instanceGuid;
            this.context = view.getContext();
        }

        public void run() {
            NotificationCompat.Builder mBuilder =
                    new NotificationCompat.Builder(context)
                            .setSmallIcon(R.drawable.icon_ozone_160x160)
                            .setContentTitle(title)
                            .setContentText(text);
            Intent resultIntent = new Intent(context, LoginActivity.class);
            resultIntent.putExtra("instanceGuid", instanceGuid);
            resultIntent.putExtra(CALLBACK_INTENT, callbackName);
            TaskStackBuilder stackBuilder = TaskStackBuilder.create(context);
            stackBuilder.addParentStack(LoginActivity.class);
            stackBuilder.addNextIntent(resultIntent);
            PendingIntent resultPendingIntent =
                    stackBuilder.getPendingIntent(
                            0,
                            PendingIntent.FLAG_UPDATE_CURRENT
                    );
            Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            mBuilder.setSound(alarmSound);
            mBuilder.setContentIntent(resultPendingIntent);
            NotificationManager mNotificationManager =
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            mNotificationManager.notify(NOTIFICATION_ID, mBuilder.build());
        }
    }
}
