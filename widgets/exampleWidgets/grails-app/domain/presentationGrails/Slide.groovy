package presentationGrails

/**
 * Created with IntelliJ IDEA.
 * User: nkhan, echaney
 * Date: 8/30/13
 * Time: 4:57 PM
 * To change this template use File | Settings | File Templates.
 */
class Slide {
	
    String title = "";
    String assessment = "";
    String slideContent = "";
	String references = "";
	int slideNum = 0;
    static belongsTo = [presentation: Presentation];
	static hasMany = [backgrounds: Background];


	static mapping = {
		slideContent type:'text';
		assessment type:'text';
		references type:'text', column:'refs';
	}

    static constraints = {
        id: nullable:false;
        assessment: nullable:true;
        title: nullable:true;
		slideContent: nullable: true;
		backgrounds: nullable: true;
		references: nullable: true;
    }
}