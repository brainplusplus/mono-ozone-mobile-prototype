var TILE_SIZE = 6000;	
var CMAPI;
var boxLayer;

$(document).ready(function() {
	setTimeout(function(){
		$(loadingDiv).hide();
		$('#map').height($( window ).height() - 10);
		$('#map').width ($( window ).width() - 10);
		$('#slider').height($('#map').height() - 165);
	
	var tileServer = Mono.IsNative() ? (noCache ? null : '/ozone.gov/mapcache/serve/') : null;
	var aeriServer = Mono.IsNative() ? (noCache ? null : '/ozone.gov/mapcache/sat/') : 'http://otile1.mqcdn.com/tiles/1.0.0/sat/';
	var queryServer = 'http://nominatim.openstreetmap.org/search';
	
	var map = new MapLayers("map", {displayLayerControls: false,				
	    displayDrawControls: false, useZoomBar: false, displayPanControls: false, 
		heatMapOptions: {cols: 200, rows: 200},  heatMapLayer: false, OSM: {tileServer: tileServer, aeriServer: aeriServer}});

	window.mRunning = false;
    boxLayer = new OpenLayers.Layer.Vector("Box layer");
	
    map.setCenter(0,0,2);

    var meterDensity = function(zoomLevel){
		var WHOLE_WORLD = 156412;
		var meters = (WHOLE_WORLD / Math.pow(2, zoomLevel));
		var pretty;
		if( meters > 1){ 
			var build = [];
			pretty = Math.floor(meters).toString();
            for(var i = pretty.length; i > 3; i-= 3)
                build.push(pretty.substring(i - 3, i));
			build.push(pretty.substring(0, i));	
            build.reverse();
            pretty = build.join();
		} 
		else
			pretty = meters.toFixed(2).toString();
		return pretty + 'm';
	};

	var degToRad = function(degrees){
		return Math.PI * (degrees/180);
	};
    
	var pointControl = new OpenLayers.Control.DrawFeature(boxLayer,
               OpenLayers.Handler.RegularPolygon, {
	           	  handlerOptions: {
	                sides: 4,
	                irregular: true
	             },
	             featureAdded: function(vector){
	 				  pointControl.deactivate();
					  //Get the corners
					  var geometry = vector.geometry;
					  var points = geometry.components[geometry.components.length - 1].components;
					  var bounds = [];
					  var to = new OpenLayers.Projection("EPSG:4326");
					  var fromprojection = map.map.getProjectionObject();
					  submitCacheRequest(geometry.bounds.transform(fromprojection, to), 
							  18 - $( "#slider" ).slider( "values", 1  ), 
							  18 - $( "#slider" ).slider( "values", 0  ));
	          	}
	         });
	  map.map.addControl(pointControl);
      map.map.addLayers([boxLayer]);
      map.map.events.register('zoomend', map.map, function(){
          var values = $( "#slider" ).slider('values');
    	  var to = new OpenLayers.Projection("EPSG:4326");
		  var fromprojection = map.map.getProjectionObject();
	      var count = getTileCount(map.map.getExtent().transform(fromprojection, to), 18 - values[1], 18 - values[0]);
        $( "#level" ).html( bytesToSize(count*TILE_SIZE) );
      });
	  
	  $('.aerial.layer').click(function(){map.toggleAerialView(true)});
	  $('.street.layer').click(function(){map.toggleAerialView(false)});
	  
	  CMAPI = CommonMapAPI(map.map, {proxyUrl: '/presentationGrails/sage/proxyNorthcom?id='});
	  CMAPI.events.register();
	  
      //setup 
	  $( "#slider" ).slider({
	      values:[17,18],
	      min: 0,
	      max: 18,
	      range: true,
	      orientation: "vertical",
	      step: 1,
	      slide: function( event, ui ) {
			  var to = new OpenLayers.Projection("EPSG:4326");
			  var fromprojection = map.map.getProjectionObject();
		      var count = getTileCount(map.map.getExtent().transform(fromprojection, to), 18 - ui.values[1], 18 - ui.values[0]);
	        $( "#level" ).html( bytesToSize(count*TILE_SIZE) );
	      }
	  });

	$('.engager').click(function(){
		boxLayer.destroyFeatures();
		pointControl.activate();
	});

	

    window.onresize = function()
    {	        	
		$('#map').height($( window ).height() - 10);
		$('#map').width ($( window ).width() - 10); 
        setTimeout( function() { map.map.updateSize();}, 200);
		$('#slider').height($('#map').height() - 165); 
    }
    
    $('#searchBar').keypress(function(e) {
	    if(e.which == 13) {
	        $.get('/presentationGrails/sage/proxyNorthcom?id=' + 
	        encodeURIComponent(queryServer + '?format=json&q=' + $('#searchBar').val()), null, function(result){
	        	if(result && result.length && result.length >= 1) {			        		
			  		var to = map.map.getProjectionObject();
			  		var fromprojection = new OpenLayers.Projection("EPSG:4326");
	        		var bounds = new OpenLayers.Bounds();
	        		var nw = new OpenLayers.LonLat(parseFloat(result[0].boundingbox[3]), parseFloat(result[0].boundingbox[0]));
	        		var se = new OpenLayers.LonLat(parseFloat(result[0].boundingbox[2]), parseFloat(result[0].boundingbox[1]));
	        		bounds.extend(nw);
	        		bounds.extend(se);
	        		bounds.transform(fromprojection, to);
	        		map.map.zoomToExtent(bounds);
	        	}
	        }, 'json');
	    }
	});
	

	var getTileNumber = function(point, zoommin, zoommax){
   		console.log('zoom - ' + point.x + ';' + point.y)
		var lat_rad = degToRad(point.y);
		var n = Math.pow(2, zoommin);
		tiles = {
				z: zoommin,
				x: Math.floor(n * (point.x + 180.0)/360.0),
				y: Math.floor(n * (1 - Math.log(Math.tan(lat_rad) + (1 / Math.cos(lat_rad))) / Math.PI) / 2)
			};
		return tiles;				
   	};

   	var sortFunction = function(a,b,accessor,descending){
		var diff = b[accessor] - a[accessor];
		return descending ? diff : diff * -1;
   	};

   	var getTileCount = function(bounds, zoommin, zoommax){
		var tiles = [
		         	getTileNumber({x: bounds.left, y: bounds.top}, zoommax),
	   	   	   	   	getTileNumber({x: bounds.left, y: bounds.bottom}, zoommax),
	   	   	   	   	getTileNumber({x: bounds.right, y: bounds.top}, zoommax),
	   	   	   	   	getTileNumber({x: bounds.right, y: bounds.bottom}, zoommax) 
				];
		tiles.sort(function(a,b){return sortFunction(a,b,'x');});
		var minx = tiles[0].x, maxx = tiles[tiles.length-1].x;
		tiles.sort(function(a,b){return sortFunction(a,b,'y');});
		var miny = tiles[0].y, maxy = tiles[tiles.length-1].y;
		var size = Math.abs(minx-maxx) * Math.abs(miny-maxy);
		var log = size;
		for(var i=zoommax;i > zoommin; i--){
			log = Math.pow(2,Math.floor(Math.log(log)/Math.log(2)));
			size += log;
		}
		return size;
   	};

   	var enlargenSidebar = function(){
		$('.sidebar').animate({ 
				height: $('#map').height() - 50,
				width: 125
			});
		$('#sidebarContent').show();				
   	};

   	var shrinkSidebar = function(){
		$('.sidebar').animate({ 
			height: 20,
			width: 12
		});
		$('#sidebarContent').hide();
   	};

   	var submitCacheRequest = function(bounds, zoommin, zoommax){
        if(Mono.IsNative()) {
			window.mRunning = true;
            var size = getTileCount(bounds, zoommin, zoommax);
            if(size > 10000)
                alert('Sorry, this request would require ' + bytesToSize(size * TILE_SIZE) + '. \nPlease decrease your resolution or bounding area.');
            else {
                $.get('/ozone.gov/mapcache/cache', 
                        {
                            'tllon' : bounds.left, 
                            'tllat' : bounds.top, 
                            'brlon' : bounds.right, 
                            'brlat' : bounds.bottom, 
                            'zoommin' : zoommin, 
                            'zoommax' : zoommax
                        });				
                window.statusCheck = window.setInterval(getCacheStatus, 2000);
            }
        }
   	};

   	var getCacheStatus = function(){
        if(Mono.IsNative()) {
            $.ajax('/ozone.gov/mapcache/status', {
                dataType: 'json',
                success: function(data){
                    if(data.status === "complete"){
						if(window.mRunning){
                        	$('.active-selection').show();
                      	  	$('#statusbar').hide();
                       	 	shrinkSidebar();
							Mono.Notifications.Notify({title: "Tile caching complete", text: 'Tile cache complete.'});
                       	 	clearInterval(window.statusCheck);
							window.mRunning = false;
						}
                    }
                    else if (data.status === 'running'){
                        $('#statusbar').html(data.percentComplete + '%');
                        $('.active-selection').hide();
                        $('#statusbar').show();
                    }
                    else {
                        $('#statusbar').html(data.status);
                        clearInterval(window.statusCheck);
                    }
                },
                error: function(){
                    clearInterval(window.statusCheck);
                }
            });
        }
   	};

	$('#toggleSidebar').toggle(enlargenSidebar, shrinkSidebar);			
   	window.statusCheck = window.setInterval(getCacheStatus, 2000);
	}, 5000);
});

function bytesToSize(bytes) {
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
   if (bytes == 0) return '0 Bytes';
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

//TODO: We should replace this with the api connection check when that is implemented
function isMobile() {
    return Mono.IsNative();
    //return ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) );
}