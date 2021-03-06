/// locations to search for config files that get merged into the main config
// config files can either be Java properties files or ConfigSlurper scripts

// grails.config.locations = [ "classpath:${appName}-config.properties",
//                             "classpath:${appName}-config.groovy",
//                             "file:${userHome}/.grails/${appName}-config.properties",
//                             "file:${userHome}/.grails/${appName}-config.groovy"]

// if(System.properties["${appName}.config.location"]) {
//    grails.config.locations << "file:" + System.properties["${appName}.config.location"]
// }

grails.project.groupId = appName // change this to alter the default package name and Maven publishing destination
grails.mime.file.extensions = true // enables the parsing of file extensions from URLs into the request format
grails.mime.use.accept.header = false
grails.mime.types = [ html: ['text/html','application/xhtml+xml'],
                      xml: ['text/xml', 'application/xml'],
                      text: 'text/plain',
                      js: 'text/javascript',
                      rss: 'application/rss+xml',
                      atom: 'application/atom+xml',
                      css: 'text/css',
                      csv: 'text/csv',
                      all: '*/*',
                      json: ['application/json','text/json'],
                      form: 'application/x-www-form-urlencoded',
                      multipartForm: 'multipart/form-data'
                    ]

// URL Mapping Cache Max Size, defaults to 5000
//grails.urlmapping.cache.maxsize = 1000

// The default codec used to encode data with ${}
grails.views.default.codec = "none" // none, html, base64
grails.views.gsp.encoding = "UTF-8"
grails.converters.encoding = "UTF-8"
// enable Sitemesh preprocessing of GSP pages
grails.views.gsp.sitemesh.preprocess = true
// scaffolding templates configuration
grails.scaffolding.templates.domainSuffix = 'Instance'

// Set to false to use the new Grails 1.2 JSONBuilder in the render method
grails.json.legacy.builder = false
// enabled native2ascii conversion of i18n properties files
grails.enable.native2ascii = true
// whether to install the java.util.logging bridge for sl4j. Disable for AppEngine!
grails.logging.jul.usebridge = true
// packages to include in Spring bean scanning
grails.spring.bean.packages = []

// request parameters to mask when logging exceptions
grails.exceptionresolver.params.exclude = ['password']


// set per-environment serverURL stem for creating absolute links
environments {
    production {
        grails.serverURL = "http://monover.42six.com"
    }
    development {
        grails.serverURL = "http://localhost:8080/${appName}"
		
		log4j = { root ->
			appenders {
					   console name: 'stdout', layout: pattern(conversionPattern: "%d [%t] %-5p %c %x - %m%n")
			}
			warn       'org.codehaus.groovy.grails.web.servlet',  //  controllers
					   'org.codehaus.groovy.grails.web.pages', //  GSP
					   'org.codehaus.groovy.grails.web.sitemesh', //  layouts
					   'org.codehaus.groovy.grails.web.mapping.filter', // URL mapping
					   'org.codehaus.groovy.grails.web.mapping', // URL mapping
					   'org.codehaus.groovy.grails.commons', // core / classloading
					   'org.codehaus.groovy.grails.plugins', // plugins
					   'org.codehaus.groovy.grails.orm.hibernate', // hibernate integration
					   'org.springframework',
					   'org.hibernate'
			debug  'com.netjay'
			root.level = org.apache.log4j.Level.INFO
    }
    }
    test {
        grails.serverURL = "http://localhost:8080/${appName}"
    }

}

def catalinaBase = System.properties.getProperty('catalina.base')
if (!catalinaBase) catalinaBase = '.'   // just in case
def logDirectory = "${catalinaBase}/logs"

// default for all environments
log4j = { root ->
	 appenders {
			 rollingFile name:'stdout', file:"${logDirectory}/${appName}.log".toString(), maxFileSize:'100KB'
			 rollingFile name:'stacktrace', file:"${logDirectory}/${appName}_stack.log".toString(), maxFileSize:'100KB'
	}


        // Enable Hibernate SQL logging with param values
        trace 'org.hibernate.type'
        debug 'org.hibernate.SQL'
        //the rest of your logging config
        // ...


	error  'org.codehaus.groovy.grails.web.servlet',  //  controllers
		   'org.codehaus.groovy.grails.web.pages', //  GSP
		   'org.codehaus.groovy.grails.web.sitemesh', //  layouts
		   'org.codehaus.groovy.grails.web.mapping.filter', // URL mapping
		   'org.codehaus.groovy.grails.web.mapping', // URL mapping
		   'org.codehaus.groovy.grails.commons', // core / classloading
		   'org.codehaus.groovy.grails.plugins', // plugins
		   'org.codehaus.groovy.grails.orm.hibernate', // hibernate integration
		   'org.springframework',
		   'org.hibernate'
	root.level = org.apache.log4j.Level.WARN
}

