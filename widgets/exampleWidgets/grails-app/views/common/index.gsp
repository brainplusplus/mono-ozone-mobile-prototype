<html lang="en" ng-app="mono">
<!--manifest="/presentationGrails/manifests/presentationEditor.manifest"-->
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=0">
<title>Home</title>

<link rel="stylesheet" href="${createLink(uri: '/')}js/lib/bootstrap/css/bootstrap.css">
<link rel="stylesheet" href="${createLink(uri: '/')}css/fontello.css">
<link rel="stylesheet" href="${createLink(uri: '/')}css/editorIndex.css">

<script src="${createLink(uri: '/')}js/lib/jquery/jquery-1.10.1.min.js"></script>
<script src="${createLink(uri: '/')}js/lib/bootstrap/js/bootstrap.js"></script>
<!--<script src="${createLink(uri: '/')}js/lib/carouFredSel-6.2.1/jquery.carouFredSel-6.2.1.js"></script>-->
<!--<script src="${createLink(uri: '/')}js/editor/carousel.js"></script>-->
<!--<script src="${createLink(uri: '/')}js/editor/modernizr.custom.js"></script>-->

<!-- Angular -->
<script src="${createLink(uri: '/')}js/lib/angular/angular.min.js"></script>
<script src="${createLink(uri: '/')}js/viewer/controllers.js"></script>
<script src="${createLink(uri: '/')}js/viewer/directives.js"></script>
<script src="${createLink(uri: '/')}js/common.js"></script>

<!-- Jquery liquid carousel -->
<!--<script type="text/javascript" src="${createLink(uri: '/')}js/lib/jquery-liquidcarousel/jquery-1.4.2.min.js"></script>-->
<script type="text/javascript" src="${createLink(uri: '/')}js/lib/jquery-liquidcarousel/jquery.liquidcarousel.pack.js"></script>
<script type="text/javascript">
	$(document).ready(function() {
		$('#liquid1').liquidcarousel({height:170, duration:250, hidearrows:false});
	});
</script>

</head>
<body>
	<!-- ROW 1 -->
	<div class="heading">
		<i class="icon-home-circled"></i><span>Home</span>
	</div>

	<!--  Create new project - Modal -->
	<div class="modal hide fade" id="createModal">
		<div class="modal-header">
			<a class="close" data-dismiss="modal"><i class="icon-cancel-6"></i></a>
			<h3>Create New Presentation</h3>
		</div>
		<div class="modal-body">
			<form method="POST" id="titleForm" action="${createLink(uri: '/')}editor/edit"> 
				<label>Presentation Title: </label>
				<input name='presentationTitle' id='presentationTitle' type="text" required />
			</form>
		</div>
		<div class="modal-footer">
			<span onClick="createPresentation()" class="btn btn-primary">Save</span>
		</div>
	</div>

	<g:if test="${editor}">
	<!-- ROW 2 -- Create new projects -->
	<div style="background: #f2f2f2; width: 100%;">
		<div class="create-new-project">

			<!-- Blank canvas -->
			<div class="blank-canvas">
			<h2>Blank Canvas</h2>
				<div class="blankDocument">
					<a data-toggle="modal" href="#createModal"><img src="/presentationGrails/images/128.png" alt="New Blank Document" width="130" height="auto"></a>
				</div>
			</div>
			
			<!-- Existing templates - JQuery liquid carousel plugin -->
			
			<div id="liquid1" class="liquid">
			<h2>Create New Project</h2>
				<span class="previous"><i class="icon-left-open-mini"></i></span>
				<div class="wrapper">
					<ul>
						<g:each in="${templateList}">
							<li>
								<a data-toggle="modal" href="#createModal">
									<img src="${it.imagePath}" alt="${it.name}" width="150" height="100">
									<span class="title-template">Template Name</span>
								</a>
							</li>
						</g:each>
					</ul>
				</div>
				<span class="next"><i class="icon-right-open-mini"></i></span>
			</div>
			
		</div><!-- /create-new-project -->
	</div>
	</g:if>
	
	<!-- ROW 3 -- Projects -->
	<div class="projects">
		<!-- Facets -- Mobile -->
		<div class="facets-mobile">
			<div class="facets-col">
				<!--<span class="facets-icon"><i class="icon-plus-squared-small"></i></span>-->
				<span id="menu-toggle" content-menu>My Projects</span>
				<ul class="facets" id="panel" content-menu>
					<li><a onclick="$('.tile-presentation').fadeIn()" href="#">All</a></li>
					<li><a onclick="filter('filter','hour')" href="#">Last Hour</a></li>
					<li><a onclick="filter('filter','today')" href="#">Today</a></li>
					<li><a onclick="filter('filter','week')" href="#">This Week</a></li>
					<li><a onclick="filter('filter','month')" href="#">This Month</a></li>
				</ul>
			</div>
		</div>
		<!-- Facets -- Desktop -->
		<div class="facets-desktop">
			<div class="facets-col">
				<span>My Projects</span>
				<ul class="facets">
                    <li><a onclick="$('.tile-presentation').fadeIn()" href="#">All</a></li>
                    <li><a onclick="filter('filter','hour')" href="#">Last Hour</a></li>
                    <li><a onclick="filter('filter','today')" href="#">Today</a></li>
                    <li><a onclick="filter('filter','week')" href="#">This Week</a></li>
                    <li><a onclick="filter('filter','month')" href="#">This Month</a></li>
                </ul>
			</div>
		</div>
		<div class="box-options">
			<!--<div class="layout-options">
              <i class="icon-th-4"></i>
			</div>
			<div class="layout-options">
              <i class="icon-list-4"></i>
			</div>
			-->
			<!-- Expanding search box -->
			<div class="search">
				<div id="sb-search" class="sb-search">
					<form>
						<input class="sb-search-input" placeholder="Search" type="text" value="" name="search" id="search"  onkeypress="$('.tile-presentation').fadeIn()">
						<input class="sb-search-submit" type="submit" value="" onclick="filter('search',$('#search').val())">
						<span class="sb-icon-search"></span>
					</form>
				</div>
				<!--<div class="vr"></div><i class="icon-th-4"></i><div class="vr"></div><i class="icon-list-1"></i>-->
			</div>
		</div>
		<!-- _presentationBlob.gsp -->
		<div class="presentationList">
			<g:each in="${presentationList}">
				<g:render template="../common/presentationBlob" bean="${it}" />
			</g:each>
		</div>
	</div>
	<!-- /container -->
	<script src="${createLink(uri: '/')}js/editor/classie.js"></script>
	<script src="${createLink(uri: '/')}js/editor/uisearch.js"></script>
	<script>
		new UISearch( document.getElementById( 'sb-search' ) );

		function createPresentation() {
			$.ajax("/presentationGrails/editor/createPresentation", {
				type : 'POST',
				data: {
					presentationTitle: $("#presentationTitle").val()
					},
				success : function(data) {
					window.location = "/presentationGrails/editor/edit?id=" + data;
				}
			});
		}
	</script>
</body>

</html>
