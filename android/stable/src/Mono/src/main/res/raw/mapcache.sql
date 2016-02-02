CREATE TABLE mapcache (guid TEXT, tileData BLOB, timeStamp NUMERIC);
CREATE INDEX maptilehash
ON mapcache (guid);