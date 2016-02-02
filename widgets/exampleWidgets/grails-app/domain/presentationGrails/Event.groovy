package presentationGrails

/**
 * Created with IntelliJ IDEA.
 * User: nkhan
 * Date: 9/3/13
 * Time: 11:07 AM
 * To change this template use File | Settings | File Templates.
 */
class Event {

    Date date;
    String description= "";
    int numBackgrounds = 0;
    static hasMany = [backgrounds: Background];
    static belongsTo = [timeline: Timeline];

    static constraints = {
        date: nullable: true;
        numBackgrounds: nullable: true;
        backgrounds: nullable: true;

    }
	
	static mapping = {
		sort 'date'
	}
}
