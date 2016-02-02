<%@ page contentType="text/html;charset=UTF-8" %>
<html>
<head>
    <r:require modules="owfWidget, jqueryui_1_10_4" />
    <r:layoutResources/>
    <title>Modal tester</title>
</head>
<body>
<script>
    function alert2(data){
       
        var jsonDiv = document.getElementById('jsonDiv');
        jsonDiv.innerHTML= "Response: " + JSON.stringify(data) ;
    }

    function makeUrlRequest() {
        console.log("Making URL request.");
        Mono.Modals.ShowUrlModal("42six!",  "http://www.42six.com");
    }

    function makeMessageRequest() {
        console.log("Making message request");
        Mono.Modals.ShowMessageModal(  "Here is the title",  "This is my message");
    }
    
    function makeHtmlRequest() {

        var myHtml = $('#htmlVal').val();
        if (myHtml.length === 0)
        {
            alert("populate html");
            return;
        }
        console.log("Making html request");
        Mono.Modals.ShowHtmlModal(  "HTML title", myHtml );
    }

    function makeWidgetRequest() {
       var myWidget = $('#widget').val();
        if (myWidget.length === 0)
        {
            alert("populate widget");
            return;
        }
        console.log("Making widget request");
        Mono.Modals.ShowWidgetModal("widget title", myWidget);
    }

    function makeYesNoRequest() {
        console.log("Making Yes/No request");
        Mono.Modals.ShowYesNoModal("Do you like modals?", "If you Like Modals, please let us know!", function(data){alert2(data);});
    }

    function makeUrlRequest() {
        console.log("Making URL request.");
        Mono.Modals.ShowUrlModal("42six!",  "http://www.42six.com");
    }

</script>
<label>Widgetname:</label><input size = "40" id="widget" type="text" name="widget"/><a href="#" onclick='makeWidgetRequest()'>Widget</a> <br/>
<a href="#" onclick='makeUrlRequest()'>Url</a> <br/>
<a href="#" onclick='makeMessageRequest()'>Message</a> <br/>
<label>HTML:</label><input size = "40" id="htmlVal" type="text" value="<HTML> this the html to display </HTML>"/> <a href="#" onclick='makeHtmlRequest()'>Html</a> <br/>
<a href="#" onclick='makeYesNoRequest()'>Yes/No dialog</a><br/>

<div id="response"></div>
<div id="jsonDiv"></div>
<r:layoutResources/>
</body>
</html>