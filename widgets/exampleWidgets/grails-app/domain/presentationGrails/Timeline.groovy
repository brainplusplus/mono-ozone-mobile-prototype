package presentationGrails

/**
 * Created with IntelliJ IDEA.
 * User: nkhan
 * Date: 8/30/13
 * Time: 4:31 PM
 * To change this template use File | Settings | File Templates.
 */
class Timeline {
	
	
    Slide slide;
    static belongsTo = [slide: Slide];
    static hasMany = [events: Event];

    static constraints = {
        slide: nullable: true;
        events:nullable: true;
    }

}
