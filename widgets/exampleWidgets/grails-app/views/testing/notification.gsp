<%@ page contentType="text/html;charset=UTF-8" %>
<html>
<head>
    <r:require modules="owfWidget, jqueryui_1_10_4" />
    <r:layoutResources/>
    <title>Modal tester</title>
</head>
<body>
<script>	
    function notify() {
		var title = document.getElementById('title').value;
		var text = document.getElementById('text').value;
		var delay = (parseInt(document.getElementById('delay').value) || 5) * 1000;
		var alert_text = document.getElementById('return').value;
		setTimeout(function(){
          Mono.Notifications.Notify({title: title, callback: function(data){alert(alert_text);}, text: text}); 
		}, delay);
    }

</script>
<table cellpadding="2" cellspacing="0" border="0">
<tr><td>Title</td><td><input id="title" type="text" value="Notification Test" /></td></tr>
<tr><td>Message</td><td><textarea id="text" rows="5" cols="20" >Nullam nec felis sed ligula egestas auctor. Vestibulum vitae magna et elit dapibus faucibus. Pellentesque fringilla diam in ante vestibulum pulvinar. Praesent aliquet ornare diam quis eleifend. Phasellus venenatis est vitae neque feugiat, tempor tincidunt lacus ornare. Aenean eros sapien, commodo in ultrices eu, sodales ut ipsum. In eget facilisis est, eu aliquet nulla. Cras dictum venenatis nulla in congue. Pellentesque hendrerit congue felis, ac elementum augue porttitor ac. Fusce dignissim enim vitae tempor euismod. Etiam fermentum felis nibh, et mollis leo fringilla id. Morbi tincidunt orci hendrerit arcu interdum, eu mattis arcu sollicitudin. Praesent faucibus sed arcu non euismod. Nulla dapibus cursus massa sed feugiat. Sed vitae dignissim augue, quis aliquam metus.</textarea></td></tr>
<tr><td>Delay</td><td><input id="delay" type="text" value="5" /></td></tr>
<tr><td>Alert </td><td><input id="return" type="text" value="Called!" /></td></tr>
</table>
 

<button onclick='notify()' value="Notify" >Notify</button>
<r:layoutResources/>
</body>
</html>
