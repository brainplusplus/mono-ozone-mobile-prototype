package com.fourtwosix.mono.webViewIntercept;

import android.app.AlertDialog;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.text.Html;
import android.view.ContextThemeWrapper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.IDataService;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.views.WidgetWebView;

import java.util.List;

import static com.fourtwosix.mono.utils.caching.CacheHelper.dataIsCached;
import static com.fourtwosix.mono.utils.caching.CacheHelper.getCachedStringData;

/**
 * Permits running modal actions on the same runnable UI thread as the application
 */
public class ModalExecutor {
    WebView view;
    WebView root;

    /**
     * Creates a new WebViewExecutor that can load URLs into the view.
     *
     * @param view The view to load URLs into.
     */
    public ModalExecutor(WebView view) {
        this.view = this.root = view;
    }

    public void launchModal(String title, String data) {
        LaunchModal launchModal = new LaunchModal(title, data);
        Looper looper = view.getContext().getMainLooper();

        new Handler(looper).post(launchModal);
    }

    public void launchYesNoModal(String title, String data, String yes, String no, String callbackName) {
        LaunchYesNoModal launchYesNoModal = new LaunchYesNoModal(title, data, yes, no, callbackName);
        Looper looper = view.getContext().getMainLooper();

        new Handler(looper).post(launchYesNoModal);
    }

    public void launchWebViewModalFromUrl(String title, String url) {
        LaunchWebViewModalFromUrl launchWebViewModalFromUrl = new LaunchWebViewModalFromUrl(title, url);
        Looper looper = view.getContext().getMainLooper();

        new Handler(looper).post(launchWebViewModalFromUrl);
    }

    public void launchWebViewModalHtml(String title, String html) {
        LaunchWebViewModalHtml launchWebViewModalHtml = new LaunchWebViewModalHtml(title, html);
        Looper looper = view.getContext().getMainLooper();

        new Handler(looper).post(launchWebViewModalHtml);
    }

    public void launchWidgetModal(WidgetListItem widget, String title, String data) {
        LaunchWidgetModal launchWidgetModal = new LaunchWidgetModal(widget, title, data);
        Looper looper = view.getContext().getMainLooper();

        new Handler(looper).post(launchWidgetModal);
    }

    private class LaunchModal implements Runnable {
        private String title;
        private String data;
        private Context context;

        public LaunchModal(String title, String data) {
            this.title = title;
            this.data = data;
            this.context = view.getContext();
        }

        public void run() {
            if (view != null) {
                LayoutInflater inflater = (LayoutInflater) context.getSystemService(context.LAYOUT_INFLATER_SERVICE);
                View layout = inflater.inflate(R.layout.dialog_prompt_layout, (ViewGroup) view.findViewById(R.layout.activity_login));

                TextView textTitle = (TextView) layout.findViewById(R.id.txtTitle);
                TextView textPrompt = (TextView) layout.findViewById(R.id.txtPrompt);
                Button btnNegative = (Button) layout.findViewById(R.id.btnNegative);
                Button btnPositive = (Button) layout.findViewById(R.id.btnPositive);

                if (title == null) {
                    textTitle.setVisibility(View.GONE);
                } else {
                    textTitle.setText(title);
                }
                textPrompt.setText(Html.fromHtml(data));
                btnNegative.setVisibility(View.GONE);
                btnPositive.setText("OK");

                final AlertDialog alertDialog = new AlertDialog.Builder(context)
                        .setView(layout)
                        .show();

                btnPositive.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View view) {
                        alertDialog.hide();
                    }
                });
            }
        }
    }

    private class LaunchYesNoModal implements Runnable {
        private String title;
        private String data;
        private String callbackName;
        private String yesBtn = "Yes";
        private String noBtn = "No";
        private Context context;

        public LaunchYesNoModal(String title, String data, String yes, String no, String callbackName) {
            this.title = title;
            this.data = data;
            this.callbackName = callbackName;
            if(!yes.isEmpty()) this.yesBtn = yes;
            if(!no.isEmpty()) this.noBtn = no;
            this.context = view.getContext();
        }

        public void run() {
            if (view != null) {
                LayoutInflater inflater = (LayoutInflater) context.getSystemService(context.LAYOUT_INFLATER_SERVICE);
                View layout = inflater.inflate(R.layout.dialog_prompt_layout, (ViewGroup) view.findViewById(R.layout.activity_login));

                TextView textTitle = (TextView) layout.findViewById(R.id.txtTitle);
                TextView textPrompt = (TextView) layout.findViewById(R.id.txtPrompt);
                Button btnNegative = (Button) layout.findViewById(R.id.btnNegative);
                Button btnPositive = (Button) layout.findViewById(R.id.btnPositive);

                if (title == null) {
                    textTitle.setVisibility(View.GONE);
                } else {
                    textTitle.setText(title);
                }
                textPrompt.setText(Html.fromHtml(data));
                btnPositive.setText(yesBtn);
                btnNegative.setText(noBtn);

                final AlertDialog alertDialog = new AlertDialog.Builder(context)
                        .setView(layout)
                        .show();

                btnPositive.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View view) {
                        WebView original = (WebView)root.findViewById(R.id.webView);
                        original.loadUrl("javascript:Mono.EventBus.runEvents('" + callbackName + "', {status: 'success', outcome: 'yes'})");
                        alertDialog.hide();
                    }
                });

                btnNegative.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View view) {
                        WebView original = (WebView)root.findViewById(R.id.webView);
                        original.loadUrl("javascript:Mono.EventBus.runEvents('" + callbackName + "', {status: 'success', outcome: 'no'})");
                        alertDialog.hide();
                    }
                });
            }
        }
    }

    private class LaunchWidgetModal implements Runnable {
        private String title;
        private String url;
        private String widgetGuid;
        private Context context;

        public LaunchWidgetModal(WidgetListItem widget, String title, String widgetGetParams) {
            this.title = title;
            this.url = widget.getUrl();
            if (!this.url.contains(widgetGetParams)){
                this.url += widgetGetParams;
            }
            this.widgetGuid = widget.getGuid();
            this.context = view.getContext();
        }

        public void run() {
            LayoutInflater inflater = (LayoutInflater) context.getSystemService(context.LAYOUT_INFLATER_SERVICE);
            View layout = inflater.inflate(R.layout.dialog_web_view_layout, (ViewGroup) view.findViewById(R.layout.activity_login));

            TextView textTitle = (TextView) layout.findViewById(R.id.txtTitle);
            WidgetWebView webView = (WidgetWebView)layout.findViewById(R.id.wbvWebViewDial);
            webView.init(widgetGuid, null);

            webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
            Button btnNegative = (Button) layout.findViewById(R.id.btnNegative);
            Button btnPositive = (Button) layout.findViewById(R.id.btnPositive);

            if (title == null) {
                textTitle.setVisibility(View.GONE);
            } else {
                textTitle.setText(title);
            }
            webView.loadUrl(url);

            btnNegative.setVisibility(View.GONE);
            btnPositive.setText("Close");

            final AlertDialog alertDialog = new AlertDialog.Builder(context)
                    .setView(layout)
                    .show();

            btnPositive.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    alertDialog.hide();
                }
            });
        }
    }

    private abstract class LaunchWebViewModal  {

        protected String title;
        protected Context context;

        public LaunchWebViewModal(String title) {

            this.title = title;
            this.context = view.getContext();

        }

        abstract protected void Initialize(WebView view);

        public void run() {
            LayoutInflater inflater = (LayoutInflater) context.getSystemService(context.LAYOUT_INFLATER_SERVICE);
            View layout = inflater.inflate(R.layout.dialog_web_view_layout, (ViewGroup) view.findViewById(R.layout.activity_login));

            WebView webView = (WebView) layout.findViewById(R.id.wbvWebViewDial);
            Initialize(webView);
            Button btnNegative = (Button) layout.findViewById(R.id.btnNegative);
            Button btnPositive = (Button) layout.findViewById(R.id.btnPositive);

            btnNegative.setVisibility(View.GONE);
            btnPositive.setText("Close");

            final AlertDialog alertDialog = new AlertDialog.Builder(context)
                    .setView(layout)
                    .show();

            btnPositive.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    alertDialog.hide();
                }
            });
        }
    }

    private class LaunchWebViewModalHtml extends LaunchWebViewModal implements Runnable  {
        protected String html;
        public LaunchWebViewModalHtml(String title, String html) {
            super(title);
            this.html = html;
        }
        protected void Initialize(WebView webview)
        {
            webview.loadData(html, "text/html", "UTF-8");
        }
    }

    private class LaunchWebViewModalFromUrl extends LaunchWebViewModal implements Runnable {
        private String url;

        public LaunchWebViewModalFromUrl(String title, String url) {
            super(title);
            this.url = url;
        }

        protected void Initialize(WebView webview)
        {
            if (dataIsCached(context, url)) {
                webview.loadData(getCachedStringData(context, url), "text/html", "UTF-8");
            } else {
                webview.loadUrl(url);
            }
        }
    }
}
