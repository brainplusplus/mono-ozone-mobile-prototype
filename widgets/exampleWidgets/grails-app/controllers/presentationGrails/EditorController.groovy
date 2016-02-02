package presentationGrails

import presentationGrails.Template;
import presentationGrails.Presentation;

class EditorController {

	def presentationService;

	def index = {
		def templateList = Template.findAll();
		def presentationList = Presentation.findAll();
		render (view:'../common/index', model:[templateList:templateList,presentationList:presentationList,linkDestination:"editor/edit",editor:true])
	}
	
	def createPresentation = {
		def presentation = presentationService.create(params.presentationTitle);
		render presentation.id;
	}

	def edit = {
		if(params.id) {
			def presentation = presentationService.getPresentation(params.id);
			render (view:'edit',model:[pres:presentation,id:presentation.id,title:presentation.title,slideNum:1])
		}else {
			def presentation = presentationService.create(params.presentationTitle);
			render (view:'edit', model:[slideNum:1,pres:presentation,id:presentation.id,backgrounds:"[]",references:"Type your content here.",title:presentation.title,assessment:"Type your content here."])
		}
	}

	def create = {

		for(int i=10;i<20;i++) {
			def template = new Template();
			template.createdBy = "alerman";
			template.imagePath = params.path + (i-10).toString() + ".jpg";
			template.layout = "";
			template.name = params.name + i.toString();
			template.type = params.type;
			template.save(flush:true);
			println(template.errors)
		}
		render "OK";
	}

	def addSlide = {
		def slide = presentationService.addSlide(params);
		render(template:'slideBlob', bean:slide);
	}

	def saveEdited = {		
		render presentationService.updatePresentation(params);
	}
	
	def createGUID = {
		render UUID.randomUUID() as String;
	}
	
	def createBackground = {
		render presentationService.createBackground(params, UUID.randomUUID() as String);
	}
	
	def removeBackground = {
		render presentationService.removeBackground(params);
	}
	
	def uploadFile = {
		render presentationService.uploadFile(params);
	}
	
	def retrieveSlide = {
		def slide = presentationService.loadSlide(params.int('id'), params.int('slideNum'));
		render(template:'slideEdit', bean: slide)
	}
	
	def retrieveFileResource = {
		render presentationService.getFileResource(params);
	}
}
