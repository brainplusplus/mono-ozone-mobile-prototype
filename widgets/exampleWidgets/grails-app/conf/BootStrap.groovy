import presentationGrails.Template;

class BootStrap {

	def init = { servletContext ->

		//REMOVE ONCE PRESENTATIONNS CAN BE CREATED
		for(int i=10;i<15;i++)
		{
			def template = new Template();
			template.createdBy = "alerman";
			template.imagePath =  "/presentationGrails/images/" + (i-10).toString() + ".jpg";
			template.layout = "";
			template.name = "CJCS" + i.toString();
			template.type = "CJCS";
			template.save(flush:true);
			println(template.errors)
		}
	}
	def destroy = {
	}
}

