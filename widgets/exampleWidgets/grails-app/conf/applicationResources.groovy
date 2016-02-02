modules = {
	owf {
		
	}
	
	owfWidget {
		resource url:"js/widget/owf-widget-min.js"
	}
	
	jc2cui {		
		//resource url:"js/lib/jc2cui-common/common/dynatree-1.2.2/src/skin/ui.dynatree.min.css", disposition:'head'
		//resource url:"js/lib/jc2cui-common/common/slickGrid/slick.grid.min.css", disposition:'head'
	}
	
	
	jqueryui_1_10_4 {
		dependsOn 'jc2cui'
		resource url:"js/lib/jc2cui-common/common/javascript/util.js"
		resource url:"js/lib/jc2cui-common/common/javascript/jquery-1.8.3.min.js"
		resource url:"js/lib/jc2cui-common/common/dynatree-1.2.2/src/skin/ui.dynatree.css", disposition:'head'
		
		resource url:"js/lib/jc2cui-common/common/javascript/jquery-ui-1.10.4/css/ui-lightness/jquery-ui-1.10.4.custom.min.css", disposition:'head'
		resource url:"js/lib/jc2cui-common/common/javascript/jquery-ui-1.10.4/js/jquery-ui-1.10.4.custom.min.js"
		resource url:"js/lib/jc2cui-common/common/dynatree-1.2.2/src/jquery.dynatree.min.js"
		resource url:"js/lib/jc2cui-common/common/slickGrid/slick.grid.css", disposition:'head'
		resource url:"js/lib/jc2cui-common/common/slickGrid/controls/slick.columnpicker.css", disposition:'head'
		resource url:"js/lib/jc2cui-common/common/css/dragAndDrop.min.css", disposition:'head'
		
		
		resource url:"js/lib/jc2cui-common/common/javascript/jquery.event.drag.min.js"
		resource url:"js/lib/jc2cui-common/common/javascript/jquery.mousewheel.min.js"
		resource url:"js/lib/jc2cui-common/common/javascript/json2.min.js"
		resource url:"js/lib/jc2cui-common/common/slickGrid/slick.core.min.js"
		resource url:"js/lib/jc2cui-common/common/slickGrid/slick.grid.min.js"
		resource url:"js/lib/jc2cui-common/common/slickGrid/slick.dataview.min.js"
		resource url:"js/lib/jc2cui-common/common/slickGrid/controls/slick.columnpicker.min.js"
	}
	
	jqueryui_1_9_2 {
		dependsOn 'jc2cui'
		
		resource url:"js/lib/jc2cui-common/common/javascript/util.js"
		resource url:"js/lib/jc2cui-common/common/javascript/jquery-1.8.3.min.js"
		resource url:"js/lib/jc2cui-common/common/dynatree-1.2.2/src/skin/ui.dynatree.css", disposition:'head'
		resource url:"js/lib/jc2cui-common/common/slickGrid/slick.grid.css", disposition:'head'
		resource url:"js/lib/jc2cui-common/common/slickGrid/controls/slick.columnpicker.css", disposition:'head'
		resource url:"js/lib/jc2cui-common/common/css/dragAndDrop.min.css", disposition:'head'
		
		resource url:"js/lib/jc2cui-common/common/css/jquery-ui-1.9.2.css", disposition:'head'
		resource url:"js/lib/jc2cui-common/common/javascript/jquery-ui-1.9.2.min.js"
		resource url:"js/lib/jc2cui-common/common/dynatree-1.2.2/src/jquery.dynatree.min.js"
		
		resource url:"js/lib/jc2cui-common/common/javascript/jquery.event.drag.min.js"
		resource url:"js/lib/jc2cui-common/common/javascript/jquery.mousewheel.min.js"
		resource url:"js/lib/jc2cui-common/common/javascript/json2.min.js"
		resource url:"js/lib/jc2cui-common/common/slickGrid/slick.core.min.js"
		resource url:"js/lib/jc2cui-common/common/slickGrid/slick.grid.min.js"
		resource url:"js/lib/jc2cui-common/common/slickGrid/slick.dataview.min.js"
		resource url:"js/lib/jc2cui-common/common/slickGrid/controls/slick.columnpicker.min.js"
	}
	
	mapWidget {
		dependsOn 'owf,jc2cui,jqueryui_1_10_4'

		resource url: "js/mapWidget/css/atlas.css", disposition: 'head'
		resource url: "js/mapWidget/js/VirtualEarth6.2.min.js"
		resource url: "js/mapWidget/js/OpenLayers.js", disposition: 'head'
		resource url: "js/mapWidget/js/heatMap.js"
		resource url: "js/mapWidget/js/heatMapOpenLayers.js"
		resource url: "js/mapWidget/js/commonMapAPI.js"
		resource url: "js/mapWidget/js/mapLayers.js"
		resource url: "js/mapWidget/js/kmlParser.js"
		resource url: "js/mapWidget/js/atlas.js"
	}
	
	mapping {
		dependsOn 'owf,jc2cui,jqueryui_1_10_4'
		//resource url: "mapping/css/mapWidget.all.min.css", disposition: 'head'
		resource url: "mapping/css/mapWidget.css", disposition: 'head'
		
		resource url: "mapping/javascript/mapWidget.js"
		
	}
	
	sage {
		dependsOn 'owf,jqueryui_1_10_4'
		resource url: '/js/lib/jc2cui-common/common/css/charset.css', disposition: 'head'                                                                                          
		resource url: '/sage/html/widgets/sageOverlayWidget/css/sageOverlayWidget.css', disposition: 'head'                                                                          
		resource url: '/js/lib/jc2cui-common/common/javascript/jquery-migrate-1.2.1.js'                                                                                         
		resource url: '/js/lib/jc2cui-common/common/javascript/json2.js'                                                                           
		resource url: '/sage/html/widgets/sageOverlayWidget/javascript/sageOverlayWidget.js'                       
	}
	
	watchboard {
		dependsOn 'owf,owfWidget,jc2cui,jqueryui_1_9_2'
		//resource url: "watchboard/css/logWidget.all.min.css", disposition:'head'
		resource url: "watchboard/css/logWidget.css", disposition:'head'
		
		resource url: "watchboard/javascript/logWidget.js"
	}
}
