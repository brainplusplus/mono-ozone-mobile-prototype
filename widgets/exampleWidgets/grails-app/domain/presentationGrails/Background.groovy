package presentationGrails

/**
 * Created with IntelliJ IDEA.
 * User: nkhan, echaney
 * Date: 9/3/13
 * Time: 2:23 PM
 * To change this template use File | Settings | File Templates.
 */
class Background {
	String guid;
    String description;
	String type = "text";
	String title = "Background";
	
	Background(guid) {
		this.guid = guid;
	}
	
	Background(guid, title, description, type) {
		this.guid = guid;
		this.title = title;
		this.description = description;
		this.type = type;
	}

    static belongsTo = [slide: Slide];
    static hasMany = [images:ImageUpload, audios:AudioUpload, videos:VideoUpload];
	
	static mapping = {
		id generator:'increment'
		description type:'text'
        images cascade: 'all-delete-orphan'
		audios cascade: 'all-delete-orphan'
		videos cascade: 'all-delete-orphan'
    }

    static constraints = {
		id: nullable:false;
		title: nullable: false;
        description: nullable: true;
		guid: nullable: false;
		type: nullable: true;
    }
}
