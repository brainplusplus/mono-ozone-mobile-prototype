class UrlMappings {

	static mappings = {
		
		"/$controller/$action?/$id?"{
			constraints {
				// apply constraints here
			}
		}
		
		"/$controller/cache.manifest"{
			action='manifest'
		}
		
		"/uploads/$id" {
            controller='presentation'
            action="retrieveFile"
        }
        "/uploads" {
            controller='presentation'
            action="retrieveFile"
        }
		"/index/$action" {
			controller='index'
		}
		
		"/editor/$action" {
			controller='editor'
		}
		
		"/social-ui/app/chirpWidget.html" {
			view="/social-ui/app/chirpWidget.html"
		}
		
		"/social-ui/app/composeChirpWidget.html" {
			view="/social-ui/app/composeChirpWidget.html"
		}
		
		"/social-ui/app/linkAnalysisWidget.html" {
			view="/social-ui/app/linkAnalysisWidget.html"
		}
		
		"/"(controller:"index",action:"index")
		"500"(view:'/error')
	}
}
