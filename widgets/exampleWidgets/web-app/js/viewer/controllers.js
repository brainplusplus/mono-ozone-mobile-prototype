'use strict';
/*global window */
/*global angular */
/* Controllers */
var mono = angular.module('mono', []);

mono.controller('viewerCtrl', ['$scope', '$http', '$location',
 function($scope, $http, $location){

	var presentationId = 1;
	$scope.slideBackgrounds = new Array();
	var baseUri = '/presentationGrails/viewer/';
	presentationId = $location.search().id? $location.search().id: 0;
		
	//console.log(presentationId);
	$scope.initIndex = function(){
		$http.get(baseUri+'retrieveAllPresentationTitles').success(function(data){
			//console.log(data);
			$scope.presentationTitles = data;
		});
	};

	//Test code
	$scope.generatePresentation = function(){
		$http.get(baseUri+'generatePresentation').success(function(data){
			//console.log(data);
			$scope.initIndex();
		});
	};

	$scope.openPresentation = function(id){
		//console.log(id);
		window.location='/presentationGrails/viewer/viewer?id='+(id+1);
	};
	// end test code
		//Load slide
	var getSlide = function(slideNum){
		$http({
			url: '../viewer/retrieveSlide',
			method: 'GET',
			params: {
				id: presentationId, 
				slide: slideNum
			}
		}).success(function(data){
			$scope.slide = data;
			$scope.currSlide = slideNum;
			$scope.slideBackgrounds = data.backgrounds;
		});
	};
	
	//Load the menu items
	var getMenuItems = function(){
		$http({
			url: '../presentation/retrieveMenuItems',
			method: 'GET',
			params: {id: presentationId}
		}).success(function(data){
			$scope.menuItems = data;
			getSlide(1);
		});
	};

	//Get top level presentation
	$scope.getPresentation = function(){
		$http({
			url: '../viewer/retrievePresentation',
			method: 'GET',
			params: {id: presentationId}
		}).success(function(data){
			$scope.presentation = data;
			getMenuItems();
		});
	};

	//Gets the specified slide for the current presentation
	$scope.loadSlide = function(slideNum){
		 $('#panel').slideUp("fast");
		if(slideNum > 0 && slideNum <= $scope.presentation.totalSlides){
			getSlide(slideNum);
		}
	};

	//Loads appropriate background content
	$scope.loadBackground = function(bgIndex){
		if($('.container').hasClass("open")){
			console.log(slideBackgrounds[bgIndex]);
			$scope.bgContent = slideBackgrounds[bgIndex];
		}else{
			$scope.bgContent = "";
		}
	};

	//Opens panel with background data
	$scope.openPanel = function(){
		$('.container').toggleClass("open");
	};
}]);
