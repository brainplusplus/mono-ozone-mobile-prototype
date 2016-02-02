<!doctype html>
<html lang="en" ng-app="mono">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=0">
<title>Presentation Viewer</title>

<link rel="stylesheet" href="${createLink(uri: '/')}css/fontello.css" />
<link rel="stylesheet" href="${createLink(uri: '/')}css/jquery.mobile1.4.alpha.css" />
<link rel="stylesheet" href="${createLink(uri: '/')}css/zenpen/style.css" />
<link rel="stylesheet" href="${createLink(uri: '/')}css/app.css" />

<!--  OWF -->
<script src="${createLink(uri: '/')}js/widget/owf-widget-min.js"></script>
<g:javascript type="text/javascript">
	if(typeof OWF === 'undefined') {
		OWF = {};
	}
    OWF.relayFile = "${createLink(uri: '/')}js/widget/rpc_relay.uncompressed.html";
</g:javascript>

<style>
.viewerHidden {display: none;}
</style>
</head>

<body>
	<div id="mask" class="mask"></div>
	<!-- JQM Page -->
	<div data-role="page" ng-controller="viewerCtrl" content-menu>

		<!-- App header -- START -->
		<div class="app-bar">

			<!-- Pager -->
			<div class="pagination">
				<a href="#" data-role="button" data-inline="true" ng-click="loadSlide(currSlide-1)"><i class="icon-left-circle"></i></a>
				<span class="editorPagination">{{currSlide}} / {{presentation.totalSlides}}</span>
				<a href="#" data-role="button" data-inline="true" ng-click="loadSlide(currSlide+1)"><i class="icon-right-circle"></i></a>
			</div>

			<!-- Presentation title -->
			<div class="title-presentation truncate" content-menu
				id="menu-toggle">
				<span class="ng-binding cursor-pointer">
					<a href="/presentationGrails/viewer/"><i class="icon-home-circled"></i></a> {{presentation.title}}
				</span>
			</div>

		</div><!-- App header -- END -->

		<!-- Slide panel -->
		<div id="panel" style="display: none;">
			<ol class="panel-slide-title">
				<li ng-repeat="item in menuItems" ng-click="loadSlide($index+1)">
					<div class="slide-title cursor-pointer">
						<img src="../images/img-slide.png" alt="CJCS Daily Intel Brief"
							style="z-index: -1; float: left; margin-right: 20px;">
						<div class="slide-number">{{$index+1}}</div>
						{{item}}
					</div>
				</li>
			</ol>
		</div>

		<!-- Page content -->
		<div ng-include src="'../partials/timeline.html'"
			ng-init="getPresentation()"></div>
		<div id="panel-container"></div>

		<!-- Assessment Footer -->
		<div data-role="footer" data-position="fixed" data-tap-toggle="false">
			<div data-role="collapsible" data-collapsed-icon="arrow-u"
				data-expanded-icon="arrow-d">
				<h3 class="assessment-header">
					<i class="icon-dot-3" style="float: right; margin-right: 20px;"></i>Assessment
				</h3>
				<div>
					<p class="text-body">{{slide.assessment}}</p>
				</div>
			</div>
		</div>

	</div>
	<!-- /JQM Page -->
</body>
<!-- JQM -->
<script src="${createLink(uri: '/')}js/lib/jquery/jquery-1.10.1.min.js"></script>
<script src="${createLink(uri: '/')}js/lib/JQM/jquery.mobile.1.4.alpha.js"></script>

<!-- Angular -->
<script src="${createLink(uri: '/')}js/lib/angular/angular.min.js"></script>
<script src="${createLink(uri: '/')}js/viewer/controllers.js"></script>
<script src="${createLink(uri: '/')}js/viewer/viewer.js"></script>
<script src="${createLink(uri: '/')}js/viewer/directives.js"></script>
<script src="${createLink(uri: '/')}js/common.js"></script>



<!-- JQM To Angular adapter -->
<script src="${createLink(uri: '/')}js/lib/JQM/jquery-mobile-angular-adapter.min.js"></script>

</html>