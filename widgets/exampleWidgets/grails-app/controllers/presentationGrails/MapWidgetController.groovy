package presentationGrails

class MapWidgetController {

    def index() { }

	def descriptor() {
		render(template: "/common/descriptor", model: [path: '', largeImage: '/', smallImage: '/', displayName: ''])
	}
	
	def manifest() {
		render(contentType: "text/cache-manifest", view: "manifest")
	}
	
	def pubsub(){render view: 'pubsub'}
}
