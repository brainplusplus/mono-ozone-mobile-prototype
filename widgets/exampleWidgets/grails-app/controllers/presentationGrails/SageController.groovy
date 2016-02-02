package presentationGrails

import groovyx.net.http.*;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection

import java.io.InputStream;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.springframework.beans.factory.InitializingBean

import java.security.cert.X509Certificate;
import java.io.ByteArrayOutputStream
;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

class SageController implements InitializingBean {

    private String authCredentials
	
	def manifest() {
		render(contentType: "text/cache-manifest", view: "manifest")
	}

	void afterPropertiesSet() throws Exception {
		Properties props = new Properties()
        File file = new File("sage-auth.properties");

        if(!file.exists()) {
			throw new RuntimeException("Couldn't find sage-auth.properties in the class path.  Needs to be a file with sage.credentials set properly.")
        }

        InputStream iStream = new FileInputStream(file)
        props.load(iStream)

        authCredentials = props.get("sage.credentials")
    }		

    def index() { }
	
	def showTempFilePath(fName){
		def tempdir = System.getProperty("java.io.tmpdir");
		def file = fName ?: UUID.randomUUID().toString()
		if ( !(tempdir.endsWith("/") || tempdir.endsWith("\\")) )
		   tempdir = tempdir + System.getProperty("file.separator");
		return tempdir + file
	}
	
	def inputStreamToString(is){
		String inputLine
		StringBuilder sb = new StringBuilder();
		BufferedReader r = new BufferedReader(new InputStreamReader(is))
		while ((inputLine = r.readLine()) != null)
			sb.append(inputLine)
		r.close();
		return sb.toString();
	}
	
	def proxyNorthcomConnection =  {urlToGet, request=null ->
		println "**************retrieving KML**********************"
		
		String urlString = urlToGet.replace(" ", "%20");
		println urlString
		// Create a trust manager that does not validate certificate chains
				TrustManager[] trustAllCerts =
				[new X509TrustManager() {
						public java.security.cert.X509Certificate[] getAcceptedIssuers() {
							return null;
						}
						public void checkClientTrusted(X509Certificate[] certs, String authType) {
						}
						public void checkServerTrusted(X509Certificate[] certs, String authType) {
						}
					}
				] as TrustManager[];
				// Install the all-trusting trust manager
				SSLContext sc = SSLContext.getInstance("SSL");
				sc.init(null, trustAllCerts, new java.security.SecureRandom());
				HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
				// Create all-trusting host name verifier
				HostnameVerifier allHostsValid = new HostnameVerifier() {
					public boolean verify(String hostname, SSLSession session) {
						return true;
					}
				};
				// Install the all-trusting host verifier
				HttpsURLConnection.setDefaultHostnameVerifier(allHostsValid);

		URL url = new URL (urlString);
        print url.toString();
		String encoding = authCredentials.bytes.encodeBase64().toString();
		
		log.debug(encoding);
		
		HttpURLConnection connection = (HttpURLConnection) url.openConnection();
		if(urlToGet.contains("northcom")){
			connection.setRequestMethod("GET");
			connection.setDoOutput(true);
			connection.setRequestProperty  ("Authorization", "Basic " + encoding);
			if(request){
				connection.addRequestProperty("Accept", request.getHeader("Accept"))
			}
		}

		return connection
	}
	
	def relayImage = {text ->
		return text.replaceAll(/(<href>)([^<]*.png)(<\/href>)/, '<href>/presentationGrails/sage/proxyImage?id=$2</href>')
	}
	
	def proxy = {
		println 'proxy: ' + params?.id
		String kml
		def con = proxyNorthcomConnection(params?.id)
		InputStream content = (InputStream)con.getInputStream()
		kml = inputStreamToString(content)
		render(status: 200, contentType: "application/json", text: kml)
	}	
	
	
	def proxyImage = {
		println 'proxy: ' + params?.id
		def con = proxyNorthcomConnection(params?.id, request)

        response.status = 200; 
        response.contentType = 'image/png'
        response.outputStream << con.getInputStream()
	}

	def proxyLink = {
		println 'proxyLink: ' + params?.id
		def con = proxyNorthcomConnection(params?.id, request)

        if(con.contentType.contains("kml")) {
		    def kml = inputStreamToString(con.getInputStream())
			render(status: con.responseCode, contentType: con.contentType, text: relayImage(kml))
        }
        else {
            response.status = con.responseCode
            response.contentType = con.contentType
            response.outputStream << con.getInputStream()
        }
	}
	
	def proxyNorthcom = {
		println 'proxyNorthcom: ' + params?.id
		if(params?.id.contains('.kmz'))
			forward action: "retrieveKmlProxy", params: params
		else {
			String kml
			def con = proxyNorthcomConnection(params?.id)
			InputStream content = (InputStream)con.getInputStream()
			kml = inputStreamToString(content)
			render(status: 200, contentType: "application/vnd.google-earth.kml+xml", text: relayImage(kml))
		}
	}
	
	def retrieveKmlProxy = {
		println 'retrieveKmlProxy: ' + params?.id
		OutputStream outputStream = null;
		String kmz = showTempFilePath(FilenameUtils.getBaseName(params?.id))
	 
		try { 
			outputStream = new FileOutputStream(new File(kmz));
			def con = proxyNorthcomConnection(params?.id);
			InputStream content = (InputStream)con.getInputStream();
			byte[] b = IOUtils.toByteArray(content);
			outputStream.write(b)
			outputStream.close();
			content.close()
		} catch(Exception e) {
		println e.message
//			e.printStackTrace();
		}
		
		String fileContents = getKmlFromZip(kmz)

		render(status: 200, contentType: "application/vnd.google-earth.kml+xml", text: relayImage(fileContents));
	}
	
	def retrieveKml = {
		println 'retrieveKml: ' + params?.id
		OutputStream outputStream = null;
		String kmz = showTempFilePath(FilenameUtils.getBaseName(params?.id) + Integer.toString(new Random().nextInt()));

		try {
			outputStream = new FileOutputStream(new File(kmz));
			def con = proxyNorthcomConnection(params?.id)		
			InputStream content = (InputStream)con.getInputStream();
			byte[] b = IOUtils.toByteArray(content);
			outputStream.write(b)
			outputStream.close();
			content.close()
		} catch(Exception e) {
		println e.message
//			e.printStackTrace();
		}
		
		String kmlFilename = unZip(kmz);
		
		String fileContents = new File(kmlFilename).text
		render(status: 200, contentType: "application/vnd.google-earth.kml+xml", text: relayImage(fileContents));
	}
	
	/**
	 * Unzip file
	 * @param zipFile input zip file
	 * @param output zip file output folder
	 */
	private String unZip(String zipFile/*, String outputFolder*/){
 
	 byte[] buffer = new byte[1024];
 
	 String unzippedKmlFileName = "";
	 
	 try{
		//get the zip file content
		ZipInputStream zis =
			new ZipInputStream(new FileInputStream(zipFile));
		//get the zipped file list entry
		ZipEntry ze = zis.getNextEntry();
 
		while(ze!=null){
 
		   String fileName = ze.getName();
		   File newFile = new File(showTempFilePath(fileName));
 
		   println("file unzip : "+ newFile.getAbsoluteFile());
 
			//create all non exists folders
			//else you will hit FileNotFoundException for compressed folder
		   if(newFile.exists() && newFile.getParent()) {
			new File(newFile.getParent()).mkdirs();
		   }
		    
			FileOutputStream fos = new FileOutputStream(newFile);
 
			int len;
			while ((len = zis.read(buffer)) > 0) {
			   fos.write(buffer, 0, len);
			}
 
			if(fileName.endsWith("kml")) {
				unzippedKmlFileName = newFile.toString();
			}
			
			fos.close();
			ze = zis.getNextEntry();
		}
 
		zis.closeEntry();
		zis.close();
 
		log.debug("Done unzip");
 
		return unzippedKmlFileName;
		
	}catch(IOException ex){
	   ex.printStackTrace();
	}
   }
	/**
	 * Unzip file
	 * @param zipFile input zip file
	 * @param output zip file output folder
	 */
	private String getKmlFromZip(String filename){
	  String kmlText
	  try
		{
			byte[] buf = new byte[1024];
			ZipInputStream zipinputstream = null;
			ZipEntry zipentry;
			zipinputstream = new ZipInputStream(
				 new FileInputStream(filename));

			zipentry = zipinputstream.getNextEntry();
			while (zipentry != null)
			{
				//for each entry to be extracted
				String entryName = zipentry.getName();
				File newFile = new File(entryName);
				String directory = newFile.getParent();
				
				println("Getting KML from zip : "+ newFile.getAbsoluteFile());
				
				if(directory == null)
				{
					if(newFile.isDirectory())
                        zipinputstream.getNextEntry();
				}

				if(entryName.toLowerCase().endsWith(".kml")){
                    println ("Found a kml file.");
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    String line;
                    byte [] buffer = new byte[1024];
                    int numBytesRead = -1;
					StringBuilder sb = new StringBuilder();
					while ((numBytesRead = zipinputstream.read(buffer)) > 0)
						sb.append(new String(buffer, 0, numBytesRead));
					kmlText = sb.toString()
                    break;
				}
				zipentry = zipinputstream.getNextEntry();

			}//while

			zipinputstream.close();
		}
		catch (Exception e)
		{
			println("Could not read: " + e.message);
		}
		return kmlText
   }
}
