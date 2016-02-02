
<%@ page contentType="text/html;charset=UTF-8" %>
<html>
<head>
    <r:require modules="owfWidget, jqueryui_1_10_4" />
    <r:layoutResources/>
    <title>Modal tester</title>
</head>
<body>
<script>
    function makeUrlRequest() {
        console.log("Making URL request.");
        Mono.Modals.Display("url", {title: "CNN!", url: "http://www.cnn.com"});
    }

    function makeMessageRequest() {
        console.log("Making message request");
        Mono.Modals.Display("message", {title: "Here is the title", message: "This is my message"});
    }

    function makeWidgetRequest() {
        console.log("Making widget request");
        Mono.Modals.Display("widget", {widgetUUID: "e12f6cca-790b-f25f-cc73-bc78a62f6dfd"}); // watchboard
    }

    function makeYesNoRequest() {
        console.log("Making Yes/No request");
        Mono.Modals.ShowYesNoModal("Do you like modals?", "If you Like Modals, please let us know!", function() {
           console.log("this is the callback");
        });
    }

</script>
<a href="#" onclick='makeUrlRequest()'>Url</a> |
<a href="#" onclick='makeMessageRequest()'>Message</a> |
<a href="#" onclick='makeWidgetRequest()'>Widget</a> |
<a href="#" onclick='makeYesNoRequest()'>Yes/No dialog</a>
<r:layoutResources/>
</body>
</html>
