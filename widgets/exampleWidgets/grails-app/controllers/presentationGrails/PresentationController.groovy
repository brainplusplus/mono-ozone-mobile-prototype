package presentationGrails

class PresentationController {

    public enum FilterType {
        HOUR,TODAY,WEEK,MONTH
    }

    def presentationService;

    def index = {}

    def retrieveMenuItems = {
        def presentationId = params.id;
        def titleList = presentationService.loadSlideTitles(presentationId);

        render(contentType: "text/json") {
            titleList;
        }
    }
    def retrieveFile = {
        if(!params.id?.contains("{{"))
        {
            log.info(params.id);
            log.info(params.guid);
            def id = params.id;
            def file = FileUpload.get(id);
            if(file == null)
            {
                file = FileUpload.findByGuid(params.guid)
            }

            response.setContentLength(file.data.size())
            response.outputStream << file.data;
        } else render ""; //Angluar is evaluating the expression before the binding. Can we fix that?
    }

    def filter = {
        FilterType filterType = FilterType.valueOf(params.query.toUpperCase());
        def presentationIds =  presentationService.filter(filterType).collect(new HashSet()) { '#' + it.id };
        if(presentationIds == null)
        {
            render '[]';
        }
        else render presentationIds;
    }

    def search = {
        String query = params.query;
        //TODO: Should change to use HQL to avoid loading whole pres when only id is needed
        def presentations = presentationService.search(query).collect(new HashSet()) { '#' + it.id }
        if(presentations == null)
        {
            render '[]';
        }else
        render presentations;

    }

    def delete = {
        Presentation.get(params.id).delete(flush:true);
        render "deleted";
    }

    def deleteSlide = {
        Presentation p = Presentation.get(params.presentationId);
        render "schwing";
    }
}
