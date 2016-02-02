
//var myapp = angular.module('myApp', []);

//Click toolbar initializer
mono.directive('initToolbar', function($http, $compile, $templateCache){
   //console.log(html);
  return {
        restrict:'A',
        link: function(scope, element, attrs)
        {
          //Initialize highlighter
          $http.get('partials/tools.html', {cache: $templateCache}).
          success(function(content){
            var compiledContent = $compile(content)(scope);
         
             $(element).textHighlighter(
            {
              highlightedClass: 'selected',
              onBeforeHighlight: function(range){              
                $(element).getHighlighter().setColor('#00ff00');                
                return true;
              },
              onRemoveHighlight: function(range){
                //console.log("called remove")
                return true;
              },
              onAfterHighlight: function(highlights, range){
                $(element).qtip('api').options.position.target = $('.selected');
                $(element).qtip("show");
              }
            });
            //init q tip
           $(element).qtip({
              content: compiledContent,
              position: {
                my: 'bottom left',
                at: 'top middle',
                target: $(element)
              },
              show: {
                event: false,
                when: false
              },
              hide: {
                event: 'mousedown'
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
         });   
        } 
    };
});

mono.directive('hideToolbar', function(){
  return {
    restrict: 'A',
    link: function(scope, element, attrs)
    {
      element.bind('mousedown', function(){
      $(element).getHighlighter().removeHighlights();
       //$(element).removeClass("selected");
        
    
      });
    }
  };
});


//Hyperlink directive
mono.directive('hyperlink', function(){
  return{
    restrict: 'A',
    link: function(scope, element, attrs)
    {
      element.bind('click', function(e){

        if(element.is("a")){
          $('.btn-group').toggleClass("open");
        }
        e.stopPropagation();
      });
    }
  };
});

//Registers clicks on body
mono.directive('editorContent', function(){
  return{
    restrict: 'A',
    link: function(scope, element, attrs)
    {
      
      element.bind('click', function(){
      //Manually simulate close for 
      //adding a link dialog
        if($('.btn-group').hasClass("open")){
           $('.btn-group').removeClass("open");
        }

        var placeholders = $('.placeholder');
        var count = placeholders.size();
        var holderText = "Type or paste your content here";
        //Goes through place holders and looks for empty ones
        for(var i=0; i<count; i++){
          var text = placeholders[i].innerText;
          if(text.trim().length === 0){
            placeholders[i].innerText = holderText;
            $(placeholders[i]).css('color', 'A9A9A9');
          }else if(text === holderText){
            $(placeholders[i]).css('color', 'A9A9A9');
          }
        }
      });
    }
  };
});


//Need this workaround for wysiwyg plugin
mono.directive('editorPlaceholder', function(){
  return {
    restrict: 'A',
    link : function(scope, element, attrs)
    {
      //Selects text on focus
      element.bind('click', function(e){
        console.log(attrs.id);
        if(attrs.placeholdertext === element.text()){
          var text = document.getElementById(attrs.id);
          var selection = window.getSelection();
          var range = document.createRange();
          range.selectNodeContents(text);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        this.style.color = "#000022";
        e.stopPropagation();
      });
    }
  };
});

//Placeholder for editable content
//This directive does not work with wysiwyg plugin
mono.directive('placeholder', function(){
  return {
    restrict: 'A',
    link: function(scope, element, attrs)
    {
      element.bind('blur', function() {
        //Adds placeholder text
        if(!element.text().length){
          element.text(attrs.placeholdertext);
          this.style.color = "#A9A9A9";
        }
      });

      //Clears placeholder on click
      element.bind('click', function(){
        if(attrs.placeholdertext === element.text()){
          element.text("");
          this.style.color = "#000011";
        }
      });
    }
  };
});

//Directive for placing the background content
mono.directive('backgroundContent', function(){
  return {
    restrict: 'A',
    link: function(scope, element, attrs)
    {
      element.bind('click', function(){
        var btnTopOffset = element.offset().top-10;
        $('.background').css("margin-top", btnTopOffset+"px");
        console.log(element);
      }); 
    }
  };
});

mono.directive('editableNoModel', function () {       
    return function(scope, element, attrs, ctrl) {   
    	$(element).attr("contenteditable", true);
    };
});

mono.directive('editable', function() {
    return {
        require: '?ngModel',
        link: function(scope, element, attrs, ctrl) {
        	$(element).attr("contenteditable", "true");
        	
            // view -> model
        	element.bind('blur', function() {
                scope.$apply(function() {
                    ctrl.$setViewValue(element.html());
                });
            });

            // model -> view
            ctrl.$render = function() {
            	element.html(ctrl.$viewValue);
            };

            // load init value from DOM
            ctrl.$setViewValue(element.html());
        }
    };
});


mono.directive('noViewer', function() {
	return function(scope, element, attrs, ctrl) {
		$(element).remove();
	};
});















// THESE ARE NOT BEING USED, WILL EVENTUALLY DELETE
//Format tag
mono.directive('format', function(){
  return{
    restrict: 'A',
    link: function(scope, element, attrs)
    {
      element.bind('click', function(){
      
      //Recursive searches for a format tag
      //up the dom tree
      var hasParent = function(node, parent){
        if(node[0].nodeName === "P"){
          return false;
        }else if(node[0].nodeName === parent){
          return node;
        }else{
          return hasParent(node.parent(), parent);
        }
      };

      var getMultiNodeStatus = function(tag){
        return $($('.selected')[0]).parent()[0].nodeName === $($('.selected')[1]).parent()[0].nodeName;
      };

      var multiNodes = function(tag){
          console.log('called multinode');
         
          $($('.selected')[0]).unwrap();
          $('.selected').wrapAll(tag);
      };

      var singleBold = function(){
        var node = hasParent($('.selected').parent(), "B");
        if(node === false){
          $('.selected').wrap('<b>');
        }else{
          node.children().unwrap();
        }
      };
      //Bold format basic cases
      var bold = function(){
        var size = $('.selected').size();
        if(size > 1 && !getMultiNodeStatus()){

          multiNodes('<b>');
        }else{
          singleBold();
        }
      };

      //Italics format handles basic cases
      var italics = function(){
        var size = $('.selected').size();
        if(size > 1){
          multiNodes('<i>');
        }else{
          var node = hasParent($('.selected').parent(), "I");        
          if(node === false){
            $('.selected').wrap('<i>');
          }else{
            node.children().unwrap();
          }
        }
      };

      var headingOne = function(){
        var node = hasParent($('.selected').parent(), "H1");

        if(node === false){
          $('.selected').wrap('<h1>');
        }else{
          node.children().unwrap();
        }
      };

      var headingTwo = function(){
        var node = hasParent($('.selected').parent(), "H2");

        if(node === false){
          $('.selected').wrap('<h2>');
        }else{
          node.children().unwrap();
        }
      };

      var blockquote = function(){
          var node = hasParent($('.selected').parent(), "BLOCKQUOTE");

          if(node === false){
            $('.selected').wrap('<blockquote>');
          }else{
            node.children().unwrap();
          }
      };

      console.log(element.text().trim());
      
      switch(element.text().trim()){
        case "B":
            bold();
          break;
        case "I":
            italics();
          break;
        case "H1":
            headingOne();
          break;
        case "H2":
            headingTwo();
          break;
        case "":
            blockquote();
          break;
      }

      });
    }
  };
});

//Uploader
mono.directive('imageGet', function($http, $compile){
  return {
    restrict: 'A',
    link: function(scope, element, attrs)
    {
      element.bind('click', function(){
        $http.get({method: 'GET', url: '/Presentation/api/data'}).then(function(data){
          console.log('called');
          console.log(data);
          
        });
      });
    }
  };
});


mono.directive('upload', ['uploadManager', '$compile', '$http',
  function factory(uploadManager, $compile, $http){
    return {
      restrict: 'A',
      link: function (scope, element, attrs){

        var renderImage = function(file){
          //Only process image files
          if(file.type.match('image.*')){
            var reader = new FileReader();
            //Closure to capture the file information
            reader.onload = (function(theFile) {
              return function(e){
                console.log('called again');
                //Render thumbnail.
                var span = document.createElement('span');
                span.innerHTML = ['<br><img class="thumb" src="', e.target.result, '"/>'].join('');
                //console.log(span);
               // document.getElementById('text').appendChild(span);
               console.log(scope.para);
                $($("P")[scope.para]).append(span);
                scope.para = scope.para + 1;
              };
            })(file);
            reader.readAsDataURL(file);
          }
        };

        var getImage = function(imageID){
          $http.get('/Presentation/api/data').success(function(data){
             console.log('called get');
          });
          console.log('get failed');
        };

        $(element).fileupload({
          dataType: 'text',
          add: function(e, data){
            uploadManager.add(data);
            renderImage(data.files[0]);
          },
          progressall: function(e, data){
           // console.log("progress data: " + data.loaded + "data total: " + data.total);
            var progress = parseInt(data.loaded/data.total*100, 10);
            uploadManager.setProgress(progress);
          },
          done: function(e, data){
            console.log('done');
            console.log(data.result);
            //uploadManager.setProgress(100);
            //$('.thumb').remove();
            scope.$apply(function(){
              getImage(data.result);
            });
            
          }
        });
      }
    };
}]);




//bold directive
mono.directive('bold', function(){
  return {
    restrict: 'A',
    link: function(scope, element, attrs)
    {
      element.bind('click', function(){
        var wrapped = false;
        //Matches selected text
        var pattern = /(<span .*<\/span>)/;
        //Gets the parent
        var selection = $('.selected');
        //var parent = $('.selected').parent()[0];
        var parent = $('.selected').parent();
        var newHtml = '';
        var str = '';
        //One level up is paragraph
        if(parent[0].nodeName == 'P'){
          console.log('P case');
          //Remove all the bold tags from children
          if(selection.size() > 1){
            //Selection spans over multiple nodes
            for(var i=0; i<selection.size(); i++){
              newHtml += selection[i].innerHTML;
            }

            console.log(newHtml);
          }
          //wrap it
          $('.selected').wrap("<b>");
          //One level up is bold tag
        }else if(parent[0].nodeName == 'B'){
          console.log('In else parent B');
          //Check internal selection
           str  = $('.selected').parent().html();
          //Splits based on match
          var arr = str.split(pattern);
          //Check if there is anything before selection
          var prev = $('.selected')[0].previousSibling;
          //Check if there is anything before selection
          var next = $('.selected')[0].nextSibling;

          //First case
          if(prev === null && next===null){
            console.log('first case');
            //user selected text contained in bold tags
            //Unwrap it
            //Done!
            $('.selected').unwrap();

          //Second case
          }else if(prev !==null && next === null){
            console.log('second case');
            //There is Bold text behind selected text
            str = $('.selected').parent().html();
            console.log("Arr: " + arr);

            newHtml = '<b>' + arr[0] + '</b>' + arr[1];
            $('.selected').parent().replaceWith(newHtml);

            //There is bold text after selected text
          }else if(prev ===null && next !==null){
            console.log('third case');

            //The selected text has bold characters
            //before and after
          }else if(prev !==null && next !==null){
            console.log('fourth case');
            //At this point we are guaranteed to have prev and next siblings
            console.log(arr);
            //Unbold selected
            newHtml = '<b>' + arr[0] + arr[1].replace(pattern, "</b>$1<b>") + arr[2] + '</b>';
            $('.selected').parent().replaceWith(newHtml);
          }
        }

        //console.log(parent.nodeName);

      });
    }
  };
});


mono.directive('savePresentation', function() {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			$.ajax("/presentationGrails/editor/saveEdited", {
				type : 'POST',
				data : {
					id : $('#presentationId').val(),
					slideContent : $('#editor').html(),
					title : $("#title").html(),
					assessment : $("#assessment").html().replace(/^\s*\n/gm, ""),
					slideTitle : $("#slideTitle").html().replace(/^\s*\n/gm, ""),
					slideNum : $('#slideNum').val()
				},
				success : callback
			});
		}
	};
});

mono.directive('contenteditable', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            // view -> model
            elm.bind('keyup', function() {
                scope.$apply(function() {
                    ctrl.$setViewValue(elm.html());
                });
            });

            // model -> view
            ctrl.$render = function() {
                elm.html(ctrl.$viewValue);
            };
        }
    };
});