'use strict';
/*global window*/
/*global document*/
/*global angular*/
/* Controllers */
var mono = angular.module('mono', []);

mono.controller('editorTwoCtrl', ['$scope', '$http', '$location', function($scope, $http, $location){
	
	$scope.currSlide = 1;
	$scope.slideBackgrounds = [];
	
	var baseUri = '/presentationGrails/editor/';
	var clearSavedTimeout;
	
	var queueSave = false;
	var saveRunning = false;

	//Load the menu items
	$scope.getMenuItems = function(){
		$http({
			url: '../presentation/retrieveMenuItems',
			method: 'GET',
			params: {id: $scope.presentationIdValue}
		}).success(function(data){
			$scope.menuItems = data;
		});
	};
	
	$scope.initEditor = function(id){ 
		$scope.presentationIdValue = id;
		$scope.getMenuItems();
		$scope.getPresentation();
		
		$scope.$watch( function() { return $scope.slideBackgrounds.length; }, function(arraySize) {
			if(arraySize > 0) {
			    $scope.$watch(function() { return $scope.slideBackgrounds[(arraySize - 1)].description; }, function(backgroundDescription) {
			    	$scope.slideBackgrounds[(arraySize - 1)].description = backgroundDescription.replace(/[<]br[^>]*[>]/gi,"");
			    	$scope.savePresentation();
			    });
			}
	    });
		
		$(document).bind('keyup', function(e) {

			if (saveRunning) {
				queueSave = true;
			}else {
				saveRunning = true;
				
				$("#savingStatus").html("Saving...");
				
				//this timeout helps limit the number of requests we send
				//and it guarantees that everything gets saved.
				setTimeout(function() {
					$scope.savePresentation(function() {
						if (queueSave) {
							$scope.savePresentation(function() {
								saveRunning = false;
								queueSave = false;
								$("#savingStatus").html("Saved!");
								clearSaved();
							});
						} else {
							saveRunning = false;
							$("#savingStatus").html("Saved!");
							clearSaved();
						}
					});
				}, 2000);
			}
		});
	};
	
	function clearSaved() {
		clearTimeout(clearSavedTimeout);
		clearSavedTimeout = setTimeout(function() {
			$("#savingStatus").html("");
		}, 2000);
	}

	$scope.select = function(id){
		
		var doc = document,
		text = doc.getElementById(id),
		range,
		selection;
		//ms
		if(doc.body.createTextRange){
			range = doc.body.createTextRange();
			range.moveToElementText(text);
			range.select();
		}else if(window.getSelection){//other browsers
			selection = window.getSelection();
			range = doc.createRange();
			range.selectNodeContents(text);
			selection.removeAllRanges();
			selection.addRange(range);
		}
		text.style.color="black";
	};
	
	//Gets the specified slide for the current presentation
	$scope.loadSlide = function(slideNum){
		$('#panel').slideUp("fast");
		
		if(slideNum > 0 && slideNum <= $scope.menuItems.length){
			getSlide(slideNum);
		}
	};

	//Load slide
	var getSlide = function(slideNum){
		$http({
			url: '../viewer/retrieveSlide',
			method: 'GET',
			params: {
				id: $scope.presentationIdValue, 
				slide: slideNum
			}
		}).success(function(data){
			$scope.slide = data;
			$scope.currSlide = slideNum;
			$scope.slideBackgrounds = data.backgrounds;
			//alert(JSON.stringify($scope.slideBackgrounds))
			$('#slideNum').val(slideNum);
		}).error(function() {
			console.log("retrieving slide failed");
		});
	};
	
	$scope.createSlide = function() {
		$.ajax("/presentationGrails/editor/addSlide", {
			type : 'GET',
			data : {
				id : $('#presentationId').val()
			},
			success : function() {
				$scope.getMenuItems();
				$scope.presentation.totalSlides++;
			}
		});
	};
	
	$scope.savePresentation = function(callback) {
		
		var title = $("#title").text();
		title = title ==null ? "" : title.trim();
		
		var slideTitle = $("#slideTitle").text().replace(/^\s*\n/gm, "");
		slideTitle = slideTitle==null ? "" : slideTitle.trim();
		
		var content = $('#slideContent').html();
		content = content==null ? "" : content.trim();
		
		var assessment =$("#slideAssessment").text().replace(/^\s*\n/gm, "");
		assessment = assessment==null ? "" : assessment.trim();
		
		var references = $("#slideReferences").html().replace(/^\s*\n/gm, "");
		references = references==null ? "" : references.trim();
		
		$.ajax("/presentationGrails/editor/saveEdited", {
			type : 'POST',
			data : {
				id : $('#presentationId').val(),
				title : title,
				slideContent : content,
				assessment : assessment,
				slideTitle : slideTitle,
				references : references,
				backgrounds : JSON.stringify($scope.slideBackgrounds),
				slideNum : $('#slideNum').val(),
			},
			success : callback
		});
		
		$scope.getMenuItems();
	};

	$scope.editSlide = function (slideNum, presId, callback) {
		$('#slideNum').val(slideNum);
		$('#slideEdit').load("/presentationGrails/editor/getSlide", {
			slideNum : slideNum,
			id : presId
		}, callback);
	};
	
	//Get top level presentation
	$scope.getPresentation = function(){
		$http({
			url: '../viewer/retrievePresentation',
			method: 'GET',
			params: {id: $scope.presentationIdValue}
		}).success(function(data){
			$scope.presentation = data;
			getSlide(1);
			$scope.getMenuItems();
		});
	};
	
	$scope.createBackground = function(callback) {
		$("#savingStatus").html("Saving...");
		
		//this will prevent creating backgrounds with no associated text
		var selectedText = getSelectionText(); 
		if(!selectedText) {
			return;
		}
		
		$.ajax("/presentationGrails/editor/createBackground", {
			type : 'POST',
			data : {
				id : $('#presentationId').val(),
				slideNum : $('#slideNum').val()
				/*,
				title: bgTitle*/
			},
			success : function(data) {
				var bg = new Object();
				bg.description = "Insert your background info here";
				bg.guid = data;
				bg.type="text";
				//bg.title = bgTitle;
				bg.title = "Background";
				
				callback(data);
				
				$scope.slideBackgrounds.push(bg);
				$scope.savePresentation();
				
				$("#savingStatus").html("Saved!");
				clearSaved();
				
			    $("#bgGuid-" + data).fadeIn(400);
			}
		});
	};
	
	$scope.removeBackground = function(index) {
		var bg = $scope.slideBackgrounds[index];
		var selector = "a[onclick*='" + bg.guid + "']";
		$(selector).contents().unwrap();
		$scope.slideBackgrounds.splice(index, 1);
		
		$("#savingStatus").html("Saving...");
		
		$scope.savePresentation();
		
		$("#savingStatus").html("Saved!");
		clearSaved();
	};
	
	$scope.uploadFile = function(bg_guid) {
		var file = $("#attachmentFile_" + bg_guid).val();
		if(!file) {
			$("#uploadContent_" + bg_guid).html("No file selected");
			console.log("no file selected");
			return;
		}
		
		$.ajax("/presentationGrails/editor/createGUID", {
			type : 'POST',
			success : function(data) {
				//get the file type based on the chosen file
				var splits = file.split(".");
				var type = splits[splits.length-1];
				
				var fullUrl = baseUri + "uploadFile?guid=" + data + "&bg_guid=" + bg_guid + "&fileType=" + type + "&type=" + getType(type) + "&slideNum="+$('#slideNum').val();
				$.ajaxFileUpload({url:fullUrl, fileElementId:"attachmentFile_" + bg_guid});

				var html = loadBackground(data, type);
				$("#uploadStatus_" + bg_guid).html("Uploading...");
				setTimeout(function() {
					var currentHtml = $("#uploadContent_" + bg_guid).html();
					$("#uploadContent_" + bg_guid).html(currentHtml + "<br />" + html);
					$("#uploadStatus_" + bg_guid).html("");
				}, 2000);
			}
		});
	}
	
	function loadBackground(guid, type) {
		
		var mediaType = getType(type);
		var html = "Insert your background info here";
		var url = "../uploads?guid=" + guid;
		
		if(mediaType == "image") {
			html = '<img id="'+guid+'" src="' + url + '" width="100%" />'
		} else if(mediaType == "video") {
			html = '<video id="'+guid+'" src="' + url + '" width="100%" height="120" controls><source src="' + url + '" type="video/' + type + '">Your browser does not support the video tag.</video>';
		} else if(mediaType == "audio") {
			html = '<audio id="'+guid+'" controls width="100%"><source src="'+url+'" type="audio/ogg"><source src="' + url + '" type="audio/' + type + '">Your browser does not support the audio element.</audio>';
		} else if(mediaType == "link") {
			html = '<a id="'+guid+'" href="'+url+'">'+file+'</a>';
		}
		
		return html;
	}
	
	/*
	 	aac aif iff flac m4a m4b mid midi mp3 mpa mpc oga ogg ra ram snd wav wma
		avi divx flv m4v mkv mov mp4 mpeg mpg ogm ogv ogx rm rmvb smil web wmv xvix
		jpe jpg jpeg gif png bmp ico svg svgz tif tiff ai drw pct psp xcf psd raw
	 */
	var imageTypes = "jpe jpg jpeg gif png bmp ico svg svgz tif tiff ai drw pct psp xcf psd raw";
	var videoTypes = "avi divx flv m4v mkv mov mp4 mpeg mpg ogm ogv ogx rm rmvb smil web wmv xvix"
	var audioTypes = "aac aif iff flac m4a m4b mid midi mp3 mpa mpc oga ogg ra ram snd wav wma";
	
	function getType(type) {
		type = type ? type.toLowerCase() : "";
		if(imageTypes.indexOf(type) >= 0)
			return "image";
		else if(videoTypes.indexOf(type) >= 0)
			return "video";
		else if(audioTypes.indexOf(type) >= 0)
			return "audio";
		else return "link";
	}
	
	function getSelectionText() {
	    var text = "";
	    if (window.getSelection) {
	        text = window.getSelection().toString();
	    } else if (document.selection && document.selection.type != "Control") {
	        text = document.selection.createRange().text;
	    }
	    return text;
	}
}]);