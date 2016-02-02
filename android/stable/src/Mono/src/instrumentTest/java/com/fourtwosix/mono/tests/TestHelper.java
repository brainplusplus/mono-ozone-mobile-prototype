package com.fourtwosix.mono.tests;

import android.app.Activity;
import android.app.KeyguardManager;
import android.test.ActivityInstrumentationTestCase2;

/**
 * This class may or may not be used. The keyguard stuff was out of necessity to get the key events
 * to send to UI tests, however for now they are not used.
 * Created by Eric on 12/4/13.
 */
public class TestHelper {

    private static KeyguardManager keyguardManager;
    private static KeyguardManager.KeyguardLock keyGuardLock;

    /**
     * Unlocks the keyguard
     * @param testActivity
     * @param activity
     */
    public static void unlockKeyGuard(ActivityInstrumentationTestCase2 testActivity, Activity activity) {
        keyguardManager = (KeyguardManager)activity.getSystemService(activity.getApplicationContext().KEYGUARD_SERVICE);
        keyGuardLock = keyguardManager.newKeyguardLock(testActivity.getName());
        keyGuardLock.disableKeyguard();
    }

    /**
     * relocks the keyguard if it was enabled.
     */
    public static void relockKeyGuard() {
        if(keyGuardLock != null) {
            keyGuardLock.reenableKeyguard();
            keyGuardLock = null;
        }
    }
}
