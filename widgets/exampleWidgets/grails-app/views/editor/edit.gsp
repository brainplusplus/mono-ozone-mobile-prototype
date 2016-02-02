<html lang="en" ng-app="mono">
<head>
<meta charset="utf-8">

<link rel="stylesheet" href="${createLink(uri: '/')}css/fontello.css" />
<link rel="stylesheet" href="${createLink(uri: '/')}css/zenpen/style.css" />
<!--<link rel="stylesheet" href="${createLink(uri: '/')}css/bootstrap.min.css">-->
<!--<link rel="stylesheet" href="${createLink(uri: '/')}css/editorTwo.css">-->
<link rel="stylesheet" href="${createLink(uri: '/')}css/app.css" />

<!--  OWF -->
<script src="${createLink(uri: '/')}js/widget/owf-widget-min.js"></script>
<g:javascript type="text/javascript">
	if(typeof OWF === 'undefined') {
		OWF = {};
	}
    OWF.relayFile = "${createLink(uri: '/')}js/widget/rpc_relay.uncompressed.html";
</g:javascript>
</head>

<body editor-content ng-controller="editorTwoCtrl" ng-init="initEditor(${id})" class="editorTwo">

	<input type="hidden" id="presentationId" value="${id}" />
	<input type="hidden" id="slideNum" value="${slideNum}" />
	<input type="hidden" id="totalSlides" value="${totalSlides}" />
	
	<!-- App header -- START -->
	<div class="app-bar">
		
		<!-- Pager -->
		<div class="pagination">
			<a href="#" data-role="button" data-inline="true" ng-click="loadSlide(currSlide-1)"><i class="icon-left-circle"></i></a>
			<span class="editorPagination">{{currSlide}} / {{presentation.totalSlides}}</span>
			<a href="#" data-role="button" data-inline="true" ng-click="loadSlide(currSlide+1)"><i class="icon-right-circle"></i></a>
		</div>
		
		<!-- Presentation title -->
		<div>
			<div class="title-presentation">
				<a href="/presentationGrails/editor/"><i class="icon-home-circled"></i></a>
				<span id="presentationTitle" class="truncate cursor-pointer">${title}</span>
				<span id="savingStatus"></span>
			</div>
		</div>

	</div><!-- App header -- END -->
	
	<!-- Slide panel -->
	<div id="panel" class="slideDown" style="display: none;">
		<div id="slides" class="slidePreviewList">
			<div class="slidePreview">
				<ol class="panel-slide-title">
					<li ng-repeat="item in menuItems" ng-click="loadSlide($index+1)">
						<div class="slide-title cursor-pointer">
							<img src="../images/img-slide.png" alt="CJCS Daily Intel Brief" style="z-index: -1; float: left; margin-right: 20px;">
							<div class="slide-number">{{$index+1}}</div>
							{{item || "Type your title here"}}
							<div><a href="#" onclick="deleteSlide('${id}','{{$index}}')">Delete</a></div>
						</div>
					</li>
					<li id="createSlide">
						<div class="slide-title cursor-pointer" ng-click="createSlide()">
							<img src="../images/img-slide.png" alt="CJCS Daily Intel Brief" style="z-index: -1; float: left; margin-right: 20px;"> Create New Slide
						</div>
					</li>
				</ol>
			</div>
		</div>
	</div>

	
	<!-- Main content -->
	<div class="slideContainer">
		<div id="slideEdit">
			<div ng-include src="'../partials/timeline.html'" ng-init="getPresentation()"></div>
			<div style="padding: 20px">
			
				<!-- Zenmap options -->
				<div class="text-options">
					<div class="options">
						<span class="no-overflow">
							<span class="lengthen ui-inputs">
								<button class="url useicons">&#xe005;</button> 
								<input class="url-input" type="text" placeholder="Type or Paste URL here" />
								<button class="bold">b</button>
								<button class="italic">i</button>
								<button class="quote">&rdquo;</button>
								<button class="background"><i class="icon-comment-2"></i></button>							
							</span>
						</span>
					</div>
				</div><!-- /Zenmap options -->

			</div>
		</div>
	</div><!-- /Main content -->

</body>

<script src="${createLink(uri: '/')}js/lib/jquery/jquery-1.10.1.min.js"></script>
<script src="${createLink(uri: '/')}js/lib/angular/angular.min.js"></script>
<script src="${createLink(uri: '/')}js/editor/controllers.js"></script>
<script src="${createLink(uri: '/')}js/editor/services.js"></script>
<script src="${createLink(uri: '/')}js/editor/directives.js"></script>
<script src="${createLink(uri: '/')}js/editor/editor.js"></script>
<script src="${createLink(uri: '/')}js/common.js"></script>
<script src="${createLink(uri: '/')}js/lib/wysiwyg/jquery.hotkeys.js"></script>
<script src="${createLink(uri: '/')}js/lib/wysiwyg/bootstrap-wysiwyg.js"></script>
<script src="${createLink(uri: '/')}js/ajaxFileUpload/ajaxfileupload.js"></script>
<script src="${createLink(uri: '/')}js/ajaxFileUpload/jquery.jqUploader.js"></script>
<script src="${createLink(uri: '/')}js/ajaxFileUpload/jquery-cookies.js"></script>

<!-- Zenpen Scripts -->
<script src="../js/zenpen/libs/head.min.js"></script>
<script src="../js/zenpen/libs/FileSaver.min.js"></script>
<script src="../js/zenpen/libs/Blob.js"></script>
<script src="../js/zenpen/libs/fullScreen.js"></script>

</html>