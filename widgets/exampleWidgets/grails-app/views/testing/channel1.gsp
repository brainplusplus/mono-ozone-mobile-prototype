<html>
<head>
    <meta charset="utf-8">
    <title>Mono Phase 2 JS Tests Example</title>
    <link rel="stylesheet" type="text/css" media="all" href="https://code.jquery.com/qunit/qunit-1.12.0.css"/>

    <script src="https://code.jquery.com/jquery-2.0.3.js"></script>
</head>
<body>
    <div id="qunit"></div>
    <div id="qunit-fixture"></div>
    <script src="/presentationGrails/js/widget/owf-widget-min.js"></script>
    <script>
        function errorLog(logline)
        {
            var errorLogDiv = document.getElementById("errorlog")
            errorLogDiv.innerHTML = errorLogDiv.innerHTML + "\n" + logline
        }

        widget = Ozone.eventing.Widget.getInstance();
        i = 0;

        setInterval(function() {
            widget.publish("pubsubTestChannel", "Count: " + i);
            errorLog("published " + i);
            i = i + 1;
        }, 5000);

    </script>
    <div>
        <pre id="errorlog" />
    </div>
</body>
</html>
