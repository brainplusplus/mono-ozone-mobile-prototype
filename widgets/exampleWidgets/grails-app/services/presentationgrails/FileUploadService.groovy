package presentationgrails

import java.io.File;
import java.io.FileInputStream;

import groovyx.net.http.*;



import org.apache.commons.io.FileUtils;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.tomcat.jni.User;
import org.apache.poi.hsmf.*;



import org.springframework.web.context.request.RequestContextHolder
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import presentationGrails.AudioUpload
import presentationGrails.FileUpload
import presentationGrails.ImageUpload
import presentationGrails.Presentation
import presentationGrails.Background
import presentationGrails.VideoUpload

class FileUploadService {

	static transactional = false

	/**
	 * Called to upload a file.  If the file is complete, the file is sent to the datastore, otherwise
	 * the partial file is saved locally
	 * @param file The uploaded file
	 * @param uploadParams Additional parameters for uploading the file
	 * @return A string result
	 */


	String upload(MultipartFile multipartFile, uploadParams = [:]) {
		File  file = File.createTempFile(multipartFile.originalFilename,"")
        OutputStream outputStream = new FileOutputStream(file);
        IOUtils.copy(multipartFile.getInputStream(), outputStream);
        outputStream.close();
			def presId = uploadParams["presId"] as String;
			def guid = uploadParams["guid"] as String;
			def type = uploadParams["type"] as String;
			def fileType = uploadParams["fileType"] as String;
			
			//writeFileUploadToDisk(file, presId, guid, fileType);
            def fileUpload;
			if(type.equals("image")) {
				fileUpload = new ImageUpload();
			} else if(type.equals("audio")) {
				fileUpload = new AudioUpload();
			} else if(type.equals("video")) {
				fileUpload = new VideoUpload();
			}
			
			if(fileUpload == null) {
				return null;
			}
			
            def background = Background.findByGuid(uploadParams.bg_guid);
            fileUpload.fileType = fileType;
			fileUpload.type = type;
            fileUpload.guid = guid;
            fileUpload.data = file.getBytes();
            fileUpload.bg = background;
            fileUpload.save(flush:true, failOnError:true);
			return guid;
	}
}