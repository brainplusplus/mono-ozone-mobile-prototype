
function CommonMapAPI(map, options){
	var map = map;
	var options = $.extend(options, {});
	var overlays = {};
    // Call (or apply) before using any bounds or lat lons to ensure correct projection
    var transformIfNeeded = function (incoming) {

	  	var to = new OpenLayers.Projection("EPSG:4326");
	  	var fromprojection = map.getProjectionObject();
        if (!to.equals(map.baseLayer.projection)) {
            this.transform(incoming ? to : map.baseLayer.projection, incoming ? map.baseLayer.projection : to);
        }
    };
	
	var processFeature = function(placemark, geometry, doc) {
        var feature;

        transformIfNeeded.call(geometry, true);

        placemark.style.openlayersStyle.title = placemark.style.openlayersStyle.graphicTitle = placemark.name; // svg renderer apparently didnt get the memo that graphicTitle is deprecated
        placemark.style.openlayersStyle.cursor = placemark.name || placemark.description ? 'pointer' : '';
        if (!placemark.visible) {
            placemark.style.openlayersStyle.display = "none";
        } else { // prevent bleed through on 'shared' styles
            delete placemark.style.openlayersStyle.display;
        }

        feature = new OpenLayers.Feature.Vector(geometry, placemark, placemark.style.openlayersStyle);
        feature.fid = placemark.id || placemark.name || feature.fid;

        if (!doc.layer) {
            createFeatureLayer(doc);
        }

        return feature;
    };		

    var createFeatureLayer = function(doc) {
        var clusterer = null,
            parent;
			
        doc.layer = new OpenLayers.Layer.Vector(doc.name, { displayInLayerSwitcher: true });

        parent = doc;
        while (parent.parent) {
            parent = parent.parent;
        }
        doc.layer.overlayId = parent.overlayId;
        doc.layer.featureId = parent.featureId;
        map.addLayer(doc.layer);
    };
	
    var kmlParserSettings = {
        proxy: options.proxyUrl,
        maxFileSize: undefined,
        maxPlacemarks: undefined,
        container: '#map', // for screen overlays
        refreshInfoWindow: function (placemark) {
            if (placemark.features.length) {
                // cant refresh it yet. Not in layer until parse complete and some info pulled
                // from layer!!
                infoWindowFeatureToRefresh = placemark.features[0];
            }
        },
        containerRemoved: function (container) {
            if (container.layer) {
                if (!container.clustering) {
                   // delete container.layer.strategies; // or shared cluster strategy will be destroyed
                }
                //removeFeatureLayer(container.layer);
                //delete container.layer;
            }
        },
        parseCallback: function (doc) { // called anytime a doc (even a network link) is parsed
            var overlayId,
                featureId,
                parent = doc,
                treeNodeData,
                i,
                features = [];
            while (parent.parent) {
                parent = parent.parent;
            }
            overlayId = parent.overlayId;
            featureId = parent.featureId;

            if (doc.layer) {
                var lay = overlays[overlayId].features[featureId];
				lay.layer.removeAllFeatures();
				_plotKml(lay, doc.kml.outerHTML);
			}
        },
        region: function (region) {
            region.latLonAltBox = new OpenLayers.Bounds(region.latLonAltBox.west, region.latLonAltBox.south, region.latLonAltBox.east, region.latLonAltBox.north);
            region.projectedLatLonBox = region.latLonAltBox.clone();
            transformIfNeeded.call(region.projectedLatLonBox, true);
            region.latLonAltBox.projection = map.baseLayer.projection;
            return region;
        },
        isRegionActive: function (region) { // TBD - Move a bit more into the parser
            if (!region.latLonAltBox.projection.equals(map.baseLayer.projection)) {
                region.projectedLatLonBox = region.latLonAltBox.clone();
                transformIfNeeded.call(region.projectedLatLonBox, true);
                region.latLonAltBox.projection = map.baseLayer.projection;
            }
            var bounds = map.getExtent(),
                swll,
                nell,
                sw,
                ne,
                pixelWidth,
                pixelHeight,
                squareRoot;

            if (!bounds.intersectsBounds(region.projectedLatLonBox)) {
                //return RegionCodes.OUT_OF_AREA;
                return false;
            }

            swll = new OpenLayers.LonLat(region.projectedLatLonBox.bottom, region.projectedLatLonBox.left);
            nell = new OpenLayers.LonLat(region.projectedLatLonBox.top, region.projectedLatLonBox.right);
            sw = map.getPixelFromLonLat(swll);
            ne = map.getPixelFromLonLat(nell);
            pixelWidth = Math.abs(ne.x - sw.x);
            pixelHeight = Math.abs(ne.y - sw.y);
            squareRoot = (Math.round(Math.sqrt(pixelWidth * pixelHeight))).toFixed(0);

            if (squareRoot < region.lod.minLodPixels) {
                return false; // RegionCodes.MIN_LOD;
            }

            if (region.lod.maxLodPixels >= 0 && squareRoot > region.lod.maxLodPixels) {
                return false; // RegionCodes.MAX_LOD;
            }

            return true; // RegionCodes.ACTIVE;
        },
        formatView: function (format) {
            var bounds = map.getExtent(),
                sw = new OpenLayers.LonLat(bounds.bottom, bounds.left),
                ne = new OpenLayers.LonLat(bounds.top, bounds.right),
                nw = new OpenLayers.LonLat(bounds.top, bounds.left),
                center = bounds.getCenterLonLat(),
                zoom = map.getZoom(),
                range = 35200000 / (Math.pow(2, zoom)),
                theMapDiv = $(map.viewPortDiv),
                verticalDistance = OpenLayers.Util.distVincenty(sw, nw) * 1000, // distVincenty returns km's. We mutiply by 1000 to convert to meters.
                horizontalDistance = OpenLayers.Util.distVincenty(ne, nw) * 1000;

            format = format.replace('[bboxWest]', sw.lat);
            format = format.replace('[bboxSouth]', sw.lon);
            format = format.replace('[bboxEast]', ne.lat);
            format = format.replace('[bboxNorth]', ne.lon);

            format = format.replace('[lookatLon]', center.lon);
            format = format.replace('[lookatLat]', center.lat);
            format = format.replace('[lookatRange]', range);

            format = format.replace('[lookatTilt]', 0);
            format = format.replace('[lookatHeading]', 0);

            format = format.replace('[horizFov]', ((horizontalDistance / 2) / range));
            format = format.replace('[vertFov]', ((verticalDistance / 2) / range));
            format = format.replace('[horizPixels]', theMapDiv.width());
            format = format.replace('[vertPixels]', theMapDiv.height());

            format = format.replace('[terrainEnabled]', 0);

            return format;
        },
        marker: function (placemark, point, doc) {
            var geometry = new OpenLayers.Geometry.Point(point.lon, point.lat, point.alt);

            placemark.style = placemark.style || {};
            placemark.style.openlayersStyle = {};
			
            return processFeature(placemark, geometry, doc);
        },
        polyline: function (placemark, path, doc) {
            var geometry = new OpenLayers.Geometry.LineString(getPolyPath(path));

            placemark.style = placemark.style || {};

            if (!placemark.style.openLayersStyle) {
                placemark.style.openlayersStyle = getOpenLayersStyle(placemark);
            }
            placemark.style.openlayersStyle.strokeColor = placemark.style.openlayersStyle.strokeColor || '#ffffff';
            return processFeature(placemark, geometry, doc);
        },
        polygon: function (placemark, paths, doc) {
            var geometry,
                rings = [],
                i;

            for (i = 0; i < paths.length; i++) {
                rings.push(new OpenLayers.Geometry.LinearRing(getPolyPath(paths[i])));
            }
            geometry = new OpenLayers.Geometry.Polygon(rings);

            placemark.style = placemark.style || {};

            if (!placemark.style.openLayersStyle) {
                placemark.style.openlayersStyle = getOpenLayersStyle(placemark);
            }
            placemark.style.openlayersStyle.strokeColor = placemark.style.openlayersStyle.strokeColor || '#ffffff';
            placemark.style.openlayersStyle.fillColor = placemark.style.openlayersStyle.fillColor || '#ffffff';

            return processFeature(placemark, geometry, doc);
        },
        groundOverlay: function (groundOverlay, doc) {
            var bounds = new OpenLayers.Bounds(groundOverlay.latLonBox.west, groundOverlay.latLonBox.south, groundOverlay.latLonBox.east, groundOverlay.latLonBox.north),
                image;

            transformIfNeeded.call(bounds, true);

            image = new OpenLayers.Layer.Image(
                groundOverlay.name,
                groundOverlay.icon.getHref(),
                bounds,
                new OpenLayers.Size(1, 1),
                {
                    opacity: groundOverlay.opacity,
                    isBaseLayer: false,
                    displayInLayerSwitcher: true
                }
            );

            map.addLayer(image);
            return image;
        },
        bounds: function () {
            return new OpenLayers.Bounds();
        }
    };

	function _beforeEvent(sender, msg, channel) {
	    //console.log(channel,sender,msg);
	};
	
	function _afterEvent(sender, msg, channel) {
	
	};

	function _iterateChildren(id, callbackFunction){
		if(overlays[id]){
			for(var i=0;i<overlays[id].children.length;i++){
				if(overlays[id].children[i])
					callbackFunction(overlays[id].children[i]);
			}
			for(var i in overlays[id].features){
				if(overlays[id].hasOwnProperty(i))
					callbackFunction(overlays[id].features[i]);
			}
		}
	};
	
	function _registerListeners(){
		try {
			  var sub = Ozone.eventing.Widget.getInstance();
			  sub.subscribe('map.feature.plot.url', function(sender, msg, channel){
				  CMAPI.feature.plotUrl(JSON.parse(msg));
			  });
			  sub.subscribe('map.feature.plot', function(sender, msg, channel){
				  $.each(JSON.parse(msg), function(index, creature){
					  CMAPI.feature.plot(creature);
				  });				  
			  });
			  sub.subscribe('map.overlay.create', function(sender, msg, channel){
				  CMAPI.overlay.create(JSON.parse(msg));
			  });
			  sub.subscribe('map.feature.unplot', function(sender, msg, channel){
				  CMAPI.feature.unplot(JSON.parse(msg));
			  });
			  sub.subscribe('map.overlay.remove', function(sender, msg, channel){
				  CMAPI.overlay.remove(JSON.parse(msg));
			  });
		  }
	  catch(e){
	    //We are not in ozone
		console.log("Could not subscribe to events");
	  }
	};
	
	function _registerPopup(layer){
		//Add a selector control to the kmllayer with popup functions
	    var controls = {
	      selector: new OpenLayers.Control.SelectFeature(layer, { onSelect: createPopup, onUnselect: destroyPopup })
	    };

	    function createPopup(feature) {
	      feature.popup = new OpenLayers.Popup.FramedCloud("pop",
	          feature.geometry.getBounds().getCenterLonLat(),
	          null,
	          '<div class="markerContent">'+feature.attributes.description+'</div>',
	          null,
	          true,
	          function() { controls['selector'].unselectAll(); }
	      );
	      feature.popup.closeOnMove = true;
	      map.addPopup(feature.popup);
	    }

	    function destroyPopup(feature) {
	      feature.popup.destroy();
	      feature.popup = null;
	    }

	    map.addControl(controls['selector']);
	    controls['selector'].activate();
	};
	
	function _createOverlay(json){
		if(!overlays[json.overlayId]) {
			overlays[json.overlayId] = {
				name: json.name,
				overlayId: json.overlayId,
				parentId: json.parentId,
				features: {},
				children: [],
				docs: {},
				layer: new OpenLayers.Layer.Vector(json.overlayId)
			};
		
			map.addLayer(overlays[json.overlayId].layer);
			
			if(json.parentId){
				overlays[json.parentId].children.push(overlays[json.overlayId]);
			}
		}
		_createFeature(json);
	};
	
	function _createFeature(json){
		
		if(json.featureId && !overlays[json.overlayId].features[json.featureId]){
			overlays[json.overlayId].features[json.featureId] =  {
				name: json.name,
				overlayId: json.overlayId,
				parentId: json.parentId,
				docs: {},
				layer: new OpenLayers.Layer.Vector(json.featureId)
			};
			map.addLayer(overlays[json.overlayId].features[json.featureId].layer);
		}
	};
	
	function _clickHandler(e){			
		// console.log('MAP CLICKED');
		// console.log(e.features);
	}
	
	function _createOverlays(json){
		if ($.isArray(json)){
			$.each(json, function(index, object){_createOverlay(object)});
		}
		else
			_createOverlay(json);
	};

	function _removeOverlay(json){
		map.removeLayer(overlays[json.overlayId].layer);
		_iterateChildren(json.overlayId, function(overlay){map.removeLayer(overlay.layer);});
		_overlays[json.overlayId] = null;
	};

	function _hideOverlay(json){
		overlays[json.overlayId].layer.setVisibility(false);
		_iterateChildren(json.overlayId, function(overlay){overlay.layer.setIntervalibility(false);});
	};

	function _showOverlay(json){
		overlays[json.overlayId].layer.setVisibility(true);
		_iterateChildren(json.overlayId, function(overlay){overlay.layer.setVisibility(true);});
	};

	function _plotFeature(json){
		console.log("GOT FEATURE");
		_createOverlay(json);
		var ovy = json.featureId ? overlays[json.overlayId].features[json.featureId] : overlays[json.overlayId];
		if(!json.format) json.format = 'kml';
		
		switch(json.format){
		case 'kml': 
			if (!_plotKml(ovy, json.feature))
			_plotCustomUrl(json);
			break;
		case 'geojson':
			_plotGeoJSON(ovy, json.feature);
			break;
		}
		if(json.zoom){
			ovy.layer.events.register("loadend", ovy.layer, function() {
				map.zoomToExtent(this.getDataExtent());
            });
		}
	};
	
	function _unplot(json)
	{
		map.removeLayer(overlays[json.overlayId].features[json.featureId].layer);
		overlays[json.overlayId].features[json.featureId] = null;
	};

	function _plotKml(overlay, data){
		try {
			var format = new OpenLayers.Format.KML({
		        'internalProjection': map.baseLayer.projection,
		        'externalProjection': new OpenLayers.Projection('EPSG:4326'),
                extractStyles: true,
                extractAttributes: true,
                maxDepth:2
		    });

            var preParseXml = $.parseXML(data);
            var hrefs = preParseXml.getElementsByTagName("href");

            for(var i=0; i<hrefs.length; i++) {
                var href = hrefs.item(i);

                if(href.childNodes.length == 1) {
                    var beginningOfPath = window.location.pathname.split("/")[1];
                    var curNodeValue = href.childNodes[0].nodeValue;

                    var indexOfPath = curNodeValue.indexOf(beginningOfPath);

                    // If the path doesn't start with the beginning of our URL -- in other words, doesn't go through our proxy
                    if(indexOfPath != 0 && indexOfPath != 1) {
                        href.childNodes[0].nodeValue = "/presentationGrails/sage/proxyLink?id=" + encodeURIComponent(curNodeValue);
                    }
                }
            }
		
		    var feature = format.read(new XMLSerializer().serializeToString(preParseXml));
		    overlay.layer.addFeatures(feature);
			_registerPopup(overlay.layer);
			return true;
		} catch(e){
			return false;
		}
	};

	function _plotGeoJSON(overlay, data){
		var format = new OpenLayers.Format.GeoJSON({
	        'internalProjection': map.baseLayer.projection,
	        'externalProjection': new OpenLayers.Projection('EPSG:4326'),
            extractStyles: true,
            extractAttributes: true
	    });
	    var feature = format.read(data);
	    overlay.layer.addFeatures(feature);				
	};

	function _plotCustomUrl(json){
        var overlay = overlays[json.overlayId] = overlays[json.overlayId] ||	
		{
			name: name,
			overlayId: json.overlayId,
			parentId: null,
			features: {},
			children: [],
			docs: {},
			layer: new OpenLayers.Layer.Vector(json.overlayId)
		},
            doc,
            oldDoc = overlay.docs[json.featureId];

        doc = kmlParser.loadKml(json.url, true, null, function (result) {
            // dont remove old until load complete to help reduce flicker
            if (oldDoc) {
                oldDoc.remove();
            }
        }, null, null, json.clustering);
        doc.featureId = json.featureId;
        doc.overlayId = json.overlayId;
        doc.name = json.name;
		// console.log(doc);
        overlay.docs[json.featureId] = doc;
	};

	function _plotUrl(json){
		var url = options.proxyUrl ? options.proxyUrl + encodeURIComponent(json.url) : json.url;
		var type = json.format ? json.format.toLowerCase() : 'kml';

		$.ajax({
			  url: url,
			  success: function(data){
				  _plotFeature($.extend(json, {feature: data}));							  
			  },
			  dataType: type === 'geojson' ? 'json' : 'text'
		});
	};
	
	kmlParser.init(kmlParserSettings);
	
   	return { 
   	   	map: map,
		overlay: {
			create: _createOverlays,
			remove: _removeOverlay,
			hide: _hideOverlay,
			show: _showOverlay
		},
		feature: {
			plot: _plotFeature,
			plotUrl: _plotUrl,
			unplot: _unplot
		},
		events: {
			register: _registerListeners
		}
   	};
};
