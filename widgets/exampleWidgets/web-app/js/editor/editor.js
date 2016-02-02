var visibleGuid;

$(window).load(function() {
	initialize();
});

function initialize() {
	$('#presentationTitle').bind('click', function() {
		$('#panel').slideToggle();
	});
	
	//make the title disappear the first time they click it.
	$("#slideTitle").click(function() {
		var text = $("#slideTitle").text();
		if(text === "Type your slide title") {
			$("#slideTitle").html("");	
		}
	});
	
	//initialize zenpen
	head.js("../js/zenpen/utils.js", "../js/zenpen/ui.js",
			"../js/zenpen/editor.js", function() {
		editor.init();
	});
}

function savePresentation(callback) {
	
	$.ajax("/presentationGrails/editor/saveEdited", {
		type : 'POST',
		data : {
			id : $('#presentationId').val(),
			title : $("#title").html(),
			slideTitle : $("#slideTitle").html().replace(/^\s*\n/gm, ""),
			slideContent : $('#slideContent').html().trim(),
			assessment : $("#slideAssessment").html().trim().replace(/^\s*\n/gm, ""),
			slideNum : $('#slideNum').val()
		},
		success : callback
	});
}

function editSlide(slideNum, presId, callback) {
	$('#slideNum').val(slideNum);
	$('#slideEdit').load("/presentationGrails/editor/retrieveSlide", {
		slideNum : slideNum,
		id : presId
	}, callback);
}

function setBackground() {
	//undo any current links
	document.execCommand( 'unlink', false );
	
	var scope = $("#timelineBackground").scope();
	scope.createBackground(function(guid) {
		document.execCommand('createLink', false, "#"+guid);
		$("a[href='#" + guid + "']").attr("onClick", 'loadBackground(\'' + guid + '\');').removeAttr("href");
		$("#bgGuid-" + visibleGuid).hide();
		visibleGuid=guid;
	});
}

function finished() {
	window.location='/presentationGrails/editor/';
}

function loadBackground(guid)
{
	if(visibleGuid)
		$("#bgGuid-" + visibleGuid).hide();
    
	var scope = $("#timelineBackground").scope();
    $("#bgGuid-" + guid).fadeIn(400);
    visibleGuid = guid;
}

function closeBackground(guid)
{
		$("#bgGuid-" + guid).hide();
}





