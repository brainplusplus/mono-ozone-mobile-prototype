<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html manifest="config/cache.manifest">
<head>
<meta http-equiv="X-UA-Compatible" content="IE=8">
<meta http-equiv="Content-Type" content="text/html;charset=utf-8">
<script type="text/javascript">
	var appServerConfig = {
		baseCommonDirectory: '${g.resource(dir: 'js/lib/jc2cui-common')}',
		baseDirectory: '${g.resource(dir: 'watchboard')}',
		configOverrides:{
			
		}
	};
</script>
<r:require module="watchboard"/>
<r:layoutResources/>
<title>Watchboard</title>
</head>
<body>
	<div id=title>No Watchboard Loaded</div>
	<div id=grid></div>
	<div id=loaded></div>
		
	<r:layoutResources/>
</body>
</html>
