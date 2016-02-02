dataSource {
	pooled = true
	driverClassName = "org.h2.Driver"
	username = "sa"
	password = ""
    //logSql = true;
}
//grails{
//	mongo {
//		host = "monover"
//		port = 27017
//		username = ""
//		password = ""
//		databaseName = "presentation"
//	}
//}

hibernate {
	cache.use_second_level_cache = true
	cache.use_query_cache = true
	cache.provider_class = 'net.sf.ehcache.hibernate.EhCacheProvider'
}
// environment specific settings
environments {
	development {
		dataSource {
			dbCreate = "update" // one of 'create', 'create-drop','update'

			url = "jdbc:h2:file:prodDbpresentation"
		}
	}
	test {
		dataSource {
			dbCreate = "update"

			url = "jdbc:h2:file:prodDbpresentation"
		}
	}
	production {
		dataSource {
			dbCreate = "update"
			url = "jdbc:h2:file:prodDbpresentation"
		}
	}
}
