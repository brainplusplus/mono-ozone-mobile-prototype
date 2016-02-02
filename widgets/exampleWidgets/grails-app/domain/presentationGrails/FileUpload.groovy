package presentationGrails

class FileUpload {
	String guid;
    byte[] data;
    String fileType;
	String type;
    Background bg;
	
	static mapping = {
		fileType type: "text"
	}

    //static belongsTo = [presentation: Presentation]
    static constraints = {
        data(maxSize: 1073741824 /* 1GB */)
    }
}