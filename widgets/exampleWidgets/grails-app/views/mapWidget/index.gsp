<!DOCTYPE html>
<html manifest="/presentationGrails/mapWidget/manifest">
<head >
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
<meta name="apple-mobile-web-app-capable" content="yes">
<r:require modules="owfWidget,mapWidget" />
<r:layoutResources/>
<title>Mapping Widget</title>
</head>
<body style="margin: 0px;">
	<div id="loadingDiv" >
		Loading...
	</div>
	<div id="searchContainer">
		<input type="text" placeholder="Search" id="searchBar" />
	</div>
	<div id="switcher">
		<button class='aerial layer'>Aerial</button>
		<button class='street layer'>Street</button>
	</div>
	<div id="selectorCache" class="sidebar engager">
		<img id="toggleSidebar" alt="+" src="${g.resource(dir: 'images', file: 'cache-icon.png')}">
		<div id="sidebarContent">
			<div class="active-selection">
			  <div class="zoomBar"><span class="zoomBar" id="level"></span></div>
		      <div id="slider"></div>
			  <button class="selectArea" value="Select Area">Cache</button>
			</div>
			<div id="statusbar"></div>
		</div>
	</div>
	<div id="map" style="float:left" class="smallmap"></div>
	<script type="text/javascript">
	var noCache = ${params.id == 'noCache' ? 'true' : "false"} ;
	</script>
	<r:layoutResources/>
</body>
</html>
