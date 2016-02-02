package presentationgrails

import groovy.json.JsonSlurper
import org.codehaus.groovy.grails.web.json.JSONObject
import presentationGrails.Background;
import presentationGrails.Event;
import presentationGrails.FileUpload;
import presentationGrails.Presentation;
import presentationGrails.Slide;
import presentationGrails.Timeline;
import presentationGrails.PresentationController.FilterType;

import grails.converters.JSON;

class PresentationService {
	
	def updatePresentation(params) {
		def presentation = Presentation.get(params.int('id'));
		def slide = presentation.slides.find{it.slideNum == params.int('slideNum')};
		
		presentation.lock();

		//Convert from a list of JSONObject to a list of Background
		List parsedBackgrounds = JSON.parse(params.backgrounds);
		def incomingBackgrounds = parsedBackgrounds.collect {JSONObject jsonObject ->
			new Background(guid: jsonObject.get("guid"), title: jsonObject.get("title"), description: jsonObject.get("description"), type:jsonObject.get("type"))
		}
		
		List<Background> toRemove = new ArrayList<Background>();
		
		if(slide.backgrounds == null) {
			slide.backgrounds = new ArrayList<Background>();
		}
		
		//update the descriptions
		for(Background background: slide.backgrounds) {
			//find current background in incoming json results with the same guid
			Background jsonBackground = incomingBackgrounds.find{it.guid == background.guid};
			
			//check if the background exists
			if(jsonBackground != null) {
				background.description = jsonBackground.description;
                log.error(background.description);
                background = background.save(flush:true)
                log.error(background.description);
			} else {
				//	background was not found in the current slide meaning we should delete it
				toRemove.add(background);
			}
		}
		
		//backgrounds we should remove
		for(Background b : toRemove) {
			slide.removeFromBackgrounds(slide.backgrounds.find{it.id == b.id});
			b.delete(flush: true);
		}
		
		slide.title = params.slideTitle.replaceAll("(?m)^[ \t]*\r?\n", "");
		slide.title = params.slideTitle.replaceAll('\t', '');
		slide.assessment = params.assessment;
		slide.slideContent=params.slideContent;
		slide.references=params.references;
		presentation.save(flush:true);
		
		if(presentation.hasErrors()) {
			println(presentation.errors);
			return "Failed!";
		}else{
			return "SAVED!"
		}
	}
	def create(presTitle)
	{
		def p = new Presentation();
		p.title = presTitle;
		p.state = "new";
		def s = new Slide();
		s.slideNum = 1;
		s.backgrounds = new ArrayList<Background>();
		s.assessment = "Insert your assessment here";
		s.references = "Insert your references here";
		p.totalSlides = 1;
		//Add slides to presentation
		p.addToSlides(s);
		
		p.save(flush:true);
		return p;
	}
	def getPresentation(String id)
	{
		return Presentation.get(id);
	}

	def addSlide(params)
	{

		def presentation = Presentation.get(params.int('id'));
		presentation.lock();
		presentation.totalSlides++;
		def s = new Slide();
		s.slideNum = presentation.totalSlides
		s.backgrounds = new ArrayList<Background>();
		s.assessment = "Insert your assessment here";
		s.references = "Insert your references here";

		//Add slides to presentation
		presentation.addToSlides(s);
		presentation.save(flush:true);
		return s;
	}

    //For retrieving presentation from database
    //Retrieves the tiles of all presentations for index page
    def loadAllPresentations(){
        def presentations = Presentation.list();
        def list = [];

        presentations.each{
            list.add(it["title"]);
        }
        return list;
    }

    //Returns top level presentation data
    def loadPresentation(int presentationId) {
        def presentation = Presentation.get(presentationId);
        def map = [:];

        map << ["title" : presentation["title"]];
        map << ["classification" : presentation["classification"]];
        map << ["totalSlides" : presentation["totalSlides"]];
        return map;
    }

    //Loads a single slide for the provided presentation id
    //and the slide number
    def loadSlide(int presentationId, int slideNum){
        def presentation = Presentation.get(presentationId);
        def slide = presentation? Slide.findByPresentationAndSlideNum(presentation, slideNum) : [];
//        def map = [:];

//        map << ["title" : slide["title"]];
//        map << ["slideNum" : slide["slideNum"]];
//        //Slide id is loaded for retrieving time line
//        map << ["slideId": slide.id];
//		map << ["slideContent": slide.slideContent];
//		map << ["assessment":slide.assessment];
//        log.error(slide.backgrounds)
//		map << ["backgrounds" : slide.backgrounds];
//		map << ["references" : slide.references];
        return slide;

    }

    //Loads the titles of all the slides in the presentation
    def loadSlideTitles(String presentationId){
        def presentation = Presentation.get(presentationId);
        def slides = presentation? Slide.findAllByPresentation(presentation, [sort: "slideNum"]) : [];
        def list = [];

        slides.each{
            list.add(it["title"]);
        }
        return list;
    }
    //Returns a map of all slides for the given presentation id
    def loadAllSlides(int presentationId){
        def presentation = Presentation.get(presentationId);
        def slides =  presentation? Slide.findAllByPresentation(presentation) : [];
        def map = [:];
        def list = [];

        slides.each{
            map << ["title" : it["title"]];
            map << ["assessment" : it["assessment"]];
            map << ["slideNum" : it["slideNum"]];
            map << ["slideId" : it.id];
			map << ["backgrounds" : it["backgrounds"]];
			map << ["references" : it["references"]];
            list.add(map);
            map = [:];
        }
        return list;
    }

    //Loads time line of events for the provided slide id
    def loadTimeline(int slideId){
        def slide = Slide.get(slideId);
        def timeline = Timeline.findBySlide(slide);
        def events = Event.findAllByTimeline(timeline);
        def map = [:];
        def list = []

        events.each{
            map << ["date" : it["date"]];
            map << ["description" : it["description"]];
            map << ["numBackgrounds" : it["numBackgrounds"]];
            map << ["eventId" : it.id];
            list.add(map);
            map = [:];
        }
        return list;
    }

    //Retrieves background info for all the events in a slide
    def loadAllTimelineBackgrounds(int slideId){
        def slide = Slide.get(slideId);
        def timeline = slide? Timeline.findBySlide(slide) : null;
        def events = timeline? Event.findAllByTimeline(timeline) : [:];
        def list = [];

        events.each {
            int id = it.id;
            list.add(loadEventBackgrounds(id));
        }
        return list;
    }

    //Retrieves all backgrounds for an event
    def loadEventBackgrounds(int eventId){
        def event = Event.get(eventId);
        def background =  Background.findByEvent(event);
        def map = [:];
        def list = [];

        background.each{
            map << ["description" : it["description"]];
            map << ["images": it["images"]]
			map << ["audios": it["audios"]]
			map << ["videos": it["videos"]]
            list.add(map);
            map = [:];
        }
        return list;
    }
	
	def uploadFile(params) {
		FileUploadService fus = new FileUploadService();
        String varName = "attachmentFile_" + params.bg_guid;
		return fus.upload(params."${varName}", params);
	}
	
	def retrieveFileResource(params) {
		return FileUpload.findByGuid(params.guid).data;
	}
	
	def createBackground(params, String guid) {
		def presentation = Presentation.get(params.int('id'));
		def slide = presentation.slides.find{it.slideNum == params.int('slideNum')};
		//For when we get around to making background titles editable
		//def bgTitle = params.title;
		def bgTitle = "Background";
		presentation.lock();
		
		Background background = new Background(guid: guid, title:bgTitle, description: "Insert your background info here", type:"text");
		slide.addToBackgrounds(background);
		presentation.save(flush:true);
		
		return guid;
	}
	
	//TODO: see if unused and remove
	def removeBackground(params) {
		def presentation = Presentation.get(params.int('presId'));
		def slide = presentation.slides.find{it.slideNum == params.int('slideNum')};
		
		presentation.lock();
		slide.lock();
		int index = -1;
		Background targetBg;
		for(int i = 0; i < slide.backgrounds.size(); i++) {
			Background bg = (slide.backgrounds.toArray())[i];
			if(bg.guid.equals(params.guid)) {
				index = i;
				targetBg = slide.backgrounds.toArray()[i];
			}
		}
		
		if(index != -1) {	
			slide.removeFromBackgrounds(targetBg);
			return "Success!";
		} else {
			return "Failed!";
		}
	}

    def search(content) {
        def list =  Presentation.createCriteria().list {
            not{like('title', '%' + content + '%')   }
        };
        return list
    }

    def filter(filterType) {
        Calendar to = Calendar.getInstance();
        Calendar from = Calendar.getInstance();
        //log.error(filterType == FilterType.HOUR)
        if(filterType == FilterType.HOUR)   from.add(Calendar.HOUR,-1)
        if(filterType ==FilterType.TODAY)   from.add(Calendar.DATE,-1)
        if(filterType ==FilterType.WEEK)   from.add(Calendar.WEEK_OF_YEAR,-1)
        if(filterType ==FilterType.MONTH)   from.add(Calendar.MONTH,-1)

        //log.error("from: " + from.getTime());
        //log.error("to: " + to.getTime());

        def list =  Presentation.createCriteria().list {
            not{between("creationDate", from.getTime(), to.getTime())}
        };
        return list
    }
}
