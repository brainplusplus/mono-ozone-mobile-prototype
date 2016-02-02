package com.fourtwosix.mono.fragments;

import android.app.DialogFragment;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import com.fourtwosix.mono.R;
import com.fourtwosix.mono.data.services.DataServiceFactory;
import com.fourtwosix.mono.listeners.DialogClickListener;
import com.fourtwosix.mono.structures.WidgetListItem;
import com.fourtwosix.mono.utils.ImageHelper;

/**
 * Created by Corey on 1/29/14.
 */
public class AppsMallDetailDialogFragment extends DialogFragment {
    static final String WIDGET_GUID_ARGUMENT = "widgetGuid";
    DialogClickListener listener;

    static AppsMallDetailDialogFragment newInstance(String w) {
        AppsMallDetailDialogFragment f = new AppsMallDetailDialogFragment();

        // Supply num input as an argument.
        Bundle args = new Bundle();
        args.putString(WIDGET_GUID_ARGUMENT, w);
        f.setArguments(args);

        return f;
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        WidgetListItem widget = (WidgetListItem)DataServiceFactory.
                getService(DataServiceFactory.Services.WidgetsDataService).
                find(getArguments().getString(WIDGET_GUID_ARGUMENT));

        View v = inflater.inflate(R.layout.dialog_app_detail, container, false);

        ImageHelper imageHelper = new ImageHelper(v.getContext());
        listener = ((DialogClickListener)getTargetFragment());

        View tv = v.findViewById(R.id.appTitle);
        ((TextView)tv).setText(widget.getTitle());

        String description = widget.getDescription() == null ? "No description available" : widget.getDescription();

        View td = v.findViewById(R.id.appDescription);
        ((TextView)td).setText(description);

        ImageView ic = (ImageView)v.findViewById(R.id.appIcon);
        Bitmap bmp = imageHelper.loadWidgetImage(widget);

        if(bmp != null){
            ic.setImageBitmap(bmp);
        }

        // Set the button text and watch for button clicks.
        Button buttonCancel = (Button)v.findViewById(R.id.cancel);
        buttonCancel.setText(listener.getNoText());
        buttonCancel.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                listener.onNoClick();
            }
        });

        Button buttonAdd = (Button)v.findViewById(R.id.add);
        buttonAdd.setText(listener.getYesText());
        buttonAdd.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                listener.onYesClick();
            }
        });

        return v;
    }
}
