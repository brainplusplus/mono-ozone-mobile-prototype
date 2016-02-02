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

        var count;
        setInterval(function() {
            OWF.Intents.startActivity(
                {action: "test", dataType: "test/type"},
                {data: "some data"},
                function(dest) {
                    errorLog(JSON.stringify(dest));
                }
            );
            count = count + 1;
        }, 5000);

    </script>
    <div>
        <pre id="errorlog" />
    </div>
</body>
</html>
