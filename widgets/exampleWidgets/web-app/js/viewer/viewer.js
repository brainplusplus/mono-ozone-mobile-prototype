var visibleGuid;

$(window).load(function() {
	
	$("#mask").click(closeBackgrounds);
	$("#timelineBackground").removeClass("span4");
	$("#timelineBackground").addClass("slideout");
	$("#timelineBackground").addClass("slideoutHidden");
	$("#timelineBackground").insertAfter("#mask");
	$("#timelineBackground").css("left", $(window).width());
});

function loadBackground(guid)
{
	if(visibleGuid)
		$("#bgGuid-" + visibleGuid).hide();
    
	var scope = $("#timelineBackground").scope();
    $("#bgGuid-" + guid).fadeIn(400);
    visibleGuid = guid;

    openBackgrounds();
}

function openBackgrounds() {
	$("#mask").show();
	$("#timelineBackground").removeClass("slideoutHidden");
	$("#timelineBackground").addClass("slideout");
	//640 value taken from app.css 
	/* Mobile */
	// @media all and (max-width: 640px) {
	if($(window).width() < 640) {
		$("#timelineBackground").css("width", "85%");
		var left = $(window).width() * .15;
		$("#timelineBackground").animate({
			left: left
		}, 200);
		
	} else {
		var left = $(window).width() - $("#timelineBackground").width();
		$("#timelineBackground").animate({
			left: left
		}, 200);	
	}
}

function closeBackgrounds() {
	$("#mask").hide();
	var width = $("#timelineBackground").width();
	$("#timelineBackground").removeClass("slideout");
	$("#timelineBackground").addClass("slideoutHidden");
	$("#timelineBackground").animate({
		left: $(window).width(), 
		width: "450px",
		top: 0
	}, 200);
	
}