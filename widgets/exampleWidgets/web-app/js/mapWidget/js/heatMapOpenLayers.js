/* 
 * heatMapOpenLayers.js OpenLayers Heatmap Class
 *
 * Copyright (c) 2014, Corey Herbert
 */ 
OpenLayers.Layer.Heatmap = OpenLayers.Class(OpenLayers.Layer, {

  /** 
   * APIProperty: isBaseLayer 
   * {Boolean} Heatmap layer is never a base layer.  
   */
  isBaseLayer: false,

  /** 
   * Property: heat
   * {Heatmap} internal objectTracking
   */
  heat: null,

  /** 
   * Property: cache
   * {Object} Hashtable with CanvasGradient objects
   */
  cache: null,  

  /** 
   * Property: canvas
   * {DOMElement} Canvas element.
   */
  canvas: null,
  
  /**
   * Property: options
   */
  options: null,
  
  /**
   * Property: points
   */
  points: null,

  /**
   * Constructor: Heatmap.Layer
   * Create a heatmap layer.
   *
   * Parameters:
   * name - {String} Name of the Layer
   * options - {Object} Hashtable of extra options to tag onto the layer
   */
  initialize: function(name, options) {
    OpenLayers.Layer.prototype.initialize.apply(this, arguments);
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.options = options;
	this.heat = new Heatmap(options);
	this.points = [];
    // For some reason OpenLayers.Layer.setOpacity assumes there is
    // an additional div between the layer's div and its contents.
    var sub = document.createElement('div');
    sub.appendChild(this.canvas);
    this.div.appendChild(sub);
  },  

  /**
   * APIMethod: addPoint
   * Adds a heat source to the layer.
   *
   * Parameters:
   * source - {<Heatmap.Source>} 
   */
  addPoint: function(source) {
	this.points.push(source);
	
    this.heat.add(this.getXY(source));
    this.heat.draw(this.canvas.getContext('2d'));
  },
  
  getXY: function(poin){
	// Pick some point on the map and use it to determine the offset
    // between the map's 0,0 coordinate and the layer's 0,0 position.
    var proj = new OpenLayers.Projection("EPSG:4326");
    var point = new OpenLayers.LonLat(poin.lon, poin.lat);
//	console.log(point);
    point.transform(proj, this.map.getProjectionObject());
    var pos = this.map.getLayerPxFromViewPortPx(this.map.getPixelFromLonLat(point));
    return pos;
  },

  /**
   * APIMethod: removeSource
   * Removes a heat source from the layer.
   * 
   * Parameters:
   * source - {<Heatmap.Source>} 
   */
  removeSource: function(source) {
    
	  if (this.points && this.points.length) {
      OpenLayers.Util.removeItem(this.points, source);
    }
  },

  /** 
   * Method: moveTo
   *
   * Parameters:
   * bounds - {<OpenLayers.Bounds>} 
   * zoomChanged - {Boolean} 
   * dragging - {Boolean} 
   */
  moveTo: function(bounds, zoomChanged, dragging) {

    OpenLayers.Layer.prototype.moveTo.apply(this, arguments);

    // The code is too slow to update the rendering during dragging.
    if (dragging)
      return;

    this.canvas.width = this.map.getSize().w;
    this.canvas.height = this.map.getSize().h;

    var ctx = this.canvas.getContext('2d');
    this.heat.resize(this.canvas.width, this.canvas.height);
    
    for(var i=0;i<this.points.length;i++){
    	this.heat.add(this.getXY(this.points[i]));
    }
    
    this.heat.draw(ctx);
  },

  /** 
   * APIMethod: getDataExtent
   * Calculates the max extent which includes all of the heatmap points.
   * 
   * Returns:
   * {<OpenLayers.Bounds>}
   */
  getDataExtent: function () {
    /*
	  var maxExtent = null;
        
    if (this.points && (this.points.length > 0)) {
      var maxExtent = new OpenLayers.Bounds();
      for(var i = 0, len = this.points.length; i < len; ++i) {
        var point = this.points[i];
        maxExtent.extend(point.lonlat);
      }
    }

    return maxExtent;
    */
  },

  CLASS_NAME: 'Heatmap.Layer'

});