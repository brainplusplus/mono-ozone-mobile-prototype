package com.fourtwosix.mono.adapters;

import android.content.Context;
import android.graphics.Bitmap;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.android.volley.toolbox.ImageLoader;
import com.android.volley.toolbox.NetworkImageView;
import com.fourtwosix.mono.R;
import com.fourtwosix.mono.utils.LogManager;
import com.fourtwosix.mono.utils.ui.OverlayButton;

import java.util.ArrayList;
import java.util.logging.Level;

/**
 * Created by Eric on 6/4/2014.
 */
public class WidgetChromeAdapter extends BaseAdapter {
    private Context context;
    private ImageLoader imageLoader;
    private ArrayList<OverlayButton> buttons;
    private Bitmap spriteSheet;

    private LayoutInflater inflater;

    public WidgetChromeAdapter(Context context, ImageLoader imageLoader, Bitmap spriteSheet, ArrayList<OverlayButton> buttons) {
        this.context = context;
        inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        this.imageLoader = imageLoader;
        this.spriteSheet = spriteSheet;
        this.buttons = buttons;
    }

    public View getView(int position, View convertView, ViewGroup parent) {

        //get the button
        OverlayButton button = buttons.get(position);

        //implementing the view holder pattern
        ViewHolder holder;

        if(convertView == null) {
            convertView = inflater.inflate(R.layout.adapter_widget_chrome, null);

            holder = new ViewHolder();
            holder.image = (NetworkImageView)convertView.findViewById(R.id.imgButton);
            holder.title = (TextView)convertView.findViewById(R.id.txtText);

            //network image view has trouble with loading standard bitmap, so fix for now is to replace with standard ImageView
            if(button.getImagePath()==null) {
                holder.image = new ImageView(context);
                ((LinearLayout)convertView).removeViewAt(0);
                ((LinearLayout)convertView).addView(holder.image, 0);
            }

            convertView.setTag(holder);
        } else {
            holder = (ViewHolder)convertView.getTag();
        }

        //set the layout params for the image
        LinearLayout.LayoutParams layoutParams = new LinearLayout.LayoutParams(100, 100);
        layoutParams.gravity = Gravity.CENTER_HORIZONTAL;
        holder.image.setLayoutParams(layoutParams);

        setButtonImage(holder, button);

        if(button.getText() != null) {
            holder.title.setText(button.getText());
        } else {
            holder.title.setVisibility(View.GONE);
        }

        return convertView;
    }

    @Override
    public int getCount() {
        return buttons.size();
    }

    @Override
    public Object getItem(int position) {
        return buttons.get(position);
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    private void setButtonImage(ViewHolder viewHolder, OverlayButton button) {

        viewHolder.image.setImageResource(R.drawable.app_2x); //set a default image

        DisplayMetrics metrics = new DisplayMetrics();


        try {
            if(button.getImagePath() != null) {
                ((NetworkImageView)viewHolder.image).setImageUrl(button.getImagePath(), imageLoader);
            } else {
                if(button.getXtype() == OverlayButton.XTYPE.widgettool) {
                    Bitmap icon = OverlayButton.createIcon(spriteSheet, button.getType(), 50, 50);
                    viewHolder.image.setImageBitmap(icon);
                } else {
                    //not sure what should happen here as icon could be for either type
                }
            }

        } catch (Exception exception) {
            LogManager.log(Level.SEVERE, "Unable to find widget chrome icon, resorting to default");
        }
    }


    /**
     * Adds a set of buttons to the grid
     * @param buttons
     */
    public void add(ArrayList<OverlayButton> buttons) {
        for(OverlayButton button : buttons) {
            if(!this.buttons.contains(button)) {
                this.buttons.add(button);
            }
        }
        notifyDataSetChanged();
    }

    /**
     * Removes a set of buttons from the grid
     * @param buttons
     */
    public void remove(ArrayList<OverlayButton> buttons) {
        for(OverlayButton button : buttons) {
            int index = this.buttons.indexOf(button);
            this.buttons.remove(index);
        }
        notifyDataSetChanged();
    }

    /**
     * Updates a set of buttons from the grid
     * @param buttons
     */
    public void update(ArrayList<OverlayButton> buttons) {
        for(OverlayButton button : buttons) {
            int index = buttons.indexOf(button);
            this.buttons.remove(index);
            this.buttons.add(index, button);
        }
        notifyDataSetChanged();
    }

    //For the view holder pattern
    class ViewHolder {
        public TextView title;
        public ImageView image;
    }
}
