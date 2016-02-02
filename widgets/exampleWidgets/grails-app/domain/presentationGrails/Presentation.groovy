package presentationGrails

class Presentation {

	int id
    String title = "";
    String classification = "";
    String references = "";
    String state = "new";
    int totalSlides = 0;
    Date creationDate = Calendar.getInstance().getTime();

    static hasMany = [slides: Slide];
	
	static constraints = {
		id: nullable:false;
		references: nullable:true;
		title: nullable:true;
		state: nullable:false;
        classification: nullable: true;
	    totalSlides: nullable: true;
        creationDate: nullable: false;
    }


    static mapping = {
        references column: "refs"
    }

}
