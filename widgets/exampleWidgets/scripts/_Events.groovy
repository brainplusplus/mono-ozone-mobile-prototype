eventCreateWarStart = { warName, myDir ->
	//println 'EVENT CALLED!'
	File libDir = new File("${myDir}/WEB-INF/lib/")
	if (grailsEnv != "development") {
	   libDir.eachFileMatch( ~/^(tomcat|grails-plugin-tomcat).*\.jar$/) { File jarToRemove ->
		  println 'REMOVING JAR: ' + jarToRemove
		  jarToRemove.delete()
	   }
	}
 }