package presentationGrails

class MappingController {

    def index() { }
	def descriptor() {
		render(template: "/common/descriptor", model: [path: '', largeImage: '/', smallImage: '/', displayName: ''])
	}
}
