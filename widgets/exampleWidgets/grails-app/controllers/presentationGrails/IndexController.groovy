package presentationGrails

import presentationGrails.Template;

class IndexController {

    def index = {
        def presentationList = Presentation.findAll();
        render(view: '../common/index', model:[presentationList: presentationList,linkDestination: "viewer/viewer",editor:false]);
    }

}
