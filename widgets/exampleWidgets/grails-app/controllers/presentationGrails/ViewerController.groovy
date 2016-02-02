package presentationGrails

import groovy.json.JsonBuilder
import groovy.json.JsonOutput
import grails.converters.JSON

/**
 * Created with IntelliJ IDEA.
 * User: nkhan
 * Date: 8/29/13
 * Time: 4:27 PM
 * To change this template use File | Settings | File Templates.
 */
class ViewerController {
    def presentationService;

    def viewer = {

        render(view: 'viewer');
    }

    def index = {
       def presentationList = Presentation.findAll();
        render(view: '../common/index', model:[presentationList: presentationList,linkDestination: "viewer/viewer",editor:false]);
    }

    //Returns the presentation with the first slide
    def retrievePresentation = {
        int presentationId = params.int("id");
        def presentationMap = presentationService.loadPresentation(presentationId);

        render(contentType:"text/json"){
            presentationMap;
        };
    }

    //Returns a slide including the time line and event content
    def retrieveSlide = {
        int presentationId = params.int("id");
        int slideNum = params.int("slide");

        def slideMap = presentationService.loadSlide(presentationId, slideNum);

        int slideId = slideMap.id;
        //slideMap["timeline"] = presentationService.loadTimeline(slideId);
        //log.error(slideMap as JSON);
        JSON.use('deep')
        render slideMap as JSON
    }

    def retrieveBackgrounds = {
        /*git int slideId = params.int("id");
        def backgroundList = presentationService.loadAllTimelineBackgrounds(slideId);
        render(contentType:"text/json"){
            backgroundList;
        };*/
    }

    //Returns all presentations
    def retrieveAllPresentationTitles = {
        def titleList = presentationService.loadAllPresentations();
        render(contentType: "text/json"){
            titleList;
        };
    }
}
