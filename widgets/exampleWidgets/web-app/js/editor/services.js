'use strict';
/* global mono */
/* Services */

//var monoApp = angular.module('appService', []);

//Service (simple version)
mono.factory('editService', function(){
	return {

		initQtip: function(){
			$('#text').qtip({
              content: {
                ajax: {
                  url: 'partials/tools.html'
                }
              },
              position: {
                my: 'bottom left',
                at: 'top middle',
                target: $('#text')
              },
            
              hide: {
                fixed : true,
                delay : 1000
              },
              style: {
                def: false,
                classes: 'editor',
                border: {
                  width: 0,
                  height: 0
                },
                tip: {
                  corner: 'bottom left',
                  mimic: 'bottomMiddle',
                  width: 6,
                  height: 6,
                  offset: 14
                }
              }
            });
        }         
	};
});


//Test code
mono.factory('uploadManager', function($rootScope){
  var _files = [];
  return {
    add: function(file){
      _files.push(file);
      $rootScope.$broadcast('fileAdded', file.files[0].name);
    },
    clear: function(){
      _files = [];
    },
    files: function(){
      var fileNames = [];
      $.each(_files, function(index, file){
        fileNames.push(file.files[0].name);
      });
      return fileNames;
    },
    upload: function(){
      $.each(_files, function(index, file){
        file.submit();
      });
      this.clear();
    },
    setProgress: function (percentage){
      $rootScope.$broadcast('uploadProgress', percentage);
    }
  };
});















