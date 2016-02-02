package com.fourtwosix.mono.data.widgetcommunication.interfaces;

import com.fourtwosix.mono.data.widgetcommunication.IntentProcessor;
import com.fourtwosix.mono.data.widgetcommunication.PublishSubscribeAgent;

/**
 * Created by Eric on 3/27/14.
 */
public interface IntentFragment {
    public IntentProcessor getIntentProcessor();
    public PublishSubscribeAgent getPublishSubscribeAgent();
}
