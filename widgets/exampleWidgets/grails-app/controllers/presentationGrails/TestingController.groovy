package presentationGrails

class TestingController {
    def modal() {
        render view: "modal"
    }

    def channel1() {
        render view: "channel1"
    }

    def channel2() {
        render view: "channel2"
    }

    def intent1() {
        render view: "intent1"
    }

    def intent2() {
        render view: "intent2"
    }

    def persistent() {
        render view: "persistent"
    }
	
	def notification() {
		
	}

}
