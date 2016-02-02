/************************************************************
 * CONSTRUCTOR												*
 ************************************************************/

var MapLayers = function (element, options) {
    this.options = {
        wmsLayers: [],
        imagepath: MapLayers.DEFAULT_IMAGE_PATH,
        theme: MapLayers.DEFAULT_CSS_FILE,
        displayNavControls: true,
        displayLayerControls: true,
        displayDrawControls: false,
        displayPanControls: true,
        useZoomBar: false,
        layerDoubleClickHandler: null,
        onDrawFinishHandler: null,
        mouseScrollZoom: false,
        addSatelliteLayer: true,
        showAmtrak: false,
        heatMap: false,
        cluster: true,
        displayHeatMapOnLoad: false,
        pointLayer: true,
        canSwitchOverlays: true
    };

    $.extend(this.options, options);

    OpenLayers.ImgPath = this.options.imagepath;

    /* Add just the navigation control to the map by default (so that the zoom panel is not added automatically) */
    this.map = new OpenLayers.Map(element,
    	{
    		theme: this.options.theme,
    		projection: new OpenLayers.Projection(MapLayers.DEFAULT_PROJECTION),
    		useSphericalMercator: ((this.options.wmsLayers && this.options.wmsLayers.length > 0) || this.options.OSM) ? false : true
    	});

    this.initializeGeoSpatialFilter();
}

/************************************************************
 * DEFAULT CONFIGURATION SETTINGS							*
 ************************************************************/

MapLayers.DEFAULT_IMAGE_PATH = "/presentationGrails/static/js/mapWidget/theme/dark/img/";
MapLayers.DEFAULT_CSS_FILE = "/presentationGrails/static/js/mapWidget/theme/dark/style.css?THEME";
MapLayers.DEFAULT_PROJECTION = "EPSG:4326"
MapLayers.DEFAULT_SELECT_FEATURE_ID = "SelectFeatureControl";
MapLayers.DEFAULT_CONTEXT_MENU = "<div id='mapContextMenu' style='display: none'><u1><li>Zoom In</li><li>Zoom Out</li><li>Lat/Lon</li></u1></div>";

/************************************************************
 * DEFAULT VARIABLES SETTINGS							    *
 ************************************************************/
MapLayers.variables = {};
MapLayers.variables.pointLayerName = "Search Results";
MapLayers.variables.polygonLayerName = "Polygon Layer";
MapLayers.variables.heatMapLayerName = "Heat Map";
MapLayers.variables.amtrakLayerName = "Amtrak Stations";

/************************************************************
 * INITIALIZATION FUNCTIONS									*
 ************************************************************/
MapLayers.prototype.initializeGeoSpatialFilter = function () {

//    try {
        var that = this;

        /* Add mouse click handlers */
        OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
            defaultHandlerOptions: {
                'single': false,
                'double': true,
                'pixelTolerance': 0,
                'stopSingle': false,
                'stopDouble': true
            },
            initialize: function (options) {
                this.handlerOptions = OpenLayers.Util.extend(
                    {}, this.defaultHandlerOptions
                );
                OpenLayers.Control.prototype.initialize.apply(
                    this, arguments
                );
                if(that.options.layerDoubleClickHandler){
	                this.handler = new OpenLayers.Handler.Click(
	                    this, {
	                        'dblclick': this.trigger
	                    }, this.handlerOptions
	                );
                }
            },
            trigger: function (e) {
                if (that.options.layerDoubleClickHandler) {
                	var points = MapLayers.getRelativePointsOnClick(e, that.map.div);
                	var posx = points["x"];
                	var posy = points["y"];

                    var lonlat = that.map.getLonLatFromViewPortPx({ x: posx, y: posy });
                    var cl = lonlat.clone();
                    if (that.proj != null) {
                        cl.transform(that.map.getProjectionObject(), that.proj);
                    }

                    that.options.layerDoubleClickHandler(cl);
                }
            }
        });

        var layersAdd = [];
        var controlsAdd = [];

        /* Add base layers */
        if (this.map.useSphericalMercator) {
        	var veOptions = {
                    type: VEMapStyle.Shaded,
                    sphericalMercator: true,
                    maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34)
                }
            layersAdd.push(new OpenLayers.Layer.VirtualEarth("Map", veOptions));

            if(this.options.addSatelliteLayer) {
            	$.extend(veOptions, {type : VEMapStyle.Hybrid});
            	layersAdd.push(new OpenLayers.Layer.VirtualEarth("Satellite", veOptions));

            	$.extend(veOptions, {type : VEMapStyle.Aerial});
            	layersAdd.push(new OpenLayers.Layer.VirtualEarth("Aerial", veOptions));
            }
        }
        else if (this.options.OSM){
        	if(this.options.OSM.tileServer)
				this.baseServer = new OpenLayers.Layer.OSM((this.options.OSM.tileServerName || 'Street'), [this.options.OSM.tileServer + '${z}/${x}/${y}.png']);
        	else
        		this.baseServer = new OpenLayers.Layer.OSM();
    		layersAdd.push(this.baseServer);
        	if(this.options.OSM.aeriServer){
				this.aeriServer = new OpenLayers.Layer.OSM((this.options.OSM.aeriServerName || 'Aerial'), [this.options.OSM.aeriServer + '${z}/${x}/${y}.png'])
        		layersAdd.push(this.aeriServer);
			}
        }
        else {
            for (var i = 0; i < this.options.wmsLayers.length; i++) {
                var curr = this.options.wmsLayers[i];
                layersAdd.push(new OpenLayers.Layer.WMS(curr.ServiceName,
					curr.ServiceUrl,
                    { layers: curr.ServiceLayer
                    },
					{ isBaseLayer: (curr.isBaseLayer || false) }
              ));
            }
        }

        /* Add the layer for plotting points */
        if(this.options.pointLayer) {
		    var vectorLayer = new OpenLayers.Layer.Vector(MapLayers.variables.pointLayerName,
		    		{
		    			displayInLayerSwitcher: this.options.canSwitchOverlays,
		    			styleMap: MapLayers.styleMaps.coralReefMap,
		    			strategies: [new OpenLayers.Strategy.Cluster()]
		    		});
		    

		    vectorLayer.events.register('featureselected', vectorLayer, this.pointClicked);
		    		    
		    /* Add control that manages selecting features on the point layer */
		    var selectControl = new OpenLayers.Control.SelectFeature(
		            [vectorLayer],
		            {
		            	autoActivate: true,
		                clickout: true, toggle: false,
		                multiple: false, hover: false,
		                toggleKey: "ctrlKey", // ctrl key removes from selection
		                multipleKey: "shiftKey", // shift key adds to selection
		                id: MapLayers.DEFAULT_SELECT_FEATURE_ID
		            });

		    layersAdd.push(vectorLayer);
		    controlsAdd.push(selectControl);		    
        }
        
        /* Add the control that allows you to draw polygons on the map */
        if (this.options.onDrawFinishHandler || this.options.displayDrawControls) {
            /* Add a polygon layer.  Used for draw control */
            var polygonLayer = new OpenLayers.Layer.Vector(MapLayers.variables.polygonLayerName);
            polygonLayer.events.register('sketchcomplete', polygonLayer,
            		function (obj) {
                		that.finishedDraw(obj);
            		});

            var panelControls = [];

            /* 
             * Add the navigation control to the toolbar next to the draw control.
             * This allows you to move the map around and have the draw control
             */
            if (this.options.displayNavControls) {
                panelControls.push(new OpenLayers.Control.Navigation());
            }
        	
            panelControls.push(new OpenLayers.Control.DrawFeature(polygonLayer,
            		OpenLayers.Handler.Polygon,
            		{
            			'displayClass': 'olControlDrawFeaturePath'
            		}));

            var toolbar = new OpenLayers.Control.Panel(
            		{
            			displayClass: 'olControlEditingToolbar',
            			defaultControl: panelControls[0]
            		});

            toolbar.addControls(panelControls);
            controlsAdd.push(toolbar);
            layersAdd.push(polygonLayer);
        }
        
        /* Add the layer for the heatmap points */
        if(this.options.heatMapLayer) {
        	layersAdd.push(new OpenLayers.Layer.Heatmap(MapLayers.variables.heatMapLayerName, this.options.heatMapOptions));
        }
        
        /* Add the layer switching control */
        if (this.options.displayLayerControls) {
            var lswitch = new OpenLayers.Control.LayerSwitcher({ 'roundedCornerColor': '#7E7D52' });
            controlsAdd.push(lswitch);
        }
        
        /* Add the type of zoom control to use */
        if(this.options.useZoomBar) {        	
        	var panZoomBar = new OpenLayers.Control.PanZoomBar({zoomStopHeight: 8});
        	controlsAdd.push(panZoomBar);
        }
        if(this.options.displayPanControls) {
        	controlsAdd.push(new OpenLayers.Control.PanZoom());
        }
        this.map.addLayers(layersAdd);
        /* Controls must be added after layers */
        this.map.addControls(controlsAdd);
        
        /* Disable the zoom by mouse scrolling */
        if(!this.options.mouseScrollZoom) {
        	var navcontrols = (this.map.getControlsByClass('OpenLayers.Control.Navigation') || [])
        	for (var i = 0; i < navcontrols.length; i++) {
        		navcontrols[i].disableZoomWheel();
        	}
        }

        this.proj = null;
        
        // Add any optional event handlers for zoom completed
        if(this.options.zoomCompleteHandler) {
        	this.map.events.register('zoomend', this.map, this.options.zoomCompleteHandler);
        }
        
        /* Set the map projection needed when plotting points */
        if (this.map.useSphericalMercator) {
            //We need to project based on the WGS84 datum to translate
            //Lon/Lat to spherical mercator coordinates which are in meters
            this.proj = new OpenLayers.Projection(MapLayers.DEFAULT_PROJECTION);
            
            /*
             * Need to check if we need to re-center the Map to make sure all the layers
             * line up correctly
             */
            this.map.events.register("moveend", this.map, MapLayers.moveEndHandler);
            // Add any optional event handlers for zoom completed
            if(this.options.panCompleteHandler) {
            	this.map.events.register('moveend', this.map, this.options.panCompleteHandler);
            }
        }
        
        
        
        /*
		 * This is needed so we can override the mouse click behaviors on the map.
		 * It is added separately because we need to activate it and it is a non-standard
		 * control.
		 */
        var click = new OpenLayers.Control.Click();
        this.map.addControl(click);
        click.activate();

        //TODO: get rid of this, it makes it easy to use the test data near dc but should not be deployed
        this.setCenter(-97, 40, 1);
        
        $(this.map.div).append(MapLayers.DEFAULT_CONTEXT_MENU);
//    }
//    catch (ex) {
//        console.log("While initializing map: " + ex.message);
//    }
}

/************************************************************
 * PROTOTYPE FUNCTIONS										*
 ************************************************************/

/**
 * Sets the center of the map to the specified lon, lat, and zoom level
 * 
 * @lon - The longitude of the center
 * @lat - The latitude of the center
 * @zoom - the zoom level to go to
 */
MapLayers.prototype.setCenter = function (lon, lat, zoom) {
    var point = new OpenLayers.LonLat(lon, lat);
    if (this.proj != null) {
        point.transform(this.proj, this.map.getProjectionObject());
    }

    this.map.setCenter(point, zoom);
}

/**
 * Action to take when done drawing on the polygon layer
 */
MapLayers.prototype.finishedDraw = function (obj) {
    //Clear out any old polygons
    this.clearHistoricalLayers();

    var reproject = obj.feature.geometry.clone();
    if (this.proj != null) {
        //first we need to translate to spherical mercator
        reproject.transform(this.map.getProjectionObject(), this.proj);
    }

    var pointCollection = [];
    //now load the x,y coordinates
    if (reproject.components && reproject.components[0] && reproject.components[0].components) {
        for (var i = 0; i < reproject.components[0].components.length; i++) {
            pointCollection.push({ lon: reproject.components[0].components[i].x, lat: reproject.components[0].components[i].y });
        }

        if(this.options.onDrawFinishHandler){
        	this.options.onDrawFinishHandler(pointCollection);
        }
    }
}

/**
 * Returns whether the current map is done initializing 
 */
MapLayers.prototype.isMapInitialized = function() {
	if(this.map) return true;
	    else return false;
}

/**
 * Action to take when a feature on the point layer is clicked
 */
MapLayers.prototype.pointClicked = function (obj) {	    
    var popupText = "";
    var onePoint = false;
    var feature = obj.feature;
    if (feature.cluster && feature.cluster.length
        && feature.cluster[0].attributes && feature.cluster[0].attributes.previewUrl) {
        if (feature.cluster.length > 1) {
            popupText = feature.cluster.length + " results. zoom in for details.";
        }
        else {
        	if(feature.cluster[0].attributes.onClick) {
	        	feature.cluster[0].attributes.onClick(obj);
	        }
            var response = $.ajax({
                type: 'GET',
                url: feature.cluster[0].attributes.previewUrl,
                dataType: 'html',
                async: false,
                cache: true
            });
            popupText = response.responseText;
            onePoint = true;
        }
        
        /* 
         * Call the click out function if there is one point.
         * Doing it this way because addCloseBox doesn't seem
         * to be working 
         */
        var closeFunction = null;
        if(onePoint){
        	closeFunction = function (ev) {
                this.map.removePopup(this.map.popups[0]);
                if(feature.cluster[0].attributes.onClickOut) {
                	feature.cluster[0].attributes.onClickOut(ev);
                }
            }
        }
        else {
        	closeFunction = function (ev) {
                this.map.removePopup(this.map.popups[0]);
            }
        }

        popup = new OpenLayers.Popup.FramedCloud("id",
                                     feature.geometry.getBounds().getCenterLonLat(),
                                     new OpenLayers.Size(500, 300),
                                     popupText,
                                     null, true, closeFunction);

        popup.autoSize = true;

        feature.popup = popup;
        obj.object.map.addPopup(popup, true);
        /* Need to unselect the feature so the user can reclick it */
        obj.object.map.getControl(MapLayers.DEFAULT_SELECT_FEATURE_ID).unselectAll();
    }
};

/**
 * Switches the aerial server to visible, if exists
 */
MapLayers.prototype.toggleAerialView = function(visible){
	if(this.aeriServer && this.baseServer){
	    this.map.setBaseLayer(visible ? this.aeriServer : this.baseServer);
	}
};

/**
 * Clears all added features from the polygon layer
 */
MapLayers.prototype.clearHistoricalLayers = function () {
    var navcontrols = this.map.getLayersByName(MapLayers.variables.polygonLayerName)[0];
    if (navcontrols && navcontrols.features && navcontrols.features.length > 0) {
        navcontrols.removeFeatures([navcontrols.features[0]]);
    }
};

/**
 * Adds a polygon to the map
 * 
 * @geoPoints - Array of objects that define the points on the polygon:
 * 		lon - Required. Longitude of the point
 * 		lat - Required. Latitude of the point
 */
MapLayers.prototype.addPolygon = function(geoPoints) {
	var polygonPoints = [];
    
	for (var i = 0; i < geoPoints.length; i++) {
        if (i == 500)
            break;
        try {
            var currPoint = new OpenLayers.Geometry.Point(geoPoints[i].lon, geoPoints[i].lat);
            if (this.proj != null) {
            	currPoint.transform(this.proj, this.map.getProjectionObject());
            }
            
            polygonPoints.push(currPoint);
        }
        catch (e) {
            log.error(e.message);
        }
    }
    
    var polygon = new OpenLayers.Geometry.Polygon(new OpenLayers.Geometry.LinearRing(polygonPoints));
    
    this.map.getLayersByName(MapLayers.variables.polygonLayerName)[0].addFeatures(new OpenLayers.Feature.Vector(polygon, null, null));
};

/**
 * Adds points to the point layer
 * 
 * @geoPoints - Array of objects:
 * 		lon - Required. Longitude of the point
 * 		lat - Required. Latitude of the point
 * 		previewUrl - The url that will return a preview of the
 * 			feature clicked
 * 		onClick - Additional action to take when a feature is clicked
 * 		onClickOut - Additional action to take when the preview is closed
 */
MapLayers.prototype.addGeoPoints = function (geoPoints) {
    try {
        var geoMarkerOptions = {
            draggable: false,
            bouncy: false
        };
        var features = [];
        for (var i = 0; i < geoPoints.length; i++) {
            if (i == 500)
                break;
            try {
                var plot_point = new OpenLayers.Geometry.Point(geoPoints[i].lon, geoPoints[i].lat);
                if (this.proj != null) {
                    plot_point.transform(this.proj, this.map.getProjectionObject());
                }

                var pointFeature = new OpenLayers.Feature.Vector(plot_point, null, null);
                pointFeature.attributes.markerImageUri = geoPoints[i].markerImageUri;
                pointFeature.attributes.cluster = this.options.cluster;
                pointFeature.attributes.label = geoPoints[i].label;
                pointFeature.attributes.radius = geoPoints[i].radius;
                pointFeature.attributes.count = 5;                
                
                if (geoPoints[i].id) {
                    pointFeature.attributes.id = geoPoints[i].id;
                }
                if (geoPoints[i].previewUrl) {
                    pointFeature.attributes.previewUrl = geoPoints[i].previewUrl;
                }
                if (geoPoints[i].onClick) {
                    pointFeature.attributes.onClick = geoPoints[i].onClick;
                }
                if (geoPoints[i].onClickOut) {
                    pointFeature.attributes.onClickOut = geoPoints[i].onClickOut;
                }
                
                features.push(pointFeature);
            }
            catch (e) {
                log.error(e.message);
            }
        }
        if (geoPoints.length > 0) {
            this.map.getLayersByName(MapLayers.variables.pointLayerName)[0].addFeatures(features);
            
            var centerPoint = new OpenLayers.LonLat(geoPoints[0].lon, geoPoints[0].lat);
            if (this.proj != null) {
            	centerPoint = centerPoint.transform(this.proj, this.map.getProjectionObject());
            }

    		/* 
    		 * Need to unregister this event handler because it will be called when centering
    		 * which unsyncs it for some reason
    		 */
            this.map.events.unregister("moveend", this.map, MapLayers.moveEndHandler);
    		
    		//this.map.setCenter(centerPoint);
    		
    		/* re-register the event */
    		this.map.events.register("moveend", this.map, MapLayers.moveEndHandler);
        }
    }
    catch (e) {
        log.error(e.message);
    }
};

/**
 * Adds points to the heat map layer
 * 
 * @geoPoints - Array of objects:
 * 		lon - Required. Longitude of the point
 * 		lat - Required. Latitude of the point
 * 		intensity - The intesity of the point, defaults to .2
 * 		radius - the radius of the heat point, defaults to 20
 */
MapLayers.prototype.addHeatMapPoints = function (geoPoints) {
   // try {
        var geoMarkerOptions = {
            draggable: false,
            bouncy: false
        };
        var features = [];
        for (var i = 0; i < geoPoints.length; i++) {
            if (i == 500)
                break;
            //try { 
            	/*
                var plot_point = new OpenLayers.Geometry.Point(geoPoints[i].lon, geoPoints[i].lat);
                if (this.proj != null) {
                    plot_point.transform(this.proj, this.map.getProjectionObject());
                }
                */
                if(this.map.getLayersByName(MapLayers.variables.heatMapLayerName)[0]) {
                	//this.map.getLayersByName(MapLayers.variables.heatMapLayerName)[0].addSource(new Heatmap.Source(new OpenLayers.LonLat(plot_point.x, plot_point.y),
                	//		geoPoints[i].radius, geoPoints[i].intensity))
                	this.map.getLayersByName(MapLayers.variables.heatMapLayerName)[0].addPoint(geoPoints[i]);
                }
           // }
           // catch (e) {
           //     log.error(e.message);
           // }
        }
    //}
    //catch (e) {
    //    log.error(e.message);
   // }
};

/**
 * Sets the zoom level based on the points on the point layer.  Error will occur if point layer
 * was not added
 */
MapLayers.prototype.setZoomLevel = function () {
    this.setCenter(0, 0, 15);
    this.map.zoomToExtent(this.map.getLayersByName(MapLayers.variables.pointLayerName)[0].getDataExtent());
};

/**
 * Sets the zoom level based on the points on the heat map layer.  Error will occur if heat map layer
 * was not added
 */
MapLayers.prototype.setHeatZoomLevel = function () {
    this.setCenter(0, 0, 15);
    this.map.zoomToExtent(this.map.getLayersByName(MapLayers.variables.heatMapLayerName)[0].getDataExtent());
};

/**
 * Clear all points from the point layer.  Error will occur if the point layer was not added
 */
MapLayers.prototype.clearGeoPoints = function () {
    var navcontrols = this.map.getLayersByName(MapLayers.variables.pointLayerName)[0];
    if (navcontrols && navcontrols.features && navcontrols.features.length > 0) {
        for (var i = 0; i < navcontrols.features.length; i++) {
            navcontrols.removeFeatures([navcontrols.features[i]]);
        }
    }
};

/************************************************************
 * STYLE FUNCTIONS											*
 ************************************************************/

MapLayers.styles = function () {
    var coralReef = new OpenLayers.Style({
        'pointRadius': '${radius}',
        'strokeColor': '#7E7D52',
        'strokeWidth': '4',
        'strokeOpacity': '0.4',
        'externalGraphic': '${markerImageUri}',
        'fontColor': 'white',
        'textShadow': '0 1px 0 #000000',
        label: '${label}'
    }, {
        context: {
            radius: function (feature) {
                var MINIMUM_RADIUS = (feature.cluster[0].attributes.radius || 27);
                var MAXIMUM_RADIUS = 54;
                var radius = MINIMUM_RADIUS + feature.attributes.count;
                var returnRadius = radius > MAXIMUM_RADIUS ? MAXIMUM_RADIUS : radius;
                                        
                return  feature.cluster[0].attributes.cluster ? returnRadius : MINIMUM_RADIUS;
            },
            markerImageUri: function (feature) {
            	if(feature.cluster[0].attributes.markerImageUri != null
            			&& feature.cluster[0].attributes.markerImageUri.length > 0) {
            		return feature.cluster[0].attributes.markerImageUri;
            	}
            	else {
            		return MapLayers.DEFAULT_IMAGE_PATH + '/mapIcons/map-point-cluster.png';
            	}
            },
            label: function (feature){
            	return feature.cluster[0].attributes.label || '';
            }
        }
    });

    return {
        coralReef: coralReef
    };
} ();

MapLayers.styleMaps = function () {
    var coralReefMap = new OpenLayers.StyleMap({
        "default": MapLayers.styles.coralReef,
        "select": {
            fillColor: "#8aeeef",
            strokeColor: "#32a8a9"
        }
    });

    return {
        coralReefMap: coralReefMap
    };
} ();

/************************************************************
 * HELPER FUNCTIONS											*
 ************************************************************/

/**
 * Function to get the x, y relative coordinates from a click
 * that adjust for which browser it is in. Mimics what layerX and layerY
 * returns if they are not supported by the browser
 */
MapLayers.getRelativePointsOnClick = function(e, parentDiv) {
	var posx = 0;
	var posy = 0;
	if (!e) {
		var e = window.event;
	}

	/* Attempt to use layerX and layerY if supported by the browser */
	if(e.layerX || e.layerY) {
		posx = e.layerX;
		posy = e.layerY;
	}
	else {
		/* 
		 * if the browser does not support layerX and layerY, we'll
		 * have to figure out the relative x,y coordinates
		 */
		
		if (e.pageX || e.pageY) 	{
			posx = e.pageX;
			posy = e.pageY;
		}
		else if (e.clientX || e.clientY) 	{
			posx = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;
			posy = e.clientY + document.body.scrollTop
				+ document.documentElement.scrollTop;
		}
		
		posx = posx - $(parentDiv).position().left;
		posy = posy - $(parentDiv).position().top;
	}
	return {"x": posx, "y": posy}
};

/**
 * Event handler for moveend event on a map to re align the map to the center
 * of the Map layer.  This will re center the Map to the center of the Map layer.
 * This was created because the Virtual Earth layer would get out
 * of sync with the map and other layers.
 */
MapLayers.moveEndHandler = function(e){
	MapLayers.syncLayers(e.object);
}

/**
 * Helper function that resyncs the layers and the map
 */
MapLayers.syncLayers = function(currMap){
	var currCenter = currMap.getCenter();
	var currBaseLayer = currMap.baseLayer;
	
	/*
	 * Get the lon and lat from the base layer.  No need to transform because it will be returned
	 * transformed into what the Map expects from these functions
	 */
	var baseLayerLon = currBaseLayer.getLongitudeFromMapObjectLonLat(currBaseLayer.getMapObjectCenter());
	var baseLayerLat = currBaseLayer.getLatitudeFromMapObjectLonLat(currBaseLayer.getMapObjectCenter());
	
	/* Only set the center if they don't match */
	if(currCenter.lon != baseLayerLon || currCenter.lat != baseLayerLat) {
		/* Need to unregister this event handler because it will be called when centering */
		currMap.events.unregister("moveend", currMap, MapLayers.moveEndHandler);
		
		currMap.setCenter(new OpenLayers.LonLat(baseLayerLon, baseLayerLat));
		
		/* re-register the event */
		currMap.events.register("moveend", currMap, MapLayers.moveEndHandler);
	}
};