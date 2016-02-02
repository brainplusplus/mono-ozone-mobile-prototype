	<div class="edit">
	<hr>
	<h3>TIMELINE OF EVENTS</h3>
	
	<!-- Editable area -->
	
	<div id="editor" contenteditable="true" class="content">
		${it.slideNum}
	</div>
	<hr contenteditable="false">
	<!-- Assessment content -->
	<h4 contenteditable="false">ASSESSMENT</h4>
	<div id="assessment" contenteditable="true" class="content placeholder"
		editor-placeholder placeholdertext="Type or paste your content here">
		${it.assessment}
	</div>
	<hr>
	<h4 contenteditable="false">REFERENCES</h4>
	<div id="references" contenteditable="true" class="content placeholder"
		editor-placeholder placeholdertext="Type or paste your content here">
		${references}
	</div>
	<div style="padding: 20px">
		<input type="button" onclick="savePresentation(function(){setTimeout(function(){window.location='${createLink(uri: '/')}editor/index';},1000)});" value="Save">
	</div>