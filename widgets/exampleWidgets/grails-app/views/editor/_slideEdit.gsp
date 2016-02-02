<!-- Editable area -->
<div data-role="page" ng-controller="editorTwoCtrl" content-menu>
	<!-- App header -- START -->
	<div class="app-bar">
		<!-- Pager -->
		<div class="pagination">
			<a href="#" data-role="button" data-inline="true"
				ng-click="loadSlide(currSlide-1)"> <i
				class="icon-left-open-mini"></i>
			</a> <span>{{currSlide}} / {{presentation.totalSlides}}</span> <a
				href="#" data-role="button" data-inline="true"
				ng-click="loadSlide(currSlide+1)"> <i
				class="icon-right-open-mini"></i>
			</a>
		</div>

		<!-- Presentation title -->
		<div class="title header">
			<h1 contenteditable="true" id="slideTitle"
				placeholdertext="Type your Slide title" placeholder>
				<g:if test="${it.title}">
					${it.title}
				</g:if>
				<g:else>Type your Slide title</g:else>
			</h1>
		</div>
	</div>
	<!-- App header -- END -->

	<!-- Menu items -->
	<div id="panel" content-menu style="display: none">
		<ol class="panel-slide-title">
			<li id="$index" ng-repeat="item in menuItems" ng-click="loadSlide($index+1)">
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
	<div ng-include src="'../partials/timeline.html'"></div>
	<div id="panel-container"></div>

	<!-- Assessment Footer -->
	<div id="assessmentFooter" data-role="footer" data-position="fixed"
		data-tap-toggle="false">
		<div data-role="collapsible" data-collapsed-icon="arrow-u"
			data-expanded-icon="arrow-d">
			<h4 class="assessment-header">
				<i class="icon-dot-3" style="float: right; margin-right: 20px;"></i>
				Assessment
			</h4>
			<div id="assessment" contenteditable="true">
				<p class="text-body sm">
					<g:if test="${it.assessment}">
						${it.assessment}
					</g:if>
					<g:else>Type your assessment here</g:else>
				</p>
			</div>
		</div>
		<div style="padding: 20px">
			<input type="button"
				onclick="savePresentation(function(){setTimeout(function(){window.location='${createLink(uri: '/')}editor/index';},1000)});"
				value="Save">
		</div>
	</div>
</div>


<!-- Editable area -->
<article id="editor" class="content editContent" contenteditable="true" ng-bind-html-unsafe="slide.slideContent">
	<g:if test="${it.slideContent}">
		${it.slideContent}
	</g:if>
	<g:else>Type your content here</g:else>
</article>


<!-- Zenmap options -->
<div class="text-options">
	<div class="options">
		<span class="no-overflow"> <span class="lengthen ui-inputs">
				<button class="url useicons">&#xe005;</button> <input
				class="url-input" type="text" placeholder="Type or Paste URL here" />
				<button class="bold">b</button>
				<button class="italic">i</button>
				<button class="quote">&rdquo;</button>
				<button class="strikethrough">S</button>
				<button class="background">B</button>
		</span>
		</span>
	</div>
</div>