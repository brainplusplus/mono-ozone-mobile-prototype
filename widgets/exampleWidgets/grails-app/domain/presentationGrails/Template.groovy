package presentationGrails

class Template {
	
	int id
	String createdBy
	String name
	//Type enum?
	String type
	String imagePath
	String layout
	
    static constraints = {
		id: nullable:false;
		createdBy: nullable:false;
		name: nullable:false;
		type: nullable:false;
		thumbnail: nullable:false;
		layout: nullable:false;
    }
}
