<html>
	<head>
		<!-- <link rel="stylesheet" type="text/css" href="../js/image-picker.css"/> -->

                <script type="text/javascript" src="/presentationGrails/js/lib/jquery/jquery-1.10.1.min.js"></script>
		<script type="text/javascript" src="/presentationGrails/js/lib/jc2cui-common/common/javascript/util.js"></script>
		<script type="text/javascript" src="/owf/js/monoPhase2/APIBase.js"></script>
                <!--<script type="text/javascript" src="../js/image-picker.min.js"></script> -->
		<script type="text/javascript">
			if (!library)
			   var library = {};

			library.json = {
			   replacer: function(match, pIndent, pKey, pVal, pEnd) {
			      var key = '<span class=json-key>';
			      var val = '<span class=json-value>';
			      var str = '<span class=json-string>';
			      var r = pIndent || '';

			      if (pKey)
			         r = r + key + pKey.replace(/[": ]/g, '') + '</span>: ';
			      if (pVal)
			         r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
			      return r + (pEnd || '');
			      },
			   prettyPrint: function(obj) {
			      var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
			      return JSON.stringify(obj, null, 3)
			         .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
			         .replace(/</g, '&lt;').replace(/>/g, '&gt;')
			         .replace(jsonLine, library.json.replacer);
			      }
			   };
    </script>
	</head>
<body>

	<span>Objects in Storage: </span><span id="storageCount">0</span>

	<select id="memoryOption">
		<option value="disk">Disk Cache</option>
		<option value="memory">Memory Cache</option>
	</select>
	<div>
		<div>Add String: </div>
		<div>
			<input type="text" id="stringKey" placeholder="Key"></input>
			<input type="text" id="stringVal" placeholder="String"></input>
			<input type="button" value="Add" id="addString"></input>
		</div>
		<div>Add Boolean: </div>
		<div>
			<input type="text" id="boolKey" placeholder="Key"></input>
			<input type="text" id="boolVal" placeholder="Boolean"></input>
			<input type="button" value="Add" id="addBool"></input>
		</div>
		<div>Add Number: </div>
		<div>
			<input type="text" id="numKey" placeholder="Key"></input>
			<input type="text" id="numVal" placeholder="Number"></input>
			<input type="button" value="Add" id="addNumber"></input>
		</div>
		<div>Add Array: </div>
		<div>
			<input type="text" id="arrKey" placeholder="Key"></input>
			<input type="button" value="Add" id="addArray"></input>
		</div>
		<div>Add Date: </div>
		<div>
			<input type="text" id="dateKey" placeholder="Key"></input>
			<input type="button" value="Add" id="addDate"></input>
		</div>
		<div>Add Object: </div>
		<div>
			<input type="text" id="objKey" placeholder="Key"></input>
			<input type="button" value="Add" id="addObject"></input>
		</div>

		<!--<div>
			  <img src="../img/rand1.jpg" value="Yellow"  style=" border:4px solid transparent;"/>
			  <img src="../img/rand2.jpg" value="Stairs" style=" border:4px solid transparent;"/>
			  <img src="../img/rand3.jpg" value="Hallway" style=" border:4px solid transparent;"/> 
			  <img src="../img/rand4.jpg" value="Blueprint" style=" border:4px solid transparent;"/>
                        </div> -->
	</div>

	<div id="currentObject" style="margin:25px;"></div>

	<div>
		<input type="button" value="Save" id="save"></input>
	</div>

	<div style="margin:25px;">
		<span> Saved Values: </span>
		<select id="storedObjects" class="retrieved-list">
			<option value=""></option>
		</select>
	</div>

	<div style="margin:25px;">
		<p>Update Existing Object By Referencing a Previous Index</p>
		<input type="text" placeholder="Index" id="updateIndex"></input>
		<input type="button" value="Update" id="update"></input>
		<span id="updateResult"></span>
	</div>

	<div style="margin:25px;">
		<div>
			<input type="text" id="deleteIndex" placeholder="Index"></input>
			<input type="button" id="delete" value="Delete"></input>
			<span id="deleteResult"></span>
		</div>
	</div>

</body>

	<script type="text/javascript">
		$(function(){
			var currStructure;
			var currJSON;
			var img;
 	
 		    var storage = "Persistent";
 		    var saved = {"Transient":"<option val=''></option>","Persistent":"<option val=''></option>"};
		
			/* Change Save Location */
			$(document).on('change', 'select#memoryOption', function(event){
				var val = $(this).val();
				console.log(val);
				var options = $("#storedObjects").html();
				saved[storage] = options;

				if (val == "memory"){
					storage = "Transient";
					$("#storedObjects").html(saved[storage]);
				}else if(val == "disk"){
					storage = "Persistent";
					$("#storedObjects").html(saved[storage]);
				};
				
				$("#storageCount").html($("#storedObjects").find("option").length-1);

				$("#stringKey").prop('disabled',false);
				$("#boolKey").prop('disabled',false);
				$("#numKey").prop('disabled',false);

				$("#currentObject").html("");
				currStructure = null;
				currJSON = null;		
			});


			/* Retrieve */
			$(document).on('change', 'select.retrieved-list', function(event){
				var index = $(this).val();

				Mono.Storage[storage].Retrieve({'index':index},function(data){
					if (data.obj != null) {
						var $currObj = $("#currentObject");
						$currObj.html("Index: "+index+"<br/>");
						$currObj.append(library.json.prettyPrint(data.obj));
						convertDataURL(null);
						currJSON = data.obj
					}else{
						alert("Error! Could Not Retrieve Object. Try Again");
					}	
				});		

				$("#stringKey").prop('disabled',false);
				$("#boolKey").prop('disabled',false);
				$("#numKey").prop('disabled',false);

				$("#currentObject").html("");
				currStructure = null;
				currJSON = null;		
			});


			/* Store */
			$(document).on('click', 'input[id="save"]', function(event){

				Mono.Storage[storage].Store({'object':currJSON}, function(data){
					if (data.index >= 0) {
						$("#storedObjects").append(
							$("<option/>")
							.attr("value",data.index)
							.html("index: "+data.index+", date: "+ (new Date().toLocaleTimeString()))
						);
					
						$("#storageCount").html($("#storedObjects").find("option").length-1);
					}else{
						alert("Error! Could Not Save Object. Try Again");
					}

				});			
					$("#stringKey").prop('disabled',false);
					$("#boolKey").prop('disabled',false);
					$("#numKey").prop('disabled',false);

					$("#currentObject").html("");
					currStructure = null;
					currJSON = null;	
			});

			/* Update */
			$(document).on('click', 'input[id="update"]', function(event){
				var index = $("#updateIndex").val();

				Mono.Storage[storage].Update({'index':index,'object':currJSON}, function(data){
					if (data.updated == "true") {

						$("#storedObjects").find("option[value='"+index+"']").html("index: "+index+", date: "+ (new Date().toLocaleTimeString()));
						
						$("#updateResult").html("Updated Object at Index: "+index).show().fadeOut(7000);

					}else{
						$("#updateResult").html("Error! Could Not Update Object at Index: "+index).show().fadeOut(7000);
					}
				});		

					$("#stringKey").prop('disabled',false);
					$("#boolKey").prop('disabled',false);
					$("#numKey").prop('disabled',false);

					$("#currentObject").html("");
					currStructure = null;
					currJSON = null;		
			});

			/* Delete */
			$(document).on('click', 'input[id="delete"]', function(event){
				var index = $("#deleteIndex").val();

				Mono.Storage[storage].Delete({'index':index}, function(data){
					if (data.removed == "true") {

						$("#storedObjects").find("option[value='"+index+"']").remove();
						$("#deleteResult").html("Deleted Object at Index: "+index).show().fadeOut(7000);

						$("#storageCount").html($("#storedObjects").find("option").length-1);

					}else{
						$("#deleteResult").html("Error! No Object to Delete at Index: "+index).show().fadeOut(7000);
					}

				});		

					$("#stringKey").prop('disabled',false);
					$("#boolKey").prop('disabled',false);
					$("#numKey").prop('disabled',false);

					$("#currentObject").html("");
					currStructure = null;
					currJSON = null;
		
			});

			/* Image Selected */
			$(document).on('click', 'img', function(event){
				var name = $(this).attr('value');
				var location = $(this).attr('src');
				$(this).css('border','4px solid blue').siblings().css('border','4px solid transparent');
				currJSON = currJSON || {};
				location = window.location.protocol+window.location.port+"//"+location.replace("..","10.1.11.18");



				if(currStructure != null && $.isArray(currStructure)){
					currStructure.push(location);
				}else if(currStructure){
					currStructure[name] = location;
			    }else{
					currJSON = currJSON || {};
					currJSON[name] = location;
				}

				$("#currentObject").html(library.json.prettyPrint(currJSON));
			});


			$(document).on('click', 'input[id="addObject"]', function(event){
				var key = $("#objKey").val();
				
				if(key.trim().length == 0){
					alert("Key is required for Object");
					return;
				}

				$("#stringKey").prop('disabled',false);
				$("#boolKey").prop('disabled',false);
				$("#numKey").prop('disabled',false);

				$("#objKey").val("");

				currStructure = {}
				currJSON = currJSON || {};
				currJSON[key] = currStructure;
				$("#currentObject").html(library.json.prettyPrint(currJSON));
			});

			$(document).on('click', 'input[id="addArray"]', function(event){
				var key = $("#arrKey").val();
				
				if(key.trim().length == 0){
					alert("Key is required for Array");
					return;
				}

				$("#stringKey").prop('disabled',true);
				$("#boolKey").prop('disabled',true);
				$("#numKey").prop('disabled',true);

				$("#arrKey").val("");

				currStructure = []
				currJSON = currJSON || {};
				currJSON[key] = currStructure;
				$("#currentObject").html(library.json.prettyPrint(currJSON));
			});

			$(document).on('click', 'input[id="addDate"]', function(event){
				var key = $("#dateKey").val();

				if(key.trim().length == 0){
					alert("Key is required for Date");
					return;
				}

				$("#dateKey").val("");
				
				if(currStructure != null && $.isArray(currStructure)){
					currStructure.push(new Date());
				}else if(currStructure){
					currStructure[key] = new Date();
			    }else{
					currJSON = currJSON || {};
					currJSON[key] = new Date();
				}

				$("#currentObject").html(library.json.prettyPrint(currJSON));
			});

			$(document).on('click', 'input[id="addNumber"]', function(event){
				var key = $("#numKey").val();
				var val = $("#numVal").val();
				 

				if(!$("#numKey").prop('disabled'))
					if(key.trim().length == 0){
						alert("Key is required for Number");
						return;
					}

				if(val.trim().length == 0){
					alert("Value is required for Number");
					return;
				}
				val = parseInt(val);

				$("#numVal").val("");
				$("#numKey").val("");

				if(currStructure != null && $.isArray(currStructure)){
					currStructure.push(val);
				}else if(currStructure){
					currStructure[key] = val;
			    }else{
					currJSON = currJSON || {};
					currJSON[key] = val;
				}

				$("#currentObject").html(library.json.prettyPrint(currJSON));
			});

			$(document).on('click', 'input[id="addBool"]', function(event){
				var key = $("#boolKey").val();
				var val = $("#boolVal").val();

				if(!$("#boolKey").prop('disabled'))
					if(key.trim().length == 0){
						alert("Key is required for Boolean");
						return;
					}

				if(val.trim().length == 0){
					alert("Value is required for Boolean")
					return;
				}

				val   = val === "true" || val === "True"  ;
				$("#boolVal").val("");
				$("#boolKey").val("");

				if(currStructure != null && $.isArray(currStructure)){
					currStructure.push(val);
				}else if(currStructure){
					currStructure[key] = val;
			    }else{
					currJSON = currJSON || {};
					currJSON[key] = val;
				}
				
				$("#currentObject").html(library.json.prettyPrint(currJSON));
			});
			
			$(document).on('click', 'input[id="addString"]', function(event){
				var key = $("#stringKey").val();
				var val = $("#stringVal").val();

				if(!$("#stringKey").prop('disabled'))
					if(key.trim().length == 0){
						alert("Key is required for String");
						return;
					}

				if(val.trim().length == 0){
					alert("Value is required for String")
					return;
				}

				$("#stringVal").val("");
				$("#stringKey").val("");

				if(currStructure != null && $.isArray(currStructure)){
					currStructure.push(val);
				}else if(currStructure){
					currStructure[key] = val;
			    }else{
					currJSON = currJSON || {};
					currJSON[key] = val;
				}
				
				$("#currentObject").html(library.json.prettyPrint(currJSON));
			});


		});

 
	  function convertDataURL(data){
			var $currObj = $("#currentObject");
			
			var $temp = $currObj.find("span:contains(canvas)");
			var $spanCanvas = $temp.next('span');
		    var url = data ? data: $spanCanvas.html();
		  	$spanCanvas.html('<div><canvas id="myCanvas" width="150" height="150"></canvas></div>');

	        var canvas = document.getElementById('myCanvas');
	        var context = canvas.getContext('2d');

	        // load image from data url
	        var imageObj = new Image();
	        imageObj.src = url;

	        imageObj.onload = function() {
	          context.drawImage(imageObj, 0, 0);		 
	        };	      
      }

		function updateBatteryState(data){
			$("#batteryState").html(data.batteryState);
		}

		function updateBatteryLevel(data){
			$("#batteryLevel").html(data.batteryLevel);
		}

		function updateGPS(data){
			$("#info").html(data.accuracy);
			$('#latCoord').html(data.coords.lat);
			$('#lonCoord').html(data.coords.lon);
		}
	</script>
</html>


