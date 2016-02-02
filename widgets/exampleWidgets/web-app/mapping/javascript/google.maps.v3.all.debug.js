/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4, unparam: true */
/*global $, console, setTimeout, parse: true, loadKml: true, setInterval, clearInterval, setTimeout, clearTimeout, externalStylesLoaded, fetchExternalStyles, document, window, util, jc2cui*/

// JC2CUI KML Parser
// Some code based in part on ideas found in geoxml parser http://code.google.com/p/geoxml3/

// TBD - Much duplicate code as many "objects" have common attributes (e.g. visibility, region)
// Also some code using generic kml->object conversion which is wasteful as we carry around useless
// attributes
// Also some code using loops through child elements vs others using getElementByTagName - need to benchmark and decide which is faster - in cases where getElementByTagName is a possibility (its recursive - not shallow) 

//TBD - NetworkLinkControl updates (e.g. SAGE - (U) USSTRATCOM Satellite Database)
//    - gx:Track ?
//    - others?

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.kmlParser = (function () {
    "use strict";

    // Supported settings:
    // proxy - proxy to use to fetch (possibly) cross domain kml. If none passed in, no proxy is used
    // region - custom region processor (e.g. google.maps.LatLngBounds)
    // isRegionActive - custom function to determine whether a particular region is currently active
    // formatView - custom function to format a viewFormat string (Link)
    // marker - custom marker processor (e.g. Extended google.maps.Marker). If none passed in no marker created
    // polyline - custom marker processor (e.g. Extended google.maps.Polyline). If none passed in no polyline created
    // polygon - custom marker processor (e.g. Extended google.maps.Polygon). If none passed in no polygon created
    // screenOverlay - custom screen overlay processor (or return null). If none passed in, default screen overlay constructed - see Container
    // container - jQuery selector for element to render screen overlays into if using default screen overlays
    // groundOverlay - custom ground overlay processor. If none passed in, no ground overlay created
    // parseCallback - callback called whenever a top level "document" is parsed (even if network link)
    // containerRemoved - callback whenever a container is removed
    // refreshInfoWindow - called when a placemark is refreshed (e.g interval loaded network link) and that placemark is currently the one being
    //                     looked at in the infowindow (probably to expensive to call for all)
    var defaults = {
            proxy: '',
            maxFileSize: 25, // mb
            maxPlacemarks: 75000
        },
        settings,
        externalStyles = {},
        supportsPointerEvents,
        maxConcurrentLoads = 5,
        currentLoads = 0,
        waitingToLoad = 0,
        currentlyParsing,
        waitingToParse = 0,
        globalLoadLargeFile,
        globalLoadMorePlacemarks,
        waitingForUser,
        totalEntities = 0,
        totalFileSize = 0,
        nextId = 0;

    // borrowed from modernizr - TBD - include modernizr and never do browser sniffing
    function browserSupportsPointerEvents() {
        if (supportsPointerEvents === undefined) {
            var element = document.createElement('x'),
                documentElement = document.documentElement,
                getComputedStyle = window.getComputedStyle,
                supports;
            if (element.style.pointerEvents === undefined) {
                supportsPointerEvents = false;
            } else {
                element.style.pointerEvents = 'auto';
                element.style.pointerEvents = 'x';
                documentElement.appendChild(element);
                supports = getComputedStyle && getComputedStyle(element, '').pointerEvents === 'auto';
                documentElement.removeChild(element);
                supportsPointerEvents = !!supports;
            }
        }
        return supportsPointerEvents;
    }

    function getNextId() {
        return 'a' + (++nextId).toString(); // want ids used as dom ids to start with a letter - had problems in past where non conforment ids caused issues
    }

    function getGoNoGo(id, theMessage, title, callback) {
        if (id === 0 && globalLoadLargeFile !== undefined) {
            callback(globalLoadLargeFile);
            return;
        }
        if (id === 1 && globalLoadMorePlacemarks !== undefined) {
            callback(globalLoadMorePlacemarks);
            return;
        }
        if (waitingForUser) {
            setTimeout(function () {
                getGoNoGo(id, theMessage, title, callback);
            }, 1000);
            return;
        }
        waitingForUser = true;
        if (typeof theMessage === 'function') {
            theMessage = theMessage();
        }
        var msg = $('<div>' + theMessage + '<br><br><div><input type="checkbox" id="global">Dont show again, apply to all overlays<br></div>'),
            $window = $(window),
            windowSize = { height: $window.innerHeight(), width: $window.innerWidth() },
            height = 220,
            width = 300;

        msg.dialog({
            preferredHeight: height,
            preferredWidth: width,
            height: Math.min(height, windowSize.height - 20),
            width: Math.min(width, windowSize.width - 20),
            modal: false,
            title: title,
            buttons: {
                'Yes': function () {
                    msg.dialog('close');
                    callback(true, $('#global', msg).is(':checked'));
                },
                'No': function () {
                    msg.dialog('close');
                    callback(false, $('#global', msg).is(':checked'));
                }
            },
            close: function (ev, ui) {
                waitingForUser = false;
                msg.remove();
            }
        });
    }

    // Default screen overlay implementation - Not map specific, adds screen overlays to parent container 
    // identified as container (jQuery selector) in init options
    // Pass in your own screenOverlay ctor in the init options to use it instead if desired
    function ScreenOverlay(screenOverlay) {
        var container = $(settings.container),
            img = $('<img class="screenOverlay" src=' + screenOverlay.href + '>'),
            mask,
            rotated = false,
            that = this;

        this.visibility = screenOverlay.visibility;
        this.visible = screenOverlay.visible;
        this.name = screenOverlay.name;

        this.placer = (function () {
            return function () {
                var css = {},
                    xOffset = 0,
                    yOffset = 0,
                    containerWidth,
                    containerHeight,
                    imageHeight = img[0].height,
                    imageWidth = img[0].width,
                    ratio,
                    overlayX = screenOverlay.overlayXY.x,
                    overlayY = screenOverlay.overlayXY.y;

                if (screenOverlay.screenXY) {
                    containerHeight = container.height();
                    containerWidth = container.width();
                    xOffset = screenOverlay.screenXY.x;
                    yOffset = screenOverlay.screenXY.y;

                    /*if (screenOverlay.screenXY.xunits === 'pixels') { // already good
                        xOffset = xOffset - imageWidth;
                    } else */
                    if (screenOverlay.screenXY.xunits === 'insetPixels') {
                        xOffset = containerWidth - xOffset - imageWidth;
                    } else if (screenOverlay.screenXY.xunits === 'fraction') {
                        xOffset = containerWidth * xOffset;
                    }

                    if (screenOverlay.screenXY.yunits === 'pixels') {
                        yOffset = containerHeight - yOffset;
                    } else if (screenOverlay.screenXY.yunits === 'fraction') {
                        yOffset = containerHeight * (1 - yOffset);
                    } /*else if (screenOverlay.screenXY.yunits === 'insetPixels') {
                        // already good
                    }*/
                }

                if (screenOverlay.sizeXY) {
                    /*if (screenOverlay.sizeXY.x === -1) { // already good
                    imageWidth = img.width();
                    } else*/
                    if (screenOverlay.sizeXY.x > 0) {
                        if (screenOverlay.sizeXY.xunits === 'pixels') {
                            imageWidth = screenOverlay.sizeXY.x;
                        } else if (screenOverlay.sizeXY.xunits === 'fraction') {
                            containerWidth = containerWidth || container.width();
                            imageWidth = containerWidth * screenOverlay.sizeXY.x;
                        }
                        // TBD - inset pixels ?
                    }

                    /*if (screenOverlay.sizeXY.y === -1) { // already good
                    imageHeight = img.height();
                    } else*/
                    if (screenOverlay.sizeXY.y > 0) {
                        if (screenOverlay.sizeXY.yunits === 'pixels') {
                            imageHeight = screenOverlay.sizeXY.y;
                        } else if (screenOverlay.sizeXY.yunits === 'fraction') {
                            containerHeight = containerHeight || container.height();
                            imageHeight = containerHeight * screenOverlay.sizeXY.y;
                        }
                        // TBD - inset pixels ?
                    }

                    if (screenOverlay.sizeXY.x === 0 && screenOverlay.sizeXY.y !== 0) {
                        ratio = img[0].width / img[0].height;
                        imageWidth = imageHeight * ratio;
                    }
                    if (screenOverlay.sizeXY.y === 0 && screenOverlay.sizeXY.x !== 0) {
                        ratio = img[0].width / img[0].height;
                        imageHeight = imageWidth / ratio;
                    }

                    if (imageWidth) {
                        css.width = imageWidth;
                    }
                    if (imageHeight) {
                        css.height = imageHeight;
                    }
                }

                if (screenOverlay.overlayXY) {
                    if (screenOverlay.overlayXY.xunits === 'pixels') {
                        overlayX = -overlayX;
                    } else if (screenOverlay.overlayXY.xunits === 'insetPixels') {
                        overlayX = -(imageWidth - overlayX);
                    } else if (screenOverlay.overlayXY.xunits === 'fraction') {
                        overlayX = -imageWidth * overlayX;
                    }

                    if (screenOverlay.overlayXY.yunits === 'pixels') {
                        overlayY = -imageHeight + overlayY;
                    } else if (screenOverlay.overlayXY.yunits === 'insetPixels') {
                        overlayY = -overlayY;
                    } else if (screenOverlay.overlayXY.yunits === 'fraction') {
                        overlayY = -imageHeight * (1 - overlayY);
                    }
                    xOffset += overlayX;
                    yOffset += overlayY;
                }

                if (xOffset !== 0) {
                    css.left = xOffset + 'px';
                }

                if (yOffset !== 0) {
                    css.top = yOffset + 'px';
                }

                img.css(css);

                if (mask) {
                    mask.css(css);
                }

                if (screenOverlay.rotation && !rotated) {
                    rotated = true;
                    // rotation is 0 - 180 and 0 - -180
                    if (screenOverlay.rotation < 0) {
                        screenOverlay.rotation = -screenOverlay.rotation;
                    } else {
                        screenOverlay.rotation = 360 - screenOverlay.rotation;
                    }
                    img.rotate(screenOverlay.rotation);
                }

                // Need to be visible until placed or we may get incorrect width and height (depending on browser)
                // using opacity 0 as way to not see image before placed
                if (!that.visible) {
                    that.setVisible(false);
                }
                img.css('opacity', 1);
            };
        }());
        img.css('opacity', 0); // // Need to be visible until placed or we may get incorrect width and height (depending on browser) using opacity 0 as way to not see image before placed
        img.load(this.placer);

        this.image = img.appendTo(container);

        if (!browserSupportsPointerEvents()) {
            mask = $('<span class="screenOverlay"></span>');
            mask.css({ 'background-color': '#F5F5F5', opacity: 0.3, 'z-index': 0 });
            this.mask = mask.appendTo(container);
        }
        this.internalId = getNextId();
    }

    ScreenOverlay.prototype.remove = function () {
        this.image.remove();
        if (this.mask) {
            this.mask.remove();
        }
    };

    ScreenOverlay.prototype.setVisible = function (visible, setVisibility) {
        var parent;
        this.visible = visible;
        if (setVisibility) {
            this.visibility = visible;
            if (visible) { // parent flag must be set (but not recurse to children) or parents children may not be visible on refresh (kml child visibility ignored if parent visibility not set)
                parent = this.parent;
                while (parent && !parent.visibility) {
                    parent.visibility = true;
                    parent = parent.parent;
                }
            }
        }
        if (visible) {
            this.image.show();
            if (this.mask) {
                this.mask.show();
            }
        } else {
            this.image.hide();
            if (this.mask) {
                this.mask.hide();
            }
        }
    };

    ScreenOverlay.prototype.extendBounds = function (bounds) { return; };

    // Feature - Holds n markers, polylines, polygons (Single Placemark but may be multi geometry), OR a single ground overlay
    function Feature(parent) {
        this.internalId = getNextId();
        this.parent = parent;
        this.features = [];
    }

    Feature.prototype.remove = function () {
        var i;
        this.removed = true;
        for (i = 0; i < this.features.length; i++) {
            this.features[i].removeFromMap();
        }
        if (jc2cui.mapWidget.infoWindow && jc2cui.mapWidget.infoWindow.getMapItem() && jc2cui.mapWidget.infoWindow.getMapItem().internalId === this.internalId) {
            jc2cui.mapWidget.infoWindow.close();
        }
        totalEntities -= Math.max(1, this.features.length); // Counts for at least one entity - the placemark - even if no actual feature created
    };

    Feature.prototype.setVisible = function (visible, setVisibility) {
        var parent,
            i;
        this.visible = visible;
        if (setVisibility) {
            this.visibility = visible;
            if (visible) { // parent flag must be set (but not recurse to children) or parents children may not be visible on refresh (kml child visibility ignored if parent visibility not set)
                parent = this.parent;
                while (parent && !parent.visibility) {
                    parent.visibility = true;
                    parent = parent.parent;
                }
            }
        }
        for (i = 0; i < this.features.length; i++) {
            this.features[i].setVisible(visible);
        }
        if (!visible && jc2cui.mapWidget.infoWindow && jc2cui.mapWidget.infoWindow.getMapItem() && jc2cui.mapWidget.infoWindow.getMapItem().internalId === this.internalId) {
            jc2cui.mapWidget.infoWindow.close();
        }
    };

    Feature.prototype.getBounds = function () {
        var bounds;
        if (settings.bounds) {
            bounds = settings.bounds();
            this.extendBounds(bounds);
        }
        return bounds;
    };

    Feature.prototype.extendBounds = function (bounds) {
        var i;
        for (i = 0; i < this.features.length; i++) {
            this.features[i].extendBounds(bounds);
        }
    };

    Feature.prototype.getAllVisiblePlacemarks = function (markers) {
        markers = markers || [];

        $.each(this.features, function (index, marker) {
            if (marker.getVisible && marker.getVisible()) {
                markers.push(marker);
            }
        });
        return markers;
    };

    // Container - holds other containers, placemarks, ground overlays, screen overlays, and networkLinks
    function Container(parent, notAnEntity) {
        if (!notAnEntity) {
            ++totalEntities;
        }
        this.internalId = getNextId();
        this.containers = []; // should probably not use raw array. Current 'design' requires children to be pushed on via parent argument in ctor.
        this.features = [];
        this.screenOverlays = [];
        this.viewSensitiveFeatures = []; // Any features with regions or icons with refresh rules - for efficiency when updating view. These features are also in features list
        this.visibility = true;

        if (parent) {
            this.parent = parent;
            parent.containers.push(this);

            if (parent.maintainState) {
                this.maintainState = true;
                this.idMap = {};
                this.nameMap = {};
            }
            this.loadMorePlacemarks = parent.loadMorePlacemarks; // If user already answered this on parent dont ask again on child - but we will still ask on large file size
        }
    }

    Container.prototype.getAllPlacemarks = function (markers) {
        var i;
        markers = markers || [];
        for (i = 0; i < this.containers.length; i++) {
            this.containers[i].getAllPlacemarks(markers);
        }
        for (i = 0; i < this.features.length; i++) {
            $.merge(markers, this.features[i].features);
        }
        return markers;
    };

    Container.prototype.getAllVisiblePlacemarks = function (markers) {
        var i;
        markers = markers || [];
        for (i = 0; i < this.containers.length; i++) {
            this.containers[i].getAllVisiblePlacemarks(markers);
        }

        for (i = 0; i < this.features.length; i++) {
            this.features[i].getAllVisiblePlacemarks(markers);
        }
        return markers;
    };

    Container.prototype.remove = function () {
        var i;
        --totalEntities;
        this.removed = true;
        if (this.fileSize) {
            totalFileSize -= this.fileSize;
        }
        for (i = 0; i < this.containers.length; i++) {
            this.containers[i].remove();
        }
        for (i = 0; i < this.features.length; i++) {
            this.features[i].remove();
        }
        for (i = 0; i < this.screenOverlays.length; i++) {
            this.screenOverlays[i].remove();
            --totalEntities;
        }
        if (settings.containerRemoved) {
            settings.containerRemoved(this);
        }
    };

    Container.prototype.setVisible = function (visible, setVisibility) {
        var parent,
            i;
        this.visible = visible;
        if (setVisibility) {
            this.visibility = visible;
            if (visible) { // parent flag must be set (but not recurse to children) or parents children may not be visible on refresh (kml child visibility ignored if parent visibility not set)
                parent = this.parent;
                while (parent && !parent.visibility) {
                    parent.visibility = true;
                    parent = parent.parent;
                }
            }
        }
        for (i = 0; i < this.containers.length; i++) {
            this.containers[i].setVisible(visible, setVisibility);
        }
        for (i = 0; i < this.features.length; i++) {
            this.features[i].setVisible(visible, setVisibility);
        }
        for (i = 0; i < this.screenOverlays.length; i++) {
            this.screenOverlays[i].setVisible(visible, setVisibility);
        }
    };

    Container.prototype.extendBounds = function (bounds) {
        var i;
        for (i = 0; i < this.containers.length; i++) {
            this.containers[i].extendBounds(bounds);
        }
        for (i = 0; i < this.features.length; i++) {
            this.features[i].extendBounds(bounds);
        }
    };

    // No - If a parent region gets turned on/off it will do all children.
    // Only a child with its own region need be handled separately
    /*Container.prototype.getRegion = function () {
    var elem = this;
    while (elem) {
    if (elem.region) {
    return elem.region;
    }
    elem = elem.parent;
    }
    };*/

    function createRefreshFeatureFunc(feature) {
        return setTimeout(function () {
            if (feature.features.length) {
                feature.features[0].refreshIcon(feature);
            }
        }, feature.icon.viewRefreshTime);
    }

    Container.prototype.onViewUpdate = function (bounds) {
        var i,
            regionActive,
            feature;
        if (this.region && settings.isRegionActive) {
            regionActive = settings.isRegionActive(this.region);
            if (this.visibility && regionActive !== this.visible) {
                this.setVisible(regionActive);
            }
        }

        for (i = 0; i < this.containers.length; i++) {
            this.containers[i].onViewUpdate(bounds);
        }

        if (settings.isRegionActive) {
            for (i = 0; i < this.viewSensitiveFeatures.length; i++) {
                feature = this.viewSensitiveFeatures[i];
                if (feature.region) {
                    regionActive = settings.isRegionActive(feature.region);
                    if (feature.visibility && regionActive !== feature.visible) {
                        feature.setVisible(regionActive);
                    }
                }
                if (feature.icon) {
                    if (feature.icon.viewRefreshMode === 'onStop' || feature.icon.viewRefreshMode === 'onRequest') {
                        clearTimeout(feature.stopRefresh);
                        feature.stopRefresh = createRefreshFeatureFunc(feature);
                    }
                }
            }
        }
    };

    Container.prototype.getAllContainers = function (containers) {
        var i;
        containers = containers || [];
        for (i = 0; i < this.containers.length; i++) {
            this.containers[i].getAllContainers(containers);
        }
        $.merge(containers, this.containers);
        return containers;
    };

    Container.prototype.getAllFeatures = function (features) {
        var i;
        features = features || [];
        for (i = 0; i < this.containers.length; i++) {
            this.containers[i].getAllFeatures(features);
        }
        $.merge(features, this.features);
        return features;
    };

    Container.prototype.getAllScreenOverlays = function (screenOverlays) {
        var i;
        screenOverlays = screenOverlays || [];
        for (i = 0; i < this.containers.length; i++) {
            this.containers[i].getAllScreenOverlays(screenOverlays);
        }
        $.merge(screenOverlays, this.screenOverlays);
        return screenOverlays;
    };

    // Everything a container has + interval timers that reload network links
    // Also custom view update code to load new links as appropiate
    function NetworkLink() {
        Container.apply(this, arguments);
        this.intervals = [];
        this.loaded = false;
    }

    NetworkLink.prototype = new Container(null, true); // or can we just do Container.prototype ????

    NetworkLink.prototype.remove = function () {
        var i;
        Container.prototype.remove.call(this); //  Is this a valid way to call super?
        for (i = 0; i < this.intervals.length; i++) {
            clearInterval(this.intervals[i]);
        }
    };

    NetworkLink.prototype.onViewUpdate = function (bounds) {
        var that = this,
            time;
        if (((!this.link.viewRefreshMode || this.link.viewRefreshMode === 'never') && (!this.region || this.loaded)) ||
                (this.link.viewRefreshMode === 'onRegion' && this.loaded)) {
            Container.prototype.onViewUpdate.apply(this, arguments); //  Is this a valid way to call super?
        } else {
            if ((this.region && settings.isRegionActive && (this.link.viewRefreshMode === 'onRegion' || !this.loaded))) {
                if (settings.isRegionActive(this.region)) {
                    this.setVisible(this.visibility);
                    this.loaded = true;
                    this.loadedDoc = loadKml(this.link.getHref(), this.visible, this, function (result) {
                        var theLoadedDoc = result.doc || this.loadedDoc;
                        that.loadLargeFile = theLoadedDoc.loadLargeFile;
                        that.loadMorePlacemarks = theLoadedDoc.loadMorePlacemarks;
                    });
                    this.loadedDoc.visibility = this.visibility;
                }
            } else if (this.link.viewRefreshMode === 'onStop' || this.link.viewRefreshMode === 'onRequest') { // for now 'auto requesting' for onRequest links after 4 seconds each time map moves
                clearTimeout(this.stopRefresh);
                that = this;
                time = this.link.viewRefreshMode === 'onRequest' ? 3000 : Math.max(0, this.link.viewRefreshTime - 1000); // we already waited a second before onViewUpdate was called - but dont become negative...
                this.stopRefresh = setTimeout(function () {
                    if (this.region && (!settings.isRegionActive || !settings.isRegionActive(this.region))) {
                        return;
                    }
                    var reload = loadKml(that.link.getHref(), that.loadedDoc.visible, that, function (result) {
                        var i,
                            theReloadedDoc = reload || result.doc;
                        // dont remove old until successfully loaded new to help reduce flicker
                        that.loadedDoc.remove();
                        for (i = 0; i < that.containers.length; i++) { // Can we change to object keyed by id instead of array ? Or is there only ever going to be one and we can simply use [0] index?
                            if (that.containers[i] === that.loadedDoc) {
                                //that.containers.splice(i, 1, doc);
                                that.containers.splice(i, 1);
                                that.loadedDoc = theReloadedDoc;
                                break;
                            }
                        }
                        that.loadLargeFile = theReloadedDoc.loadLargeFile;
                        that.loadMorePlacemarks = theReloadedDoc.loadMorePlacemarks;
                    }, null, that.loadedDoc);
                    reload.visibility = that.loadedDoc.visibility;
                }, time);
            }
        }
    };

    function init(options) {
        settings = $.extend(true, {}, defaults, options);
    }

    function getTextValue(node) {
        var text = '',
            i;
        if (node) {
            if (node.nodeType === 2 || node.nodeType === 3 || node.nodeType === 4) { // attribute, text, cdata
                text = node.nodeValue;
            } else if (node.nodeType === 1 || node.nodeType === 9 || node.nodeType === 11) { // element, document, document fragment
                for (i = 0; i < node.childNodes.length; ++i) {
                    text += getTextValue(node.childNodes[i]);
                }
            }
        }
        return $.trim(text);
    }

    function findAndGetTextValue(node, tag) {
        if (node) {
            var childNode = node.getElementsByTagName(tag);
            if (childNode.length) {
                return getTextValue(childNode[0]);
            }
        }
    }

    function getBooleanValue(node, defVal) {
        var text = getTextValue(node);
        if (!text.length) {
            return defVal || false;
        }
        return parseInt(text, 10) !== 0;
    }

    function findAndGetBooleanValue(node, tag, defVal) {
        if (node) {
            var childNode = node.getElementsByTagName(tag);
            if (childNode.length) {
                return getBooleanValue(childNode[0], defVal);
            }
        }
        return defVal;
    }

    // generic xml to object inflator. probably shouldnt exist as we waste lots of time (and memory) parsing nodes we just ignore anyway
    function parseNode(xml) {
        var obj = {},
            attribute,
            i,
            childNode,
            childName,
            child;

        if (xml.nodeType === 1 || xml.nodeType === 9 || xml.nodeType === 11) { // element, document, document fragment
            // do attributes
            if (xml.attributes.length > 0) {
                for (i = 0; i < xml.attributes.length; i++) {
                    attribute = xml.attributes.item(i);
                    obj[attribute.nodeName] = getTextValue(attribute);
                }
            }
        } else if (xml.nodeType === 2 || xml.nodeType === 3 || xml.nodeType === 4) { // attribute, text, cdata
            obj = getTextValue(xml);
        }

        // do children
        if (xml.hasChildNodes()) {
            // special case , only 1 child and its attribute, text, or cdata
            if (xml.childNodes.length === 1 && (xml.childNodes[0].nodeType === 2 || xml.childNodes[0].nodeType === 3 || xml.childNodes[0].nodeType === 4)) {
                obj = getTextValue(xml.childNodes[0]);
            } else {
                for (i = 0; i < xml.childNodes.length; i++) {
                    childNode = xml.childNodes.item(i);
                    if (childNode.nodeType === 3 || childNode.nodeType === 8) { // Useless text, probably extraneous new lines OR comment
                        continue;
                    }
                    childName = childNode.nodeName;
                    child = parseNode(childNode);
                    if (!obj[childName]) {
                        obj[childName] = child;
                    } else {
                        if (!$.isArray(obj[childName])) {
                            obj[childName] = [obj[childName]];
                        }
                        obj[childName].push(child);
                    }
                }
            }
        }

        return obj;
    }

    function parseXY(node) {
        return {
            x: parseFloat(node.getAttribute('x')),
            y: parseFloat(node.getAttribute('y')),
            xunits: node.getAttribute('xunits'),
            yunits: node.getAttribute('yunits')
        };
    }

    function parseLatLonBox(node) {
        return {
            north: parseFloat(findAndGetTextValue(node, 'north')),
            south: parseFloat(findAndGetTextValue(node, 'south')),
            east: parseFloat(findAndGetTextValue(node, 'east')),
            west: parseFloat(findAndGetTextValue(node, 'west'))
        };
    }

    function parseViewer(node) {
        var alt = parseFloat(findAndGetTextValue(node, 'altitude')),
            altM = findAndGetTextValue(node, 'altitudeMode'),
            rng = parseFloat(findAndGetTextValue(node, 'range'));

        // range will be interpreted as altitude when it is present in a LookAt tag:
        if (!isNaN(rng)) {
            alt = rng; // even when altitude included?
        } else if (isNaN(alt)) {
            alt = 0;
        }

        if (!altM || !altM.length) {
            altM = 'relativeToGround';
        }
        return {
            latitude: parseFloat(findAndGetTextValue(node, 'latitude')),
            longitude: parseFloat(findAndGetTextValue(node, 'longitude')),
            altitude: alt,
            altitudeMode: altM,
            range: rng
        };
    }

    function getViewer(node) {
        // Can only have one of Camera or LookAt:
        var childNodes = node.getElementsByTagName('Camera');
        if (childNodes.length) {
            return parseViewer(childNodes[0]);
        }
        childNodes = node.getElementsByTagName('LookAt');
        if (childNodes.length) {
            return parseViewer(childNodes[0]);
        }
        // undefined return
    }

    function parseRegion(node) {
        if (node.childNodes.length) { // Have seen kml with empty region nodes!!!
            var region = {
                latLonAltBox: parseLatLonBox(node),
                lod: {
                    minLodPixels: parseFloat(findAndGetTextValue(node, 'minLodPixels')),
                    maxLodPixels: parseFloat(findAndGetTextValue(node, 'maxLodPixels')) || -1
                }
            };
            if (settings.region) {
                return settings.region(region);
            }
            return region;
        }
    }

    function parseExtendedData(node) {
        // For now only processing Data element
        var childNodes = node.getElementsByTagName('Data'),
            i,
            data = {},
            name,
            value;

        if (childNodes.length) {
            for (i = 0; i < childNodes.length; i++) {
                name = childNodes[i].getAttribute('name');
                value = getTextValue(childNodes[i].getElementsByTagName('value')[0]);
                data[name] = value;
            }
        }
        return data;
    }

    function IconOrLink(node) { // Icon and Link have exactly the same fields
        // Ignoring viewBoundScale and httpQuery for now
        if (node) {
            this.href = findAndGetTextValue(node, 'href');
            this.refreshMode = findAndGetTextValue(node, 'refreshMode');
            this.viewRefreshMode = findAndGetTextValue(node, 'viewRefreshMode');
            this.viewFormat = findAndGetTextValue(node, 'viewFormat');

            if (this.refreshMode === 'onInterval') {
                this.interval = parseFloat(findAndGetTextValue(node, 'refreshInterval'));
            }

            if (this.viewRefreshMode === 'onStop') {
                this.viewRefreshTime = parseFloat(findAndGetTextValue(node, 'viewRefreshTime'));
                if (isNaN(this.viewRefreshTime)) {
                    this.viewRefreshTime = 4; // default to 4 seconds as in kml spec
                }
                this.viewRefreshTime *= 1000;// store seconds as millis

                if (!this.viewFormat || !this.viewFormat.length) {
                    this.viewFormat = 'BBOX=[bboxWest],[bboxSouth],[bboxEast],[bboxNorth]';
                }
            }
        }
    }

    IconOrLink.prototype.getHref = function getHref() {
        var urlToUse = this.href || '';
        if (this.viewFormat && this.viewFormat.length && settings.formatView) {
            if (urlToUse.indexOf('?') < 0) {
                urlToUse += '?';
            } else {
                urlToUse += '&';
            }
            urlToUse += settings.formatView(this.viewFormat);
        }
        return urlToUse;
    };

    function randomColor(rr, gg, bb) {
        var col = [rr, gg, bb],
            i,
            c;
        for (i = 0; i < 2; i++) {
            c = col[i];
            if (!c) {
                c = 'ff';
            }
            c = Math.round(Math.random() * parseInt(rr, 16)).toString(16);
            if (c.length === 1) {
                c = '0' + c;
            }
            col[i] = c;
        }

        return '#' + col[0] + col[1] + col[2];
    }

    function kmlColor(colorString, colorMode) {
        var color = {},
            aa,
            rr,
            gg,
            bb;
        colorString = colorString || 'ffffffff';

        aa = colorString.substr(0, 2);
        bb = colorString.substr(2, 2);
        gg = colorString.substr(4, 2);
        rr = colorString.substr(6, 2);

        color.opacity = parseInt(aa, 16) / 256;
        color.color = (colorMode === 'random') ? randomColor(rr, gg, bb) : '#' + rr + gg + bb;
        return color;
    }

    // Parse shared styles
    // According to spec shared styles can only be in document element
    // But - have seen kml with shared styles defined on placemarks and then used in other placemarks
    // Will therefore allow styles to be defined anywhere - besides we want to be sure we parse styles before placemarks regardless of tag order
    function parseSharedStyles(kml) {
        var styles = {},
            i,
            styleNodes,
            styleNode,
            styleId,
            key,
            style,
            index,
            url;
        styleNodes = kml.getElementsByTagName('Style');
        for (i = 0; i < styleNodes.length; i++) {
            styleNode = styleNodes[i];
            styleId = styleNode.getAttribute('id');
            if (!styleId) {
                continue;
            }
            styles['#' + styleId] = parseNode(styleNode);
        }

        styleNodes = kml.getElementsByTagName('StyleMap');
        for (i = 0; i < styleNodes.length; i++) {
            styleNode = styleNodes[i];
            styleId = styleNode.getAttribute('id');
            if (!styleId) {
                continue;
            }
            key = findAndGetTextValue(styleNodes[i], 'key');
            if (key === 'normal') {
                style = findAndGetTextValue(styleNodes[i], 'styleUrl');
                if (style) {
                    index = style.indexOf('#');

                    if (index > 0) { // external style
                        url = style.substring(0, index);
                        style = style.substring(index);
                        if (externalStyles[url]) {
                            style = externalStyles[url][style];
                        }
                    } else {
                        // spec says url must have # but at least some SAGE kml doesnt!
                        if (index < 0) {
                            style = '#' + style;
                        }
                        style = styles[style];
                    }
                    if (style) {
                        styles['#' + styleId] = style;
                    } else {
                        console.log('styleMap styleUrl of #' + styleId + ' not found');
                    }
                } else {
                    style = styleNodes[i].getElementsByTagName('Style');
                    if (style.childNodes.length) {
                        styles['#' + styleId] = parseNode(style.childNodes[0]);
                    }
                }
            }
        }

        /** Temp fix for style color since using generic parseNode above **/
        $.each(styles, function (index, style) {
            if (style.LineStyle && style.LineStyle.color) {
                if (typeof style.LineStyle.color === 'string') {
                    style.LineStyle.color = kmlColor(style.LineStyle.color, style.LineStyle.colorMode);
                }
            }
            if (style.PolyStyle && style.PolyStyle.color) {
                if (typeof style.PolyStyle.color === 'string') {
                    style.PolyStyle.color = kmlColor(style.PolyStyle.color, style.PolyStyle.colorMode);
                }
            }
        });
        ///

        return styles;
    }

    // Old style KML
    // Get alternate placemark "names" - might have to do more...
    function parseSchemas(doc) {
        var placemarkNames = [],
            nodes = doc.getElementsByTagName("Schema"),
            i;
        for (i = 0; i < nodes.length; i++) {
            if (nodes[i].getAttribute("parent") === "Placemark") {
                placemarkNames.push(nodes[i].getAttribute("name"));
            }
        }
        return placemarkNames;
    }

    // fetch any external styles before attempting to render - TBD - would be nice to make this asynchronous
    function externalStylesLoaded(kml, url, i, callback) {
        return function (result) {
            externalStyles[url] = result.doc ? result.doc.styles : {};
            fetchExternalStyles(kml, i + 1, callback);
        };
    }

    function fetchExternalStyles(kml, start, callback) {
        var nodes = kml.getElementsByTagName("styleUrl"),
            i,
            styleUrl,
            index,
            url,
            doc;

        for (i = start; i < nodes.length; i++) {
            styleUrl = getTextValue(nodes[i]);
            index = styleUrl.indexOf('#');
            if (index > 0 && styleUrl.indexOf('http') === 0) {
                url = styleUrl.substring(0, index);
                if (!externalStyles[url]) {
                    doc = loadKml(url, false, null, externalStylesLoaded(kml, url, i, callback), null, null, true);
                    break;
                }
            }
        }
        if (!doc) {
            callback();
        }
    }

    // Parse a coordinate string
    function parseCoordinates(coordinatesText) {
        var path,
            coords,
            coordList = [],
            i;
        coordinatesText = coordinatesText.replace(/,\s+/g, ',');
        path = coordinatesText.split(/\s+/g);
        for (i = 0; i < path.length; i++) {
            coords = path[i].split(',');
            if (coords.length > 1) {
                coordList.push({
                    lon: parseFloat(coords[0]),
                    lat: parseFloat(coords[1]),
                    alt: parseFloat(coords[2])
                });
            }
        }
        return coordList;
    }

    function parsePlacemark(placemarkNode, parent, oldParent, doc) {
        var placemark = new Feature(parent),
            childNodes,
            markers = [],
            polylines = [],
            polygons = [],
            feature,
            i,
            j,
            style,
            coordinates,
            poly,
            paths,
            index,
            url,
            old;

        placemark.id = placemarkNode.getAttribute('id');

        // assuming this is faster then walking child nodes (and then having to parse geometries directly in placemark as well as recurse geometry parsing in multi geometry and in polygon-outerBoundaryIs and polygon-innerBoundaryIs)
        placemark.name = findAndGetTextValue(placemarkNode, 'name');
        placemark.description = findAndGetTextValue(placemarkNode, 'description');
        placemark.styleUrl = findAndGetTextValue(placemarkNode, 'styleUrl');

        childNodes = placemarkNode.getElementsByTagName('Style');
        if (childNodes.length) {
            placemark.style = parseNode(childNodes[0]);
            // temp because style parsed using generic parseNode
            if (placemark.style.LineStyle && placemark.style.LineStyle.color) {
                if (typeof placemark.style.LineStyle.color === 'string') {
                    placemark.style.LineStyle.color = kmlColor(placemark.style.LineStyle.color, placemark.style.LineStyle.colorMode);
                }
            }
            if (placemark.style.PolyStyle && placemark.style.PolyStyle.color) {
                if (typeof placemark.style.PolyStyle.color === 'string') {
                    placemark.style.PolyStyle.color = kmlColor(placemark.style.PolyStyle.color, placemark.style.PolyStyle.colorMode);
                }
            }
        }

        if (placemark.styleUrl) {
            index = placemark.styleUrl.indexOf('#');

            if (index > 0) { // external style
                url = placemark.styleUrl.substring(0, index);
                style = placemark.styleUrl.substring(index);
                if (externalStyles[url]) {
                    style = externalStyles[url][style];
                }
            } else {
                // spec says url must have # but at least some SAGE kml doesnt!
                if (index < 0) {
                    placemark.styleUrl = '#' + placemark.styleUrl;
                }
                style = doc.styles[placemark.styleUrl];
            }

            // inline style overrides shared style (but doesnt replace it)
            if (placemark.style) {
                placemark.style = $.extend(true, {}, style, placemark.style);
            } else {
                placemark.style = style;
            }
        }

        childNodes = placemarkNode.getElementsByTagName('Region');
        if (childNodes.length) {
            placemark.region = parseRegion(childNodes[0]);
        }

        childNodes = placemarkNode.getElementsByTagName('Point'); // Whether in placemark root or nested in a multi geometry
        for (i = 0; i < childNodes.length; i++) {
            if (doc.removed) {
                return;
            }
            coordinates = findAndGetTextValue(childNodes[i], 'coordinates');
            if (coordinates) {
                markers.push(parseCoordinates(coordinates));
            }
        }

        childNodes = placemarkNode.getElementsByTagName('LineString'); // Whether in placemark root or nested in a multi geometry
        for (i = 0; i < childNodes.length; i++) {
            if (doc.removed) {
                return;
            }
            coordinates = findAndGetTextValue(childNodes[i], 'coordinates');
            if (coordinates) {
                polylines.push(parseCoordinates(coordinates));
            }
        }

        // LinearRing anywhere BUT in a polygon - treat as polyline - or should we let map impl decide that?
        childNodes = placemarkNode.getElementsByTagName('LinearRing'); // Whether in placemark root or nested in a multi geometry
        for (i = 0; i < childNodes.length; i++) {
            if (doc.removed) {
                return;
            }
            if (childNodes[i].parentNode.nodeName !== 'outerBoundaryIs' && childNodes[i].parentNode.nodeName !== 'innerBoundaryIs') {
                coordinates = findAndGetTextValue(childNodes[i], 'coordinates');
                if (coordinates) {
                    // But make sure it is closed
                    if (coordinates[coordinates.length - 1].lat !== coordinates[0].lat ||
                            coordinates[coordinates.length - 1].lon !== coordinates[0].lon) {
                        coordinates.push(coordinates[0]);
                    }
                    polylines.push(parseCoordinates(coordinates));
                }
            }
        }

        // polygons - outer is first path, any others are inners (donuts or holes)
        childNodes = placemarkNode.getElementsByTagName('Polygon'); // Whether in placemark root or nested in a multi geometry
        for (i = 0; i < childNodes.length; i++) {
            if (doc.removed) {
                return;
            }
            paths = [];
            poly = childNodes[i].getElementsByTagName('outerBoundaryIs');
            coordinates = findAndGetTextValue(poly[0], 'coordinates');
            paths.push(parseCoordinates(coordinates));

            poly = childNodes[i].getElementsByTagName('innerBoundaryIs');
            for (j = 0; j < poly.length; j++) {
                coordinates = findAndGetTextValue(poly[j], 'coordinates');
                paths.push(parseCoordinates(coordinates));
            }
            polygons.push(paths);
        }

        // location to "Look:"
        placemark.viewer = getViewer(placemarkNode);

        if (parent) {
            parent.features.push(placemark);
            if (placemark.region) {
                parent.viewSensitiveFeatures.push(placemark);
            }
            if (parent.maintainState) {
                if (placemark.id) {
                    if (oldParent) {
                        old = oldParent.idMap[placemark.id];
                    }
                    parent.idMap[placemark.id] = placemark;
                } else if (placemark.name) {
                    if (oldParent) {
                        old = oldParent.nameMap[placemark.name];
                    }
                    parent.nameMap[placemark.name] = placemark;
                }
            }
        }

        // ExtendedData
        childNodes = placemarkNode.getElementsByTagName('ExtendedData');
        if (childNodes.length) {
            placemark.extendedData = parseExtendedData(childNodes[0]);
        }

        if (old) {
            placemark.visibility = old.visibility;
        }

        if (placemark.visibility === undefined) {
            placemark.visibility = findAndGetBooleanValue(placemarkNode, 'visibility', true);
        }

        placemark.visibility = placemark.visibility && parent.visibility;

        placemark.visible = placemark.visibility && (!placemark.region || (settings.isRegionActive && settings.isRegionActive(placemark.region)));

        // Translate generic features to domain specific ones
        if (settings.marker) {
            for (j = 0; j < markers.length; j++) {
                if (doc.removed) {
                    return;
                }
                feature = settings.marker(placemark, markers[j][0], doc);
                if (feature) {
                    placemark.features.push(feature);
                }
            }
        }
        if (settings.polyline) {
            for (j = 0; j < polylines.length; j++) {
                if (doc.removed) {
                    return;
                }
                feature = settings.polyline(placemark, polylines[j], doc);
                if (feature) {
                    placemark.features.push(feature);
                }
            }
        }
        if (settings.polygon) {
            for (j = 0; j < polygons.length; j++) {
                if (doc.removed) {
                    return;
                }
                feature = settings.polygon(placemark, polygons[j], doc);
                if (feature) {
                    if ($.isArray(feature)) { // some implementations cant correctly handle multi path polygons
                        $.merge(placemark.features, feature);
                    } else {
                        placemark.features.push(feature);
                    }
                }
            }
        }

        // Wait till end before letting users know currently viewed placemark was updated
        // Want to ensure any custom processing is complete (e.g generation of custom features)
        if (old) {
            if (jc2cui.mapWidget.infoWindow && jc2cui.mapWidget.infoWindow.getMapItem() && jc2cui.mapWidget.infoWindow.getMapItem().internalId === old.internalId) {
                if (settings.refreshInfoWindow) {
                    settings.refreshInfoWindow(placemark);
                }
            }
        }

        totalEntities += Math.max(1, placemark.features.length); // Counts for at least one entity - the placemark - even if no actual feature created
    }

    function parseScreenOverlay(screenOverlayNode, parent, oldParent, doc) {
        // not looping - assuming this is faster but maybe not?
        // also assuming no possible mixups. need to review
        var screenOverlay = {
                name: findAndGetTextValue(screenOverlayNode, 'name'),
                id: screenOverlayNode.getAttribute('id'),
                parent: parent
            },
            iconNode = screenOverlayNode.getElementsByTagName('Icon'),
            screenXyNode = screenOverlayNode.getElementsByTagName('screenXY'),
            overlayXyNode = screenOverlayNode.getElementsByTagName('overlayXY'),
            sizeXyNode = screenOverlayNode.getElementsByTagName('size'),
            rotationNode = screenOverlayNode.getElementsByTagName('rotation'); // NOTE: ignoring rotationXY for now.

        if (screenXyNode && screenXyNode.length) {
            screenOverlay.screenXY = parseXY(screenXyNode[0]);
        }
        if (overlayXyNode && overlayXyNode.length) {
            screenOverlay.overlayXY = parseXY(overlayXyNode[0]);
        }
        if (sizeXyNode && sizeXyNode.length) {
            screenOverlay.sizeXY = parseXY(sizeXyNode[0]);
        }
        if (iconNode && iconNode.length) {
            screenOverlay.href = findAndGetTextValue(iconNode[0], 'href');
        }
        if (rotationNode && rotationNode.length) {
            screenOverlay.rotation = parseFloat(getTextValue(rotationNode[0]));
        }

        if (parent) {
            if (parent.maintainState) {
                if (screenOverlay.id) {
                    if (oldParent && oldParent.idMap[screenOverlay.id]) {
                        screenOverlay.visibility = oldParent.idMap[screenOverlay.id].visibility;
                    }
                } else if (screenOverlay.name) {
                    if (oldParent && oldParent.nameMap[screenOverlay.name]) {
                        screenOverlay.visibility = oldParent.nameMap[screenOverlay.name].visibility;
                    }
                }
            }
        }

        if (screenOverlay.visibility === undefined) {
            screenOverlay.visibility = findAndGetBooleanValue(screenOverlayNode, 'visibility', true);
        }
        screenOverlay.visible = screenOverlay.visibility && (!parent || parent.visibility);

        if (settings.screenOverlay) {
            screenOverlay = settings.screenOverlay(screenOverlay, doc);
        } else {
            screenOverlay = new ScreenOverlay(screenOverlay);
        }
        ++totalEntities;

        // cant do this in code above as actual screenOverlay obj may change
        if (parent) {
            parent.screenOverlays.push(screenOverlay);
            if (parent.maintainState) {
                if (screenOverlay.id) {
                    parent.idMap[screenOverlay.id] = screenOverlay;
                } else if (screenOverlay.name) {
                    parent.nameMap[screenOverlay.name] = screenOverlay;
                }
            }
        }
    }

    function parseGroundOverlay(overlayNode, parent, oldParent, doc) {
        // not looping - assuming this is faster but maybe not?
        // also assuming no possible mixups. need to review
        var groundOverlay = new Feature(parent),
            color = findAndGetTextValue(overlayNode, 'color'),
            iconNode,
            regionNode;

        groundOverlay.latLonBox = {
            north: parseFloat(findAndGetTextValue(overlayNode, 'north')),
            east: parseFloat(findAndGetTextValue(overlayNode, 'east')),
            south: parseFloat(findAndGetTextValue(overlayNode, 'south')),
            west: parseFloat(findAndGetTextValue(overlayNode, 'west'))
        };
        groundOverlay.opacity = 0.5; // made up default
        groundOverlay.id = overlayNode.getAttribute('id');
        groundOverlay.name = findAndGetTextValue(overlayNode, 'name');

        iconNode = overlayNode.getElementsByTagName('Icon');
        if (iconNode.length) {
            groundOverlay.icon = new IconOrLink(iconNode[0]);
        } else {
            groundOverlay.icon = new IconOrLink();
        }
        // Opacity is embedded in color
        if (color) {
            groundOverlay.opacity = kmlColor(color).opacity;
        }

        regionNode = overlayNode.getElementsByTagName('Region');
        if (regionNode.length) {
            groundOverlay.region = parseRegion(regionNode[0]);
        }

        if (parent) {
            parent.features.push(groundOverlay);
            if (groundOverlay.region || groundOverlay.icon.viewRefreshMode === 'onStop' || groundOverlay.icon.viewRefreshMode === 'onRequest') { // for now treating on request as onStop
                parent.viewSensitiveFeatures.push(groundOverlay);
            }
            if (parent.maintainState) {
                if (groundOverlay.id) {
                    if (oldParent && oldParent.idMap[groundOverlay.id]) {
                        groundOverlay.visibility = oldParent.idMap[groundOverlay.id].visibility;
                    }
                    parent.idMap[groundOverlay.id] = groundOverlay;
                } else if (groundOverlay.name) {
                    if (oldParent && oldParent.nameMap[groundOverlay.name]) {
                        groundOverlay.visibility = oldParent.nameMap[groundOverlay.name].visibility;
                    }
                    parent.nameMap[groundOverlay.name] = groundOverlay;
                }
            }
        }

        if (groundOverlay.visibility === undefined) {
            groundOverlay.visibility = findAndGetBooleanValue(overlayNode, 'visibility', true);
        }
        groundOverlay.visible = groundOverlay.visibility && (!parent || parent.visibility) && (!groundOverlay.region || (settings.isRegionActive && settings.isRegionActive(groundOverlay.region)));
        if (settings.groundOverlay) {
            groundOverlay.features.push(settings.groundOverlay(groundOverlay, doc));
        }
        ++totalEntities;
        return groundOverlay;
    }

    function parseNetworkLink(networkLinkNode, parent, oldParent, doc) {
        var networkLink = new NetworkLink(parent),
            nodes = networkLinkNode.getElementsByTagName('Link'),
            oldNetworkLink;

        if (nodes.length) {
            networkLink.link = new IconOrLink(nodes[0]);
        } else {
            nodes = networkLinkNode.getElementsByTagName('Url'); // KML < 2.1
            if (nodes.length) {
                networkLink.link = new IconOrLink(nodes[0]);
            }
        }
        if (!networkLink.link) { // shouldnt be possible
            networkLink.link = new IconOrLink();
        }

        networkLink.maintainState = !findAndGetBooleanValue(networkLinkNode, 'refreshVisibility', false);
        networkLink.visibility = parent.visibility && findAndGetBooleanValue(networkLinkNode, 'visibility', true);
        networkLink.visible = networkLink.visibility && parent.visibility; // normal region stuff here?
        networkLink.open = findAndGetBooleanValue(networkLinkNode, 'open', false);
        networkLink.id = networkLinkNode.getAttribute('id');
        networkLink.name = findAndGetTextValue(networkLinkNode, 'name');

        if (!networkLink.name || !networkLink.name.length) {
            networkLink.name = networkLink.link.href;
        }

        if (parent.maintainState) {
            /*if (networkLink.id) {
            if (oldParent && oldParent.idMap[networkLink.id]) {
            oldNetworkLink = oldParent.idMap[networkLink.id];
            }
            parent.idMap[networkLink.id] = networkLink;
            } else if (networkLink.name) {
            if (oldParent && oldParent.nameMap[networkLink.name]) {
            oldNetworkLink = oldParent.nameMap[networkLink.name];
            }
            parent.nameMap[networkLink.name] = networkLink;
            }*/

            if (oldParent) { // always first container - may have no id or name but can still be 'found'
                oldNetworkLink = oldParent.containers[0];
            }

            if (oldNetworkLink) {
                networkLink.visibility = oldNetworkLink.visibility;
                networkLink.open = oldNetworkLink.open;
            }
        }

        nodes = networkLinkNode.getElementsByTagName('Region');
        if (nodes.length) {
            networkLink.region = parseRegion(nodes[0]);
        }

        if (networkLink.region && (!settings.isRegionActive || !settings.isRegionActive(networkLink.region))) {
            networkLink.visible = false;
            return;
        }

        // Not yet supporting refreshMode === onExpire

        // Always load once
        ++doc.remaining;
        networkLink.loaded = true;
        networkLink.loading = true;
        networkLink.loadedDoc = loadKml(networkLink.link.getHref(), networkLink.visible, networkLink, function (result) {
            --doc.remaining;
            if (!doc.remaining && doc.initialParseCompleteCallback) {
                doc.initialParseCompleteCallback({ doc: doc });
                //delete doc.remaining;
                //delete doc.initialParseCompleteCallback;
            }
            var theLoadedDoc = networkLink.loadedDoc || result.doc;
            networkLink.loadLargeFile = theLoadedDoc.loadLargeFile;
            networkLink.loadMorePlacemarks = theLoadedDoc.loadMorePlacemarks;
            networkLink.loading = false;
        });
        networkLink.loadedDoc.visibility = networkLink.visibility;
        if (networkLink.link.refreshMode === 'onInterval') {
            if (networkLink.link.interval) {
                networkLink.intervals.push(setInterval(function () {
                    if (networkLink.loading) {
                        return;
                    }
                    networkLink.loading = true;
                    var reload = loadKml(networkLink.link.getHref(), networkLink.loadedDoc.visible, networkLink, function (result) {
                        var i,
                            reloadedDoc = reload || result.doc;

                        networkLink.loading = false;
                        // dont remove old until successfully loaded new to help reduce flicker
                        networkLink.loadedDoc.remove();
                        for (i = 0; i < networkLink.containers.length; i++) { // Can we change to object keyed by id instead of array ? Or is there only ever going to be one and we can simply use [0] index?
                            if (networkLink.containers[i] === networkLink.loadedDoc) {
                                //networkLink.containers.splice(i, 1, doc);
                                networkLink.containers.splice(i, 1);
                                networkLink.loadedDoc = reloadedDoc;
                                break;
                            }
                        }
                        networkLink.loadLargeFile = reloadedDoc.loadLargeFile;
                        networkLink.loadMorePlacemarks = reloadedDoc.loadMorePlacemarks;
                    }, null, networkLink.loadedDoc);
                    reload.visibility = networkLink.loadedDoc.visibility;
                    //networkLink.containers.push(reload); // need it in parent immediately so parent removes, hides, shows, etc include it
                }, networkLink.link.interval * 1000));
            }
        }
    }

    // Need to hoist creation of recursive container parse functions out of loop
    function getContainerParseFunc(kml, parent, oldParent, doc, parseCompleteCallback, start) {
        return function () {
            parse(kml, parent, oldParent, doc, parseCompleteCallback, start);
        };
    }

    // Parse a container object (root kml, document, or folder elements)
    function parse(kml, parent, oldParent, doc, parseCompleteCallback, start) {
        ++waitingToParse;
        if (currentlyParsing) {
            setTimeout(function () {
                --waitingToParse;
                parse(kml, parent, oldParent, doc, parseCompleteCallback, start);
            }, (waitingToParse * 10)); // Try to get FIFO
            return;
        }
        --waitingToParse;
        currentlyParsing = true;
        var block = 100,
            i,
            j,
            childNode,
            childName,
            child,
            wasContainer,
            nameNode,
            oldChild;
        start = start || 0;

        // Parse a block of child nodes
        try {
            for (i = start; i < kml.childNodes.length && i < start + block; i++) {
                if (doc.removed) {
                    currentlyParsing = false;
                    return;
                }
                childNode = kml.childNodes.item(i);
                childName = childNode.nodeName;

                if (childName === 'kml') {
                    wasContainer = true; // so we dont continue loop after break
                    parse(childNode, parent, oldParent, doc, parseCompleteCallback);
                    break;
                }
                if (childName === 'Document' || childName === 'Folder') {
                    child = new Container(parent);
                    child.type = childName;
                    child.visible = parent.visibility; // Will be checked against visibility when we find that tag
                    child.visibility = parent.visibility;
                    child.id = childNode.getAttribute('id');
                    if (parent.maintainState) {
                        if (child.type === 'Document') { // always first container - no need for possibly slow search - also may have no id or name but can still be 'found'
                            if (oldParent) {
                                oldChild = oldParent.containers[0];
                            }
                        } else { // folder
                            if (child.id) {
                                if (oldParent && oldParent.idMap[child.id]) {
                                    oldChild = oldParent.idMap[child.id];
                                }
                                parent.idMap[child.id] = child;
                            } else {
                                // need name NOW for potential mapping to old before parsing children
                                for (j = 0; j < childNode.childNodes.length; j++) {
                                    nameNode = childNode.childNodes.item(j);
                                    if (nameNode.nodeName === 'name') {
                                        child.name = getTextValue(nameNode);
                                        if (oldParent && oldParent.nameMap[child.name]) {
                                            oldChild = oldParent.nameMap[child.name];
                                        }
                                        parent.nameMap[child.name] = child;
                                        break;
                                    }
                                }
                            }
                        }

                        if (oldChild) {
                            child.visibility = oldChild.visibility;
                            child.open = oldChild.open;
                        }
                    }

                    //parent.containers.push(child);
                    wasContainer = true; // so we dont continue loop after break - parse callback will let us know when we can continue
                    parse(childNode, child, oldChild, doc, getContainerParseFunc(kml, parent, oldParent, doc, parseCompleteCallback, i + 1));
                    break;
                }
                if (childName === 'NetworkLink') {
                    parseNetworkLink(childNode, parent, oldParent, doc);
                    //child = parseNetworkLink(childNode, parent, doc);
                    //if (child) {
                    //child.visibility = findAndGetBooleanValue(childNode, 'visibility', true);
                    //child.visible = child.visibility && parent.visibility; // TBD - region????
                    //parent.containers.push(child);
                    //}
                    // not breaking - will continue parsing this doc while we go off and load link. If many network links may begin loading many at once. Need to throttle this????
                } else if (childName === 'Placemark' || $.inArray(childName, doc.placemarkNames) > -1) {
                    parsePlacemark(childNode, parent, oldParent, doc);
                } else if (childName === 'ScreenOverlay') {
                    parseScreenOverlay(childNode, parent, oldParent, doc);
                } else if (childName === 'GroundOverlay') {
                    parseGroundOverlay(childNode, parent, oldParent, doc);
                } else if (childName === 'Region') {
                    child = parseRegion(childNode, doc);
                    if (child) {
                        parent.region = child;
                        parent.visible = parent.visible && parent.visibility && settings.isRegionActive(parent.region); // if visibility tag found first
                    }
                } else if (childName === 'visibility') {
                    parent.visibility = parent.visibility && getBooleanValue(childNode, true);
                    parent.visible = parent.visible && parent.visibility && (!parent.region || settings.isRegionActive(parent.region)); // Note: parent.visible is parents parent visibility at this point --- TBD - region
                } else if (childName === 'name') {
                    parent.name = getTextValue(childNode);
                } else if (childName === 'open') {
                    if (parent.open === undefined) { // only if it wasnt already set due to 'maintainState' above
                        parent.open = getBooleanValue(childNode, false);
                    }
                } else if (childName === 'LookAt' || childName === 'Camera') {
                    // 'this' is a viewer.  Parent is a container, maybe the child of the topmost container:
                    parent.viewer = parseViewer(childNode);
                    if (parent.parent && parent.parent.overlayId && !parent.parent.viewer) {
                        parent.parent.viewer = parent.viewer;
                    }
                }
            }
        } catch (err) {
            console.log(err);
        }
        currentlyParsing = false;
        if (!wasContainer) {
            if (i < kml.childNodes.length) {
                setTimeout(function () {
                    parse(kml, parent, oldParent, doc, parseCompleteCallback, i);
                }, 1);
            } else {
                if (parseCompleteCallback) {
                    parseCompleteCallback({ doc: doc });
                }

                if (parent === doc) {
                    if (doc.parseCompleteCallback) {
                        doc.parseCompleteCallback({ doc: doc });
                    }

                    // When top level element finishes invoke standard callback
                    if (settings.parseCallback) {
                        settings.parseCallback(doc);
                    }

                    --doc.remaining;
                    if (!doc.remaining && doc.initialParseCompleteCallback) {
                        doc.initialParseCompleteCallback({ doc: doc });
                        //delete doc.remaining;
                        //delete doc.initialParseCompleteCallback;
                    }
                }
            }
        }
    }

    // parse a top level kml object (may be kml, doc, or any feature (though spec states kml required)
    function parseDocument(kml, doc, oldDoc, stylesOnly, url) {
        if (doc.fileSize) {
            totalFileSize += doc.fileSize;
        }
        if (url) { // prevent recursive loading of self when (incorrectly?) specifying own url when defining styleUrl's
            externalStyles[url] = externalStyles[url] || {};
        }
        fetchExternalStyles(kml, 0, function () {
            doc.styles = parseSharedStyles(kml);
            if (!stylesOnly) {
                doc.placemarkNames = parseSchemas(kml);
                if (!doc.loadMorePlacemarks && !globalLoadMorePlacemarks) {
                    var numPlacemarks = 0,
                        i,
                        names,
                        it,
                        name,
                        allEntities = doc.placemarkNames.slice();
                    allEntities.push('Placemark');
                    allEntities.push('ScreenOverlay');
                    allEntities.push('GroundOverlay');
                    allEntities.push('NetworkLink');
                    allEntities.push('Document');
                    allEntities.push('Folder');
                    for (i = 0; i < allEntities.length; i++) {
                        numPlacemarks += kml.getElementsByTagName(allEntities[i]).length;
                    }
                    if (numPlacemarks + totalEntities > settings.maxPlacemarks) {
                        names = [];
                        it = doc;
                        while (it) {
                            if (it.name && it.name.length) {
                                names.push(it.name);
                            }
                            it = it.parent;
                        }
                        names.reverse();
                        name = names.join('/');
                        getGoNoGo(1, function () {
                            var msg = ['Overlay '];
                            msg.push(name);
                            msg.push(' contains approximately ');
                            msg.push(numPlacemarks);
                            msg.push(' entities. There are currently approximately ');
                            msg.push(totalEntities);
                            msg.push(' entities already loaded. ');
                            msg.push('Loading the additional entities may cause the browser to become unresponsive. Continue loading anyway?');
                            return msg.join('');
                        }, 'Warning - Large Number Of Entities', function (userChoice, global) {
                            if (global) {
                                globalLoadMorePlacemarks = userChoice;
                            }
                            doc.loadMorePlacemarks = userChoice;
                            if (!userChoice) {
                                totalFileSize -= doc.fileSize;
                                doc.fileSize = 0;
                                --totalEntities;
                                doc.name = doc.name || '';
                                doc.name += ' - LOAD CANCELED';
                                if (doc.parseCompleteCallback) {
                                    doc.parseCompleteCallback({ error: 'canceled', doc: doc });
                                }
                                if (!stylesOnly && settings.parseCallback) {
                                    settings.parseCallback(doc);
                                }
                            } else {
                                parse(kml, doc, oldDoc, doc);
                            }
                        });
                        return;
                    }
                }
                parse(kml, doc, oldDoc, doc);
            } else {
                doc.parseCompleteCallback({ doc: doc });
            }
        });
    }

    function getFileSizeString(bytes) {
        if (bytes < 1048576) { // use kb
            return (bytes / 1024).toFixed(2) + 'kB';
        } // else use mb
        return (bytes / 1048576).toFixed(2) + 'MB';
    }

    // load and parse kml
    function loadKml(url, visible, parent, parseCompleteCallback, initialParseCompleteCallback, oldDoc, stylesOnly, clustering, doc) {
        var request,
            urlToUse = settings.proxy.length ? encodeURIComponent(url) : url,
            numberOfPlacemarks = totalEntities,
            names,
            name,
            it;

        doc = doc || new Container(parent);
        doc.remaining = 1;
        doc.parseCompleteCallback = parseCompleteCallback;
        doc.initialParseCompleteCallback = initialParseCompleteCallback;
        doc.visibility = doc.visible = visible;
        doc.clustering = clustering;

        if (oldDoc) {
            //doc.visibility = doc.visible = oldDoc.visible; - not needed already passed in as visible flag
            doc.open = oldDoc.open;
            doc.loadLargeFile = doc.loadLargeFile || oldDoc.loadLargeFile;
            doc.loadMorePlacemarks = doc.loadMorePlacemarks || oldDoc.loadMorePlacemarks;
        }

        if (settings.maxPlacemarks < numberOfPlacemarks && !globalLoadMorePlacemarks && !doc.loadMorePlacemarks) {
            if (oldDoc) { // these are being replaced
                numberOfPlacemarks -= oldDoc.getAllFeatures().length;
            }
            if (settings.maxPlacemarks < numberOfPlacemarks) { // check again in case replacing
                if (doc.loadMorePlacemarks === undefined) {
                    names = [];
                    it = doc;
                    while (it) {
                        if (it.name && it.name.length) {
                            names.push(it.name);
                        }
                        it = it.parent;
                    }
                    names.reverse();
                    name = names.join('/');

                    getGoNoGo(1, function () {
                        var msg = ['There are currently approximately '];
                        msg.push(totalEntities);
                        msg.push(' entities loaded. ');
                        if (oldDoc) {
                            msg.push('Reloading overlay ');
                        } else {
                            msg.push('Loading additional entities included in overlay ');
                        }
                        msg.push(name);
                        msg.push(' may cause the browser to become unresponsive. Continue loading anyway?');
                        return msg.join('');
                    },
                        'Warning - Large Number Of Entities', function (userChoice, global) {
                            if (global) {
                                globalLoadMorePlacemarks = userChoice;
                            }
                            doc.loadMorePlacemarks = userChoice;
                            if (!userChoice) {
                                //doc.remove();
                                doc.name = doc.name || '';
                                doc.name += ' - LOAD CANCELED';
                                if (parseCompleteCallback) {
                                    parseCompleteCallback({ error: 'canceled', doc: doc });
                                }
                                if (!stylesOnly && settings.parseCallback) {
                                    settings.parseCallback(doc);
                                }
                            } else {
                                loadKml(url, visible, parent, parseCompleteCallback, initialParseCompleteCallback, oldDoc, stylesOnly, clustering, doc);
                            }
                        });
                } else {
                    //doc.remove();
                    doc.parseCompleteCallback({ error: 'canceled', doc: doc });
                    if (!stylesOnly && settings.parseCallback) {
                        settings.parseCallback(doc);
                    }
                }
                return doc;
            }
        }

        if (currentLoads >= maxConcurrentLoads) {
            ++waitingToLoad;
            setTimeout(function () {
                --waitingToLoad;
                if (!doc.removed) {
                    loadKml(url, visible, parent, parseCompleteCallback, initialParseCompleteCallback, oldDoc, stylesOnly, clustering, doc);
                }
            }, 500 + (waitingToLoad * 10)); // try to get FIFO
            return doc;
        }
        ++currentLoads;

        request = $.ajax({
            dataType: 'xml',
            url: settings.proxy + urlToUse
        });

        request.done(function (data, textStatus, jqXHR) {
            var names,
                name,
                it,
                loadLargeFile,
                fileSizeWillBe,
                containers,
                i;
            --currentLoads;
            if (doc.removed) { // quick user deleted before ajax returned
                return;
            }
            doc.fileSize = jqXHR.responseText.length;
            loadLargeFile = oldDoc ? oldDoc.loadLargeFile : globalLoadLargeFile;
            if (!loadLargeFile) {
                fileSizeWillBe = totalFileSize + jqXHR.responseText.length;
                if (oldDoc) {
                    containers = [oldDoc];
                    oldDoc.getAllContainers(containers);
                    for (i = 0; i < containers.length; i++) {
                        if (containers[i].fileSize) {
                            fileSizeWillBe -= containers[i].fileSize;
                        }
                    }
                }
                if (fileSizeWillBe > settings.maxFileSize * 1048576) { // bytes to MB
                    if (loadLargeFile === undefined) {
                        names = [];
                        it = doc;
                        while (it) {
                            if (it.name && it.name.length) {
                                names.push(it.name);
                            }
                            it = it.parent;
                        }
                        names.reverse();
                        name = names.join('/');
                        getGoNoGo(0, function () {
                            var msg = ['Overlay '];
                            msg.push(name);
                            msg.push(' is ');
                            msg.push(getFileSizeString(jqXHR.responseText.length));
                            msg.push('. After loading it, total loaded data will be ');
                            msg.push(getFileSizeString(fileSizeWillBe));
                            msg.push('. Loading so much data may cause the browser to become unresponsive. Load it anyway?');
                            return msg.join('');
                        }, 'Warning - Large File Size',
                            function (userChoice, global) {
                                if (global) {
                                    globalLoadLargeFile = userChoice;
                                }
                                doc.loadLargeFile = userChoice;
                                if (!userChoice) {
                                    //doc.remove();
                                    doc.fileSize = 0;
                                    --totalEntities;
                                    doc.name = doc.name || '';
                                    doc.name += ' - LOAD CANCELED';
                                    if (parseCompleteCallback) {
                                        parseCompleteCallback({ error: 'canceled', doc: doc });
                                    }
                                    if (!stylesOnly && settings.parseCallback) {
                                        settings.parseCallback(doc);
                                    }
                                } else {
                                    parseDocument(data, doc, oldDoc, stylesOnly, url);
                                }
                            });
                        return;
                    }
                    if (!loadLargeFile) {
                        //doc.remove();
                        doc.fileSize = 0;
                        --totalEntities;
                        if (parseCompleteCallback) {
                            parseCompleteCallback({ error: 'canceled', doc: doc });
                        }
                        if (!stylesOnly && settings.parseCallback) {
                            settings.parseCallback(doc);
                        }
                        return;
                    }
                }
            }
            parseDocument(data, doc, oldDoc, stylesOnly, url);
        });

        request.fail(function (jqXHR, textStatus, errorThrown) {
            --currentLoads;
            doc.name = doc.name || '';
            doc.name += ' - LOAD FAILED';
            console.log('Failed to load ' + url + ' - ' + textStatus);
            if (parseCompleteCallback) {
                parseCompleteCallback({ error: textStatus, doc: doc });
            }
            if (!stylesOnly && settings.parseCallback) {
                settings.parseCallback(doc);
            }
        });

        return doc;
    }

    // parse kml string
    function parseKmlString(kmlString, visible, parent, parseCompleteCallback, clustering) {
        var doc = new Container(parent),
            kmlAsXml;
        doc.remaining = 1;

        // parseCompleteCallback passed in from outside is only invoked after any (non region) subordinate network links that
        // are going to be loaded are loaded as well (to support zoom and remove after new data showing)
        // It will be internally refered to as initialParseCompleteCallback
        // Internal parseCompleteCallback passed internally to the parser are called every time a doc is parsed
        // without waiting for children.
        // It will be internally known as parseCompleteCallback
        doc.parseCompleteCallback = function (result) {
            // initialParseCompleteCallback only called on successfull load...
            if (!result.doc && parseCompleteCallback) {
                parseCompleteCallback(result);
            }
        };
        doc.initialParseCompleteCallback = parseCompleteCallback;
        doc.visibility = doc.visible = visible;
        doc.clustering = clustering;
        setTimeout(function () { // make it asynchronous so we get identical behavior as load via Ajax
            kmlAsXml = $.parseXML(kmlString);
            parseDocument(kmlAsXml, doc);
        }, 1);
        return doc;
    }

    function getTreeData(container, parentVisible, overlayId, featureId) {
        var containerNodeData,
            i,
            j,
            subContainerNode,
            featureNodeData;

        if ((!container.name || !container.name.length) && container.containers.length <= 1 && !container.features.length && !container.screenOverlays.length) {
            containerNodeData = [];
            for (i = 0; i < container.containers.length; i++) {
                subContainerNode = getTreeData(container.containers[0], parentVisible, overlayId, featureId);
                if (subContainerNode) {
                    if ($.isArray(subContainerNode)) {
                        for (j = 0; j < subContainerNode.length; j++) {
                            containerNodeData.push(subContainerNode[j]);
                        }
                    } else {
                        containerNodeData.push(subContainerNode);
                    }
                }
            }
            return containerNodeData;
        }
        containerNodeData = {
            title: container.name || '[no name]',
            tooltip: 'click to zoom to',
            key: container.parent ? container.internalId : featureId, // top level feature uses featureId lower items use internal id
            isFolder: true,
            expand: container.open,
            select: container.visibility && parentVisible,
            children: []
        };
        if (!container.parent) { // top level feature
            containerNodeData.isFeature = true;
        }
        for (i = 0; i < container.containers.length; i++) {
            subContainerNode = getTreeData(container.containers[i], containerNodeData.select, overlayId);
            if (subContainerNode) {
                if ($.isArray(subContainerNode)) {
                    for (j = 0; j < subContainerNode.length; j++) {
                        containerNodeData.children.push(subContainerNode[j]);
                    }
                } else {
                    containerNodeData.children.push(subContainerNode);
                }
            }
        }
        for (i = 0; i < container.features.length; i++) {
            featureNodeData = {
                title: container.features[i].name || '[no name]',
                tooltip: 'click to zoom to',
                key: container.features[i].internalId,
                select: container.features[i].visibility && containerNodeData.select
            };
            containerNodeData.children.push(featureNodeData);
        }
        for (i = 0; i < container.screenOverlays.length; i++) {
            featureNodeData = {
                title: container.screenOverlays[i].name || '[no name]',
                tooltip: 'click to zoom to',
                key: container.screenOverlays[i].internalId,
                select: container.screenOverlays[i].visibility && containerNodeData.select
            };
            containerNodeData.children.push(featureNodeData);
        }
        return containerNodeData;
    }

    return {
        init: init,
        loadKml: function (url, visible, parent, parseCompleteCallback, oldDoc, stylesOnly, clustering, doc) {
            // parseCompleteCallback passed in from outside is only invoked after any (non region) subordinate network links that
            // are going to be loaded are loaded as well (to support zoom and remove after new data showing)
            // It will be internally refered to as initialParseCompleteCallback
            // Internal parseCompleteCallback passed internally to the parser are called every time a doc is parsed
            // without waiting for children.
            // It will be internally known as parseCompleteCallback
            return loadKml(url, visible, parent, function (result) {
                // initialParseCompleteCallback only called on successfull load...
                if (!result.doc && parseCompleteCallback) {
                    parseCompleteCallback(result);
                }
            }, parseCompleteCallback, oldDoc, stylesOnly, clustering, doc);
        },
        parseKmlString: parseKmlString,
        Container: Container,
        totalEntities: function () {
            return totalEntities;
        },
        getEntitiesString: function (additionalNonKmlEntities) {
            return 'Approximately ' + getFileSizeString(totalFileSize) + ' of data containing approximately ' + (totalEntities + (additionalNonKmlEntities || 0)) + ' entities loaded.';
        },
        getTreeData: getTreeData
    };
}());/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4, unparam: true*/
/*global jQuery, $, util, jc2cui*/

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.infoWindow = (function () {
    "use strict";
    var infoWindow,
        options,
        content,
        firstTime = true,
        manuallySized = false,
        mapItem;

    function createInfoWindow() {
        var closeButton;

        // turn containment into a jQuery object if needed
        if (options.containment) {
            if (!(options.containment instanceof jQuery)) {
                options.containment = $(options.containment);
            }
        }

        infoWindow = $('<div id="infoWindow" class="infoWindow"><span class="closeInfoWindow"></span><div id="infoWindowContent" class="infoWindowContent"></div></div>')
            .appendTo(options.containment || $('body'))
            .draggable({ cancel: '#infoWindowContent', containment: options.containment, cursor: 'move' })
            .resizable({ containment: options.containment, stop: function (event, ui) { manuallySized = true; } });

        closeButton = $('.closeInfoWindow', infoWindow)
            .hover(
                function () {
                    closeButton.addClass('closeInfoWindowOver');
                },
                function () {
                    closeButton.removeClass('closeInfoWindowOver');
                }
            )
            .click(function () {
                jc2cui.mapWidget.infoWindow.close();
            });

        content = $('#infoWindowContent');

        if (options.zIndex) {
            infoWindow.css('z-index', options.zIndex);
        }
    }

    function ensureInfoWindowVisible() {
        if (options.containment) { // && infoWindow.is(":visible")) {
            //var infoPos = infoWindow.position(), - Doesnt work on hidden info window - always gets 0 top and 0 left!
            var top = parseInt(infoWindow.css('top').replace('px', ''), 10),
                left = parseInt(infoWindow.css('left').replace('px', ''), 10),
                containerPos = options.containment.position();

            if (top + infoWindow.outerHeight() > options.containment.height() + containerPos.top) {
                infoWindow.css("top", Math.max(containerPos.top, options.containment.height() - infoWindow.outerHeight() + containerPos.top) + "px");
            }

            if (left + infoWindow.outerWidth() >= options.containment.width()) {
                infoWindow.css("left", Math.max(0, options.containment.width() - infoWindow.outerWidth()) + "px");
            }
        }
    }

    function resizeInfoWindow() {
        if (options.containment) { // && infoWindow.is(":visible")) {
            // If user resized dont mess with it unless it will no longer fit.
            // TBD - Whats wrong with calculation that -12 and - 18 is compensating for?
            var height = manuallySized ? Math.min(options.containment.innerHeight() - (infoWindow.outerHeight() - infoWindow.innerHeight()) - 18, infoWindow.height()) : Math.min(500, (options.containment.height() * 0.60)),
                width = manuallySized ? Math.min(options.containment.innerWidth() - (infoWindow.outerWidth() - infoWindow.innerWidth()) - 12, infoWindow.width()) : Math.min(542, (options.containment.width() * 0.60));
            infoWindow.css("height", Math.max(10, height) + "px");
            infoWindow.css("width", Math.max(10, width) + "px");
            ensureInfoWindowVisible();
        }
    }

    return {
        init: function (config) {
            options = config || {};
        },
        open: function (details, obj) {
            if (!infoWindow) {
                createInfoWindow();
            }
            if (details.content) {
                if (typeof (details.content) === 'string') {
                    content.html(details.content);
                } else {
                    content.empty();
                    content.append(details.content);
                }
                // force links to open in new window
                $('a', content)
                    .addClass("external")
                    .attr({ target: "_blank" });
            }
            if (!content.text().length) { // refuse to show nothing - (balloon html may be just css)
                return;
            }
            if (details.width) {
                infoWindow.css("width", details.width);
                manuallySized = true;
            }
            if (details.height) {
                infoWindow.css("height", details.height);
                manuallySized = true;
            }
            if (details.bgColor) {
                infoWindow.css("background-color", details.bgColor);
                manuallySized = true;
            }
            if (details.textColor) {
                infoWindow.css("color", details.textColor);
                manuallySized = true;
            }
            mapItem = obj;
            infoWindow.show();
            content.scrollTop(0);
            if (firstTime) {
                firstTime = false;
                resizeInfoWindow(); // must be after show or needed values are 0!
                if (options.containment) {
                    infoWindow.css("left", Math.max(0, (options.containment.width() - infoWindow.outerWidth()) / 2 + options.containment.scrollLeft()) + "px"); // initially centered or at far left
                    infoWindow.css("top", Math.max(0, (options.containment.height() - infoWindow.outerHeight()) / 2 + options.containment.scrollTop()) + "px"); // initially centered or at top
                }
            }
        },
        close: function () {
            mapItem = null;
            if (infoWindow) {
                infoWindow.hide();
            }
        },
        setPosition: function () {
            return;
        },
        checkResize: function () {
            if (infoWindow) {
                resizeInfoWindow();
            }
        },
        getMapItem: function () {
            return mapItem;
        }
    };
}());/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4, unparam: true*/
/*global window, jQuery, document*/

// Color picker inspired by http://www.web2media.net/laktek/?p=96
// and taken almost as is from AMSO project
(function ($) {
    "use strict";
    var that = {},
        hide,
        toHex = function (color) {
            //if valid HEX code is entered - else rgb color value is entered (by selecting a swatch)
            if (color.match(/[0-9a-fA-F]{3}$/) || color.match(/[0-9a-fA-F]{6}$/)) {
                color = (color.charAt(0) === "#") ? color : ("#" + color);
            } else if (color.match(/^rgb\(([0-9]|[1-9][0-9]|[1][0-9]{2}|[2][0-4][0-9]|[2][5][0-5]),[ ]{0,1}([0-9]|[1-9][0-9]|[1][0-9]{2}|[2][0-4][0-9]|[2][5][0-5]),[ ]{0,1}([0-9]|[1-9][0-9]|[1][0-9]{2}|[2][0-4][0-9]|[2][5][0-5])\)$/)) {
                var c = ([parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10), parseInt(RegExp.$3, 10)]),
                    r,
                    g,
                    b,
                    pad = function (str) {
                        var i,
                            len;
                        if (str.length < 2) {
                            for (i = 0, len = 2 - str.length; i < len; i++) {
                                str = '0' + str;
                            }
                        }
                        return str;
                    };

                if (c.length === 3) {
                    r = pad(c[0].toString(16));
                    g = pad(c[1].toString(16));
                    b = pad(c[2].toString(16));
                    color = '#' + r + g + b;
                }
            } else {
                color = null;
            }
            return color;
        },
        changeColor = function (newColor) {
            var hex = toHex(newColor);
            hex = hex || 'transparent';
            that.selector.css('background-color', hex);
            hide(true, hex);
        },
        buildPicker = function (useShim) {
            that.control = $("<div class='color-picker'></div>");

            //add color pallete
            var addSwatch = function (swatch) {
                swatch.bind({
                    click: function (e) {
                        changeColor(swatch.css("background-color"));
                    },
                    mouseover: function (e) {
                        swatch.css("border-color", "#598FEF");
                    },
                    mouseout: function (e) {
                        swatch.css("border-color", "#000");
                    }
                });

                that.control.append(swatch);
            };

            $.each($.fn.colorPicker.defaultColors, function (i) {
                var swatch = $("<div class='color_swatch'>&nbsp;</div>");
                swatch.css("background-color", "#" + this);
                addSwatch(swatch);
            });

            addSwatch($("<div class='nocolor'>transparent</div>"));

            $('body').append(that.control);

            if (useShim) {
                that.iframeShim = document.createElement('iframe');
                that.iframeShim.frameBorder = 0;
                that.iframeShim.scrolling = 'no';
                that.iframeShim.src = ['javascript', ':false;'].join(''); // join to avoid jslint complaint about javascript url
                that.iframeShim.style.position = 'absolute';
                that.iframeShim.style.width = that.control.width() + 'px';
                that.iframeShim.style.height = that.control.height() + 'px';
                $('body').append(that.iframeShim);
            }
        },
        checkMouse = function (event) {
            // mouse click elsewhere causes it to be hidden
            if (event.target === that.control || $(event.target).parent()[0] === that.control[0]) {
                return;
            }

            hide();
        },
        resetHeight = function () {
            that.control.css('height', ''); // jquery bug? stop during a slide keeps current height forever!
        },
        show = function (element, callback, useShim) {
            that.selector = element;

            if (!that.control) {
                buildPicker(useShim);
            }

            hide();

            var pos = element.offset(),
                top = Math.max(0, pos.top - that.control.height()), // dont go off top
                winder = $(window),
                left = Math.max(0, pos.left); // dont go off left
            top = Math.min(top, winder.height() - that.control.height()); // dont go off bottom
            left = Math.min(left, winder.width() - that.control.width()); // dont go off right

            that.control.css({
                left: left + 'px',
                top: top + 'px'
            });

            if (that.iframeShim) {
                that.iframeShim.style.left = left + 'px';
                that.iframeShim.style.top = top + 'px';
                that.iframeShim.style.zIndex = that.control.css('z-index') - 1;
            }

            that.control.slideDown("slow");
            that.callback = callback;
            $('body').bind("mousedown", checkMouse);
        };

    hide = function (animate, newColor) {
        that.control.stop(true);
        if (animate) {
            that.control.slideUp("slow", function () {
                resetHeight();
            });
        } else {
            that.control.hide();
            resetHeight();
        }
        $('body').unbind("mousedown", checkMouse);

        if (that.iframeShim) {
            that.iframeShim.style.zIndex = -500;
        }

        if (that.callback) {
            that.callback(newColor);
            delete that.callback;
        }
    };

    $.fn.colorPicker = function (color, callback, useShim) {
        var it = this;

        return this.css('background-color', color)
            .bind("mouseover", function (e) {
                it.css("border-color", "#598FEF");
            })
            .bind("mouseout", function (e) {
                it.css("border-color", "#000");
            })
            .click(function () {
                show(it, callback, useShim);
            });
    };

    $.fn.colorPicker.hide = function (animate) {
        hide(animate);
    };

    $.fn.colorPicker.defaultColors = ['000000', '993300', '333300', '000080', '333399', '333333', '800000', 'FF6600', '808000', '008000', '008080', '0000FF', '666699', '808080', 'FF0000', 'FF9900', '99CC00', '339966', '33CCCC', '3366FF', '800080', '999999', 'FF00FF', 'FFCC00', 'FFFF00', '00FF00', '00FFFF', '00CCFF', '993366', 'C0C0C0', 'FF99CC', 'FFCC99', 'FFFF99', 'CCFFFF', '99CCFF', 'FFFFFF', '15428B', 'DFE8F6'];
}(jQuery));/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4, unparam: true*/
/*global $, document, util, jc2cui*/

// Note: borrows heavily from http://earth-api-samples.googlecode.com/svn/trunk/demos/myearth/index.html

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.featureEditor = (function () {
    "use strict";

    var useShim,
        data,
        MARKER_ICONS_PER_ROW = 7,
        markerIconUrls = (function () {
            var urls = [],
                styles = [
                    '-circle.png',
                    '-blank.png',
                    '-pushpin.png'
                ],
                colors = ['blu', 'red', 'grn', 'ltblu', 'ylw', 'purple', 'pink'],
                shapes = [
                    'dining', 'coffee', 'bars', 'snack_bar', 'tram', 'lodging', 'wheel_chair_accessible',
                    'shopping', 'movies', 'convenience', 'grocery', 'arts', 'homegardenbusiness', 'electronics',
                    'mechanic', 'partly_cloudy', 'realestate', 'salon', 'dollar', 'parking_lot', 'gas_stations',
                    'cabs', 'bus', 'truck', 'rail', 'airports', 'ferry', 'heliport',
                    'subway', 'info', 'flag', 'earthquake', 'webcam', 'post_office', 'police',
                    'firedept', 'hospitals', 'info_circle', 'phone', 'caution', 'falling_rocks', 'camera',
                    'parks', 'campfire', 'picnic', 'campground', 'ranger_station', 'toilets', 'poi',
                    'hiker', 'cycling', 'motorcycling', 'horsebackriding', 'play', 'golf', 'trail',
                    'water', 'snowflake_simple', 'marina', 'fishing', 'sailing', 'swimming', 'ski',
                    'woman', 'man', 'rainy', 'volcano', 'sunny', 'euro', 'yen'
                ],
                i,
                j,
                color;

            for (i = 0; i < styles.length; i++) {
                for (j = 0; j < colors.length; j++) {
                    color = colors[j];
                    urls.push([jc2cui.mapWidget.getAppPath(), 'images/', color, styles[i]].join(''));
                }
            }

            for (i = 0; i < shapes.length; i++) {
                urls.push([jc2cui.mapWidget.getAppPath(), 'images/', shapes[i], '.png'].join(''));
            }
            return urls;
        }());

    function populateMarkerCharacteristics(characteristics) {
        var iconDiv = $('<div id="marker-icons">').appendTo(characteristics),
            i,
            bgPos,
            getIconClickFunc = function (href) {
                return function (icon) {
                    data.iconUrl = href;
                    $('#characteristicsButton', characteristics.parent()).attr("src", data.iconUrl);

                    $('.marker-icon', iconDiv).removeClass('selected');
                    $(this).addClass('selected');
                };
            };

        for (i = 0; i < markerIconUrls.length; i++) {
            bgPos = [-(i % MARKER_ICONS_PER_ROW) * 32, -Math.floor(i / MARKER_ICONS_PER_ROW) * 32];
            $('<a class="marker-icon" tabindex="1"></a>')
                .css('background-position', bgPos[0] + 'px ' + bgPos[1] + 'px')
                .appendTo(iconDiv)
                .click(getIconClickFunc(markerIconUrls[i]));
        }
    }

    function populateLineCharacteristics(characteristics) {
        var div = $('<div><label>line color <input id="strokeColor" type="text"></label><label>line width (pixels) <input id="strokeWeight" type="text"></label><label>line opacity <input id="strokeOpacity" type="text"></label></div>').appendTo(characteristics);
        $('#strokeColor', div).colorPicker(data.strokeColor, function (color) {
            data.strokeColor = color;
            $('#mask', characteristics.parent()).css({
                'background-color': data.type === 'line' ? data.strokeColor : data.fillColor,
                'border-color': data.strokeColor
            });
        }, useShim);
        $('#strokeWeight', div)
            .val(data.strokeWeight)
            .change(function () {
                var strokeWeight = parseInt($(this).val(), 10);
                if (!isNaN(strokeWeight)) {
                    data.strokeWeight = strokeWeight;
                }
            });
        $('#strokeOpacity', div)
            .val(Math.floor(100 * data.strokeOpacity))
            .change(function () {
                var strokeOpacity = parseInt($(this).val(), 10);
                if (!isNaN(strokeOpacity)) {
                    strokeOpacity = Math.max(0, Math.min(100, strokeOpacity)) / 100;
                    data.strokeOpacity = strokeOpacity;
                }
            });
    }

    function populateShapeCharacteristics(characteristics) {
        var div = $('<div><label>fill color <input id="fillColor" type="text"></label><label>fill opacity <input id="fillOpacity" type="text"></label></div>').appendTo(characteristics);
        $('#fillColor', div).colorPicker(data.fillColor, function (color) {
            data.fillColor = color;
            $('#mask', characteristics.parent()).css({
                'background-color': data.type === 'line' ? data.strokeColor : data.fillColor
            });
        }, useShim);
        $('#fillOpacity', div)
            .val(Math.floor(100 * data.fillOpacity))
            .change(function () {
                var fillOpacity = parseInt($(this).val(), 10);
                if (!isNaN(fillOpacity)) {
                    fillOpacity = Math.max(0, Math.min(100, fillOpacity)) / 100;
                    data.fillOpacity = fillOpacity;
                }
            });
    }

    function getCharacteristics(type, container) {
        var characteristics = $('<div id="characteristics""><div id="back">back</div></div>').appendTo(container);

        switch (type) {
        case 'marker':
            populateMarkerCharacteristics(characteristics);
            break;
        case 'line':
            populateLineCharacteristics(characteristics);
            break;
        case 'shape':
            populateLineCharacteristics(characteristics);
            populateShapeCharacteristics(characteristics);
            break;
        }

        return characteristics;
    }

    return {
        useShim: function (val) { // should color picker use shim (earth plugin in IE for example)
            useShim = val;
        },
        getEditFeatureHtml: function (props, callbacks) {
            data = props;
            var content = $([
                    '<div class="editFeature">',
                    '<div id="outer">',
                    '<div id="basic">',
                    '<div class="bold top">Title <input id="title" type="text" id="title" />',
                    '<div id="mask"><img id="characteristicsButton" src="',
                    data.iconUrl,
                    '" title="Click to set ',
                    data.type,
                    ' characteristics">',
                    '</div>',
                    '</div>',
                    '<div class="bold section">Description',
                    '</div>',
                    '<textarea id="description"></textarea>',
                    '</div>',
                    '</div>',
                    '<div class="buttons"><span id="delete" class="button">delete</span><span id="cancel" class="button">cancel</span><span id="ok" class="button">ok</span>',
                    '</div>',
                    '</div>'
                ].join('')),
                basic,
                characteristics;

            $('#title', content).val(data.title || '');
            $('#description', content).val(data.description || '');

            $('#characteristicsButton', content).click(function () {
                if (!basic) {
                    basic = $('#basic', content);
                }
                if (!characteristics) {
                    characteristics = getCharacteristics(data.type, $('#outer', content));
                }
                $('#back', characteristics).click(function () {
                    characteristics.hide();
                    basic.show();
                });
                basic.hide();
                characteristics.show();
            });

            $('#mask', content).css({
                'background-color': data.type === 'marker' ? 'transparent' : data.type === 'line' ? data.strokeColor : data.fillColor,
                'border-color': data.type === 'marker' ? 'transparent' : data.strokeColor
            });

            $('#delete', content).click(function () {
                if (callbacks && callbacks.deleted) {
                    callbacks.deleted();
                }
            });
            $('#ok', content).click(function () {
                if (callbacks && callbacks.updated) {
                    data.title = $('#title', content).val();
                    data.description = $('#description', content).val();
                    callbacks.updated(data);
                }
            });
            $('#cancel', content).click(function () {
                if (callbacks && callbacks.canceled) {
                    callbacks.canceled();
                }
            });

            return content[0];
        }
    };
}());



// VERSION: 3.1 LAST UPDATE: 13.03.2012
/* 
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * 
 * Made by Wilq32, wilq32@gmail.com, Wroclaw, Poland, 01.2009
 * Website: http://code.google.com/p/jqueryrotate/ 
 */

// Documentation removed from script file (was kinda useless and outdated)

(function($) {
var supportedCSS,styles=document.getElementsByTagName("head")[0].style,toCheck="transformProperty WebkitTransform OTransform msTransform MozTransform".split(" "); //MozTransform <- firefox works slower with css!!!
for (var a=0;a<toCheck.length;a++) if (styles[toCheck[a]] !== undefined) supportedCSS = toCheck[a];
// Bad eval to preven google closure to remove it from code o_O
// After compresion replace it back to var IE = 'v' == '\v'
var IE = eval('"v"=="\v"');

jQuery.fn.extend({
    rotate:function(parameters)
    {
        if (this.length===0||typeof parameters=="undefined") return;
            if (typeof parameters=="number") parameters={angle:parameters};
        var returned=[];
        for (var i=0,i0=this.length;i<i0;i++)
            {
                var element=this.get(i);	
                if (!element.Wilq32 || !element.Wilq32.PhotoEffect) {

                    var paramClone = $.extend(true, {}, parameters); 
                    var newRotObject = new Wilq32.PhotoEffect(element,paramClone)._rootObj;

                    returned.push($(newRotObject));
                }
                else { 
                    element.Wilq32.PhotoEffect._handleRotation(parameters);
                }
            }
            return returned;
    },
    getRotateAngle: function(){
        var ret = [];
        for (var i=0,i0=this.length;i<i0;i++)
            {
                var element=this.get(i);	
                if (element.Wilq32 && element.Wilq32.PhotoEffect) {
                    ret[i] = element.Wilq32.PhotoEffect._angle;
                }
            }
            return ret;
    },
    stopRotate: function(){
        for (var i=0,i0=this.length;i<i0;i++)
            {
                var element=this.get(i);	
                if (element.Wilq32 && element.Wilq32.PhotoEffect) {
                    clearTimeout(element.Wilq32.PhotoEffect._timer);
                }
            }
    }
});

// Library agnostic interface

Wilq32=window.Wilq32||{};
Wilq32.PhotoEffect=(function(){

	if (supportedCSS) {
		return function(img,parameters){
			img.Wilq32 = {PhotoEffect: this};
            
            this._img = this._rootObj = this._eventObj = img;
            this._handleRotation(parameters);
		}
	} else if (IE) {
		return function(img,parameters) {
			// Make sure that class and id are also copied - just in case you would like to refeer to an newly created object
            this._img = img;

			this._rootObj=document.createElement('span');
			this._rootObj.style.display="inline-block";
			this._rootObj.Wilq32 = {PhotoEffect: this};
			img.parentNode.insertBefore(this._rootObj,img);
            this._Loader(parameters);
		}
	} else {
        return function(img,parameters){
            // Just for now... Dont do anything if CSS3 is not supported
        this._rootObj = img;
        }
    }
})();

Wilq32.PhotoEffect.prototype={
    _setupParameters : function (parameters){
		this._parameters = this._parameters || {};
        if (typeof this._angle !== "number") this._angle = 0 ;
        if (typeof parameters.angle==="number") this._angle = parameters.angle;
        this._parameters.animateTo = (typeof parameters.animateTo==="number") ? (parameters.animateTo) : (this._angle); 

        this._parameters.step = parameters.step || this._parameters.step || null;
		this._parameters.easing = parameters.easing || this._parameters.easing || function (x, t, b, c, d) { return -c * ((t=t/d-1)*t*t*t - 1) + b; }
		this._parameters.duration = parameters.duration || this._parameters.duration || 1000;
        this._parameters.callback = parameters.callback || this._parameters.callback || function(){};
        if (parameters.bind && parameters.bind != this._parameters.bind) this._BindEvents(parameters.bind); 
	},
	_handleRotation : function(parameters){
          this._setupParameters(parameters);
          if (this._angle==this._parameters.animateTo) {
              this._rotate(this._angle);
          }
          else { 
              this._animateStart();          
          }
	},

	_BindEvents:function(events){
		if (events && this._eventObj) 
		{
            // Unbinding previous Events
            if (this._parameters.bind){
                var oldEvents = this._parameters.bind;
                for (var a in oldEvents) if (oldEvents.hasOwnProperty(a)) 
                        // TODO: Remove jQuery dependency
                        jQuery(this._eventObj).unbind(a,oldEvents[a]);
            }

            this._parameters.bind = events;
			for (var a in events) if (events.hasOwnProperty(a)) 
				// TODO: Remove jQuery dependency
					jQuery(this._eventObj).bind(a,events[a]);
		}
	},

	_Loader: function(parameters)
		{
			var width=this._img.width;
			var height=this._img.height;
			//this._img.parentNode.removeChild(this._img);
            //this._rootObj.parentNode.removeChild(this._rootObj);
            
            this._rootObj.appendChild(this._img);

            this._rootObj.style.width = this._img.offsetWidth;
            this._rootObj.style.height = this._img.offsetHeight;

            this._img.style.position = "absolute";

            this._rootObj = this._img;
            this._rootObj.Wilq32 = {PhotoEffect: this}

            this._rootObj.style.filter += "progid:DXImageTransform.Microsoft.Matrix(M11=1,M12=1,M21=1,M22=1,sizingMethod='auto expand')";

		    this._eventObj = this._rootObj;	
		    this._handleRotation(parameters);
		},

	_animateStart:function()
	{	
		if (this._timer) {
			clearTimeout(this._timer);
		}
		this._animateStartTime = +new Date;
		this._animateStartAngle = this._angle;
		this._animate();
	},
    _animate:function()
    {
         var actualTime = +new Date;
         var checkEnd = actualTime - this._animateStartTime > this._parameters.duration;

         // TODO: Bug for animatedGif for static rotation ? (to test)
         if (checkEnd && !this._parameters.animatedGif) 
         {
             clearTimeout(this._timer);
         }
         else 
         {
             if (this._canvas||this._vimage||this._img) {
                 var angle = this._parameters.easing(0, actualTime - this._animateStartTime, this._animateStartAngle, this._parameters.animateTo - this._animateStartAngle, this._parameters.duration);
                 this._rotate((~~(angle*10))/10);
             }
             if (this._parameters.step) {
                this._parameters.step(this._angle);
             }
             var self = this;
             this._timer = setTimeout(function()
                     {
                     self._animate.call(self);
                     }, 10);
         }

         // To fix Bug that prevents using recursive function in callback I moved this function to back
         if (this._parameters.callback && checkEnd){
             this._angle = this._parameters.animateTo;
             this._rotate(this._angle);
             this._parameters.callback.call(this._rootObj);
         }
     },

	_rotate : (function()
	{
		var rad = Math.PI/180;
		if (IE)
		return function(angle)
		{
            this._angle = angle;
			//this._container.style.rotation=(angle%360)+"deg";
            var _rad = angle * rad ;
            costheta = Math.cos(_rad);
            sintheta = Math.sin(_rad);
            var fil = this._rootObj.filters.item("DXImageTransform.Microsoft.Matrix");
            fil.M11=costheta; fil.M12=-sintheta; fil.M21=sintheta; fil.M22=costheta;

            this._rootObj.style.marginLeft = -(this._rootObj.offsetWidth - this._rootObj.clientWidth)/2 +"px";
            this._rootObj.style.marginTop = -(this._rootObj.offsetHeight - this._rootObj.clientHeight)/2 +"px";
		}
		else if (supportedCSS)
		return function(angle){
            this._angle = angle;
			this._img.style[supportedCSS]="rotate("+(angle%360)+"deg)";
		}

	})()
}
})(jQuery);
// Apparently due to fixes below not using latest excanvas from http://code.google.com/p/explorercanvas/source/browse/trunk/excanvas.js
// Missing all the text functions. Brought in a bunch of stuff - but only what was actually needed right now. More may be missing....

// 8/7/12 - Added fix for rotation based on http://dev.sencha.com/playpen/tm/excanvas-patch/. Did not take all
// the fixes, only those that seemed to relate to rotation. While it is true that the fix for rotation helped
// when the icons are in the map view, it did NOT help the following bug. Load a kml file with arrows. Loads well.
// Then load another kml file in another area of the world and zoom in alot...Arrows appear in the top left corner
// of the map for no reason...To fix that we implemented (on 8/27/12) our own function called 'drawImageWithRotate'.
// It draws upon some code in openLayers.debug.js. See the comment before drawImageWithRotate.

// Added fix for lazy loading. init_ never called

// Copyright 2006 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


// Known Issues:
//
// * Patterns are not implemented.
// * Radial gradient are not implemented. The VML version of these look very
//   different from the canvas one.
// * Clipping paths are not implemented.
// * Coordsize. The width and height attribute have higher priority than the
//   width and height style values which isn't correct.
// * Painting mode isn't implemented.
// * Canvas width/height should is using content-box by default. IE in
//   Quirks mode will draw the canvas using border-box. Either change your
//   doctype to HTML5
//   (http://www.whatwg.org/specs/web-apps/current-work/#the-doctype)
//   or use Box Sizing Behavior from WebFX
//   (http://webfx.eae.net/dhtml/boxsizing/boxsizing.html)
// * Non uniform scaling does not correctly scale strokes.
// * Optimize. There is always room for speed improvements.

// Only add this code if we do not already have a canvas implementation
if (!document.createElement('canvas').getContext) {

(function() {

  // alias some functions to make (compiled) code shorter
  var m = Math;
  var mr = m.round;
  var ms = m.sin;
  var mc = m.cos;
  var abs = m.abs;
  var sqrt = m.sqrt;

  // this is used for sub pixel precision
  var Z = 10;
  var Z2 = Z / 2;

  /**
   * This funtion is assigned to the <canvas> elements as element.getContext().
   * @this {HTMLElement}
   * @return {CanvasRenderingContext2D_}
   */
  function getContext() {
    return this.context_ ||
        (this.context_ = new CanvasRenderingContext2D_(this));
  }

  var slice = Array.prototype.slice;

  /**
   * Binds a function to an object. The returned function will always use the
   * passed in {@code obj} as {@code this}.
   *
   * Example:
   *
   *   g = bind(f, obj, a, b)
   *   g(c, d) // will do f.call(obj, a, b, c, d)
   *
   * @param {Function} f The function to bind the object to
   * @param {Object} obj The object that should act as this when the function
   *     is called
   * @param {*} var_args Rest arguments that will be used as the initial
   *     arguments when the function is called
   * @return {Function} A new function that has bound this
   */
  function bind(f, obj, var_args) {
    var a = slice.call(arguments, 2);
    return function() {
      return f.apply(obj, a.concat(slice.call(arguments)));
    };
  }

  var G_vmlCanvasManager_ = {
    init: function(opt_doc) {
      if (/MSIE/.test(navigator.userAgent) && !window.opera) {
        var doc = opt_doc || document;
        // Create a dummy element so that IE will allow canvas elements to be
        // recognized.
        doc.createElement('canvas');
        if (doc.readyState !== "complete") {
            doc.attachEvent('onreadystatechange', bind(this.init_, this, doc));
        } else {
            this.init_(doc);
        }
      }
    },

    init_: function(doc) {
      // create xmlns
      if (!doc.namespaces['g_vml_']) {
        doc.namespaces.add('g_vml_', 'urn:schemas-microsoft-com:vml',
                           '#default#VML');

      }
      if (!doc.namespaces['g_o_']) {
        doc.namespaces.add('g_o_', 'urn:schemas-microsoft-com:office:office',
                           '#default#VML');
      }

      // Setup default CSS.  Only add one style sheet per document
      if (!doc.styleSheets['ex_canvas_']) {
        var ss = doc.createStyleSheet();
        ss.owningElement.id = 'ex_canvas_';
        ss.cssText = 'canvas{display:inline-block;overflow:hidden;' +
            // default size is 300x150 in Gecko and Opera
            'text-align:left;width:300px;height:150px}' +
            'g_vml_\\:*{behavior:url(#default#VML)}' +
            'g_o_\\:*{behavior:url(#default#VML)}';

      }

      // find all canvas elements
      var els = doc.getElementsByTagName('canvas');
      for (var i = 0; i < els.length; i++) {
        this.initElement(els[i]);
      }
    },

    /**
     * Public initializes a canvas element so that it can be used as canvas
     * element from now on. This is called automatically before the page is
     * loaded but if you are creating elements using createElement you need to
     * make sure this is called on the element.
     * @param {HTMLElement} el The canvas element to initialize.
     * @return {HTMLElement} the element that was created.
     */
    initElement: function(el) {
      if (!el.getContext) {

        el.getContext = getContext;

        // Remove fallback content. There is no way to hide text nodes so we
        // just remove all childNodes. We could hide all elements and remove
        // text nodes but who really cares about the fallback content.
        el.innerHTML = '';

        // do not use inline function because that will leak memory
        el.attachEvent('onpropertychange', onPropertyChange);
        el.attachEvent('onresize', onResize);

        var attrs = el.attributes;
        if (attrs.width && attrs.width.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setWidth_(attrs.width.nodeValue);
          el.style.width = attrs.width.nodeValue + 'px';
        } else {
          el.width = el.clientWidth;
        }
        if (attrs.height && attrs.height.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setHeight_(attrs.height.nodeValue);
          el.style.height = attrs.height.nodeValue + 'px';
        } else {
          el.height = el.clientHeight;
        }
        //el.getContext().setCoordsize_()
      }
      return el;
    }
  };

  function onPropertyChange(e) {
    var el = e.srcElement;

    switch (e.propertyName) {
      case 'width':
        el.style.width = el.attributes.width.nodeValue + 'px';
        el.getContext().clearRect();
        break;
      case 'height':
        el.style.height = el.attributes.height.nodeValue + 'px';
        el.getContext().clearRect();
        break;
    }
  }

  function onResize(e) {
    var el = e.srcElement;
    if (el.firstChild) {
      el.firstChild.style.width =  el.clientWidth + 'px';
      el.firstChild.style.height = el.clientHeight + 'px';
    }
  }

  G_vmlCanvasManager_.init();

  // precompute "00" to "FF"
  var dec2hex = [];
  for (var i = 0; i < 16; i++) {
    for (var j = 0; j < 16; j++) {
      dec2hex[i * 16 + j] = i.toString(16) + j.toString(16);
    }
  }

  function createMatrixIdentity() {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  function matrixMultiply(m1, m2) {
    var result = createMatrixIdentity();

    for (var x = 0; x < 3; x++) {
      for (var y = 0; y < 3; y++) {
        var sum = 0;

        for (var z = 0; z < 3; z++) {
          sum += m1[x][z] * m2[z][y];
        }

        result[x][y] = sum;
      }
    }
    return result;
  }

  function copyState(o1, o2) {
    o2.fillStyle     = o1.fillStyle;
    o2.lineCap       = o1.lineCap;
    o2.lineJoin      = o1.lineJoin;
    o2.lineWidth     = o1.lineWidth;
    o2.miterLimit    = o1.miterLimit;
    o2.shadowBlur    = o1.shadowBlur;
    o2.shadowColor   = o1.shadowColor;
    o2.shadowOffsetX = o1.shadowOffsetX;
    o2.shadowOffsetY = o1.shadowOffsetY;
    o2.strokeStyle   = o1.strokeStyle;
    o2.globalAlpha   = o1.globalAlpha;
    o2.font          = o1.font;
    o2.textAlign     = o1.textAlign;
    o2.textBaseline  = o1.textBaseline;
    o2.arcScaleX_    = o1.arcScaleX_;
    o2.arcScaleY_    = o1.arcScaleY_;
    o2.lineScale_    = o1.lineScale_;
	o2.rotation_	 = o1.rotation_; // used for images
  }

  function processStyle(styleString) {
    var str, alpha = 1;

    styleString = String(styleString);
    if (styleString.substring(0, 3) == 'rgb') {
      var start = styleString.indexOf('(', 3);
      var end = styleString.indexOf(')', start + 1);
      var guts = styleString.substring(start + 1, end).split(',');

      str = '#';
      for (var i = 0; i < 3; i++) {
        str += dec2hex[Number(guts[i])];
      }

      if (guts.length == 4 && styleString.substr(3, 1) == 'a') {
        alpha = guts[3];
      }
    } else {
      str = styleString;
    }

    return {color: str, alpha: alpha};
  }

  function processLineCap(lineCap) {
    switch (lineCap) {
      case 'butt':
        return 'flat';
      case 'round':
        return 'round';
      case 'square':
      default:
        return 'square';
    }
  }

  /**
   * This class implements CanvasRenderingContext2D interface as described by
   * the WHATWG.
   * @param {HTMLElement} surfaceElement The element that the 2D context should
   * be associated with
   */
  function CanvasRenderingContext2D_(surfaceElement) {
    this.m_ = createMatrixIdentity();

    this.mStack_ = [];
    this.aStack_ = [];
    this.currentPath_ = [];

    // Canvas context properties
    this.strokeStyle = '#000';
    this.fillStyle = '#000';

    this.lineWidth = 1;
    this.lineJoin = 'miter';
    this.lineCap = 'butt';
    this.miterLimit = Z * 1;
    this.globalAlpha = 1;
    this.font = '10px sans-serif';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.canvas = surfaceElement;

    var el = surfaceElement.ownerDocument.createElement('div');
    el.style.width =  surfaceElement.clientWidth + 'px';
    el.style.height = surfaceElement.clientHeight + 'px';
    el.style.overflow = 'hidden';
    el.style.position = 'absolute';
    surfaceElement.appendChild(el);

    this.element_ = el;
    this.arcScaleX_ = 1;
    this.arcScaleY_ = 1;
    this.lineScale_ = 1;
	this.rotation_ = 0;
  }

  var contextPrototype = CanvasRenderingContext2D_.prototype;
  contextPrototype.clearRect = function() {
    this.element_.innerHTML = '';
  };

  contextPrototype.beginPath = function() {
    // TODO: Branch current matrix so that save/restore has no effect
    //       as per safari docs.
    this.currentPath_ = [];
  };

  contextPrototype.moveTo = function(aX, aY) {
    var p = this.getCoords_(aX, aY);
    this.currentPath_.push({type: 'moveTo', x: p.x, y: p.y});
    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.lineTo = function(aX, aY) {
    var p = this.getCoords_(aX, aY);
    this.currentPath_.push({type: 'lineTo', x: p.x, y: p.y});

    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.bezierCurveTo = function(aCP1x, aCP1y,
                                            aCP2x, aCP2y,
                                            aX, aY) {
    var p = this.getCoords_(aX, aY);
    var cp1 = this.getCoords_(aCP1x, aCP1y);
    var cp2 = this.getCoords_(aCP2x, aCP2y);
    bezierCurveTo(this, cp1, cp2, p);
  };

  // Helper function that takes the already fixed cordinates.
  function bezierCurveTo(self, cp1, cp2, p) {
    self.currentPath_.push({
      type: 'bezierCurveTo',
      cp1x: cp1.x,
      cp1y: cp1.y,
      cp2x: cp2.x,
      cp2y: cp2.y,
      x: p.x,
      y: p.y
    });
    self.currentX_ = p.x;
    self.currentY_ = p.y;
  }

  contextPrototype.quadraticCurveTo = function(aCPx, aCPy, aX, aY) {
    // the following is lifted almost directly from
    // http://developer.mozilla.org/en/docs/Canvas_tutorial:Drawing_shapes

    var cp = this.getCoords_(aCPx, aCPy);
    var p = this.getCoords_(aX, aY);

    var cp1 = {
      x: this.currentX_ + 2.0 / 3.0 * (cp.x - this.currentX_),
      y: this.currentY_ + 2.0 / 3.0 * (cp.y - this.currentY_)
    };
    var cp2 = {
      x: cp1.x + (p.x - this.currentX_) / 3.0,
      y: cp1.y + (p.y - this.currentY_) / 3.0
    };

    bezierCurveTo(this, cp1, cp2, p);
  };

  contextPrototype.arc = function(aX, aY, aRadius,
                                  aStartAngle, aEndAngle, aClockwise) {
    aRadius *= Z;
    var arcType = aClockwise ? 'at' : 'wa';

    var xStart = aX + mc(aStartAngle) * aRadius - Z2;
    var yStart = aY + ms(aStartAngle) * aRadius - Z2;

    var xEnd = aX + mc(aEndAngle) * aRadius - Z2;
    var yEnd = aY + ms(aEndAngle) * aRadius - Z2;

    // IE won't render arches drawn counter clockwise if xStart == xEnd.
    if (xStart == xEnd && !aClockwise) {
      xStart += 0.125; // Offset xStart by 1/80 of a pixel. Use something
                       // that can be represented in binary
    }

    var p = this.getCoords_(aX, aY);
    var pStart = this.getCoords_(xStart, yStart);
    var pEnd = this.getCoords_(xEnd, yEnd);

    this.currentPath_.push({type: arcType,
                           x: p.x,
                           y: p.y,
                           radius: aRadius,
                           xStart: pStart.x,
                           yStart: pStart.y,
                           xEnd: pEnd.x,
                           yEnd: pEnd.y});

  };

  contextPrototype.rect = function(aX, aY, aWidth, aHeight) {
    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
  };

  contextPrototype.strokeRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.stroke();

    this.currentPath_ = oldPath;
  };

  contextPrototype.fillRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.fill();

    this.currentPath_ = oldPath;
  };

  contextPrototype.createLinearGradient = function(aX0, aY0, aX1, aY1) {
    var gradient = new CanvasGradient_('gradient');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    return gradient;
  };

  contextPrototype.createRadialGradient = function(aX0, aY0, aR0,
                                                   aX1, aY1, aR1) {
    var gradient = new CanvasGradient_('gradientradial');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.r0_ = aR0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    gradient.r1_ = aR1;
    return gradient;
  };

  getTheDistanceTo = function(from, to) {
		var x0 = from.x,
			y0 = from.y,
			x1 = to.x,
			y1 = to.y,
			distance = Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));
		return distance;
	};
	
	//origin is Center point for the rotation
	doRotate = function(angle, origin, rotatingObject) { 
		angle *= Math.PI / 180;
        var radius = getTheDistanceTo(rotatingObject, origin);
        var theta = angle + Math.atan2(rotatingObject.y - origin.y, rotatingObject.x - origin.x);
        rotatingObject.x = origin.x + (radius * Math.cos(theta));
        rotatingObject.y = origin.y + (radius * Math.sin(theta));
	};
	
	getAdjustedBounds = function(bounds, theObject) {
		if (bounds && theObject) {
			if ( (bounds.left == null) || (theObject.left < bounds.left)) {
				bounds.left = theObject.left;
			}
			if ( (bounds.bottom == null) || (theObject.bottom < bounds.bottom) ) {
				bounds.bottom = theObject.bottom;
			} 
			if ( (bounds.right == null) || (theObject.right > bounds.right) ) {
				bounds.right = theObject.right;
			}
			if ( (bounds.top == null) || (theObject.top > bounds.top) ) { 
				bounds.top = theObject.top;
			}
		}
	};
	
	// See OpenLayers.debug.js (the function 'graphicRotate'). Specifically towards the end
	// when it uses the bounds of 'imgBox'. The code in this function ('getAdjustedTopLeft') and in 
	// 'getTheDistanceTo', 'doRotate', 'getAdjustedBounds' is based off the code in 'graphicRotate' 
	getAdjustedTopLeft = function(locX, locY, xOffset, yOffset, width, height, angle) {
		var centerPoint = {   // will be origin for doRotate
				x: -xOffset,
				y: -yOffset
			},
			leftBottom = {
				x: 0,
				y: 0
			},
			rightBottom = {
				x: width,
				y: 0
			},
			rightTop = {
				x: width,
				y: height
			},
			leftTop = {
				x: 0,
				y: height
			},
			bounds = {
				left: null,
				bottom: null,
				right:null,
				top: null
			},
			unadjustedLeft = locX + xOffset,
			unadjustedTop = locY + yOffset;
			
		doRotate(angle, centerPoint, leftBottom);
		doRotate(angle, centerPoint, rightBottom);
		doRotate(angle, centerPoint, rightTop);
		doRotate(angle, centerPoint, leftTop);
		
		getAdjustedBounds(bounds, {left: leftBottom.x, bottom: leftBottom.y, right: leftBottom.x, top:leftBottom.y});
		getAdjustedBounds(bounds, {left: rightBottom.x, bottom: rightBottom.y, right: rightBottom.x, top:rightBottom.y});
		getAdjustedBounds(bounds, {left: rightTop.x, bottom: rightTop.y, right: rightTop.x, top:rightTop.y});
		getAdjustedBounds(bounds, {left: leftTop.x, bottom: leftTop.y, right: leftTop.x, top:leftTop.y});

		return {
			top: Math.round(unadjustedTop + bounds.bottom), // in openLayers the code does top - bottom. That didn't work here. top + bottom did work.
			left: Math.round(unadjustedLeft + bounds.left)
		};
	}
  
  // The rotate code in drawImage doesn't work so well, so we needed to
  // write our own function. (Sometimes when zooming in alot it would draw an image at the 
  // top left corner even though it doesn't belong there.) 
  // Much of it is based off the original drawImage. Also based off
  // OpenLayers.debug.js (the function 'graphicRotate'). See comment before the function 'getAdjustedTopLeft'.
  // Note: We are leaving the rotate functionality in drawImage, in case someone can figure out a better way to 
  // fix the issue.
  contextPrototype.drawImageWithRotate = function(image, locX, locY, xOffset, yOffset, 
													theWidth, theHeight, theRotate) {
	// to fix new Image() we check the existance of runtimeStyle
	var rts = image.runtimeStyle.width;

	// to find the original width we overide the width and height
	if(rts) {
		var oldRuntimeWidth = image.runtimeStyle.width;
		var oldRuntimeHeight = image.runtimeStyle.height;

		image.runtimeStyle.width = 'auto';
		image.runtimeStyle.height = 'auto';	  
	}

	// get the original size
	var w = image.width;
	var h = image.height;

	// and remove overides
	if(rts) {
		image.runtimeStyle.width = oldRuntimeWidth;
		image.runtimeStyle.height = oldRuntimeHeight;		
	}

	sx = sy = 0;
	sw = w;
	sh = h;

	var d = this.getCoords_(xOffset, yOffset);

	var w2 = sw / 2;
	var h2 = sh / 2;

	var vmlStr = [];

	var scaleX = scaleY = 1;

	// FIX: divs give better quality then vml image and also fixes transparent PNG's
	vmlStr.push(' <div style="position:absolute;');

	var filter = [];

	// Scaling images using width & height instead of Transform Matrix
	// because of quality loss
	var c = mc(this.rotation_);	
	var s = ms(this.rotation_);

	// Inverse rotation matrix
	var irm = [
		[c,  -s, 0],
		[s, c, 0],
		[0,  0, 1]
	];	

	// Get unrotated matrix to get only scaling values
	var urm = matrixMultiply(irm, this.m_);	  
	scaleX = urm[0][0];
	scaleY = urm[1][1];

	var rad = Math.PI/180;
	var _rad = theRotate * rad ;
	var costheta = Math.cos(_rad);
	var sintheta = Math.sin(_rad);

	filter.push('M11=', costheta, ',',
	'M12=', -sintheta, ',',
	'M21=', sintheta, ',',
	'M22=', costheta);

	var adjustedTopLeft = getAdjustedTopLeft(locX, locY, xOffset, yOffset, theWidth, theHeight, theRotate);
	vmlStr.push('top:', adjustedTopLeft.top, 'px;left:', adjustedTopLeft.left, 'px;filter:progid:DXImageTransform.Microsoft.Matrix(',
		filter.join(''), ", sizingmethod='auto expand');");

	vmlStr.push(' ">');    

	// Apply scales to width and height
	vmlStr.push('<div style="width:', Math.round(scaleX * w * theWidth / sw), 'px;',
		' height:', Math.round(scaleY * h * theHeight / sh), 'px;',
		' filter:');

	// If there is a globalAlpha, apply it to image
	if(this.globalAlpha < 1) {
		vmlStr.push(' progid:DXImageTransform.Microsoft.Alpha(opacity=' + (this.globalAlpha * 100) + ')');
	}

	vmlStr.push(' progid:DXImageTransform.Microsoft.AlphaImageLoader(src=', image.src, ',sizingMethod=scale)">');

	vmlStr.push('</div></div>');

	this.element_.insertAdjacentHTML('beforeEnd', vmlStr.join(''));
  };
  
  contextPrototype.drawImage = function(image) {
    var dx, dy, dw, dh, sx, sy, sw, sh;
	
    // to fix new Image() we check the existance of runtimeStyle
    var rts = image.runtimeStyle.width;
	
    // to find the original width we overide the width and height
    if(rts) {
      var oldRuntimeWidth = image.runtimeStyle.width;
      var oldRuntimeHeight = image.runtimeStyle.height;
      		
      image.runtimeStyle.width = 'auto';
      image.runtimeStyle.height = 'auto';	  
    }

    // get the original size
    var w = image.width;
    var h = image.height;
	
    // and remove overides
    if(rts) {
      image.runtimeStyle.width = oldRuntimeWidth;
      image.runtimeStyle.height = oldRuntimeHeight;		
    }
	
    if (arguments.length == 3) {
      dx = arguments[1];
      dy = arguments[2];
      sx = sy = 0;
      sw = dw = w;
      sh = dh = h;
    } else if (arguments.length == 5) {
      dx = arguments[1];
      dy = arguments[2];
      dw = arguments[3];
      dh = arguments[4];
      sx = sy = 0;
      sw = w;
      sh = h;
    } else if (arguments.length == 9) {
      sx = arguments[1];
      sy = arguments[2];
      sw = arguments[3];
      sh = arguments[4];
      dx = arguments[5];
      dy = arguments[6];
      dw = arguments[7];
      dh = arguments[8];
    } else {
      throw Error('Invalid number of arguments');
    }

    var d = this.getCoords_(dx, dy);

    var w2 = sw / 2;
    var h2 = sh / 2;

    var vmlStr = [];

    var W = 10;
    var H = 10;
	
    var scaleX = scaleY = 1;
	
    // FIX: divs give better quality then vml image and also fixes transparent PNG's
    vmlStr.push(' <div style="position:absolute;');

    // If filters are necessary (rotation exists), create them
    // filters are bog-slow, so only create them if abbsolutely necessary
    // The following check doesn't account for skews (which don't exist
    // in the canvas spec (yet) anyway.
    if (this.m_[0][0] != 1 || this.m_[0][1] ||
        this.m_[1][1] != 1 || this.m_[1][0]) {
      var filter = [];

      // Scaling images using width & height instead of Transform Matrix
      // because of quality loss
      var c = mc(this.rotation_);	
      var s = ms(this.rotation_);
      
      // Inverse rotation matrix
      var irm = [
        [c,  -s, 0],
        [s, c, 0],
        [0,  0, 1]
      ];	
	
      // Get unrotated matrix to get only scaling values
      var urm = matrixMultiply(irm, this.m_);	  
      scaleX = urm[0][0];
      scaleY = urm[1][1];
    
      // Apply only rotation and translation to Matrix
      filter.push('M11=', c, ',',
                  'M12=', -s, ',',
                  'M21=', s, ',',
                  'M22=', c, ',',
                  'Dx=', d.x / Z, ',',
                  'Dy=', d.y / Z);

      // Bounding box calculation (need to minimize displayed area so that
      // filters don't waste time on unused pixels.
      var max = d;
      var c2 = this.getCoords_(dx + dw, dy);
      var c3 = this.getCoords_(dx, dy + dh);
      var c4 = this.getCoords_(dx + dw, dy + dh);

      max.x = m.max(max.x, c2.x, c3.x, c4.x);
      max.y = m.max(max.y, c2.y, c3.y, c4.y);

      vmlStr.push('padding:0 ', mr(max.x / Z), 'px ', mr(max.y / Z),
                  'px 0;filter:progid:DXImageTransform.Microsoft.Matrix(',
                  filter.join(''), ", sizingmethod='clip');");
    } else {
      vmlStr.push('top:', mr(d.y / Z), 'px;left:', mr(d.x / Z), 'px;');
    }

    vmlStr.push(' ">');

    // Draw a special cropping div if needed
    if (sx || sy) {
      // Apply scales to width and height
      vmlStr.push('<div style="overflow: hidden; width:', Math.ceil((dw + sx * dw / sw) * scaleX), 'px;',
                  ' height:', Math.ceil((dh + sy * dh / sh) * scaleY), 'px;',
                  ' filter:progid:DxImageTransform.Microsoft.Matrix(Dx=',
                  -sx * dw / sw * scaleX, ',Dy=', -sy * dh / sh * scaleY, ');">');
    }
    
      
    // Apply scales to width and height
    vmlStr.push('<div style="width:', Math.round(scaleX * w * dw / sw), 'px;',
                ' height:', Math.round(scaleY * h * dh / sh), 'px;',
                ' filter:');
   
    // If there is a globalAlpha, apply it to image
    if(this.globalAlpha < 1) {
      vmlStr.push(' progid:DXImageTransform.Microsoft.Alpha(opacity=' + (this.globalAlpha * 100) + ')');
    }
    
    vmlStr.push(' progid:DXImageTransform.Microsoft.AlphaImageLoader(src=', image.src, ',sizingMethod=scale)">');
    
    // Close the crop div if necessary            
    if (sx || sy) vmlStr.push('</div>');
    
    vmlStr.push('</div></div>');
    
    this.element_.insertAdjacentHTML('beforeEnd', vmlStr.join(''));
  };

  contextPrototype.stroke = function(aFill) {
    var lineStr = [];
    var lineOpen = false;
    var a = processStyle(aFill ? this.fillStyle : this.strokeStyle);
    var color = a.color;
    var opacity = a.alpha * this.globalAlpha;

    var W = 10;
    var H = 10;

    lineStr.push('<g_vml_:shape',
                 ' filled="', !!aFill, '"',
                 ' style="position:absolute;width:', W, 'px;height:', H, 'px;"',
                 ' coordorigin="0 0" coordsize="', Z * W, ' ', Z * H, '"',
                 ' stroked="', !aFill, '"',
                 ' path="');

    var newSeq = false;
    var min = {x: null, y: null};
    var max = {x: null, y: null};

    for (var i = 0; i < this.currentPath_.length; i++) {
      var p = this.currentPath_[i];
      var c;

      switch (p.type) {
        case 'moveTo':
          c = p;
          lineStr.push(' m ', mr(p.x), ',', mr(p.y));
          break;
        case 'lineTo':
          lineStr.push(' l ', mr(p.x), ',', mr(p.y));
          break;
        case 'close':
          lineStr.push(' x ');
          p = null;
          break;
        case 'bezierCurveTo':
          lineStr.push(' c ',
                       mr(p.cp1x), ',', mr(p.cp1y), ',',
                       mr(p.cp2x), ',', mr(p.cp2y), ',',
                       mr(p.x), ',', mr(p.y));
          break;
        case 'at':
        case 'wa':
          lineStr.push(' ', p.type, ' ',
                       mr(p.x - this.arcScaleX_ * p.radius), ',',
                       mr(p.y - this.arcScaleY_ * p.radius), ' ',
                       mr(p.x + this.arcScaleX_ * p.radius), ',',
                       mr(p.y + this.arcScaleY_ * p.radius), ' ',
                       mr(p.xStart), ',', mr(p.yStart), ' ',
                       mr(p.xEnd), ',', mr(p.yEnd));
          break;
      }


      // TODO: Following is broken for curves due to
      //       move to proper paths.

      // Figure out dimensions so we can do gradient fills
      // properly
      if (p) {
        if (min.x == null || p.x < min.x) {
          min.x = p.x;
        }
        if (max.x == null || p.x > max.x) {
          max.x = p.x;
        }
        if (min.y == null || p.y < min.y) {
          min.y = p.y;
        }
        if (max.y == null || p.y > max.y) {
          max.y = p.y;
        }
      }
    }
    lineStr.push(' ">');

    if (!aFill) {
      var lineWidth = this.lineScale_ * this.lineWidth;

      // VML cannot correctly render a line if the width is less than 1px.
      // In that case, we dilute the color to make the line look thinner.
      if (lineWidth < 1) {
        opacity *= lineWidth;
      }

      lineStr.push(
        '<g_vml_:stroke',
        ' opacity="', opacity, '"',
        ' joinstyle="', this.lineJoin, '"',
        ' miterlimit="', this.miterLimit, '"',
        ' endcap="', processLineCap(this.lineCap), '"',
        ' weight="', lineWidth, 'px"',
        ' color="', color, '" />'
      );
    } else if (typeof this.fillStyle == 'object') {
      var fillStyle = this.fillStyle;
      var angle = 0;
      var focus = {x: 0, y: 0};

      // additional offset
      var shift = 0;
      // scale factor for offset
      var expansion = 1;

      if (fillStyle.type_ == 'gradient') {
        var x0 = fillStyle.x0_ / this.arcScaleX_;
        var y0 = fillStyle.y0_ / this.arcScaleY_;
        var x1 = fillStyle.x1_ / this.arcScaleX_;
        var y1 = fillStyle.y1_ / this.arcScaleY_;
        var p0 = this.getCoords_(x0, y0);
        var p1 = this.getCoords_(x1, y1);
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        angle = Math.atan2(dx, dy) * 180 / Math.PI;

        // The angle should be a non-negative number.
        if (angle < 0) {
          angle += 360;
        }

        // Very small angles produce an unexpected result because they are
        // converted to a scientific notation string.
        if (angle < 1e-6) {
          angle = 0;
        }
      } else {
        var p0 = this.getCoords_(fillStyle.x0_, fillStyle.y0_);
        var width  = max.x - min.x;
        var height = max.y - min.y;
        focus = {
          x: (p0.x - min.x) / width,
          y: (p0.y - min.y) / height
        };

        width  /= this.arcScaleX_ * Z;
        height /= this.arcScaleY_ * Z;
        var dimension = m.max(width, height);
        shift = 2 * fillStyle.r0_ / dimension;
        expansion = 2 * fillStyle.r1_ / dimension - shift;
      }

      // We need to sort the color stops in ascending order by offset,
      // otherwise IE won't interpret it correctly.
      var stops = fillStyle.colors_;
      stops.sort(function(cs1, cs2) {
        return cs1.offset - cs2.offset;
      });

      var length = stops.length;
      var color1 = stops[0].color;
      var color2 = stops[length - 1].color;
      var opacity1 = stops[0].alpha * this.globalAlpha;
      var opacity2 = stops[length - 1].alpha * this.globalAlpha;

      var colors = [];
      for (var i = 0; i < length; i++) {
        var stop = stops[i];
        colors.push(stop.offset * expansion + shift + ' ' + stop.color);
      }

      // When colors attribute is used, the meanings of opacity and o:opacity2
      // are reversed.
      lineStr.push('<g_vml_:fill type="', fillStyle.type_, '"',
                   ' method="none" focus="100%"',
                   ' color="', color1, '"',
                   ' color2="', color2, '"',
                   ' colors="', colors.join(','), '"',
                   ' opacity="', opacity2, '"',
                   ' g_o_:opacity2="', opacity1, '"',
                   ' angle="', angle, '"',
                   ' focusposition="', focus.x, ',', focus.y, '" />');
    } else {
      lineStr.push('<g_vml_:fill color="', color, '" opacity="', opacity,
                   '" />');
    }

    lineStr.push('</g_vml_:shape>');

    this.element_.insertAdjacentHTML('beforeEnd', lineStr.join(''));
  };

  contextPrototype.fill = function() {
    this.stroke(true);
  }

  contextPrototype.closePath = function() {
    this.currentPath_.push({type: 'close'});
  };

  /**
   * @private
   */
  contextPrototype.getCoords_ = function(aX, aY) {
    var m = this.m_;
    return {
      x: Z * (aX * m[0][0] + aY * m[1][0] + m[2][0]) - Z2,
      y: Z * (aX * m[0][1] + aY * m[1][1] + m[2][1]) - Z2
    }
  };

  contextPrototype.save = function() {
    var o = {};
    copyState(this, o);
    this.aStack_.push(o);
    this.mStack_.push(this.m_);
    this.m_ = matrixMultiply(createMatrixIdentity(), this.m_);
  };

  contextPrototype.restore = function() {
    copyState(this.aStack_.pop(), this);
    this.m_ = this.mStack_.pop();
  };

  function matrixIsFinite(m) {
    for (var j = 0; j < 3; j++) {
      for (var k = 0; k < 2; k++) {
        if (!isFinite(m[j][k]) || isNaN(m[j][k])) {
          return false;
        }
      }
    }
    return true;
  }

  function setM(ctx, m, updateLineScale) {
    if (!matrixIsFinite(m)) {
      return;
    }
    ctx.m_ = m;

    if (updateLineScale) {
      // Get the line scale.
      // Determinant of this.m_ means how much the area is enlarged by the
      // transformation. So its square root can be used as a scale factor
      // for width.
      var det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
      ctx.lineScale_ = sqrt(abs(det));
    }
  }

  contextPrototype.translate = function(aX, aY) {
    var m1 = [
      [1,  0,  0],
      [0,  1,  0],
      [aX, aY, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.rotate = function(aRot) {
    var c = mc(aRot);
    var s = ms(aRot);
	
	this.rotation_ += aRot;

    var m1 = [
      [c,  s, 0],
      [-s, c, 0],
      [0,  0, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.scale = function(aX, aY) {
    this.arcScaleX_ *= aX;
    this.arcScaleY_ *= aY;
    var m1 = [
      [aX, 0,  0],
      [0,  aY, 0],
      [0,  0,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);
  };

  contextPrototype.transform = function(m11, m12, m21, m22, dx, dy) {
    var m1 = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);
  };

  contextPrototype.setTransform = function(m11, m12, m21, m22, dx, dy) {
    var m = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, m, true);
  };
    /////
  function encodeHtmlAttribute(s) {
      return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }
    /////
  var DEFAULT_STYLE = {
      style: 'normal',
      variant: 'normal',
      weight: 'normal',
      size: 10,
      family: 'sans-serif'
  };

    // Internal text style cache
  var fontStyleCache = {};

  function processFontStyle(styleString) {
      if (fontStyleCache[styleString]) {
          return fontStyleCache[styleString];
      }

      var el = document.createElement('div');
      var style = el.style;
      try {
          style.font = styleString;
      } catch (ex) {
          // Ignore failures to set to invalid font.
      }

      return fontStyleCache[styleString] = {
          style: style.fontStyle || DEFAULT_STYLE.style,
          variant: style.fontVariant || DEFAULT_STYLE.variant,
          weight: style.fontWeight || DEFAULT_STYLE.weight,
          size: style.fontSize || DEFAULT_STYLE.size,
          family: style.fontFamily || DEFAULT_STYLE.family
      };
  }

  function getComputedStyle(style, element) {
      var computedStyle = {};

      for (var p in style) {
          computedStyle[p] = style[p];
      }

      // Compute the size
      var canvasFontSize = parseFloat(element.currentStyle.fontSize),
          fontSize = parseFloat(style.size);

      if (typeof style.size == 'number') {
          computedStyle.size = style.size;
      } else if (style.size.indexOf('px') != -1) {
          computedStyle.size = fontSize;
      } else if (style.size.indexOf('em') != -1) {
          computedStyle.size = canvasFontSize * fontSize;
      } else if (style.size.indexOf('%') != -1) {
          computedStyle.size = (canvasFontSize / 100) * fontSize;
      } else if (style.size.indexOf('pt') != -1) {
          computedStyle.size = fontSize / .75;
      } else {
          computedStyle.size = canvasFontSize;
      }

      // Different scaling between normal text and VML text. This was found using
      // trial and error to get the same size as non VML text.
      computedStyle.size *= 0.981;

      return computedStyle;
  }

  function buildStyle(style) {
      return style.style + ' ' + style.variant + ' ' + style.weight + ' ' +
          style.size + 'px ' + style.family;
  }
    /////
  function appendFill(ctx, lineStr, min, max) {
      var fillStyle = ctx.fillStyle;
      var arcScaleX = ctx.arcScaleX_;
      var arcScaleY = ctx.arcScaleY_;
      var width = max.x - min.x;
      var height = max.y - min.y;
      if (fillStyle instanceof CanvasGradient_) {
          // TODO: Gradients transformed with the transformation matrix.
          var angle = 0;
          var focus = { x: 0, y: 0 };

          // additional offset
          var shift = 0;
          // scale factor for offset
          var expansion = 1;

          if (fillStyle.type_ == 'gradient') {
              var x0 = fillStyle.x0_ / arcScaleX;
              var y0 = fillStyle.y0_ / arcScaleY;
              var x1 = fillStyle.x1_ / arcScaleX;
              var y1 = fillStyle.y1_ / arcScaleY;
              var p0 = getCoords(ctx, x0, y0);
              var p1 = getCoords(ctx, x1, y1);
              var dx = p1.x - p0.x;
              var dy = p1.y - p0.y;
              angle = Math.atan2(dx, dy) * 180 / Math.PI;

              // The angle should be a non-negative number.
              if (angle < 0) {
                  angle += 360;
              }

              // Very small angles produce an unexpected result because they are
              // converted to a scientific notation string.
              if (angle < 1e-6) {
                  angle = 0;
              }
          } else {
              var p0 = getCoords(ctx, fillStyle.x0_, fillStyle.y0_);
              focus = {
                  x: (p0.x - min.x) / width,
                  y: (p0.y - min.y) / height
              };

              width /= arcScaleX * Z;
              height /= arcScaleY * Z;
              var dimension = m.max(width, height);
              shift = 2 * fillStyle.r0_ / dimension;
              expansion = 2 * fillStyle.r1_ / dimension - shift;
          }

          // We need to sort the color stops in ascending order by offset,
          // otherwise IE won't interpret it correctly.
          var stops = fillStyle.colors_;
          stops.sort(function (cs1, cs2) {
              return cs1.offset - cs2.offset;
          });

          var length = stops.length;
          var color1 = stops[0].color;
          var color2 = stops[length - 1].color;
          var opacity1 = stops[0].alpha * ctx.globalAlpha;
          var opacity2 = stops[length - 1].alpha * ctx.globalAlpha;

          var colors = [];
          for (var i = 0; i < length; i++) {
              var stop = stops[i];
              colors.push(stop.offset * expansion + shift + ' ' + stop.color);
          }

          // When colors attribute is used, the meanings of opacity and o:opacity2
          // are reversed.
          lineStr.push('<g_vml_:fill type="', fillStyle.type_, '"',
                       ' method="none" focus="100%"',
                       ' color="', color1, '"',
                       ' color2="', color2, '"',
                       ' colors="', colors.join(','), '"',
                       ' opacity="', opacity2, '"',
                       ' g_o_:opacity2="', opacity1, '"',
                       ' angle="', angle, '"',
                       ' focusposition="', focus.x, ',', focus.y, '" />');
      } else if (fillStyle instanceof CanvasPattern_) {
          if (width && height) {
              var deltaLeft = -min.x;
              var deltaTop = -min.y;
              lineStr.push('<g_vml_:fill',
                           ' position="',
                           deltaLeft / width * arcScaleX * arcScaleX, ',',
                           deltaTop / height * arcScaleY * arcScaleY, '"',
                           ' type="tile"',
                           // TODO: Figure out the correct size to fit the scale.
                           //' size="', w, 'px ', h, 'px"',
                           ' src="', fillStyle.src_, '" />');
          }
      } else {
          var a = processStyle(ctx.fillStyle);
          var color = a.color;
          var opacity = a.alpha * ctx.globalAlpha;
          lineStr.push('<g_vml_:fill color="', color, '" opacity="', opacity,
                       '" />');
      }
  }
    /////
    /**
   * The text drawing function.
   * The maxWidth argument isn't taken in account, since no browser supports
   * it yet.
   */
  contextPrototype.drawText_ = function (text, x, y, maxWidth, stroke) {
      var m = this.m_,
          delta = 1000,
          left = 0,
          right = delta,
          offset = { x: 0, y: 0 },
          lineStr = [];

      var fontStyle = getComputedStyle(processFontStyle(this.font),
                                       this.element_);

      var fontStyleString = buildStyle(fontStyle);

      var elementStyle = this.element_.currentStyle;
      var textAlign = this.textAlign.toLowerCase();
      switch (textAlign) {
          case 'left':
          case 'center':
          case 'right':
              break;
          case 'end':
              textAlign = elementStyle.direction == 'ltr' ? 'right' : 'left';
              break;
          case 'start':
              textAlign = elementStyle.direction == 'rtl' ? 'right' : 'left';
              break;
          default:
              textAlign = 'left';
      }

      // 1.75 is an arbitrary number, as there is no info about the text baseline
      switch (this.textBaseline) {
          case 'hanging':
          case 'top':
              offset.y = fontStyle.size / 1.75;
              break;
          case 'middle':
              break;
          default:
          case null:
          case 'alphabetic':
          case 'ideographic':
          case 'bottom':
              offset.y = -fontStyle.size / 2.25;
              break;
      }

      switch (textAlign) {
          case 'right':
              left = delta;
              right = 0.05;
              break;
          case 'center':
              left = right = delta / 2;
              break;
      }

      //var d = getCoords(this, x + offset.x, y + offset.y);
      var d = this.getCoords_(x + offset.x, y + offset.y);

      lineStr.push('<g_vml_:line from="', -left, ' 0" to="', right, ' 0.05" ',
                   ' coordsize="100 100" coordorigin="0 0"',
                   ' filled="', !stroke, '" stroked="', !!stroke,
                   '" style="position:absolute;width:1px;height:1px;">');

      if (stroke) {
          appendStroke(this, lineStr);
      } else {
          // TODO: Fix the min and max params.
          appendFill(this, lineStr, { x: -left, y: 0 },
                     { x: right, y: fontStyle.size });
      }

      var skewM = m[0][0].toFixed(3) + ',' + m[1][0].toFixed(3) + ',' +
                  m[0][1].toFixed(3) + ',' + m[1][1].toFixed(3) + ',0,0';

      var skewOffset = mr(d.x / Z) + ',' + mr(d.y / Z);

      lineStr.push('<g_vml_:skew on="t" matrix="', skewM, '" ',
                   ' offset="', skewOffset, '" origin="', left, ' 0" />',
                   '<g_vml_:path textpathok="true" />',
                   '<g_vml_:textpath on="true" string="',
                   encodeHtmlAttribute(text),
                   '" style="v-text-align:', textAlign,
                   ';font:', encodeHtmlAttribute(fontStyleString),
                   '" /></g_vml_:line>');

      this.element_.insertAdjacentHTML('beforeEnd', lineStr.join(''));
  };

  contextPrototype.fillText = function (text, x, y, maxWidth) {
      this.drawText_(text, x, y, maxWidth, false);
  };

  contextPrototype.strokeText = function (text, x, y, maxWidth) {
      this.drawText_(text, x, y, maxWidth, true);
  };

  contextPrototype.measureText = function (text) {
      if (!this.textMeasureEl_) {
          var s = '<span style="position:absolute;' +
              'top:-20000px;left:0;padding:0;margin:0;border:none;' +
              'white-space:pre;"></span>';
          this.element_.insertAdjacentHTML('beforeEnd', s);
          this.textMeasureEl_ = this.element_.lastChild;
      }
      var doc = this.element_.ownerDocument;
      this.textMeasureEl_.innerHTML = '';
      this.textMeasureEl_.style.font = this.font;
      // Don't use innerHTML or innerText because they allow markup/whitespace.
      this.textMeasureEl_.appendChild(doc.createTextNode(text));
      return { width: this.textMeasureEl_.offsetWidth };
  };
    /////

  /******** STUBS ********/
  contextPrototype.clip = function() {
    // TODO: Implement
  };

  contextPrototype.arcTo = function() {
    // TODO: Implement
  };

  contextPrototype.createPattern = function() {
    return new CanvasPattern_;
  };

  // Gradient / Pattern Stubs
  function CanvasGradient_(aType) {
    this.type_ = aType;
    this.x0_ = 0;
    this.y0_ = 0;
    this.r0_ = 0;
    this.x1_ = 0;
    this.y1_ = 0;
    this.r1_ = 0;
    this.colors_ = [];
  }

  CanvasGradient_.prototype.addColorStop = function(aOffset, aColor) {
    aColor = processStyle(aColor);
    this.colors_.push({offset: aOffset,
                       color: aColor.color,
                       alpha: aColor.alpha});
  };

  function CanvasPattern_() {}

  // set up externs
  G_vmlCanvasManager = G_vmlCanvasManager_;
  CanvasRenderingContext2D = CanvasRenderingContext2D_;
  CanvasGradient = CanvasGradient_;
  CanvasPattern = CanvasPattern_;

})();

} // if
/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4, unparam: true*/
/*global $, google, document, setTimeout, clearTimeout, console, Image, G_vmlCanvasManager, util, jc2cui*/

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.markerOverlay = (function () {
    "use strict";

    var images = {},
        noNativeCanvas = !document.createElement('canvas').getContext,
        nameLengthMap = {}; // IE fake measureText very slow. Only do once per name...

    function MarkerOverlay(map, doc) {
        google.maps.OverlayView.call(this);
        this.setValues({ map: map });
        this.placemarks = [];
        this.doc = doc;
        this.markerLayer = $('<div class="marker-overlay"/>');
        this.mouseOverTimeout = 0;
        this.toolTip = null;
        this.projection = null;
        this.leftCanvas = 0;
        this.topCanvas = 0;
        this.needsSorting = true;

        var that = this,
            overlayId,
            featureId;

        while (doc) {
            if (doc.overlayId) {
                overlayId = doc.overlayId;
                featureId = doc.featureId;
                break;
            }
            doc = doc.parent;
        }

        this.mouseOutMapListener = google.maps.event.addListener(map, 'mouseout', function (e) {
            clearTimeout(that.mouseOverTimeout);
            if (that.toolTip !== null) {
                $('.markerCanvas', map.getDiv()).css('cursor', 'inherit');
                that.toolTip.remove();
            }
        });

        this.clickMapListener = google.maps.event.addListener(map, 'click', function (mouseEvent) {
            var point,
                p,
                placemark,
                item;
            clearTimeout(that.mouseOverTimeout);
            if (that.toolTip !== null) {
                $('.markerCanvas', map.getDiv()).css('cursor', 'inherit');
                that.toolTip.remove();
            }

            if (mouseEvent.handled) {
                return;
            }

            if (that.projection === null) {
                return;
            }

            point = that.projection.fromLatLngToDivPixel(mouseEvent.latLng);
            point.x = point.x - that.leftCanvas;
            point.y = point.y - that.topCanvas;

            for (p = (that.placemarks.length - 1); p >= 0; p--) {
                placemark = that.placemarks[p].placemark;

                if (!placemark.visible) {
                    continue;
                }

                if (!placemark.hitRegion) {
                    continue;
                }

                if ((placemark.hitRegion.minX <= point.x && placemark.hitRegion.maxX >= point.x) &&
                        (placemark.hitRegion.minY <= point.y && placemark.hitRegion.maxY >= point.y)) {
                    item = {
                        selectedId: placemark.id || undefined,
                        selectedName: placemark.name || undefined,
                        featureId: featureId,
                        overlayId: overlayId
                    };

                    jc2cui.mapWidget.showPlacemarkInfoWindow(placemark);
                    jc2cui.mapWidget.itemSelected(item);

                    mouseEvent.handled = true;
                    break;
                }
            }
        });

        this.mouseMoveMapListener = google.maps.event.addListener(map, 'mousemove', function (mouseEvent) {
            var point,
                p,
                placemark;

            // endless mouse moves in IE
            if (mouseEvent.latLng.equals(this.lastMouseMove)) {
                return;
            }
            this.lastMouseMove = mouseEvent.latLng;

            if (that.toolTip !== null) {
                $('.markerCanvas', map.getDiv()).css('cursor', 'inherit');
                that.toolTip.remove();
            }
            clearTimeout(that.mouseOverTimeout);

            that.mouseOverTimeout = setTimeout(function () {
                if (mouseEvent.handled) {
                    return;
                }

                if (that.projection === null) {
                    return;
                }

                point = that.projection.fromLatLngToDivPixel(mouseEvent.latLng);
                point.x = point.x - that.leftCanvas;
                point.y = point.y - that.topCanvas;

                for (p = (that.placemarks.length - 1); p >= 0; p--) {
                    placemark = that.placemarks[p].placemark;

                    if (!placemark.visible || !placemark.hitRegion || !placemark.name) {
                        continue;
                    }

                    if ((placemark.hitRegion.minX <= point.x && placemark.hitRegion.maxX >= point.x) &&
                                    (placemark.hitRegion.minY <= point.y && placemark.hitRegion.maxY >= point.y)) {
                        $('.markerCanvas', map.getDiv()).css('cursor', 'pointer');
                        that.toolTip = $('<span class="placeMarkTooltip">' + placemark.name + '</span>')
                            .appendTo(map.getDiv())
                            .css({
                                'left': (point.x + 18).toString() + 'px',
                                'top': (point.y - 9).toString() + 'px'
                            });
                        mouseEvent.handled = true;
                        break;
                    }
                }
            }, 500);
        });

        // draw() not necessarily called just because map moved - only if when the position from projection.fromLatLngToPixel() would return a new value for a given LatLng
        // see https://developers.google.com/maps/documentation/javascript/reference#OverlayView
        // Need to catch at least drag, resize, and pan - zoom will always be handled internally 
        this.boundsChangedListener = google.maps.event.addListener(map, 'bounds_changed', function () {
            //that.redrawNeeded = true;
            that.redraw(true);
        });

        /*this.idleListener = google.maps.event.addListener(map, 'idle', function () {
        if (that.redrawNeeded) {
        that.redraw();
        }
        });*/
    }

    // cant be called before dynamic load of google maps is complete!
    function init() {
        MarkerOverlay.prototype = new google.maps.OverlayView();

        MarkerOverlay.prototype.onAdd = function () {
            this.getPanes().overlayImage.appendChild(this.markerLayer[0]); // Pane 3
        };

        MarkerOverlay.prototype.removeFromMap = function () {
            if (this.ieMarkerOverlay) {
                this.ieMarkerOverlay.setMap(null);
            } else {
                this.setMap(null);
            }
        };

        MarkerOverlay.prototype.onRemove = function () {
            clearTimeout(this.mouseOverTimeout);
            if (this.toolTip !== null) {
                //$('.markerCanvas', map.getDiv()).css('cursor', 'inherit');
                this.toolTip.remove();
            }

            this.killCurrentDraw();

            google.maps.event.removeListener(this.mouseOutMapListener);
            google.maps.event.removeListener(this.clickMapListener);
            google.maps.event.removeListener(this.mouseMoveMapListener);
            google.maps.event.removeListener(this.boundsChangedListener);
            //google.maps.event.removeListener(this.idleListener);

            this.markerLayer.remove();
            delete this.markerLayer;
        };

        MarkerOverlay.prototype.hide = function () {
            if (this.ieMarkerOverlay) {
                this.ieMarkerOverlay.hide();
                return;
            }
            this.markerLayer.hide();
        };

        MarkerOverlay.prototype.show = function () {
            if (this.ieMarkerOverlay) {
                this.ieMarkerOverlay.show();
                return;
            }
            this.markerLayer.show();
        };

        MarkerOverlay.prototype.killCurrentDraw = function (force) {
            clearTimeout(this.redrawTimeout);
            clearTimeout(this.drawPlacemarksTimeout);
            this.canvas = null;
        };

        MarkerOverlay.prototype.addMarker = function (placemark, latLng) {
            placemark.addedToMarkerOverlay = true;
            if (this.ieMarkerOverlay) {
                this.ieMarkerOverlay.addMarker(placemark, latLng);
                return;
            }

            var that = this,
                href,
                ieMarkerOverlay;

            this.placemarks.push({ placemark: placemark, latLng: latLng });

            if (noNativeCanvas && this.placemarks.length >= 100) {
                this.killCurrentDraw();
                ieMarkerOverlay = new jc2cui.mapWidget.markerOverlayIE.MarkerOverlay(this.map, this.doc, this.placemarks);
                this.setMap(null);
                this.ieMarkerOverlay = ieMarkerOverlay;
                return;
            }

            this.needsSorting = true;
            if (placemark.visible) {
                this.redrawNeeded = true; // not really neccessary. parseComplete callback will call redraw
            }
            if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href) {
                href = placemark.style.IconStyle.Icon.href;
            } else {
                href = jc2cui.mapWidget.getDefaultIcon();
            }
            if (!images[href]) {
                images[href] = new Image();
                this.imagesLoading = this.imagesLoading ? this.imagesLoading + 1 : 1;
                images[href].onload = function () {
                    that.imagesLoading--;
                    if (that.needsDraw) {
                        that.needsDraw = false;
                        that.redraw(true);
                    }
                };

                images[href].onerror = function () {
                    console.log('Error thrown, image ' + images[href].src + ' didn\'t load, probably a 404.');
                    images[href].src = jc2cui.mapWidget.getErrorIcon();
                };

                images[href].src = href;
            }
        };

        MarkerOverlay.prototype.removeMarker = function (placemark) {
            placemark.addedToMarkerOverlay = false;
            if (this.ieMarkerOverlay) {
                this.ieMarkerOverlay.removeMarker(placemark);
                return;
            }

            var i = -1;
            $.each(this.placemarks, function (index, obj) {
                if (placemark === obj.placemark) {
                    i = index;
                    return false;
                }
            });
            if (i > -1) {
                this.placemarks.splice(i, 1);
            }
        };

        MarkerOverlay.prototype.redraw = function (force) {
            if (this.ieMarkerOverlay) {
                this.ieMarkerOverlay.redraw(force);
                return;
            }
            if (!this.markerLayer) {
                return;
            }
            var that = this;
            this.redrawNeeded = this.redrawNeeded || force;
            if (this.redrawNeeded) {
                this.killCurrentDraw();
                this.redrawTimeout = setTimeout(function () {
                    if (that.redrawNeeded) {
                        that.draw();
                    }
                }, noNativeCanvas ? 100 : 10);
            }
        };

        MarkerOverlay.prototype.placemarkVisibilityChanged = function (placemark) {
            if (this.ieMarkerOverlay) {
                return this.ieMarkerOverlay.placemarkVisibilityChanged(placemark);
            }

            // temp hack to force redraw when marker visibility MAY have changed - new capability
            // Dont redraw for each marker though....     
            this.redraw(true);
        };

        MarkerOverlay.prototype.drawPlacemarks = function (canvasToDrawOn, context, bounds, start) {
            var i,
                block = 500,
                placemark,
                loc,
                scale,
                w,
                h,
                xOffset,
                yOffset,
                locX,
                locY,
                href,
                textHeight = 10,
                len,
                that,
                drawLabels = jc2cui.mapWidget.options().labels && jc2cui.mapWidget.options().labels.value;

            start = start || 0;

            for (i = 0; i < this.placemarks.length && i < start + block; i++) {
                if (this.doc.removed) {
                    return;
                }
                if (this.canvas !== canvasToDrawOn) { // this draw was canceled
                    return;
                }

                placemark = this.placemarks[i].placemark;

                if (!placemark.visible) {
                    continue;
                }

                /*We use 3 rules for href. 
                1- If href has an icon URL, use it.
                2- If href is undefined, use the default icon. 
                3- If href is an empty string, do not use the default icon, but at the same time since there 
                is no icon URL specified, don't put a marker for the placemark (hence the code calls 'continue').*/
                if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href !== undefined && !placemark.style.IconStyle.Icon.href) {
                    continue;
                }

                // Not sure when, but IE7 gets here sometimes. Shouldnt, since ieMarkeroverlay already took over at that point. Meanwhile...
                if (!this.projection) {
                    return;
                }

                loc = this.projection.fromLatLngToDivPixel(this.placemarks[i].latLng);

                // hotspot support
                // WARNING --- Assumes most markers are 32 by 32
                // Default hotspot apparently (based on observing Earth) middle of icon
                // but if no icon provided we will use default earth API icon which has hot spot at bottom to left of middle
                scale = placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.scale ? placemark.style.IconStyle.scale : 1;

                // Google icons are 64x64 - Assuming all others are 32 X 32 for now....
                if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href && placemark.style.IconStyle.Icon.href.indexOf('http://maps.google.com/mapfiles/kml') >= 0) {
                    w = 64;
                    h = 64;
                    scale = scale / 2;
                } else {
                    w = 32;
                    h = 32;
                }

                if (scale === 0) {
                    continue;
                }

                w *= scale;
                h *= scale;

                if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.hotSpot) {
                    xOffset = placemark.style.IconStyle.hotSpot.x;
                    yOffset = placemark.style.IconStyle.hotSpot.y;
                    if (placemark.style.IconStyle.hotSpot.xunits === 'pixels') {
                        xOffset = -xOffset * scale;
                    }
                    if (placemark.style.IconStyle.hotSpot.xunits === 'insetPixels') {
                        xOffset = -w + (xOffset * scale);
                    }
                    if (placemark.style.IconStyle.hotSpot.xunits === 'fraction') {
                        xOffset = -w * xOffset;
                    }

                    if (placemark.style.IconStyle.hotSpot.yunits === 'pixels') {
                        yOffset = -h + (yOffset * scale) + 1;
                    }
                    if (placemark.style.IconStyle.hotSpot.yunits === 'insetPixels') {
                        yOffset = -(yOffset * scale) + 1;
                    }
                    if (placemark.style.IconStyle.hotSpot.yunits === 'fraction') {
                        yOffset = -h * (1 - yOffset) + 1;
                    }
                } else {
                    xOffset = placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href ? -w / 2 : -w * 0.625;
                    yOffset = -h / 2;
                }

                locX = loc.x - this.leftCanvas;
                locY = loc.y - this.topCanvas;

                placemark.hitRegion = placemark.hitRegion || {};
                placemark.hitRegion.minX = locX + xOffset;
                placemark.hitRegion.minY = locY + yOffset;
                placemark.hitRegion.maxX = locX + xOffset + w;
                placemark.hitRegion.maxY = locY + yOffset + h;
                href = placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href ? placemark.style.IconStyle.Icon.href : jc2cui.mapWidget.getDefaultIcon();

                // palette support
                if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.w) {
                    //placemark.style.IconStyle.Icon.y is position from the bottom
                    context.drawImage(images[href], placemark.style.IconStyle.Icon.x, images[href].height - placemark.style.IconStyle.Icon.y - placemark.style.IconStyle.Icon.h, placemark.style.IconStyle.Icon.w, placemark.style.IconStyle.Icon.h, locX + xOffset, locY + yOffset, w, h);
                } else {
                    if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.heading) {
                        context.save();

                        // move the origin to loc of image 
                        context.translate(locX, locY);

                        // rotate around this point
                        context.rotate(placemark.style.IconStyle.heading * Math.PI / 180);

                        // then draw the image at proper offset
                        if (!noNativeCanvas) {
                            context.drawImage(images[href], xOffset, yOffset, w, h);
                        } else {
                            context.drawImageWithRotate(images[href], locX, locY, xOffset, yOffset, w, h, placemark.style.IconStyle.heading);
                        }
                        context.restore();
                    } else {
                        context.drawImage(images[href], locX + xOffset, locY + yOffset, w, h);
                    }
                    if (placemark.name && placemark.name.length && drawLabels) {
                        if (noNativeCanvas) { // temp hack to to prevent excanavs bug where labels get drawn in random locations when offscreen - obviously not a real fix
                            if (!bounds.contains(this.placemarks[i].latLng)) {
                                continue;
                            }
                        }
                        context.font = textHeight + 'pt Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif';
                        context.fillStyle = "rgba(255, 255, 255, 0.5)";
                        // IE fake measureText very slow. Only do once
                        len = nameLengthMap[placemark.name] !== undefined ? nameLengthMap[placemark.name] : context.measureText(placemark.name).width;
                        if (noNativeCanvas) {
                            nameLengthMap[placemark.name] = len;
                        }
                        context.fillRect((locX + xOffset) - (len / 2) + (w / 2) - 1, locY + yOffset + h - (noNativeCanvas ? 3 : 1) - 1, len + (noNativeCanvas ? len * 0.07 : 0) + 1, textHeight + (noNativeCanvas ? 1 : 0) + 1);  // I.E. fake canvas calculations coming up just a bit short.
                        context.fillStyle = "blue";
                        context.fillText(placemark.name, (locX + xOffset) - (len / 2) + (w / 2), locY + yOffset + h + 8);
                    }
                }
            }

            if (i < this.placemarks.length) {
                that = this;
                this.drawPlacemarksTimeout = setTimeout(function () {
                    that.drawPlacemarks(canvasToDrawOn, context, bounds, i);
                }, 10); //1);
            } else {
                //lastDrawn = this.markerLayer.find(':last-child').detach().css('z-index', 0); breaks IE
                //this.markerLayer.empty().append(lastDrawn);
                $(this.canvas).css('z-index', 0).siblings().remove();
            }
        };

        MarkerOverlay.prototype.draw = function () {
            var bounds,
                context,
                locContainer,
                loc,
                that = this;

            this.projection = this.getProjection();

            // Cant draw if not yet added to map - (will draw when added)
            if (!this.projection) {
                return;
            }

            // Cant draw images not loaded yet. 
            if (this.imagesLoading && this.imagesLoading > 0) {
                this.needsDraw = true;
                return;
            }

            this.redrawNeeded = false;
            this.killCurrentDraw();

            if (noNativeCanvas) {
                bounds = this.map.getBounds();
            }

            // if zoomed changed, wipe out old immediately, else wait until new drawn
            if (this.lastZoom !== this.map.getZoom()) {
                this.markerLayer.empty();
                this.lastZoom = this.map.getZoom();
            }

            this.canvas = document.createElement("canvas");
            this.markerLayer.append(this.canvas);

            if (noNativeCanvas) { // support ie 8 and below and IE9 in OWF 3.8 (quirks mode)
                this.canvas = G_vmlCanvasManager.initElement(this.canvas);
            }

            context = this.canvas.getContext("2d");

            this.canvas.width = this.getMap().getDiv().scrollWidth;
            this.canvas.height = this.getMap().getDiv().scrollHeight;
            this.canvas.className = 'markerCanvas';

            this.topCanvas = 0;
            this.leftCanvas = 0;

            if (this.needsSorting) {
                this.placemarks.sort(function (p1, p2) {
                    return p2.latLng.lat() - p1.latLng.lat(); // sort placemarks higher latitudes on bottom
                });

                this.needsSorting = false;
            }

            // offset canvas to be placed at the correct position
            if (this.placemarks.length) {
                locContainer = this.projection.fromLatLngToContainerPixel(this.placemarks[0].latLng);
                loc = this.projection.fromLatLngToDivPixel(this.placemarks[0].latLng);

                this.topCanvas = loc.y - locContainer.y;
                this.leftCanvas = loc.x - locContainer.x;
                this.canvas.style.top = this.topCanvas + "px";
                this.canvas.style.left = this.leftCanvas + "px";
                this.canvas.style.zIndex = -1;
            }

            this.drawPlacemarksTimeout = setTimeout(function () {
                that.drawPlacemarks(that.canvas, context, bounds);
            }, 10);
        };
    }

    return {
        init: function () {
            init();
            if (noNativeCanvas) {
                jc2cui.mapWidget.markerOverlayIE.init();
            }
        },
        MarkerOverlay: MarkerOverlay
    };
}());/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4, unparam: true*/
/*global $, google, document, setTimeout, clearTimeout, console, util, jc2cui*/

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.markerOverlayIE = (function () {
    "use strict";

    var paletteSizes = {};

    function isSageArrow(placemark) {
        return placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href && placemark.style.IconStyle.Icon.href === 'https://sageearth.northcom.mil/TrackService/icons/white_outlined_arrow.png';
    }

    function MarkerOverlay(map, doc, placemarks) {
        google.maps.OverlayView.call(this);
        this.setValues({ map: map });
        this.placemarks = [];
        this.doc = doc;
        this.container = $('<div />');

        var that = this,
            overlayId,
            featureId,
            i;

        if (placemarks) {
            for (i = 0; i < placemarks.length; i++) {
                if (isSageArrow(placemarks[i].placemark)) {
                    placemarks[i].placemark.visible = placemarks[i].placemark.visibility = false;
                    continue;
                }
                placemarks[i].placemark.latLng = placemarks[i].latLng;
                this.placemarks.push(placemarks[i].placemark);
            }
        }

        while (doc) {
            if (doc.overlayId) {
                overlayId = doc.overlayId;
                featureId = doc.featureId;
                break;
            }
            doc = doc.parent;
        }

        this.click = function (event) {
            var placemark = that.placemarks[parseInt(event.target.id.substr(1), 10)],
                item = {
                    selectedId: placemark.id || undefined,
                    selectedName: placemark.name || undefined,
                    featureId: featureId,
                    overlayId: overlayId
                };
            jc2cui.mapWidget.showPlacemarkInfoWindow(placemark);
            jc2cui.mapWidget.itemSelected(item);
        };
    }

    // cant be called before dynamic load of google maps is complete!
    function init() {
        MarkerOverlay.prototype = new google.maps.OverlayView();

        MarkerOverlay.prototype.onAdd = function () {
            this.getPanes().overlayImage.appendChild(this.container[0]);
        };

        MarkerOverlay.prototype.onRemove = function () {
            this.container.remove();
        };

        MarkerOverlay.prototype.hide = function () {
            this.container.hide();
        };

        MarkerOverlay.prototype.show = function () {
            this.container.show();
        };

        MarkerOverlay.prototype.addMarker = function (placemark, latLng) {
            if (isSageArrow(placemark)) {
                placemark.visible = placemark.visibility = false;
                return;
            }
            placemark.latLng = latLng;
            this.placemarks.push(placemark);

            // palette support
            if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.w) {
                if (!paletteSizes[placemark.style.IconStyle.Icon.href]) {
                    paletteSizes[placemark.style.IconStyle.Icon.href] = {}; // placeholder
                    var tempImage = $('<img src="' + placemark.style.IconStyle.Icon.href + '"/></img>').appendTo('body'),
                        that = this;
                    this.paletteLoading = this.paletteLoading ? this.paletteLoading + 1 : 1;
                    tempImage.load(function () {
                        paletteSizes[placemark.style.IconStyle.Icon.href] = { height: tempImage.height(), width: tempImage.width() };
                        tempImage.remove();
                        that.paletteLoading--;
                        if (that.needsDraw) {
                            that.needsDraw = false;
                            that.redraw();
                        }
                    });
                }
            }

            if (placemark.visible) {
                this.forceRefresh = true;
            }
        };

        MarkerOverlay.prototype.removeMarker = function (placemark) {
            var i = -1;
            $.each(this.placemarks, function (index, pm) {
                if (placemark === pm) {
                    i = index;
                    return false;
                }
            });
            if (i > -1) {
                this.placemarks.splice(i, 1);
            }
        };

        MarkerOverlay.prototype.killCurrentDraw = function (force) {
            clearTimeout(this.redrawTimeout);
            clearTimeout(this.drawPlacemarksTimer);
            this.markerLayer = null;
        };

        MarkerOverlay.prototype.redraw = function () {
            var that = this;
            this.forceRefresh = true;
            this.killCurrentDraw();
            this.redrawTimeout = setTimeout(function () {
                if (that.forceRefresh) {
                    that.draw();
                }
            }, 100);
        };

        MarkerOverlay.prototype.placemarkVisibilityChanged = function (placemark) {
            // temp hack to force redraw when marker visibility MAY have changed - new capability
            // Dont redraw for each marker though....   
            if (isSageArrow(placemark)) {
                return false;
            }
            this.redraw();
        };

        // So many possibilities - I chose those I think will give best performance without doing ANY measurements.
        // See however
        // http://nickjohnson.com/b/google-maps-v3-how-to-quickly-add-many-marker
        // http://www.learningjquery.com/2009/03/43439-reasons-to-use-append-correctly
        MarkerOverlay.prototype.drawPlacemarks = function (projection, markerLayer, start) {
            var markerMarkup = [],
                i,
                placemark,
                loc,
                w,
                h,
                paletteSize, // rest of variables for palette support
                hDivisor = 1,
                wDivisor = 1,
                top,
                right,
                bottom,
                left,
                xOffset,
                yOffset,
                scale,
                block = 200,
                that = this,
                newPlacemarks,
                drawLabels = jc2cui.mapWidget.options().labels && jc2cui.mapWidget.options().labels.value;

            start = start || 0;
            for (i = start; i < this.placemarks.length  && i < start + block; i++) {
                if (this.doc.removed) {
                    return;
                }
                if (markerLayer !== this.markerLayer) {
                    return;
                }

                placemark = this.placemarks[i];

                if (!placemark.visible) {
                    continue;
                }

                /*We use 3 rules for href. 
                1- If href has an icon URL, use it.
                2- If href is undefined, use the default icon. 
                3- If href is an empty string, do not use the default icon, but at the same time since there 
                is no icon URL specified, don't put a marker for the placemark (hence the code calls 'continue').*/
                if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href !== undefined && !placemark.style.IconStyle.Icon.href) {
                    continue;
                }

                loc = projection.fromLatLngToDivPixel(this.placemarks[i].latLng);

                markerMarkup.push('<img id="t');
                markerMarkup.push(i);
                markerMarkup.push('" class="marker"');
                if (placemark.name && placemark.name.length > 0) {
                    markerMarkup.push(' title="');
                    markerMarkup.push(placemark.name);
                    markerMarkup.push('"');
                }
                markerMarkup.push(' style="z-index:');
                markerMarkup.push((-(Math.round((this.placemarks[i].latLng.lat() + 90) * 1000))) + 180000); // higher latitudes on bottom - (but selection messed up with negative z-indexes!)

                // hotspot support
                // WARNING --- Assumes most markers are 32 by 32
                // Default hotspot apparently (based on observing Earth) middle of icon
                // but if no icon provided we will use default earth API icon which has hot spot at bottom to left of middle
                scale = placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.scale ? placemark.style.IconStyle.scale : 1;
                // Google icons are 64x64 - Assuming all others are 32 X 32 for now....
                if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href && placemark.style.IconStyle.Icon.href.indexOf('http://maps.google.com/mapfiles/kml') >= 0) {
                    w = 64;
                    h = 64;
                    scale = scale / 2;
                } else {
                    w = 32;
                    h = 32;
                }

                w *= scale;
                h *= scale;

                if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.hotSpot) {
                    xOffset = placemark.style.IconStyle.hotSpot.x;
                    yOffset = placemark.style.IconStyle.hotSpot.y;
                    if (placemark.style.IconStyle.hotSpot.xunits === 'pixels') {
                        xOffset = -xOffset * scale;
                    }
                    if (placemark.style.IconStyle.hotSpot.xunits === 'insetPixels') {
                        xOffset = -w + (xOffset * scale);
                    }
                    if (placemark.style.IconStyle.hotSpot.xunits === 'fraction') {
                        xOffset = -w * xOffset;
                    }

                    if (placemark.style.IconStyle.hotSpot.yunits === 'pixels') {
                        yOffset = -h + (yOffset * scale) + 1;
                    }
                    if (placemark.style.IconStyle.hotSpot.yunits === 'insetPixels') {
                        yOffset = -(yOffset * scale) + 1;
                    }
                    if (placemark.style.IconStyle.hotSpot.yunits === 'fraction') {
                        yOffset = -h * (1 - yOffset) + 1;
                    }
                } else {
                    xOffset = placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href ? -w / 2 : -w * 0.625;
                    yOffset = -h / 2;
                }

                markerMarkup.push('; left:');
                markerMarkup.push(loc.x + xOffset);
                markerMarkup.push('px; top:');
                markerMarkup.push(loc.y + yOffset);
                markerMarkup.push('px;');

                // palette support
                if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.w) {
                    paletteSize = paletteSizes[placemark.style.IconStyle.Icon.href];

                    if ((placemark.style.IconStyle.Icon.h && placemark.style.IconStyle.Icon.h !== 32) || h !== 32) {
                        hDivisor = (placemark.style.IconStyle.Icon.h || 32) / h;
                        markerMarkup.push('height:');
                        markerMarkup.push(paletteSize.height / hDivisor);
                        markerMarkup.push('px;');
                    }
                    if ((placemark.style.IconStyle.Icon.w && placemark.style.IconStyle.Icon.w !== 32) || w !== 32) {
                        wDivisor = (placemark.style.IconStyle.Icon.w || 32) / w;
                        markerMarkup.push('width:');
                        markerMarkup.push(paletteSize.width / wDivisor);
                        markerMarkup.push('px;');
                    }
                    top = ((paletteSize.height - placemark.style.IconStyle.Icon.y) / hDivisor) - h;
                    right = (placemark.style.IconStyle.Icon.x / wDivisor) + w;
                    bottom = top + h; // ((paletteSize.height - placemark.style.y)) / hDivisor)
                    left = right - w; // placemark.style.x / wDivisor;
                    markerMarkup.push('clip: rect(');
                    markerMarkup.push(top);
                    markerMarkup.push('px,');
                    markerMarkup.push(right);
                    markerMarkup.push('px,');
                    markerMarkup.push(bottom);
                    markerMarkup.push('px,');
                    markerMarkup.push(left);
                    markerMarkup.push('px);');

                    markerMarkup.push('margin-left:');
                    markerMarkup.push(-(placemark.style.IconStyle.Icon.x / wDivisor));
                    markerMarkup.push('px;');

                    markerMarkup.push('margin-top:');
                    markerMarkup.push(-(paletteSize.height / hDivisor) + (placemark.style.IconStyle.Icon.y / hDivisor) + h);
                    markerMarkup.push('px;');
                } else {
                    if (h !== 32) {
                        markerMarkup.push('height:');
                        markerMarkup.push(h);
                        markerMarkup.push('px;');
                    }
                    if (w !== 32) {
                        markerMarkup.push('width:');
                        markerMarkup.push(w);
                        markerMarkup.push('px;');
                    }
                }

                // Works but IE filters too slow...
                /*if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.heading) {
                    cos = Math.cos(placemark.style.IconStyle.heading);
                    sin = Math.sin(placemark.style.IconStyle.heading);
                    markerMarkup.push('filter: progid:DXImageTransform.Microsoft.Matrix(M11=');
                    markerMarkup.push(cos);
                    markerMarkup.push(', M12=');
                    markerMarkup.push(-sin);
                    markerMarkup.push(', M21=');
                    markerMarkup.push(sin);
                    markerMarkup.push(', M22=');
                    markerMarkup.push(cos);
                    markerMarkup.push(",SizingMethod='auto expand');");
                }*/

                markerMarkup.push('" src="');
                markerMarkup.push(placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href ? placemark.style.IconStyle.Icon.href : jc2cui.mapWidget.getDefaultIcon());
                markerMarkup.push('">');

                if (placemark.name && placemark.name.length && drawLabels) {
                    markerMarkup.push('<div class="markerLabelOuter"');
                    markerMarkup.push('style="left:');
                    markerMarkup.push(loc.x + xOffset + (w / 2));
                    markerMarkup.push('px; top:');
                    markerMarkup.push(loc.y + yOffset + (h / 2) + 8);
                    markerMarkup.push('px;');
                    markerMarkup.push('"><span class="markerLabelInner">');
                    markerMarkup.push(placemark.name);
                    markerMarkup.push('</span>');
                    //markerMarkup.push('<div class="markerLabelBackground"></div>'); --- to slow
                    markerMarkup.push('</div>');
                }
            }

            newPlacemarks = markerLayer.append(markerMarkup.join(''));

            $('img', newPlacemarks).one('error', function () { this.src = jc2cui.mapWidget.getErrorIcon(); });

            if (i < this.placemarks.length) {
                this.drawPlacemarksTimer = setTimeout(function () {
                    that.drawPlacemarks(projection, markerLayer, i);
                }, 10);
            } else {
                markerLayer.detach().css('z-index', 0);
                this.container.empty().append(markerLayer);
            }
        };

        MarkerOverlay.prototype.draw = function () {
            var projection = this.getProjection(),
                loc,
                zoom,
                that = this;

            // Cant draw if not yet added to map - (will draw when added)
            if (!projection) {
                return;
            }

            // Cant draw if palettes not loaded yet. We wont know sizes
            if (this.paletteLoading && this.paletteLoading > 0) {
                this.needsDraw = true;
                return;
            }

            if (this.placemarks.length) {
                loc = projection.fromLatLngToDivPixel(this.placemarks[0].latLng);
                zoom = this.map.getZoom();
                if (this.lastZoom === zoom && !this.forceRefresh && loc.equals(this.lastFirstLoc)) {
                    return;
                }
            }
            this.forceRefresh = false;
            this.killCurrentDraw();

            this.lastFirstLoc = loc;
            this.lastZoom = zoom;

            this.markerLayer = $('<div class="marker-overlay"/>').click(this.click);
            this.container.append(this.markerLayer);

            this.drawPlacemarksTimer = setTimeout(function () {
                that.drawPlacemarks(projection, that.markerLayer);
            }, 10);
        };
    }

    return {
        init: function () {
            init();
        },
        MarkerOverlay: MarkerOverlay
    };
}());/*jslint browser: true, confusion: true, sloppy: true, vars: true, nomen: false, plusplus: false, indent: 2 */
/*global window, google */

// JC2CUI modified
// - Dont leave out markers at very north or south of earth
// - Dont cause extra redraws when zoom doesnt change
// - Dont cause multiple redraws when using many clusterers
// - Pass cluster to calculator not just its markers
// - Dont convert bounds to pixels - use bounds - WAY faster
// - Keep a hash of markers rather then searching for each one when being removed - WAY faster
// - When updating an existing cluster icon (on batch process of large number of markers) dont
//      update things that couldnt have changed (especially position). - WAY faster
// - Dont search for a marker within a cluster (loop through entire array each time) to determine 
//      if its already added.Just save the cluster in the marker (instead of the old boolean - added)

/**
 * @name MarkerClustererPlus for Google Maps V3
 * @version 2.0.15 [October 18, 2012]
 * @author Gary Little
 * @fileoverview
 * The library creates and manages per-zoom-level clusters for large amounts of markers.
 * <p>
 * This is an enhanced V3 implementation of the
 * <a href="http://gmaps-utility-library-dev.googlecode.com/svn/tags/markerclusterer/"
 * >V2 MarkerClusterer</a> by Xiaoxi Wu. It is based on the
 * <a href="http://google-maps-utility-library-v3.googlecode.com/svn/tags/markerclusterer/"
 * >V3 MarkerClusterer</a> port by Luke Mahe. MarkerClustererPlus was created by Gary Little.
 * <p>
 * v2.0 release: MarkerClustererPlus v2.0 is backward compatible with MarkerClusterer v1.0. It
 *  adds support for the <code>ignoreHidden</code>, <code>title</code>, <code>printable</code>,
 *  <code>batchSizeIE</code>, and <code>calculator</code> properties as well as support for
 *  four more events. It also allows greater control over the styling of the text that appears
 *  on the cluster marker. The documentation has been significantly improved and the overall
 *  code has been simplified and polished. Very large numbers of markers can now be managed
 *  without causing Javascript timeout errors on Internet Explorer. Note that the name of the
 *  <code>clusterclick</code> event has been deprecated. The new name is <code>click</code>,
 *  so please change your application code now.
 */

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * @name ClusterIconStyle
 * @class This class represents the object for values in the <code>styles</code> array passed
 *  to the {@link MarkerClusterer} constructor. The element in this array that is used to
 *  style the cluster icon is determined by calling the <code>calculator</code> function.
 *
 * @property {string} url The URL of the cluster icon image file. Required.
 * @property {number} height The height (in pixels) of the cluster icon. Required.
 * @property {number} width The width (in pixels) of the cluster icon. Required.
 * @property {Array} [anchor] The anchor position (in pixels) of the label text to be shown on
 *  the cluster icon, relative to the top left corner of the icon.
 *  The format is <code>[yoffset, xoffset]</code>. The <code>yoffset</code> must be positive
 *  and less than <code>height</code> and the <code>xoffset</code> must be positive and less
 *  than <code>width</code>. The default is to anchor the label text so that it is centered
 *  on the icon.
 * @property {Array} [anchorIcon] The anchor position (in pixels) of the cluster icon. This is the
 *  spot on the cluster icon that is to be aligned with the cluster position. The format is
 *  <code>[yoffset, xoffset]</code> where <code>yoffset</code> increases as you go down and
 *  <code>xoffset</code> increases to the right. The default anchor position is the center of the
 *  cluster icon.
 * @property {string} [textColor="black"] The color of the label text shown on the
 *  cluster icon.
 * @property {number} [textSize=11] The size (in pixels) of the label text shown on the
 *  cluster icon.
 * @property {number} [textDecoration="none"] The value of the CSS <code>text-decoration</code>
 *  property for the label text shown on the cluster icon.
 * @property {number} [fontWeight="bold"] The value of the CSS <code>font-weight</code>
 *  property for the label text shown on the cluster icon.
 * @property {number} [fontStyle="normal"] The value of the CSS <code>font-style</code>
 *  property for the label text shown on the cluster icon.
 * @property {number} [fontFamily="Arial,sans-serif"] The value of the CSS <code>font-family</code>
 *  property for the label text shown on the cluster icon.
 * @property {string} [backgroundPosition="0 0"] The position of the cluster icon image
 *  within the image defined by <code>url</code>. The format is <code>"xpos ypos"</code>
 *  (the same format as for the CSS <code>background-position</code> property). You must set
 *  this property appropriately when the image defined by <code>url</code> represents a sprite
 *  containing multiple images.
 */
/**
 * @name ClusterIconInfo
 * @class This class is an object containing general information about a cluster icon. This is
 *  the object that a <code>calculator</code> function returns.
 *
 * @property {string} text The text of the label to be shown on the cluster icon.
 * @property {number} index The index plus 1 of the element in the <code>styles</code>
 *  array to be used to style the cluster icon.
 * @property {string} title The tooltip to display when the mouse moves over the cluster icon.
 *  If this value is <code>undefined</code> or <code>""</code>, <code>title</code> is set to the
 *  value of the <code>title</code> property passed to the MarkerClusterer.
 */
/**
 * A cluster icon.
 *
 * @constructor
 * @extends google.maps.OverlayView
 * @param {Cluster} cluster The cluster with which the icon is to be associated.
 * @param {Array} [styles] An array of {@link ClusterIconStyle} defining the cluster icons
 *  to use for various cluster sizes.
 * @private
 */
function ClusterIcon(cluster, styles) {
    cluster.getMarkerClusterer().extend(ClusterIcon, google.maps.OverlayView);

    this.cluster_ = cluster;
    this.className_ = cluster.getMarkerClusterer().getClusterClass();
    this.styles_ = styles;
    this.center_ = null;
    this.div_ = null;
    this.sums_ = null;
    this.visible_ = false;

    this.setMap(cluster.getMap()); // Note: this causes onAdd to be called
}

/**
 * Adds the icon to the DOM.
 */
ClusterIcon.prototype.onAdd = function () {
    var cClusterIcon = this;
    var cMouseDownInCluster;
    var cDraggingMapByCluster;

    this.div_ = document.createElement("div");
    this.div_.className = this.className_;
    if (this.visible_) {
        this.show();
    }

    this.getPanes().overlayMouseTarget.appendChild(this.div_);

    // Fix for Issue 157
    google.maps.event.addListener(this.getMap(), "bounds_changed", function () {
        cDraggingMapByCluster = cMouseDownInCluster;
    });

    google.maps.event.addDomListener(this.div_, "mousedown", function () {
        cMouseDownInCluster = true;
        cDraggingMapByCluster = false;
    });

    google.maps.event.addDomListener(this.div_, "click", function (e) {
        cMouseDownInCluster = false;
        if (!cDraggingMapByCluster) {
            var theBounds;
            var mz;
            var mc = cClusterIcon.cluster_.getMarkerClusterer();
            /**
             * This event is fired when a cluster marker is clicked.
             * @name MarkerClusterer#click
             * @param {Cluster} c The cluster that was clicked.
             * @event
             */
            google.maps.event.trigger(mc, "click", cClusterIcon.cluster_);
            google.maps.event.trigger(mc, "clusterclick", cClusterIcon.cluster_); // deprecated name

            // The default click handler follows. Disable it by setting
            // the zoomOnClick property to false.
            if (mc.getZoomOnClick()) {
                // Zoom into the cluster.
                mz = mc.getMaxZoom();
                theBounds = cClusterIcon.cluster_.getBounds();
                jc2cui.mapWidget.renderer.fitToBounds(theBounds);
                // There is a fix for Issue 170 here:
                setTimeout(function () {
                    jc2cui.mapWidget.renderer.fitToBounds(theBounds);
                    // Don't zoom beyond the max zoom level
                    if (mz !== null && (mc.getMap().getZoom() > mz)) {
                        mc.getMap().setZoom(mz + 1);
                    }
                }, 100);
            }

            // Prevent event propagation to the map:
            e.cancelBubble = true;
            if (e.stopPropagation) {
                e.stopPropagation();
            }
        }
    });

    google.maps.event.addDomListener(this.div_, "mouseover", function () {
        var mc = cClusterIcon.cluster_.getMarkerClusterer();
        /**
         * This event is fired when the mouse moves over a cluster marker.
         * @name MarkerClusterer#mouseover
         * @param {Cluster} c The cluster that the mouse moved over.
         * @event
         */
        google.maps.event.trigger(mc, "mouseover", cClusterIcon.cluster_);
    });

    google.maps.event.addDomListener(this.div_, "mouseout", function () {
        var mc = cClusterIcon.cluster_.getMarkerClusterer();
        /**
         * This event is fired when the mouse moves out of a cluster marker.
         * @name MarkerClusterer#mouseout
         * @param {Cluster} c The cluster that the mouse moved out of.
         * @event
         */
        google.maps.event.trigger(mc, "mouseout", cClusterIcon.cluster_);
    });
};

/**
 * Removes the icon from the DOM.
 */
ClusterIcon.prototype.onRemove = function () {
    if (this.div_ && this.div_.parentNode) {
        this.hide();
        google.maps.event.clearInstanceListeners(this.div_);
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
    }
};

/**
 * Draws the icon.
 */
ClusterIcon.prototype.draw = function () {
    if (this.visible_) {
        var pos = this.getPosFromLatLng_(this.center_);
        this.div_.style.top = pos.y + "px";
        this.div_.style.left = pos.x + "px";
    }
};

/**
 * Hides the icon.
 */
ClusterIcon.prototype.hide = function () {
    if (this.div_) {
        this.div_.style.display = "none";
    }
    this.visible_ = false;
};

/**
 * Positions and shows the icon.
 */
ClusterIcon.prototype.show = function (posMayHaveChanged) {
    if (this.div_) {
        if (posMayHaveChanged || !this.div_.style.cssText.length) {
            var pos = this.getPosFromLatLng_(this.center_);
            this.div_.style.cssText = this.createCss(pos);
        }
        if (this.cluster_.printable_) {
            // (Would like to use "width: inherit;" below, but doesn't work with MSIE)
            this.div_.innerHTML = "<img src='" + this.url_ + "'><div style='position: absolute; top: 0px; left: 0px; width: " + this.width_ + "px;'>" + this.sums_.text + "</div>";
        } else {
            this.div_.innerHTML = this.sums_.text;
        }
        if (typeof this.sums_.title === "undefined" || this.sums_.title === "") {
            this.div_.title = this.cluster_.getMarkerClusterer().getTitle();
        } else {
            this.div_.title = this.sums_.title;
        }
    }
    this.visible_ = true;
};

/**
 * Sets the icon styles to the appropriate element in the styles array.
 *
 * @param {ClusterIconInfo} sums The icon label text and styles index.
 */
ClusterIcon.prototype.useStyle = function (sums) {
    this.sums_ = sums;
    var index = Math.max(0, sums.index - 1);
    index = Math.min(this.styles_.length - 1, index);
    var style = this.styles_[index];
    this.url_ = style.url;
    this.height_ = style.height;
    this.width_ = style.width;
    this.anchor_ = style.anchor;
    this.anchorIcon_ = style.anchorIcon || [parseInt(this.height_ / 2, 10), parseInt(this.width_ / 2, 10)];
    this.textColor_ = style.textColor || "black";
    this.textSize_ = style.textSize || 11;
    this.textDecoration_ = style.textDecoration || "none";
    this.fontWeight_ = style.fontWeight || "bold";
    this.fontStyle_ = style.fontStyle || "normal";
    this.fontFamily_ = style.fontFamily || "Arial,sans-serif";
    this.backgroundPosition_ = style.backgroundPosition || "0 0";
};

/**
 * Sets the position at which to center the icon.
 *
 * @param {google.maps.LatLng} center The latlng to set as the center.
 */
ClusterIcon.prototype.setCenter = function (center) {
    this.center_ = center;
};

/**
 * Creates the cssText style parameter based on the position of the icon.
 *
 * @param {google.maps.Point} pos The position of the icon.
 * @return {string} The CSS style text.
 */
ClusterIcon.prototype.createCss = function (pos) {
    var style = [];
    if (!this.cluster_.printable_) {
        style.push('background-image:url(' + this.url_ + ');');
        style.push('background-position:' + this.backgroundPosition_ + ';');
    }

    if (typeof this.anchor_ === 'object') {
        if (typeof this.anchor_[0] === 'number' && this.anchor_[0] > 0 &&
            this.anchor_[0] < this.height_) {
            style.push('height:' + (this.height_ - this.anchor_[0]) +
                'px; padding-top:' + this.anchor_[0] + 'px;');
        } else {
            style.push('height:' + this.height_ + 'px; line-height:' + this.height_ +
                'px;');
        }
        if (typeof this.anchor_[1] === 'number' && this.anchor_[1] > 0 &&
            this.anchor_[1] < this.width_) {
            style.push('width:' + (this.width_ - this.anchor_[1]) +
                'px; padding-left:' + this.anchor_[1] + 'px;');
        } else {
            style.push('width:' + this.width_ + 'px; text-align:center;');
        }
    } else {
        style.push('height:' + this.height_ + 'px; line-height:' +
            this.height_ + 'px; width:' + this.width_ + 'px; text-align:center;');
    }

    style.push('cursor:pointer; top:' + pos.y + 'px; left:' +
        pos.x + 'px; color:' + this.textColor_ + '; position:absolute; font-size:' +
        this.textSize_ + 'px; font-family:' + this.fontFamily_ + '; font-weight:' +
        this.fontWeight_ + '; font-style:' + this.fontStyle_ + '; text-decoration:' +
        this.textDecoration_ + ';');

    return style.join("");
};

/**
 * Returns the position at which to place the DIV depending on the latlng.
 *
 * @param {google.maps.LatLng} latlng The position in latlng.
 * @return {google.maps.Point} The position in pixels.
 */
ClusterIcon.prototype.getPosFromLatLng_ = function (latlng) {
    var pos = this.getProjection().fromLatLngToDivPixel(latlng);
    pos.x -= this.anchorIcon_[1];
    pos.y -= this.anchorIcon_[0];
    return pos;
};

/**
 * Creates a single cluster that manages a group of proximate markers.
 *  Used internally, do not call this constructor directly.
 * @constructor
 * @param {MarkerClusterer} mc The <code>MarkerClusterer</code> object with which this
 *  cluster is associated.
 */
function Cluster(mc) {
    this.markerClusterer_ = mc;
    this.map_ = mc.getMap();
    this.gridSize_ = mc.getGridSize();
    this.minClusterSize_ = mc.getMinimumClusterSize();
    this.averageCenter_ = mc.getAverageCenter();
    this.printable_ = mc.getPrintable();
    this.markers_ = [];
    this.center_ = null;
    this.bounds_ = null;
    this.clusterIcon_ = new ClusterIcon(this, mc.getStyles());
}

Cluster.prototype.getAttributes = function () {
    return this.attributes_;
};

/**
 * Returns the number of markers managed by the cluster. You can call this from
 * a <code>click</code>, <code>mouseover</code>, or <code>mouseout</code> event handler
 * for the <code>MarkerClusterer</code> object.
 *
 * @return {number} The number of markers in the cluster.
 */
Cluster.prototype.getSize = function () {
    return this.markers_.length;
};

/**
 * Returns the array of markers managed by the cluster. You can call this from
 * a <code>click</code>, <code>mouseover</code>, or <code>mouseout</code> event handler
 * for the <code>MarkerClusterer</code> object.
 *
 * @return {Array} The array of markers in the cluster.
 */
Cluster.prototype.getMarkers = function () {
    return this.markers_;
};

/**
 * Returns the center of the cluster. You can call this from
 * a <code>click</code>, <code>mouseover</code>, or <code>mouseout</code> event handler
 * for the <code>MarkerClusterer</code> object.
 *
 * @return {google.maps.LatLng} The center of the cluster.
 */
Cluster.prototype.getCenter = function () {
    return this.center_;
};

/**
 * Returns the map with which the cluster is associated.
 *
 * @return {google.maps.Map} The map.
 * @ignore
 */
Cluster.prototype.getMap = function () {
    return this.map_;
};

/**
 * Returns the <code>MarkerClusterer</code> object with which the cluster is associated.
 *
 * @return {MarkerClusterer} The associated marker clusterer.
 * @ignore
 */
Cluster.prototype.getMarkerClusterer = function () {
    return this.markerClusterer_;
};

/**
 * Returns the bounds of the cluster.
 *
 * @return {google.maps.LatLngBounds} the cluster bounds.
 * @ignore
 */
Cluster.prototype.getBounds = function () {
    var i;
    var bounds = new google.maps.LatLngBounds(this.center_, this.center_);
    var markers = this.getMarkers();
    for (i = 0; i < markers.length; i++) {
        bounds.extend(markers[i].getPosition());
    }
    return bounds;
};

/**
 * Removes the cluster from the map.
 *
 * @ignore
 */
Cluster.prototype.remove = function () {
    this.clusterIcon_.setMap(null);
    delete this.markers_;
};

/**
 * Adds a marker to the cluster.
 *
 * @param {google.maps.Marker} marker The marker to be added.
 * @return {boolean} True if the marker was added.
 * @ignore
 */
Cluster.prototype.addMarker = function (marker) {
    var i;
    var mCount;
    var mz;

    if (this === marker.cluster) {
        return false;
    }

    if (!this.center_) {
        this.center_ = marker.getPosition();
        this.calculateBounds_();
    } else {
        if (this.averageCenter_) {
            var l = this.markers_.length + 1;
            var lat = (this.center_.lat() * (l - 1) + marker.getPosition().lat()) / l;
            var lng = (this.center_.lng() * (l - 1) + marker.getPosition().lng()) / l;
            this.center_ = new google.maps.LatLng(lat, lng);
            this.calculateBounds_();
        }
    }

    marker.cluster = this;
    this.markers_.push(marker);

    mCount = this.markers_.length;

    // Initial marker sets up this clusters attributes and rollups if being used
    if (mCount === 1) {
        this.configureAttributesAndRollups_(marker);
    }
    this.performRollup_(marker);

    mz = this.markerClusterer_.getMaxZoom();
    if (mz !== null && this.map_.getZoom() > mz) {
        // Zoomed in past max zoom, so show the marker.
        if (marker.getMap() !== this.map_) {
            marker.setMap(this.map_);
        }
    } else if (mCount < this.minClusterSize_) {
        // Min cluster size not reached so show the marker.
        if (marker.getMap() !== this.map_) {
            marker.setMap(this.map_);
        }
    } else if (mCount === this.minClusterSize_) {
        // Hide the markers that were showing.
        for (i = 0; i < mCount; i++) {
            this.markers_[i].setMap(null);
        }
    } else {
        marker.setMap(null);
    }

    this.updateIcon_(this.averageCenter_);
    return true;
};

Cluster.prototype.configureAttributesAndRollups_ = function (marker) {
    var attributes = this.markerClusterer_.getAttributes(),
        rollups = this.markerClusterer_.getRollups(),
        i;

    if (attributes && attributes.length) {
        this.attributes_ = {};
        for (i = 0; i < attributes.length; i++) {
            this.attributes_[attributes[i]] = (marker.placemark.extendedData ? marker.placemark.extendedData[attributes[i]] : undefined);
        }
    }

    if (rollups && rollups.length) {
        this.attributes_ = this.attributes_ || {};
        for (i = 0; i < rollups.length; i++) {
            attribute = rollups[i].attribute;
            if (!attribute) {
                continue;
            }
            rollup = this.attributes_[attribute];
            if (!rollup) {
                rollup = this.attributes_[attribute] = {};
                vals = rollups[i].values;
                if (vals && vals.length) {
                    for (j = 0; j < vals.length; j++) {
                        rollup[vals[j]] = 0;
                    }
                }
            }
        }
    }
}

Cluster.prototype.doMarkerAttributesMatch = function (marker) {
    var attributes = this.markerClusterer_.getAttributes(),
        i;

    if (!attributes) {
        return true;
    }

    for (i = 0; i < attributes.length; i++) {
        if (this.attributes_[attributes[i]] !== (marker.placemark.extendedData ? marker.placemark.extendedData[attributes[i]] : undefined)) {
            return false;
        }
    }
    return true;
};

Cluster.prototype.performRollup_ = function (marker) {
    var rollups = this.markerClusterer_.getRollups(),
        attribute,
        rollup,
        i,
        val;

    if (!rollups || !rollups.length) {
        return;
    }

    for (i = 0; i < rollups.length; i++) {
        attribute = rollups[i].attribute;
        if (!attribute) {
            continue;
        }
        rollup = this.attributes_[attribute];
        val = marker.placemark.extendedData ? marker.placemark.extendedData[attribute] : undefined;
        if (!val || !val.length) {
            val = '_other_';
        }
        rollup[val] = typeof rollup[val] === 'undefined' ? 1 : rollup[val] + 1;
    }
}

/**
 * Calculates the extended bounds of the cluster with the grid.
 */
Cluster.prototype.calculateBounds_ = function () {
    var bounds = new google.maps.LatLngBounds(this.center_, this.center_);
    this.bounds_ = this.markerClusterer_.getExtendedBounds(bounds);
};

/**
 * Updates the cluster icon.
 */
Cluster.prototype.updateIcon_ = function (posMayHaveChanged) {
    var mCount = this.markers_.length;
    var mz = this.markerClusterer_.getMaxZoom();

    if (mz !== null && this.map_.getZoom() > mz) {
        this.clusterIcon_.hide();
        return;
    }

    if (mCount < this.minClusterSize_) {
        // Min cluster size not yet reached.
        this.clusterIcon_.hide();
        return;
    }

    var numStyles = this.markerClusterer_.getStyles().length;
    var sums = this.markerClusterer_.getCalculator()(this, numStyles);
    this.clusterIcon_.setCenter(this.center_);
    this.clusterIcon_.useStyle(sums);
    this.clusterIcon_.show(posMayHaveChanged);
};

/**
 * @name MarkerClustererOptions
 * @class This class represents the optional parameter passed to
 *  the {@link MarkerClusterer} constructor.
 * @property {number} [gridSize=60] The grid size of a cluster in pixels. The grid is a square.
 * @property {number} [maxZoom=null] The maximum zoom level at which clustering is enabled or
 *  <code>null</code> if clustering is to be enabled at all zoom levels.
 * @property {boolean} [zoomOnClick=true] Whether to zoom the map when a cluster marker is
 *  clicked. You may want to set this to <code>false</code> if you have installed a handler
 *  for the <code>click</code> event and it deals with zooming on its own.
 * @property {boolean} [averageCenter=false] Whether the position of a cluster marker should be
 *  the average position of all markers in the cluster. If set to <code>false</code>, the
 *  cluster marker is positioned at the location of the first marker added to the cluster.
 * @property {number} [minimumClusterSize=2] The minimum number of markers needed in a cluster
 *  before the markers are hidden and a cluster marker appears.
 * @property {boolean} [ignoreHidden=false] Whether to ignore hidden markers in clusters. You
 *  may want to set this to <code>true</code> to ensure that hidden markers are not included
 *  in the marker count that appears on a cluster marker (this count is the value of the
 *  <code>text</code> property of the result returned by the default <code>calculator</code>).
 *  If set to <code>true</code> and you change the visibility of a marker being clustered, be
 *  sure to also call <code>MarkerClusterer.repaint()</code>.
 * @property {boolean} [printable=false] Whether to make the cluster icons printable. Do not
 *  set to <code>true</code> if the <code>url</code> fields in the <code>styles</code> array
 *  refer to image sprite files.
 * @property {string} [title=""] The tooltip to display when the mouse moves over a cluster
 *  marker. (Alternatively, you can use a custom <code>calculator</code> function to specify a
 *  different tooltip for each cluster marker.)
 * @property {function} [calculator=MarkerClusterer.CALCULATOR] The function used to determine
 *  the text to be displayed on a cluster marker and the index indicating which style to use
 *  for the cluster marker. The input parameters for the function are (1) the array of markers
 *  represented by a cluster marker and (2) the number of cluster icon styles. It returns a
 *  {@link ClusterIconInfo} object. The default <code>calculator</code> returns a
 *  <code>text</code> property which is the number of markers in the cluster and an
 *  <code>index</code> property which is one higher than the lowest integer such that
 *  <code>10^i</code> exceeds the number of markers in the cluster, or the size of the styles
 *  array, whichever is less. The <code>styles</code> array element used has an index of
 *  <code>index</code> minus 1. For example, the default <code>calculator</code> returns a
 *  <code>text</code> value of <code>"125"</code> and an <code>index</code> of <code>3</code>
 *  for a cluster icon representing 125 markers so the element used in the <code>styles</code>
 *  array is <code>2</code>. A <code>calculator</code> may also return a <code>title</code>
 *  property that contains the text of the tooltip to be used for the cluster marker. If
 *   <code>title</code> is not defined, the tooltip is set to the value of the <code>title</code>
 *   property for the MarkerClusterer.
 * @property {string} [clusterClass="cluster"] The name of the CSS class defining general styles
 *  for the cluster markers. Use this class to define CSS styles that are not set up by the code
 *  that processes the <code>styles</code> array.
 * @property {Array} [styles] An array of {@link ClusterIconStyle} elements defining the styles
 *  of the cluster markers to be used. The element to be used to style a given cluster marker
 *  is determined by the function defined by the <code>calculator</code> property.
 *  The default is an array of {@link ClusterIconStyle} elements whose properties are derived
 *  from the values for <code>imagePath</code>, <code>imageExtension</code>, and
 *  <code>imageSizes</code>.
 * @property {number} [batchSize=MarkerClusterer.BATCH_SIZE] Set this property to the
 *  number of markers to be processed in a single batch when using a browser other than
 *  Internet Explorer (for Internet Explorer, use the batchSizeIE property instead).
 * @property {number} [batchSizeIE=MarkerClusterer.BATCH_SIZE_IE] When Internet Explorer is
 *  being used, markers are processed in several batches with a small delay inserted between
 *  each batch in an attempt to avoid Javascript timeout errors. Set this property to the
 *  number of markers to be processed in a single batch; select as high a number as you can
 *  without causing a timeout error in the browser. This number might need to be as low as 100
 *  if 15,000 markers are being managed, for example.
 * @property {string} [imagePath=MarkerClusterer.IMAGE_PATH]
 *  The full URL of the root name of the group of image files to use for cluster icons.
 *  The complete file name is of the form <code>imagePath</code>n.<code>imageExtension</code>
 *  where n is the image file number (1, 2, etc.).
 * @property {string} [imageExtension=MarkerClusterer.IMAGE_EXTENSION]
 *  The extension name for the cluster icon image files (e.g., <code>"png"</code> or
 *  <code>"jpg"</code>).
 * @property {Array} [imageSizes=MarkerClusterer.IMAGE_SIZES]
 *  An array of numbers containing the widths of the group of
 *  <code>imagePath</code>n.<code>imageExtension</code> image files.
 *  (The images are assumed to be square.)
 */
/**
 * Creates a MarkerClusterer object with the options specified in {@link MarkerClustererOptions}.
 * @constructor
 * @extends google.maps.OverlayView
 * @param {google.maps.Map} map The Google map to attach to.
 * @param {Array.<google.maps.Marker>} [opt_markers] The markers to be added to the cluster.
 * @param {MarkerClustererOptions} [opt_options] The optional parameters.
 */
function MarkerClusterer(map, opt_markers, opt_options) {
    // MarkerClusterer implements google.maps.OverlayView interface. We use the
    // extend function to extend MarkerClusterer with google.maps.OverlayView
    // because it might not always be available when the code is defined so we
    // look for it at the last possible moment. If it doesn't exist now then
    // there is no point going ahead :)
    this.extend(MarkerClusterer, google.maps.OverlayView);

    opt_markers = opt_markers || [];
    opt_options = opt_options || {};

    this.markers_ = {};
    this.clusters_ = [];
    this.listeners_ = [];
    this.activeMap_ = null;
    this.ready_ = false;

    this.gridSize_ = opt_options.gridSize || 60;
    this.minClusterSize_ = opt_options.minimumClusterSize || 2;
    this.maxZoom_ = opt_options.maxZoom || null;
    this.styles_ = opt_options.styles || [];
    this.title_ = opt_options.title || "";
    this.zoomOnClick_ = true;
    if (opt_options.zoomOnClick !== undefined) {
        this.zoomOnClick_ = opt_options.zoomOnClick;
    }
    this.averageCenter_ = false;
    if (opt_options.averageCenter !== undefined) {
        this.averageCenter_ = opt_options.averageCenter;
    }
    this.ignoreHidden_ = false;
    if (opt_options.ignoreHidden !== undefined) {
        this.ignoreHidden_ = opt_options.ignoreHidden;
    }
    this.printable_ = false;
    if (opt_options.printable !== undefined) {
        this.printable_ = opt_options.printable;
    }
    this.imagePath_ = opt_options.imagePath || MarkerClusterer.IMAGE_PATH;
    this.imageExtension_ = opt_options.imageExtension || MarkerClusterer.IMAGE_EXTENSION;
    this.imageSizes_ = opt_options.imageSizes || MarkerClusterer.IMAGE_SIZES;
    this.calculator_ = opt_options.calculator || MarkerClusterer.CALCULATOR;
    this.batchSize_ = opt_options.batchSize || MarkerClusterer.BATCH_SIZE;
    this.batchSizeIE_ = opt_options.batchSizeIE || MarkerClusterer.BATCH_SIZE_IE;
    this.clusterClass_ = opt_options.clusterClass || "cluster";

    this.attributes_ = opt_options.attributes;
    this.rollups_ = opt_options.rollups;

    if (navigator.userAgent.toLowerCase().indexOf("msie") !== -1) {
        // Try to avoid IE timeout when processing a huge number of markers:
        this.batchSize_ = this.batchSizeIE_;
    }

    this.setupStyles_();

    this.addMarkers(opt_markers, true);
    this.setMap(map); // Note: this causes onAdd to be called
}

/**
 * Implementation of the onAdd interface method.
 * @ignore
 */
MarkerClusterer.prototype.onAdd = function () {
    var cMarkerClusterer = this;

    this.activeMap_ = this.getMap();
    this.ready_ = true;

    this.repaint();

    // Add the map event listeners
    this.listeners_ = [
      google.maps.event.addListener(this.getMap(), "zoom_changed", function () {
          // Better fix for bugs described below, especially when we may have many clusterers all doing this!
          var bounds = this.getBounds();
          if (bounds.equals(cMarkerClusterer.lastBounds)) { // if no change just return
              return;
          }
          cMarkerClusterer.lastBounds = bounds;

          cMarkerClusterer.resetViewport_(false);

          // Workaround for this Google bug: when map is at level 0 and "-" of
          // zoom slider is clicked, a "zoom_changed" event is fired even though
          // the map doesn't zoom out any further. In this situation, no "idle"
          // event is triggered so the cluster markers that have been removed
          // do not get redrawn. Same goes for a zoom in at maxZoom.
          /*if (this.getZoom() === (this.get("minZoom") || 0) || this.getZoom() === this.get("maxZoom")) {
              google.maps.event.trigger(this, "idle");
          }*/
      }),
      google.maps.event.addListener(this.getMap(), "idle", function () {
          cMarkerClusterer.redraw_();
      })
    ];
};

/**
 * Implementation of the onRemove interface method.
 * Removes map event listeners and all cluster icons from the DOM.
 * All managed markers are also put back on the map.
 * @ignore
 */
MarkerClusterer.prototype.onRemove = function () {
    var id,
        marker;

    // Put all the managed markers back on the map:
    for (id in this.markers_) {
        if (this.markers_.hasOwnProperty(id)) {
            marker = this.markers_[id];
            if (marker.getMap() !== this.activeMap_) {
                marker.setMap(this.activeMap_);
            }
            delete marker.cluster;
        }
    }
    this.markers_ = {};

    // Remove all clusters:
    for (i = 0; i < this.clusters_.length; i++) {
        this.clusters_[i].remove();
    }
    this.clusters_ = [];

    // Remove map event listeners:
    for (i = 0; i < this.listeners_.length; i++) {
        google.maps.event.removeListener(this.listeners_[i]);
    }
    this.listeners_ = [];

    this.activeMap_ = null;
    this.ready_ = false;
};

/**
 * Implementation of the draw interface method.
 * @ignore
 */
MarkerClusterer.prototype.draw = function () { };

/**
 * Sets up the styles object.
 */
MarkerClusterer.prototype.setupStyles_ = function () {
    var i, size;
    if (this.styles_.length > 0) {
        return;
    }

    for (i = 0; i < this.imageSizes_.length; i++) {
        size = this.imageSizes_[i];
        this.styles_.push({
            url: this.imagePath_ + (i + 1) + "." + this.imageExtension_,
            height: size,
            width: size
        });
    }
};

/**
 *  Fits the map to the bounds of the markers managed by the clusterer.
 */
MarkerClusterer.prototype.fitMapToMarkers = function () {
    var i;
    var markers = this.getMarkers();
    var bounds = new google.maps.LatLngBounds();
    for (i = 0; i < markers.length; i++) {
        bounds.extend(markers[i].getPosition());
    }

    jc2cui.mapWidget.renderer.fitToBounds(bounds);
};

/**
 * Returns the value of the <code>gridSize</code> property.
 *
 * @return {number} The grid size.
 */
MarkerClusterer.prototype.getGridSize = function () {
    return this.gridSize_;
};

/**
 * Sets the value of the <code>gridSize</code> property.
 *
 * @param {number} gridSize The grid size.
 */
MarkerClusterer.prototype.setGridSize = function (gridSize) {
    this.gridSize_ = gridSize;
};

/**
 * Returns the value of the <code>minimumClusterSize</code> property.
 *
 * @return {number} The minimum cluster size.
 */
MarkerClusterer.prototype.getMinimumClusterSize = function () {
    return this.minClusterSize_;
};

/**
 * Sets the value of the <code>minimumClusterSize</code> property.
 *
 * @param {number} minimumClusterSize The minimum cluster size.
 */
MarkerClusterer.prototype.setMinimumClusterSize = function (minimumClusterSize) {
    this.minClusterSize_ = minimumClusterSize;
};

/**
 *  Returns the value of the <code>maxZoom</code> property.
 *
 *  @return {number} The maximum zoom level.
 */
MarkerClusterer.prototype.getMaxZoom = function () {
    return this.maxZoom_;
};

/**
 *  Sets the value of the <code>maxZoom</code> property.
 *
 *  @param {number} maxZoom The maximum zoom level.
 */
MarkerClusterer.prototype.setMaxZoom = function (maxZoom) {
    this.maxZoom_ = maxZoom;
};

/**
 *  Returns the value of the <code>styles</code> property.
 *
 *  @return {Array} The array of styles defining the cluster markers to be used.
 */
MarkerClusterer.prototype.getStyles = function () {
    return this.styles_;
};

/**
 *  Sets the value of the <code>styles</code> property.
 *
 *  @param {Array.<ClusterIconStyle>} styles The array of styles to use.
 */
MarkerClusterer.prototype.setStyles = function (styles) {
    this.styles_ = styles;
};

/**
 * Returns the value of the <code>title</code> property.
 *
 * @return {string} The content of the title text.
 */
MarkerClusterer.prototype.getTitle = function () {
    return this.title_;
};

/**
 *  Sets the value of the <code>title</code> property.
 *
 *  @param {string} title The value of the title property.
 */
MarkerClusterer.prototype.setTitle = function (title) {
    this.title_ = title;
};

/**
 * Returns the value of the <code>zoomOnClick</code> property.
 *
 * @return {boolean} True if zoomOnClick property is set.
 */
MarkerClusterer.prototype.getZoomOnClick = function () {
    return this.zoomOnClick_;
};

/**
 *  Sets the value of the <code>zoomOnClick</code> property.
 *
 *  @param {boolean} zoomOnClick The value of the zoomOnClick property.
 */
MarkerClusterer.prototype.setZoomOnClick = function (zoomOnClick) {
    this.zoomOnClick_ = zoomOnClick;
};

/**
 * Returns the value of the <code>averageCenter</code> property.
 *
 * @return {boolean} True if averageCenter property is set.
 */
MarkerClusterer.prototype.getAverageCenter = function () {
    return this.averageCenter_;
};

/**
 *  Sets the value of the <code>averageCenter</code> property.
 *
 *  @param {boolean} averageCenter The value of the averageCenter property.
 */
MarkerClusterer.prototype.setAverageCenter = function (averageCenter) {
    this.averageCenter_ = averageCenter;
};

/**
 * Returns the value of the <code>ignoreHidden</code> property.
 *
 * @return {boolean} True if ignoreHidden property is set.
 */
MarkerClusterer.prototype.getIgnoreHidden = function () {
    return this.ignoreHidden_;
};

/**
 *  Sets the value of the <code>ignoreHidden</code> property.
 *
 *  @param {boolean} ignoreHidden The value of the ignoreHidden property.
 */
MarkerClusterer.prototype.setIgnoreHidden = function (ignoreHidden) {
    this.ignoreHidden_ = ignoreHidden;
};

/**
 * Returns the value of the <code>imageExtension</code> property.
 *
 * @return {string} The value of the imageExtension property.
 */
MarkerClusterer.prototype.getImageExtension = function () {
    return this.imageExtension_;
};

/**
 *  Sets the value of the <code>imageExtension</code> property.
 *
 *  @param {string} imageExtension The value of the imageExtension property.
 */
MarkerClusterer.prototype.setImageExtension = function (imageExtension) {
    this.imageExtension_ = imageExtension;
};

/**
 * Returns the value of the <code>imagePath</code> property.
 *
 * @return {string} The value of the imagePath property.
 */
MarkerClusterer.prototype.getImagePath = function () {
    return this.imagePath_;
};

/**
 *  Sets the value of the <code>imagePath</code> property.
 *
 *  @param {string} imagePath The value of the imagePath property.
 */
MarkerClusterer.prototype.setImagePath = function (imagePath) {
    this.imagePath_ = imagePath;
};

/**
 * Returns the value of the <code>imageSizes</code> property.
 *
 * @return {Array} The value of the imageSizes property.
 */
MarkerClusterer.prototype.getImageSizes = function () {
    return this.imageSizes_;
};

/**
 *  Sets the value of the <code>imageSizes</code> property.
 *
 *  @param {Array} imageSizes The value of the imageSizes property.
 */
MarkerClusterer.prototype.setImageSizes = function (imageSizes) {
    this.imageSizes_ = imageSizes;
};

/**
 * Returns the value of the <code>calculator</code> property.
 *
 * @return {function} the value of the calculator property.
 */
MarkerClusterer.prototype.getCalculator = function () {
    return this.calculator_;
};

/**
 * Sets the value of the <code>calculator</code> property.
 *
 * @param {function(Array.<google.maps.Marker>, number)} calculator The value
 *  of the calculator property.
 */
MarkerClusterer.prototype.setCalculator = function (calculator) {
    this.calculator_ = calculator;
};

/**
 * Returns the value of the <code>printable</code> property.
 *
 * @return {boolean} the value of the printable property.
 */
MarkerClusterer.prototype.getPrintable = function () {
    return this.printable_;
};

/**
 * Sets the value of the <code>printable</code> property.
 *
 *  @param {boolean} printable The value of the printable property.
 */
MarkerClusterer.prototype.setPrintable = function (printable) {
    this.printable_ = printable;
};

/**
 * Returns the value of the <code>batchSizeIE</code> property.
 *
 * @return {number} the value of the batchSizeIE property.
 */
MarkerClusterer.prototype.getBatchSizeIE = function () {
    return this.batchSizeIE_;
};

/**
 * Sets the value of the <code>batchSizeIE</code> property.
 *
 *  @param {number} batchSizeIE The value of the batchSizeIE property.
 */
MarkerClusterer.prototype.setBatchSizeIE = function (batchSizeIE) {
    this.batchSizeIE_ = batchSizeIE;
};

/**
 * Returns the value of the <code>clusterClass</code> property.
 *
 * @return {string} the value of the clusterClass property.
 */
MarkerClusterer.prototype.getClusterClass = function () {
    return this.clusterClass_;
};

/**
 * Sets the value of the <code>clusterClass</code> property.
 *
 *  @param {string} clusterClass The value of the clusterClass property.
 */
MarkerClusterer.prototype.setClusterClass = function (clusterClass) {
    this.clusterClass_ = clusterClass;
};

MarkerClusterer.prototype.getAttributes = function () {
    return this.attributes_;
};

MarkerClusterer.prototype.setAttributes = function (attributes) {
    this.attributes_ = attributes;
};

MarkerClusterer.prototype.getRollups = function () {
    return this.rollups_;
};

MarkerClusterer.prototype.setRollups = function (rollups) {
    this.rollups_ = rollups;
};

/**
 *  Returns the hash of markers managed by the clusterer.
 *
 *  @return {Object} The hash of markers managed by the clusterer.
 */
MarkerClusterer.prototype.getMarkers = function () {
    return this.markers_;
};

/**
    *  Returns the number of markers managed by the clusterer.
    *
    *  @return {number} The number of markers.
    */
MarkerClusterer.prototype.getTotalMarkers = function () {
    return getKeys(this.markers_).length;
};

/**
 * Returns the current array of clusters formed by the clusterer.
 *
 * @return {Array} The array of clusters formed by the clusterer.
 */
MarkerClusterer.prototype.getClusters = function () {
    return this.clusters_;
};

/**
 * Returns the number of clusters formed by the clusterer.
 *
 * @return {number} The number of clusters formed by the clusterer.
 */
MarkerClusterer.prototype.getTotalClusters = function () {
    return this.clusters_.length;
};

/**
 * Adds a marker to the clusterer. The clusters are redrawn unless
 *  <code>opt_nodraw</code> is set to <code>true</code>.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @param {boolean} [opt_nodraw] Set to <code>true</code> to prevent redrawing.
 */
MarkerClusterer.prototype.addMarker = function (marker, opt_nodraw) {
    this.pushMarkerTo_(marker);
    if (!opt_nodraw) {
        this.redraw_();
    }
};

/**
 * Adds an array of markers to the clusterer. The clusters are redrawn unless
 *  <code>opt_nodraw</code> is set to <code>true</code>.
 *
 * @param {Array.<google.maps.Marker>} markers The markers to add.
 * @param {boolean} [opt_nodraw] Set to <code>true</code> to prevent redrawing.
 */
MarkerClusterer.prototype.addMarkers = function (markers, opt_nodraw) {
    var i;
    for (i = 0; i < markers.length; i++) {
        this.pushMarkerTo_(markers[i]);
    }
    if (!opt_nodraw) {
        this.redraw_();
    }
};

/**
 * Pushes a marker to the clusterer.
 *
 * @param {google.maps.Marker} marker The marker to add.
 */
MarkerClusterer.prototype.pushMarkerTo_ = function (marker) {
    // If the marker is draggable add a listener so we can update the clusters on the dragend:
    if (marker.getDraggable()) {
        var cMarkerClusterer = this;
        google.maps.event.addListener(marker, "dragend", function () {
            if (cMarkerClusterer.ready_) {
                delete this.cluster;
                cMarkerClusterer.repaint();
            }
        });
    }
    delete marker.cluster;
    this.markers_[marker.placemark.internalId] = marker;
};

/**
 * Removes a marker from the cluster.  The clusters are redrawn unless
 *  <code>opt_nodraw</code> is set to <code>true</code>. Returns <code>true</code> if the
 *  marker was removed from the clusterer.
 *
 * @param {google.maps.Marker} marker The marker to remove.
 * @param {boolean} [opt_nodraw] Set to <code>true</code> to prevent redrawing.
 * @return {boolean} True if the marker was removed from the clusterer.
 */
MarkerClusterer.prototype.removeMarker = function (marker, opt_nodraw) {
    var removed = this.removeMarker_(marker);

    if (!opt_nodraw && removed) {
        this.repaint();
    }

    return removed;
};

/**
 * Removes an array of markers from the cluster. The clusters are redrawn unless
 *  <code>opt_nodraw</code> is set to <code>true</code>. Returns <code>true</code> if markers
 *  were removed from the clusterer.
 *
 * @param {Array.<google.maps.Marker>} markers The markers to remove.
 * @param {boolean} [opt_nodraw] Set to <code>true</code> to prevent redrawing.
 * @return {boolean} True if markers were removed from the clusterer.
 */
MarkerClusterer.prototype.removeMarkers = function (markers, opt_nodraw) {
    var i, r;
    var removed = false;

    for (i = 0; i < markers.length; i++) {
        r = this.removeMarker_(markers[i]);
        removed = removed || r;
    }

    if (!opt_nodraw && removed) {
        this.repaint();
    }

    return removed;
};

/**
 * Removes a marker and returns true if removed, false if not.
 *
 * @param {google.maps.Marker} marker The marker to remove
 * @return {boolean} Whether the marker was removed or not
 */
MarkerClusterer.prototype.removeMarker_ = function (marker) {
    var it = this.markers_[marker.placemark.internalId];
    if (it) {
        marker.setMap(null);
        delete this.markers_[marker.placemark.internalId];
    }
    return it !== undefined;
};

/**
 * Removes all clusters and markers from the map and also removes all markers
 *  managed by the clusterer.
 */
MarkerClusterer.prototype.clearMarkers = function () {
    this.resetViewport_(true);
    this.markers_ = {};
};

/**
 * Recalculates and redraws all the marker clusters from scratch.
 *  Call this after changing any properties.
 */
MarkerClusterer.prototype.repaint = function () {
    var oldClusters = this.clusters_.slice();
    this.clusters_ = [];
    this.resetViewport_(false);
    this.redraw_();

    // Remove the old clusters.
    // Do it in a timeout to prevent blinking effect.
    setTimeout(function () {
        var i;
        for (i = 0; i < oldClusters.length; i++) {
            oldClusters[i].remove();
        }
    }, 0);
};

/**
 * Returns the current bounds extended by the grid size.
 *
 * @param {google.maps.LatLngBounds} bounds The bounds to extend.
 * @return {google.maps.LatLngBounds} The extended bounds.
 * @ignore
 */
MarkerClusterer.prototype.getExtendedBounds = function (bounds) {
    var projection = this.getProjection();

    // Turn the bounds into latlng.
    var tr = new google.maps.LatLng(bounds.getNorthEast().lat(),
        bounds.getNorthEast().lng());
    var bl = new google.maps.LatLng(bounds.getSouthWest().lat(),
        bounds.getSouthWest().lng());

    // Convert the points to pixels and the extend out by the grid size.
    var trPix = projection.fromLatLngToDivPixel(tr);
    trPix.x += this.gridSize_;
    trPix.y -= this.gridSize_;

    var blPix = projection.fromLatLngToDivPixel(bl);
    blPix.x -= this.gridSize_;
    blPix.y += this.gridSize_;

    /// Convert the pixel points back to LatLng
    var ne = projection.fromDivPixelToLatLng(trPix);
    var sw = projection.fromDivPixelToLatLng(blPix);

    // Extend the bounds to contain the new bounds.
    bounds.extend(ne);
    bounds.extend(sw);

    return bounds;
};

/**
 * Redraws all the clusters.
 */
MarkerClusterer.prototype.redraw_ = function () {
    this.createClusters();
};

/**
 * Removes all clusters from the map. The markers are also removed from the map
 *  if <code>opt_hide</code> is set to <code>true</code>.
 *
 * @param {boolean} [opt_hide] Set to <code>true</code> to also remove the markers
 *  from the map.
 */
MarkerClusterer.prototype.resetViewport_ = function (opt_hide) {
    var i, marker;
    // Remove all the clusters
    for (i = 0; i < this.clusters_.length; i++) {
        this.clusters_[i].remove();
    }
    this.clusters_ = [];

    // Reset the markers to not be added and to be removed from the map.
    for (i in this.markers_) {
        if (this.markers_.hasOwnProperty(i)) {
            marker = this.markers_[i];
            delete marker.cluster;
            if (opt_hide) {
                marker.setMap(null);
            }
        }
    }
};

function getKeys(obj) {
    var keys;
    if (Object.keys) {
        keys = Object.keys(obj);
    } else {
        var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !{ toString: null }.propertyIsEnumerable("toString"),
            DontEnums = [
                'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty',
                'isPrototypeOf', 'propertyIsEnumerable', 'constructor'
            ],
            DontEnumsLength = DontEnums.length;

        if (typeof obj != "object" && typeof obj != "function" || obj === null)
            return;

        keys = [];
        for (var name in obj) {
            if (hasOwnProperty.call(obj, name)) {
                keys.push(name);
            }
        }

        if (hasDontEnumBug) {
            for (var i = 0; i < DontEnumsLength; i++) {
                if (hasOwnProperty.call(o, DontEnums[i]))
                    keys.push(DontEnums[i]);
            }
        }
    }
    return keys;
}

function toRadians(x) {
    return x * Math.PI / 180;
}

/**
 * Calculates the distance between two latlng locations in km.
 *
 * @param {google.maps.LatLng} p1 The first lat lng point.
 * @param {google.maps.LatLng} p2 The second lat lng point.
 * @return {number} The distance between the two points in km.
 * @see http://www.movable-type.co.uk/scripts/latlong.html
*/
MarkerClusterer.prototype.distanceBetweenPoints_ = function (lat1, lon1, lat2, lon2) {
    // haversine - using nice fast implementation from extensions.js
    var phi1 = toRadians(lat1),
        phi2 = toRadians(lat2),
        d_phi = toRadians(lat2 - lat1),
        d_lmd = toRadians(lon2 - lon1),
        A = Math.pow(Math.sin(d_phi / 2), 2) +
            Math.cos(phi1) * Math.cos(phi2) *
                Math.pow(Math.sin(d_lmd / 2), 2);

    return 6378 * 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A)); // 6378 = ~ earth radius in KM assuming perfect sphere see http://en.wikipedia.org/wiki/Earth_radius
};

/**
 * Adds a marker to a cluster, or creates a new cluster.
 *
 * @param {google.maps.Marker} marker The marker to add.
 */
MarkerClusterer.prototype.addToClosestCluster_ = function (marker) {
    var i, d, cluster, center, markerPos = marker.getPosition(), markerLat = markerPos.lat(), markerLon = markerPos.lng();
    var distance = 40000; // Some large number
    var clusterToAddTo = null;
    for (i = 0; i < this.clusters_.length; i++) {
        cluster = this.clusters_[i];
        // dont consider if using attributes and they dont match or out of bounds
        if ((!this.attributes_ || cluster.doMarkerAttributesMatch(marker)) && cluster.bounds_.contains(marker.getPosition())) {
            center = cluster.getCenter();
            if (center) {
                d = this.distanceBetweenPoints_(center.lat(), center.lng(), markerLat, markerLon);
                if (d < distance) {
                    distance = d;
                    clusterToAddTo = cluster;
                }
            }
        }
    }

    if (clusterToAddTo) {
        clusterToAddTo.addMarker(marker);
    } else {
        cluster = new Cluster(this);
        cluster.addMarker(marker);
        this.clusters_.push(cluster);
    }
};

MarkerClusterer.prototype.createClusters = function () {
    var keys = getKeys(this.markers_);
    this.createClusters_(keys, 0);
};

/**
 * Creates the clusters. This is done in batches to avoid timeout errors
 *  in some browsers when there is a huge number of markers.
 *
 * @param {number} iFirst The index of the first marker in the batch of
 *  markers to be added to clusters.
 */
MarkerClusterer.prototype.createClusters_ = function (keys, iFirst) {
    var i, j, marker, cluster, added;
    var mapBounds;
    var cMarkerClusterer = this;
    if (!this.ready_) {
        return;
    }

    // Cancel previous batch processing if we're working on the first batch:
    if (iFirst === 0) {
        /**
         * This event is fired when the <code>MarkerClusterer</code> begins
         *  clustering markers.
         * @name MarkerClusterer#clusteringbegin
         * @param {MarkerClusterer} mc The MarkerClusterer whose markers are being clustered.
         * @event
         */
        google.maps.event.trigger(this, "clusteringbegin", this);

        if (typeof this.timerRefStatic !== "undefined") {
            clearTimeout(this.timerRefStatic);
            delete this.timerRefStatic;
        }
    }

    // Get our current map view bounds.
    // Create a new bounds object so we don't affect the map.
    //
    // See Comments 9 & 11 on Issue 3651 relating to this workaround for a Google Maps bug:
    // JC2CUI - Misses many markers - perhaps simply because "whole world" bounds is much smaller then whole world?
    //          In any event not doing a check in this case will be faster and more correct
    if (this.getMap().getZoom() > 3) {
        mapBounds = new google.maps.LatLngBounds(this.getMap().getBounds().getSouthWest(),
          this.getMap().getBounds().getNorthEast());
    } /*else {
        mapBounds = new google.maps.LatLngBounds(new google.maps.LatLng(89.9999, -179.9999), new google.maps.LatLng(-89.9999, 179.9999)); // better
        mapBounds = new google.maps.LatLngBounds(new google.maps.LatLng(85.02070771743472, -178.48388434375), new google.maps.LatLng(-85.08136444384544, 178.00048865625));
    }*/
    var bounds = mapBounds ? this.getExtendedBounds(mapBounds) : undefined;

    var iLast = Math.min(iFirst + this.batchSize_, keys.length), key;
    for (i = iFirst; i < iLast; i++) {
        key = keys[i];
        if (this.markers_.hasOwnProperty(key)) {
            marker = this.markers_[key];
            added = false;
            if (!marker.cluster &&
                (!this.ignoreHidden_ || (this.ignoreHidden_ && marker.getVisible())) &&
                (!bounds || bounds.contains(marker.getPosition()))) {
                    this.addToClosestCluster_(marker);
            }
        }
    }

    if (iLast < keys.length) {
        this.timerRefStatic = setTimeout(function () {
            cMarkerClusterer.createClusters_(keys, iLast);
        }, 0);
    } else {
        delete this.timerRefStatic;

        /**
         * This event is fired when the <code>MarkerClusterer</code> stops
         *  clustering markers.
         * @name MarkerClusterer#clusteringend
         * @param {MarkerClusterer} mc The MarkerClusterer whose markers are being clustered.
         * @event
         */
        google.maps.event.trigger(this, "clusteringend", this);
    }
};

/**
 * Extends an object's prototype by another's.
 *
 * @param {Object} obj1 The object to be extended.
 * @param {Object} obj2 The object to extend with.
 * @return {Object} The new extended object.
 * @ignore
 */
MarkerClusterer.prototype.extend = function (obj1, obj2) {
    return (function (object) {
        var property;
        for (property in object.prototype) {
            this.prototype[property] = object.prototype[property];
        }
        return this;
    }).apply(obj1, [obj2]);
};

/**
 * The default function for determining the label text and style
 * for a cluster icon.
 *
 * @param {Cluster} cluster The cluster.
 * @param {number} numStyles The number of marker styles available.
 * @return {ClusterIconInfo} The information resource for the cluster.
 * @constant
 * @ignore
 */
MarkerClusterer.CALCULATOR = function (cluster, numStyles) {
    var index = 0;
    var title = "";
    var count = cluster.getMarkers().length.toString();

    var dv = count;
    while (dv !== 0) {
        dv = parseInt(dv / 10, 10);
        index++;
    }

    index = Math.min(index, numStyles);
    return {
        text: count,
        index: index,
        title: title
    };
};

/**
 * The number of markers to process in one batch.
 *
 * @type {number}
 * @constant
 */
MarkerClusterer.BATCH_SIZE = 2000;

/**
 * The number of markers to process in one batch (IE only).
 *
 * @type {number}
 * @constant
 */
MarkerClusterer.BATCH_SIZE_IE = 500;

/**
 * The default root name for the marker cluster images.
 *
 * @type {string}
 * @constant
 */
MarkerClusterer.IMAGE_PATH = "http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclustererplus/images/m";

/**
 * The default extension name for the marker cluster images.
 *
 * @type {string}
 * @constant
 */
MarkerClusterer.IMAGE_EXTENSION = "png";

/**
 * The default array of sizes for the marker cluster images.
 *
 * @type {Array.<number>}
 * @constant
 */
MarkerClusterer.IMAGE_SIZES = [53, 56, 66, 78, 90];/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4, nomen: true, unparam: true*/
/*global $, console, setTimeout, parse: true, loadKml: true, setInterval, clearInterval, setTimeout, clearTimeout, externalStylesLoaded, fetchExternalStyles, document, window, MarkerClusterer, google, util, jc2cui*/

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.clusterManager = (function () {
    "use strict";

    var CLUSTER_DEFAULTS = {
            distance: 60,
            threshold: 2,
            maxZoom: 19,
            style: {
                label: "${count}",
                title: "${count} items"
            }
        },
        map,
        overlays,
        mapLevelClusterer = {},
        allClusterers = [];

    function createObjectString(obj) {
        var val,
            literal = [];
        $.each(obj, function (index, v) {
            if (typeof v === 'object') {
                literal.push(createObjectString(v));
                literal.push(', ');
                return true;
            }
            literal.push(index);
            literal.push(': ');
            literal.push(v);
            literal.push(', ');
        });
        if (literal.length) {
            literal.pop(); // extra comma at end
            val = literal.join('');
        } else { // possible ?
            val = 'No data found';
        }
        return val;
    }

    function createLiteral(cluster, value) {
        var i;
        if (typeof value === "string" && value.indexOf("${") !== -1) {
            value = value.replace(/\$\{([\w.]+?)\}/g, function (str, match) {
                if (match === 'count') {
                    return cluster.getSize();
                }
                var subs = match.split(/\.+/),
                    val = cluster.getAttributes();

                for (i = 0; i < subs.length; i++) {
                    val = val[subs[i]];
                    if (!val) {
                        break;
                    }
                }

                if (typeof val === 'object') {
                    val = createObjectString(val);
                }
                return val;
            });
            value = (isNaN(value) || !value) ? value : parseFloat(value);
        }
        return value;
    }

    function getClusterer(item) {
        if (!jc2cui.mapWidget.options().clustering || !jc2cui.mapWidget.options().clustering.value) {
            return;
        }
        if (item.clustering) {
            return item;
        }
        if (item.parent) {
            return getClusterer(item.parent);
        }
        if (item.overlayId) { // jump from top level doc to lowest level overlay
            var overlay = overlays[item.overlayId];
            if (overlay) {
                return getClusterer(overlay);
            }
        }
        // top level 'map' cluster
        return mapLevelClusterer;
    }

    function processClick(clusterer, cluster, clusterSettings) {
        var style = clusterSettings.style || {},
            clusterDetails = {
                name: createLiteral(cluster, style.title) || clusterer.getTitle() || '',
                description: createLiteral(cluster, style.description) || '',
                placemarks: cluster.getMarkers(),
                attributes: 'placemark', // find individual placemark details by querying for each of placemarks (above) .placemark
                bounds: cluster.getBounds()
            };
        jc2cui.mapWidget.showClusterInfoWindow(clusterDetails);
    }

    function getStyles(style) {
        var color = style.fillColor || 'red';
        return [{
            url: '/widgets/common/kml/icons/' + color + '.png',
            height: 33,
            width: 34
        }];
    }

    function createMarkerClusterer(markers, clusterer) {
        var options = typeof clusterer.clustering === 'object' ? clusterer.clustering : {},
            clusterSettings = $.extend(true, {}, CLUSTER_DEFAULTS, options),
            markerClusterer = new MarkerClusterer(map, markers, {
                zoomOnClick: false,
                //averageCenter: true,
                gridSize: clusterSettings.distance,
                minimumClusterSize: clusterSettings.threshold,
                maxZoom: clusterSettings.maxZoom,
                styles: getStyles(clusterSettings.style || {}),
                calculator: function (cluster, numStyles) {
                    var index = 0,
                        title,
                        dv = cluster.getMarkers().length,
                        text = dv.toString();

                    if (!!clusterSettings.style && clusterSettings.style.title) {
                        title = createLiteral(cluster, clusterSettings.style.title);
                    }

                    while (dv !== 0) {
                        dv = Math.floor(dv / 10);
                        index++;
                    }

                    index = Math.min(index, numStyles);
                    return {
                        text: text,
                        index: index,
                        title: title
                    };
                },
                attributes: clusterSettings.attributes,
                rollups: clusterSettings.rollups
            });
        if (google.maps.event) { // v3
            google.maps.event.addListener(markerClusterer, 'click', function (cluster) {
                processClick(markerClusterer, cluster, clusterSettings);
            });
        } else { // V2
            google.maps.Event.addListener(markerClusterer, 'clusterclick', function (cluster) { // using deprecated clusterclick since v2 click doesnt send cluster as argument, it sends cluster lat lng
                processClick(markerClusterer, cluster, clusterSettings);
            });
        }
        return markerClusterer;
    }

    function clusterMarkers(doCluster, clusterer, markers) {
        if (clusterer) {
            if (doCluster) {
                if (!clusterer.markerClusterer) {
                    clusterer.markerClusterer = createMarkerClusterer(markers, clusterer);
                    allClusterers.push(clusterer);
                } else {
                    clusterer.markerClusterer.addMarkers(markers);
                }
            } else if (clusterer.markerClusterer) {
                clusterer.markerClusterer.removeMarkers(markers);
            }
        }
    }

    function clusterContainer(doCluster, doc) {
        var clusterer = getClusterer(doc),
            placemarks = [],
            markers = [],
            i;

        if (clusterer) {
            if (doCluster) {
                doc.getAllVisiblePlacemarks(placemarks);
                for (i = 0; i < placemarks.length; i++) {
                    if (placemarks[i].getPosition) { // only markers not polys!
                        markers.push(placemarks[i]);
                        //placemarks[i].setMap(null); - or we may get some "off map" markers that arent clustered left showing
                    }
                }
                if (!clusterer.markerClusterer) {
                    clusterer.markerClusterer = createMarkerClusterer(markers, clusterer);
                    allClusterers.push(clusterer);
                } else {
                    clusterer.markerClusterer.addMarkers(markers);
                }
            } else if (clusterer.markerClusterer) {
                if (doc === clusterer) {
                    clusterer.markerClusterer.setMap(null);
                    delete clusterer.markerClusterer;
                    allClusterers.splice($.inArray(clusterer, allClusterers), 1);
                } else {
                    doc.getAllPlacemarks(placemarks);
                    for (i = 0; i < placemarks.length; i++) {
                        if (placemarks[i].getPosition || placemarks[i].draggable) { // only markers not polys! (v3 || v2)
                            markers.push(placemarks[i]);
                        }
                    }
                    clusterer.markerClusterer.removeMarkers(markers); // clusterer will only clear the markers belonging to 'this'
                }
            }
        }
    }

    function setMarkerVisible(visible, marker) {
        var clusterer = getClusterer(marker.placemark),
            clusterFunction;
        if (clusterer && clusterer.markerClusterer) {
            clusterer.markerClusterer.markersToAdd = clusterer.markerClusterer.markersToAdd || [];
            clusterer.markerClusterer.markersToRemove = clusterer.markerClusterer.markersToRemove || [];
            if (visible) {
                clusterer.markerClusterer.markersToAdd.push(marker);
            } else {
                clusterer.markerClusterer.markersToRemove.push(marker);
            }

            clusterFunction = function (theClusterDoc) {
                if (theClusterDoc.markerClusterer.markersToAdd.length) {
                    clusterMarkers(true, theClusterDoc, theClusterDoc.markerClusterer.markersToAdd);
                    theClusterDoc.markerClusterer.markersToAdd = [];
                }
                if (theClusterDoc.markerClusterer.markersToRemove.length) {
                    clusterMarkers(false, theClusterDoc, theClusterDoc.markerClusterer.markersToRemove);
                    theClusterDoc.markerClusterer.markersToRemove = [];
                }
            };
            clearTimeout(clusterer.markersTimeout);
            clusterer.markersTimeout = setTimeout(function () { clusterFunction(clusterer); }, 100);
        }
    }

    return {
        init: function (m, o) {
            map = m;
            overlays = o;
        },
        getClusterer: function (doc) {
            return getClusterer(doc);
        },
        cluster: function (doCluster, item) {
            clusterContainer(doCluster, item);
        },
        setMarkerVisible: function (visible, marker) {
            setMarkerVisible(visible, marker);
        },
        setClustering: function (value) {
            if (!value) {
                $.each(allClusterers, function (index, clusterer) {
                    clusterer.markerClusterer.setMap(null);
                    delete clusterer.markerClusterer;
                });
                allClusterers = [];
                mapLevelClusterer = {};
            } else {
                $.each(overlays, function (index, overlay) {
                    $.each(overlay.docs, function (index, doc) {
                        clusterContainer(value, doc); // recursive
                    });
                });
            }
        }
    };
}());/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4 */
/*global google, $, util, jc2cui*/

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.latLonControl = (function () {
    "use strict";

    function LatLonControl(map) {
        var that = this,
            node = $('<div class="customMapControl"><span id="latLon-control"></span><div class="controlBack"></div></div>');

        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(node[0]);
        $('.controlBack', node).css({ opacity: 0.3 }); // cross browser

        this.control = $('#latLon-control', node)[0];

        google.maps.event.addListener(map, 'mousemove', function (event) {
            that.updatePosition(event.latLng);
        });
    }

    LatLonControl.prototype.updatePosition = function (latLon) {
        this.control.innerHTML = latLon.toUrlValue(4);
    };

    return {
        Control: LatLonControl
    };
}());/*jslint continue: true, passfail: true, plusplus: true, bitwise: true, maxerr: 50, indent: 4, unparam: true*/
/*global google, document, clearTimeout, setTimeout, $, console, util, jc2cui*/

var OWF;

function mapsLoaded() {
    "use strict";
    jc2cui.mapWidget.renderer.mapsReady();
}

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.renderer = (function () {
    "use strict";

    var map,
        mapTypeIds,
        nativeMapIds,
        lastNativeMap,
        wmsBackgroundDocs = {},
        overlays = {},
        currentLatLng,
        proxy,
        maxFileSize,
        maxPlacemarks,
        drawingSupported,
        drawingManager,
        drawing = false,
        numberDrawn = { marker: 0, shape: 0, line: 0 },
        pixelConverter,
        overlayToId = {}, // mapping of overlays the last numeric id used when mapping its child nodes to ids.
        mouseDownLoc,
        lastClickButton = -1,
        lastClickTime = 1000;

    function Overlay(id, parent, clustering) {
        this.id = id;
        this.clustering = clustering;
        this.children = {};
        this.docs = {};
        this.features = {};

        if (parent) {
            this.parent = parent;
            parent.children[this.id] = this;
            this.visible = parent.visible;
        } else {
            this.visible = true;
        }

        overlays[this.id] = this;
    }

    Overlay.prototype.setVisibility = function (visibility) {
        this.visible = visibility;

        $.each(this.docs, function (index, doc) {
            doc.setVisible(visibility, true);
        });

        $.each(this.features, function (index, feature) {
            feature.mapObject.setMap(visibility ? map : null);
            if (!visibility && jc2cui.mapWidget.infoWindow.getMapItem() && jc2cui.mapWidget.infoWindow.getMapItem().id === feature.data.id) {
                jc2cui.mapWidget.infoWindow.close();
            }
        });

        $.each(this.children, function (index, subOverlay) {
            subOverlay.setVisibility(visibility);
        });
    };

    Overlay.prototype.remove = function () {
        delete overlays[this.id];
        if (this.parent) {
            delete this.parent.children[this.id];
        }

        $.each(this.docs, function (index, doc) {
            doc.remove();
        });

        $.each(this.features, function (index, feature) {
            feature.mapObject.setMap(null);
            if (jc2cui.mapWidget.infoWindow.getMapItem() && jc2cui.mapWidget.infoWindow.getMapItem().id === feature.data.id) {
                jc2cui.mapWidget.infoWindow.close();
            }
        });

        $.each(this.children, function (index, subOverlay) {
            subOverlay.remove();
        });
    };

    function getFeatureBounds(feature) {
        var bounds = new google.maps.LatLngBounds();
        switch (feature.data.type) {
        case 'marker':
            bounds.extend(feature.mapObject.getPosition());
            break;
        case 'line':
        case 'shape':
            feature.mapObject.getPath().forEach(function (point, index) {
                bounds.extend(point);
            });
            break;
        }
        return bounds;
    }

    // TBD - somehow cache bounds, at least at individual doc level - invalidate when child added/removed
    Overlay.prototype.bounds = function () {
        var bounds = new google.maps.LatLngBounds();

        $.each(this.features, function (index, feature) {
            var b = getFeatureBounds(feature);
            if (!b.isEmpty()) {
                if (bounds.isEmpty()) { // union gets confused if union a bounds that wraps the whole world into an empty bounds 
                    bounds = b;
                } else {
                    bounds.union(b);
                }
            }
        });

        $.each(this.docs, function (index, doc) {
            doc.extendBounds(bounds);
        });

        $.each(this.children, function (index, subOverlay) {
            var childBounds = subOverlay.bounds();
            if (childBounds && !childBounds.isEmpty()) {
                if (bounds.isEmpty()) { // union gets confused if union a bounds that wraps the whole world into an empty bounds 
                    bounds = childBounds;
                } else {
                    bounds.union(childBounds);
                }
            }
        });

        return bounds;
    };

    // logic borrowed from earth extensions.js
    function convertToKmlColor(color, opacity) {
        if (color === 'transparent') {
            color = '#ffffff';
            opacity = 0;
        }

        var kmlColor = color.replace(/#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, 'ff$3$2$1').toLowerCase(),
            kmlOpacity;

        if (opacity !== undefined) {
            kmlOpacity = Math.floor(255 * opacity).toString(16);
            if (kmlOpacity.length < 2) {
                kmlOpacity = '0' + kmlOpacity;
            }
            kmlColor = kmlOpacity + kmlColor.substring(2);
        }

        return kmlColor;
    }

    function generateKml(data) {
        var kml = [],
            kmlString;

        kml.push('<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom"><Placemark id="');
        kml.push(data.id);
        kml.push('">');
        if (data.title) {
            kml.push('<name>');
            kml.push(data.title);
            kml.push('</name>');
        }
        if (data.description) {
            kml.push('<description><![CDATA[');
            kml.push(data.description);
            kml.push(']]></description>');
        }

        kml.push('<Style>');
        switch (data.type) {
        case 'marker':
            kml.push('<IconStyle><Icon><href>');
            kml.push(data.iconUrl);
            kml.push('</href></Icon><hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"></hotSpot></IconStyle></Style><Point>');
            break;
        case 'line':
        case 'shape':
            kml.push('<LineStyle><color>');
            kml.push(convertToKmlColor(data.strokeColor, data.strokeOpacity));
            kml.push('</color><width>');
            kml.push(data.strokeWeight);
            kml.push('</width></LineStyle>');

            if (data.type === 'shape') {
                kml.push('<PolyStyle><color>');
                kml.push(convertToKmlColor(data.fillColor, data.fillOpacity));
                kml.push('</color></PolyStyle>');
            }

            kml.push('</Style>');

            if (data.type === 'line') {
                kml.push('<LineString><tessellate>1</tessellate>'); // <altitudeMode>clampToGround</altitudeMode>'; - default
            } else { // shape
                kml.push('<Polygon><outerBoundaryIs><LinearRing>');
            }
            break;
        }

        kml.push('<coordinates>');

        if (data.type === 'shape' && data.coordinates.length > 0) { // close poly
            data.coordinates.push(data.coordinates[0]);
        }

        $.each(data.coordinates, function (index, latLon) {
            kml.push(latLon.lng());
            kml.push(',');
            kml.push(latLon.lat());
            kml.push(',0 ');
        });

        kml.push('</coordinates>');

        switch (data.type) {
        case 'marker':
            kml.push('</Point>');
            break;
        case 'shape':
            kml.push('</LinearRing></outerBoundaryIs></Polygon>');
            break;
        case 'line':
            kml.push('</LineString>');
            break;
        }

        kml.push('</Placemark></kml>');

        kmlString = kml.join('');

        return kmlString;
    }

    function showEditBalloon(feature) {
        jc2cui.mapWidget.showUserDrawnEditWindow(feature.data, {
            deleted: function () {
                jc2cui.mapWidget.deleteDrawing(feature.data.id);
            },
            updated: function (updatedProps) {
                var kml = generateKml(updatedProps);

                switch (feature.data.type) {
                case 'marker':
                    feature.mapObject.setIcon(new google.maps.MarkerImage(updatedProps.iconUrl, null, null, new google.maps.Point(16, 32), new google.maps.Size(32, 32)));
                    feature.mapObject.setTitle(updatedProps.title);

                    // maps bug seems to draw icon wrong size on setIcon - try removing forced redraw some time in future
                    feature.mapObject.setMap(null);
                    feature.mapObject.setMap(map);
                    break;
                case 'line':
                case 'shape':
                    feature.mapObject.setOptions({
                        strokeColor: updatedProps.strokeColor,
                        strokeWeight: updatedProps.strokeWeight,
                        strokeOpacity: updatedProps.strokeOpacity,
                        fillColor: updatedProps.fillColor,
                        fillOpacity: updatedProps.fillOpacity
                    });
                    break;
                }

                // updatedProps === feature.data so no need to update

                jc2cui.mapWidget.publishDrawing(kml, feature.data.id, feature.data.title, feature.mapObject.getVisible());
            }
        });
    }

    function makeFeatureEditable(feature, editable) {
        if (feature.data.type === 'marker') {
            feature.mapObject.setDraggable(editable);
        } else {
            feature.mapObject.setEditable(editable);
        }
    }

    function setDrawingToolsVisibility(visibility) {
        if (drawingManager) {
            drawing = visibility;

            drawingManager.setOptions({
                drawingControl: visibility
            });

            $.each(overlays, function (index, overlay) {
                $.each(overlay.features, function (index, feature) {
                    makeFeatureEditable(feature, visibility);
                });
            });
        }
    }

    function addEditableFeature(feature) {
        var overlay = overlays[jc2cui.mapWidget.USER_DRAWN_OVERLAY] || new Overlay(jc2cui.mapWidget.USER_DRAWN_OVERLAY);
        overlay.features[feature.data.id] = feature;

        google.maps.event.addListener(feature.mapObject, 'click', function () {
            if (drawing) {
                showEditBalloon(feature);
            } else {
                jc2cui.mapWidget.showPlacemarkInfoWindow(feature.data);
            }
            var item = {
                selectedId: feature.data.id || undefined,
                selectedName: feature.data.title || undefined,
                featureId: feature.data.id,
                overlayId: jc2cui.mapWidget.USER_DRAWN_OVERLAY
            };
            jc2cui.mapWidget.itemSelected(item);
        });
    }

    function getViewStatus() {
        var bounds = map.getBounds(),
            center = map.getCenter(),
            sw = bounds.getSouthWest(),
            ne = bounds.getNorthEast(),
            zoom = map.getZoom(),
            range = 35200000 / (Math.pow(2, zoom));

        // prevent wrapping bug - http://code.google.com/p/gmaps-api-issues/issues/detail?id=3247
        center = new google.maps.LatLng(center.lat(), center.lng());
        sw = new google.maps.LatLng(sw.lat(), sw.lng());
        ne = new google.maps.LatLng(ne.lat(), ne.lng());
        return jc2cui.mapWidget.createViewStatus(sw.lat(), sw.lng(), ne.lat(), ne.lng(), center.lat(), center.lng(), range);
    }

    // For Maps API implementation (not just markers - polys too)
    function processPlacemarkPart(placemarkPart, placemark, doc) {
        google.maps.event.addListener(placemarkPart, 'click', function (e) {
            var overlayId,
                featureId,
                item;

            while (doc) {
                if (doc.overlayId) {
                    overlayId = doc.overlayId;
                    featureId = doc.featureId;
                    break;
                }
                doc = doc.parent;
            }
            item = {
                selectedId: placemark.id || undefined,
                selectedName: placemark.name || undefined,
                featureId: featureId,
                overlayId: overlayId
            };
            jc2cui.mapWidget.showPlacemarkInfoWindow(placemark);
            jc2cui.mapWidget.itemSelected(item);
        });
        google.maps.event.addListener(placemarkPart, 'mousemove', function (e) {
            google.maps.event.trigger(map, 'mousemove', e);
        });
    }

    function getPolyOptions(placemark) {
        var options = {
            strokeColor: placemark.style && placemark.style.LineStyle && placemark.style.LineStyle.color ? placemark.style.LineStyle.color.color : '#ffffff',
            strokeOpacity: placemark.style && placemark.style.LineStyle && placemark.style.LineStyle.color ? placemark.style.LineStyle.color.opacity : 1,
            strokeWeight: placemark.style && placemark.style.LineStyle && placemark.style.LineStyle.width ? placemark.style.LineStyle.width : 1,
            fillColor: placemark.style && placemark.style.PolyStyle && placemark.style.PolyStyle.color ? placemark.style.PolyStyle.color.color : '#ffffff',
            fillOpacity: placemark.style && placemark.style.PolyStyle && placemark.style.PolyStyle.color ? placemark.style.PolyStyle.color.opacity : 1,
            map: map,
            visible: placemark.visible,
            title: placemark.name
        };
        if (placemark.style && placemark.style.PolyStyle && placemark.style.PolyStyle.fill === '0') {
            options.fillOpacity = 0;
        }
        if (placemark.style && placemark.style.PolyStyle && placemark.style.PolyStyle.outline === '0') {
            options.strokeWeight = 0;
        }
        return options;
    }

    function getPolyPath(path) {
        var polyPath = [],
            i;
        for (i = 0; i < path.length; i++) {
            polyPath.push(new google.maps.LatLng(path[i].lat, path[i].lon));
        }
        return polyPath;
    }
    // End For Maps API marker implementation

    // map clicks apparently not always properly fired for buttons other then left
    // determine clicks for API purposes ourselves.
    // BUT - cant grab div we want until after map properly initialized
    function registerForMouseEvents() {
        // cant listent to map or first child since map controls are also children and will fire unwanted mouse events when user clicks zoom buttons or map ctrl 
        $('div:first', ($('div:first', $('#map')))).mousedown(function (e) {
            mouseDownLoc = { x: e.pageX, y: e.pageY };
        }).mouseup(function (e) {
            if (!mouseDownLoc || (Math.abs(e.pageX - mouseDownLoc.x) < 2 && Math.abs(e.pageY - mouseDownLoc.y) < 2)) {
                var now = new Date().getTime(),
                    clicks = 1;
                if (lastClickButton === e.which && now - lastClickTime < 500) {
                    clicks = 2;
                    lastClickTime = 1000; // third click in a row is a new single click
                } else {
                    lastClickTime = now;
                }
                lastClickButton = e.which;
                jc2cui.mapWidget.mapClicked(currentLatLng.lat(), currentLatLng.lng(), clicks, e.which, e.shiftKey, e.ctrlKey, e.altKey);
            }
            mouseDownLoc = null;
        });
    }

    // jslint wont allow new with "side effects" and wont allow "unused" variable
    function createLatLonControl() {
        return new jc2cui.mapWidget.latLonControl.Control(map);
    }

    function initMap() {
        mapTypeIds = [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.TERRAIN];
        nativeMapIds = mapTypeIds.slice();
        lastNativeMap = google.maps.MapTypeId.ROADMAP;
        map = new google.maps.Map(document.getElementById("map"), {
            zoom: 3,
            center: new google.maps.LatLng(39.5, -98.3),
            mapTypeControlOptions: { mapTypeIds: mapTypeIds },
            mapTypeId: lastNativeMap,
            scaleControl: true
        });

        google.maps.event.addListener(map, 'maptypeid_changed', function () {
            var newMap = map.getMapTypeId();
            $.each(wmsBackgroundDocs, function (index, wmsDoc) {
                if (wmsDoc.name === newMap) {
                    if (!wmsDoc.visible) {
                        if (jc2cui.mapWidget.sidebar) {
                            jc2cui.mapWidget.sidebar.showFeature(wmsDoc.featureId, wmsDoc.overlayId, true);
                        } else {
                            wmsDoc.setVisible(true, true);
                        }
                    }
                } else if (wmsDoc.visible) {
                    if (jc2cui.mapWidget.sidebar) {
                        jc2cui.mapWidget.sidebar.hideFeature(wmsDoc.featureId, wmsDoc.overlayId, true);
                    } else {
                        wmsDoc.setVisible(false, true);
                    }
                }
            });
            if ($.inArray(newMap, nativeMapIds) > -1) {
                lastNativeMap = newMap;
            }
        });

        google.maps.event.addListener(map, 'mousemove', function (mouseEvent) {
            currentLatLng = mouseEvent.latLng;
        });

        google.maps.event.addListener(map, 'resize', function () {
            // Apparently fired before map div dimensions actually change (maps API appears as if this event is one way to ask map to resize...)
            setTimeout(function () {
                jc2cui.mapWidget.infoWindow.checkResize();

                $.each(overlays, function (index, overlay) {
                    $.each(overlay.docs, function (index, doc) {
                        var screenOverlays = doc.getAllScreenOverlays();
                        $.each(screenOverlays, function (i, screenOverlay) {
                            screenOverlay.placer();
                        });
                    });
                });
            }, 250);
        });

        createLatLonControl();

        var timeout,
            cssUrl,
            defaultOptions,
            kmlParserSettings;

        google.maps.event.addListener(map, 'idle', function () {
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                jc2cui.mapWidget.publishView(getViewStatus());
                // update any region based items (usually network links)
                $.each(overlays, function (index, overlay) {
                    $.each(overlay.docs, function (index, doc) {
                        doc.onViewUpdate();
                    });
                });
            }, 1000);
        });

        // Weird, but in Maps 3 you need an overlay to translate between latLng and pixels.
        function DummyOverlay(map) {
            google.maps.OverlayView.call(this);
            this.setMap(map);
        }
        DummyOverlay.prototype = new google.maps.OverlayView();
        DummyOverlay.prototype.onAdd = function () { registerForMouseEvents(); }; // when this is added we know map is ready for us to grab div and listen for events
        DummyOverlay.prototype.onRemove = function () { return; };
        DummyOverlay.prototype.draw = function () { return; };
        DummyOverlay.prototype.latLngToPixel = function (latLng) {
            return this.getProjection().fromLatLngToDivPixel(latLng);
        };
        DummyOverlay.prototype.pixelToLatLng = function (point) {
            return this.getProjection().fromDivPixelToLatLng(point);
        };
        pixelConverter = new DummyOverlay(map);

        // For Marker Overlay implementation
        function MarkerDummy(placemark, latLng, markerOverlay) {
            this.placemark = placemark;
            this.latLng = latLng;
            this.markerOverlay = markerOverlay;
            this.visible = placemark.visible;
        }
        MarkerDummy.prototype.removeFromMap = function () { return; };
        MarkerDummy.prototype.extendBounds = function (bounds) {
            bounds.extend(this.latLng);
        };
        MarkerDummy.prototype.setVisible = function (visible) {
            if (this.visible !== visible) {
                this.markerOverlay.placemarkVisibilityChanged(this.placemark);
                this.visible = visible;
                jc2cui.mapWidget.clusterManager.setMarkerVisible(visible, this); // TBD - either clusterer or marker overlay or not both
            }
        };
        MarkerDummy.prototype.getPosition = function () {
            return this.latLng;
        };
        MarkerDummy.prototype.getDraggable = function () {
            return false; // default value for google markers 'draggable' variable.
        };
        MarkerDummy.prototype.setMap = function (map) {
            if (map) {
                if (!this.placemark.addedToMarkerOverlay) {
                    this.markerOverlay.addMarker(this.placemark, this.latLng);
                }
                this.markerOverlay.placemarkVisibilityChanged(this.placemark);
            } else if (this.placemark.addedToMarkerOverlay) { // if not added, no reason to do anything
                this.markerOverlay.removeMarker(this.placemark);
                this.markerOverlay.placemarkVisibilityChanged(this.placemark);
            }
        };
        MarkerDummy.prototype.getMap = function () {
            return this.placemark.addedToMarkerOverlay ? map : undefined;
        };
        MarkerDummy.prototype.getVisible = function () {
            return this.visible;
        };
        // End For Marker Overlay implementation */

        ////// - Set up kmlParser
        kmlParserSettings = {
            proxy: proxy,
            maxFileSize: maxFileSize,
            maxPlacemarks: maxPlacemarks,
            container: '#map :first', // for screen overlays
            refreshInfoWindow: function (placemark) {
                jc2cui.mapWidget.showPlacemarkInfoWindow(placemark);
            },
            containerRemoved: function (container) {
                if (container.markerOverlay) {
                    container.markerOverlay.removeFromMap();
                }
                jc2cui.mapWidget.clusterManager.cluster(false, container); // TBD - either clusterer or marker overlay or not both
            },
            parseCallback: function (doc) { // called anytime a doc (even a network link) is parsed
                jc2cui.mapWidget.totalMarkersLoaded(jc2cui.mapWidget.kmlParser.totalEntities());
                var overlayId,
                    featureId,
                    parent = doc,
                    treeNodeData,
                    i,
                    clusterer;
                parent = doc;
                while (parent.parent) {
                    parent = parent.parent;
                }
                overlayId = parent.overlayId;
                featureId = parent.featureId;

                treeNodeData = jc2cui.mapWidget.kmlParser.getTreeData(doc, doc.visible, overlayId, featureId);
                if (treeNodeData) {
                    if ($.isArray(treeNodeData)) {
                        for (i = 0; i < treeNodeData.length; i++) {
                            jc2cui.mapWidget.addTreeItems(treeNodeData[i], overlayId, featureId, doc.parent ? doc.parent.internalId : undefined);
                        }
                    } else {
                        jc2cui.mapWidget.addTreeItems(treeNodeData, overlayId, featureId, doc.parent ? doc.parent.internalId : undefined);
                    }
                }

                clusterer = jc2cui.mapWidget.clusterManager.getClusterer(doc);
                if (clusterer) {
                    jc2cui.mapWidget.clusterManager.cluster(true, doc);
                } else if (doc.markerOverlay) {
                    doc.markerOverlay.redraw();
                }
            },
            region: function (region) {
                region.latLonAltBox = new google.maps.LatLngBounds(
                    new google.maps.LatLng(region.latLonAltBox.south, region.latLonAltBox.west),
                    new google.maps.LatLng(region.latLonAltBox.north, region.latLonAltBox.east)
                );
                return region;
            },
            isRegionActive: function (region) { // TBD - Move a bit more into the parser
                var bounds = map.getBounds(),
                    sw,
                    ne,
                    pixelWidth,
                    pixelHeight,
                    squareRoot;

                if (!bounds.intersects(region.latLonAltBox)) {
                    //return RegionCodes.OUT_OF_AREA;
                    return false;
                }

                sw = pixelConverter.latLngToPixel(region.latLonAltBox.getSouthWest());
                ne = pixelConverter.latLngToPixel(region.latLonAltBox.getNorthEast());
                pixelWidth = Math.abs(ne.x - sw.x);
                pixelHeight = Math.abs(ne.y - sw.y);
                squareRoot = (Math.round(Math.sqrt(pixelWidth * pixelHeight))).toFixed(0);

                // TBD - Should these checks be <= and >= ???????
                if (squareRoot < region.lod.minLodPixels) {
                    return false; // RegionCodes.MIN_LOD;
                }

                if (region.lod.maxLodPixels >= 0 && squareRoot > region.lod.maxLodPixels) {
                    return false; // RegionCodes.MAX_LOD;
                }

                return true; // RegionCodes.ACTIVE;
            },
            formatView: function (format) { // TBD - Move a bit more into the parser
                //  BBOX=[bboxWest],[bboxSouth],[bboxEast],[bboxNorth];CAMERA=[lookatLon],[lookatLat],[lookatRange],
                // [lookatTilt],[lookatHeading];VIEW=[horizFov],[vertFov],[horizPixels],[vertPixels],[terrainEnabled]
                var bounds = map.getBounds(),
                    sw = bounds.getSouthWest(),
                    ne = bounds.getNorthEast(),
                    nw = new google.maps.LatLng(ne.lat(), sw.lng()),
                    center = bounds.getCenter(),
                    zoom = map.getZoom(),
                    range = 35200000 / (Math.pow(2, zoom)),
                    verticalDistance = google.maps.geometry.spherical.computeDistanceBetween(sw, nw),
                    horizontalDistance = google.maps.geometry.spherical.computeDistanceBetween(ne, nw),
                    theMapDiv = $(map.getDiv());

                format = format.replace('[bboxWest]', sw.lng());
                format = format.replace('[bboxSouth]', sw.lat());
                format = format.replace('[bboxEast]', ne.lng());
                format = format.replace('[bboxNorth]', ne.lat());

                format = format.replace('[lookatLon]', center.lng());
                format = format.replace('[lookatLat]', center.lat());
                format = format.replace('[lookatRange]', range);

                format = format.replace('[lookatTilt]', 0);
                format = format.replace('[lookatHeading]', 0);

                format = format.replace('[horizFov]', ((horizontalDistance / 2) / range));
                format = format.replace('[vertFov]', ((verticalDistance / 2) / range));
                format = format.replace('[horizPixels]', theMapDiv.width());
                format = format.replace('[vertPixels]', theMapDiv.height());

                format = format.replace('[terrainEnabled]', 0);

                return format;
            },
            // This is a marker overlay implementation
            marker: function (placemark, point, doc) {
                if (!doc.markerOverlay) {
                    doc.markerOverlay = new jc2cui.mapWidget.markerOverlay.MarkerOverlay(map, doc);
                }
                var latLng = new google.maps.LatLng(point.lat, point.lon),
                    markerDummy,
                    clusterer = jc2cui.mapWidget.clusterManager.getClusterer(doc);
                if (!clusterer) {
                    doc.markerOverlay.addMarker(placemark, latLng);
                }
                markerDummy = new MarkerDummy(placemark, latLng, doc.markerOverlay);
                return markerDummy;
            },
            /* This is a maps API implementation
            //      - Not yet supporting pallete - no issue just lazy
            //      - What to do about rotate? Custom markers if heading !== 0? - Same solution as for ground overlays with rotation?
            //      - hotspot support probably wrong (copied from geoxml3)
            markerAPI: function (placemark, point, doc) {
                var markerImage,
                    markerOptions,
                    marker,
                    w = 32,
                    h = 32,
                    aX,
                    aY;

                if (placemark.style && placemark.style.markerImage) {
                    markerImage = placemark.style.markerImage;
                } else {
                    if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.scale) {
                        // Firefox and Chrome get upset if we try to make markers with 0 w/h
                        // Some kml uses scale 0 as trick to get invisible markers with labels in center of polygons - e.g. mexicostates.kml
                        if (placemark.style.IconStyle.scale === '0') { // TBD - change to 0 when we parse kml correctly
                            return;
                        }
                        w = w * placemark.style.IconStyle.scale;
                        h = h * placemark.style.IconStyle.scale;
                    }
                    aX = w / 2;
                    aY = h / 2;

                    // This is almost certainly wrong - especially insetPixels
                    if (placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.hotspot) {
                        switch (placemark.style.IconStyle.hotspot.xunits) {
                        case 'fraction':
                            aX = Math.round(placemark.style.IconStyle.hotspot.x * w);
                            break;
                        case 'insetPixels':
                            aX = Math.round(w * placemark.style.IconStyle.hotspot.x);
                            break;
                        default:
                            aX = Math.round(placemark.style.IconStyle.hotspot.x);
                            break;  // already pixels
                        }
                        aY = Math.round(((placemark.style.IconStyle.hotspot.yunits === 'fraction') ? h : 1) * placemark.style.IconStyle.hotspot.y);  // insetPixels Y = pixels Y
                    }

                    markerImage = new google.maps.MarkerImage(
                        placemark.style && placemark.style.IconStyle && placemark.style.IconStyle.Icon && placemark.style.IconStyle.Icon.href ? placemark.style.IconStyle.Icon.href : [jc2cui.mapWidget.getAppPath(), 'images/error-pushpin.png'].join(''),    // url
                        new google.maps.Size(w, h), // size
                        new google.maps.Point(0, 0), // origin
                        new google.maps.Point(aX, aY), // anchor
                        new google.maps.Size(w, h) // scaledSize
                    );
                    if (placemark.style) {
                        placemark.style.markerImage = markerImage;
                    }
                }

                markerOptions = {
                    map: map,
                    visible: placemark.visibility,
                    position: new google.maps.LatLng(point.lat, point.lon),
                    title: placemark.name,
                    zIndex: Math.round(point.lat * -100000) << 5,
                    icon: markerImage
                };

                // Create the marker on the map
                marker = new google.maps.Marker(markerOptions);
                processPlacemarkPart(marker, placemark, doc);
                return marker;
            },*/
            polyline: function (placemark, path, doc) {
                var polylineOptions = getPolyOptions(placemark),
                    polyline;

                polylineOptions.path = getPolyPath(path);

                polyline = new google.maps.Polyline(polylineOptions);
                processPlacemarkPart(polyline, placemark, doc);
                return polyline;
            },
            polygon: function (placemark, paths, doc) {
                var i,
                    polygonOptions = getPolyOptions(placemark),
                    polygon,
                    coords;

                polygonOptions.paths = [];
                for (i = 0; i < paths.length; i++) {
                    coords = getPolyPath(paths[i]);
                    if (i !== 0) { // inner polys need to be reverse order to create donuts in maps V3 API
                        coords.reverse();
                    }
                    polygonOptions.paths.push(coords);
                }

                polygon = new google.maps.Polygon(polygonOptions);
                processPlacemarkPart(polygon, placemark, doc);
                return polygon;
            },
            // This native google maps 3 implementation cant rotate - ground overlay latlonbox can include rotate
            // Use custom overlay? Same solution as for markers with rotation?
            groundOverlay: function (groundOverlay, doc) {
                var bounds;

                // Apparently lat lon box has no meaning when a view format BBOX is also present ?????
                // Try for example http://www.epa.gov/waters/tools/WATERSKMZ/releases/WATERS Data 1.4 (Raster).kmz
                if (groundOverlay.icon.viewFormat && groundOverlay.icon.viewFormat.length && groundOverlay.icon.viewFormat.indexOf('BBOX') >= 0) {
                    bounds = map.getBounds();
                } else {
                    bounds = new google.maps.LatLngBounds(
                        new google.maps.LatLng(groundOverlay.latLonBox.south, groundOverlay.latLonBox.west),
                        new google.maps.LatLng(groundOverlay.latLonBox.north, groundOverlay.latLonBox.east)
                    );
                }
                return new google.maps.GroundOverlay(groundOverlay.icon.getHref(), bounds, { clickable: false, map: groundOverlay.visible ? map : null, opacity: groundOverlay.opacity });
            },
            bounds: function () {
                return new google.maps.LatLngBounds();
            }
        };

        // For Maps API marker implementation - and to support user drawn!
        google.maps.Marker.prototype.removeFromMap = function () {
            this.setMap(null);
        };
        google.maps.Marker.prototype.extendBounds = function (bounds) {
            bounds.extend(this.getPosition());
        };
        // End For Maps API marker implementation*/
        google.maps.Polyline.prototype.removeFromMap = google.maps.Marker.prototype.removeFromMap;
        google.maps.Polyline.prototype.extendBounds = function (bounds) {
            this.getPath().forEach(function (e) {
                bounds.extend(e);
            });
        };
        google.maps.Polygon.prototype.removeFromMap = google.maps.Marker.prototype.removeFromMap;
        google.maps.Polygon.prototype.extendBounds = google.maps.Polyline.prototype.extendBounds;
        google.maps.GroundOverlay.prototype.removeFromMap = google.maps.Marker.prototype.removeFromMap;
        google.maps.GroundOverlay.prototype.extendBounds = function (bounds) {
            bounds.union(this.getBounds());
        };
        google.maps.GroundOverlay.prototype.setVisible = function (visible) {
            if (visible) {
                this.setMap(map);
            } else {
                this.setMap(null);
            }
        };
        google.maps.GroundOverlay.prototype.refreshIcon = function (groundOverlay) {
            this.remove();
            groundOverlay.features = [kmlParserSettings.groundOverlay(groundOverlay)];
        };
        jc2cui.mapWidget.kmlParser.init(kmlParserSettings);
        jc2cui.mapWidget.clusterManager.init(map, overlays);
        //////

        /// For marker overlay implementation
        jc2cui.mapWidget.markerOverlay.init();
        /// End For marker overlay implementation
        jc2cui.mapWidget.infoWindow.init({ containment: "#map" });

        if (drawingSupported) {
            defaultOptions = {
                markerOptions: {
                    icon: new google.maps.MarkerImage(jc2cui.mapWidget.getDefaultDrawingIcon(), null, null, new google.maps.Point(16, 32), new google.maps.Size(32, 32)),
                    draggable: true
                },
                polylineOptions: {
                    strokeColor: '#15428B',
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                    editable: true
                },
                polygonOptions: { // TBD - dont repeat line defaults here
                    strokeColor: '#15428B',
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                    fillColor: '#DFE8F6',
                    fillOpacity: 0.5,
                    editable: true
                }
            };
            drawingManager = new google.maps.drawing.DrawingManager({
                drawingControl: false,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_CENTER,
                    drawingModes: [google.maps.drawing.OverlayType.MARKER, google.maps.drawing.OverlayType.POLYLINE, google.maps.drawing.OverlayType.POLYGON]
                },
                markerOptions: defaultOptions.markerOptions,
                polylineOptions: defaultOptions.polylineOptions,
                polygonOptions: defaultOptions.polygonOptions
            });
            drawingManager.setMap(map);

            google.maps.event.addListener(drawingManager, 'overlaycomplete', function (event) {
                var getBounds = function () {
                        var bounds = new google.maps.LatLngBounds();
                        event.overlay.extendBounds(bounds); // non standard extension method
                        return bounds;
                    },
                    data = {
                        id: jc2cui.mapWidget.getNewId(),
                        getBounds: getBounds
                    },
                    feature = {
                        data: data,
                        mapObject: event.overlay,
                        getBounds: getBounds
                    },
                    isShape = false,
                    kml;

                switch (event.type) {
                case google.maps.drawing.OverlayType.MARKER:
                    data.type = 'marker';
                    data.title = data.type + ' ' + (++numberDrawn.marker);
                    data.coordinates = [event.overlay.getPosition()];
                    data.iconUrl = event.overlay.getIcon().url;

                    google.maps.event.addListener(feature.mapObject, 'dragend', function (mouseEvent) {
                        data.coordinates[0] = mouseEvent.latLng;
                        kml = generateKml(data);
                        jc2cui.mapWidget.publishDrawing(kml, feature.data.id, feature.data.title, feature.mapObject.getVisible());
                    });

                    break;
                case google.maps.drawing.OverlayType.POLYLINE:
                case google.maps.drawing.OverlayType.POLYGON:
                    isShape = event.type === google.maps.drawing.OverlayType.POLYGON;
                    data.type = isShape ? 'shape' : 'line';
                    data.title = data.type + ' ' + (++numberDrawn[data.type]);
                    data.coordinates = event.overlay.getPath().getArray();
                    data.iconUrl = [jc2cui.mapWidget.getAppPath(), 'images/', isShape ? 'poly' : 'line', 'Mask.png"'].join('');
                    data.strokeColor = defaultOptions.polylineOptions.strokeColor; // TBD - get rest by merging with/from options object or could use drawingManager.get('polylineOptions');
                    data.strokeWeight = defaultOptions.polylineOptions.strokeWeight;
                    data.strokeOpacity = defaultOptions.polylineOptions.strokeOpacity;
                    if (isShape) {
                        data.fillColor = defaultOptions.polygonOptions.fillColor;
                        data.fillOpacity = defaultOptions.polygonOptions.fillOpacity;
                    }

                    google.maps.event.addListener(event.overlay.getPath(), 'insert_at', function (index) {
                        kml = generateKml(data);
                        jc2cui.mapWidget.publishDrawing(kml, feature.data.id, feature.data.title, feature.mapObject.getVisible());
                    });
                    google.maps.event.addListener(event.overlay.getPath(), 'remove_at', function (index, removedElement) {
                        kml = generateKml(data);
                        jc2cui.mapWidget.publishDrawing(kml, feature.data.id, feature.data.title, feature.mapObject.getVisible());
                    });
                    google.maps.event.addListener(event.overlay.getPath(), 'set_at', function (index, oldElement) {
                        kml = generateKml(data);
                        jc2cui.mapWidget.publishDrawing(kml, feature.data.id, feature.data.title, feature.mapObject.getVisible());
                    });
                    break;
                }

                addEditableFeature(feature);
                showEditBalloon(feature);

                kml = generateKml(data);
                jc2cui.mapWidget.publishDrawing(kml, feature.data.id, feature.data.title, feature.mapObject.getVisible());

                drawingManager.setDrawingMode(null);
            });
        }

        // In IE dynamically inserted style urls apparently are relative to root directory. Rather then hardcoding that, doing this...
        // other browsers are happy starting with url = 'css/'
        cssUrl = document.location.href;
        cssUrl = cssUrl.substring(0, cssUrl.lastIndexOf('/') + 1);
        cssUrl += 'css/google.maps.v3.all.min.css';

        $('<link rel="stylesheet" type="text/css" href="' + cssUrl + '" >').appendTo("head");

        jc2cui.mapWidget.rendererReady();
    }

    function findItemInContainer(itemId, doc) {
        var containers = [doc],
            features,
            screenOverlays,
            theItem;

        doc.getAllContainers(containers);
        $.each(containers, function (i, container) {
            if (container.internalId === itemId) {
                theItem = container;
                return false;
            }
        });

        if (!theItem) {
            features = doc.getAllFeatures();
            $.each(features, function (i, feature) {
                if (feature.internalId === itemId) {
                    theItem = feature;
                    return false;
                }
            });
        }

        if (!theItem) {
            screenOverlays = doc.getAllScreenOverlays();
            $.each(screenOverlays, function (i, screenOverlay) {
                if (screenOverlay.internalId === itemId) {
                    theItem = screenOverlay;
                    return false;
                }
            });
        }

        return theItem;
    }

    function WmsDoc(name, wmsLayer, background, visible) {
        jc2cui.mapWidget.kmlParser.Container.call(this);
        this.name = name;
        this.wmsLayer = wmsLayer;
        this.background = background;
        if (background) {
            map.mapTypes.set(name, wmsLayer);
            mapTypeIds.push(name);
            map.setOptions({
                mapTypeControlOptions: {
                    mapTypeIds: mapTypeIds
                }
            });
            wmsBackgroundDocs[this.name] = this;
        }

        if (visible) {
            this.setVisible(true, true);
        }
    }

    WmsDoc.prototype = new jc2cui.mapWidget.kmlParser.Container(null, true);

    WmsDoc.prototype.remove = function () {
        if (this.background) {
            delete wmsBackgroundDocs[this.name]; // do this first so tree visibility doesnt get messed up on reload

            map.mapTypes.set(this.name, null);
            mapTypeIds.splice($.inArray(this.name, mapTypeIds), 1);

            map.setOptions({
                mapTypeControlOptions: {
                    mapTypeIds: mapTypeIds
                }
            });

            if (map.getMapTypeId() === this.name) {
                map.setMapTypeId(lastNativeMap);
            }
        } else {
            this.setVisible(false, true);
        }
    };

    WmsDoc.prototype.setVisible = function (visible, setVisibility) {
        if (this.visible !== visible) {
            this.visible = visible;
            if (setVisibility) {
                this.visibility = visible;
            }
            if (this.background) {
                if (visible) {
                    map.setMapTypeId(this.name);
                } else if (map.getMapTypeId() === this.name) {
                    map.setMapTypeId(lastNativeMap);
                }
            } else {
                if (visible) {
                    map.overlayMapTypes.push(this.wmsLayer);
                } else {
                    //map.overlayMapTypes.splice($.inArray(this.wmsLayer, map.overlayMapTypes), 1);
                    var that = this,
                        itsIndex;
                    map.overlayMapTypes.forEach(function (item, index) {
                        if (item === that.wmsLayer) {
                            itsIndex = index;
                            //break; - does break work in MVCArray forEach? no docs - need to try sometime
                        }
                    });
                    if (itsIndex !== undefined) {
                        map.overlayMapTypes.removeAt(itsIndex);
                    }
                }
            }
        }
    };

    function loadWms(overlayId, featureId, name, url, params, background, sender, msg) {
        var overlay = overlays[overlayId] || new Overlay(overlayId),
            doc,
            oldDoc = overlay.docs[featureId],
            visible = oldDoc ? oldDoc.visible : overlay.visible,
            featureData,
            version3 = false, // 1.3 and above change srs to crs and switch bbox lat lon order
            WmsGetTileUrl = function (tile, zoom) {
                var projection = map.getProjection(),
                    zpow = Math.pow(2, zoom),
                    ulp = new google.maps.Point(tile.x * 256.0 / zpow, (tile.y + 1) * 256.0 / zpow),
                    lrp = new google.maps.Point((tile.x + 1) * 256.0 / zpow, (tile.y) * 256.0 / zpow),
                    ul = projection.fromPointToLatLng(ulp),
                    lr = projection.fromPointToLatLng(lrp),
                    postParams = '',
                    bbox,
                    first = url.indexOf('?') < 0;

                $.each(params, function (param, val) {
                    if (first) {
                        postParams = '?';
                        first = false;
                    } else {
                        postParams += '&';
                    }
                    postParams += param;
                    postParams += '=';
                    postParams += val;
                });

                // prevent wrapping bug - http://code.google.com/p/gmaps-api-issues/issues/detail?id=3247
                //ul = new google.maps.LatLng(ul.lat(), ul.lng());
                //lr = new google.maps.LatLng(lr.lat(), lr.lng());
                if (!version3) {
                    bbox = ul.lng() + ',' + ul.lat() + ',' + lr.lng() + ',' + lr.lat();
                } else {
                    bbox = ul.lat() + ',' + ul.lng() + ',' + lr.lat() + ',' + lr.lng();
                }
                postParams += "&BBOX=" + bbox;

                return url + postParams;
            },
            wmsOptions = {
                alt: 'Load ' + name,
                getTileUrl: WmsGetTileUrl,
                isPng: false,
                maxZoom: 17,
                minZoom: 1,
                name: name,
                tileSize: new google.maps.Size(256, 256)
            },
            tempParams = {},
            srs = "EPSG:4326",
            wmsLayer;

        params = params || {};
        // force all params to upper case. some WMS servers wont honor lowercase
        $.each(params, function (param, val) {
            tempParams[param.toUpperCase()] = val;
        });
        params = tempParams;

        params.SERVICE = /*params.SERVICE ||*/ 'WMS';
        params.REQUEST = /*params.REQUEST ||*/ 'GetMap';
        params.VERSION = params.VERSION || '1.1.1';
        if (params.VERSION === '1.1.1' || params.VERSION === '1.1.0' || params.VERSION === '1.0.0') {
            params.SRS = srs;
        } else { // 1.3.0
            version3 = true;
            params.CRS = srs;
        }
        params.FORMAT = params.FORMAT || 'image/png';
        params.TRANSPARENT = params.TRANSPARENT || 'TRUE';
        params.STYLES = params.STYLES || '';
        params.BGCOLOR = params.BGCOLOR || '0xFFFFFF';
        params.WIDTH = '256';
        params.HEIGHT = '256';

        wmsLayer = new google.maps.ImageMapType(wmsOptions);

        if (oldDoc) {
            oldDoc.remove();
        }

        doc = new WmsDoc(name, wmsLayer, background, visible);
        doc.featureId = featureId;
        doc.internalId = featureId;
        doc.overlayId = overlayId;
        doc.name = name;
        overlay.docs[featureId] = doc;

        featureData = {
            title: doc.name || doc.featureId,
            key: doc.featureId,
            isFeature: true,
            select: visible//,
            //parentId: overlayId
        };
        jc2cui.mapWidget.addTreeItems(featureData, overlayId);
    }

    function zoomToRange(range) {
        //var zoom = Math.round(26 - (Math.log(data.range) / Math.log(2)));
        var zoom = Math.round(Math.log(35200000 / range) / Math.log(2));

        if (zoom < 0) {
            zoom = 0;
        } else if (zoom > 21 || zoom === Infinity) { // 21 is max zoom
            zoom = 21;
        }
        if (map.getZoom() !== zoom) {
            map.setZoom(zoom);
        }
    }

    function centerOnLocation(location, zoom) {
        var range;
        if (zoom !== undefined && zoom !== null) { // maybe 0
            if (zoom === 'auto') {
                range = 0;
            } else {
                range = zoom;
            }
            zoomToRange(range);
        }
        if (!map.getCenter().equals(location)) {
            map.panTo(location);
        }
    }

    // LatLngBounds bnds -> height and width as a Point
    function hwpx(bounds) {
        var proj = pixelConverter.getProjection(),
            sw = proj.fromLatLngToContainerPixel(bounds.getSouthWest()),
            ne = proj.fromLatLngToContainerPixel(bounds.getNorthEast());
        return new google.maps.Point(Math.abs(sw.y - ne.y), Math.abs(sw.x - ne.x));
    }

    // LatLngBounds b1, b2 -> zoom increment
    function extra_zoom(b1, b2) {
        var hw1 = hwpx(b1),
            hw2 = hwpx(b2),
            qx,
            qy,
            min;
        if (Math.floor(hw1.x) === 0) { return 0; }
        if (Math.floor(hw1.y) === 0) { return 0; }
        qx = hw2.x / hw1.x;
        qy = hw2.y / hw1.y;
        min = qx < qy ? qx : qy;
        if (min < 1) { return 0; }
        return Math.floor(Math.log(min) / Math.log(2));
    }

    function centerOnBounds(bounds, zoom) {
        if (!bounds.isEmpty()) {
            if (zoom === 'auto') {
                if (!map.getBounds().equals(bounds)) {
                    map.fitBounds(bounds);
                    // fitBounds broken, See http://code.google.com/p/gmaps-api-issues/issues/detail?id=3117
                    google.maps.event.addListenerOnce(map, 'bounds_changed', function () {
                        var zoom = extra_zoom(bounds, map.getBounds());
                        if (zoom > 0) {
                            map.setZoom(map.getZoom() + zoom);
                        }
                    });
                }
            } else {
                centerOnLocation(bounds.getCenter(), zoom);
            }
        }
    }

    function setView(item, zoom) {
        var bounds;

        if (item.viewer) {
            centerOnLocation(new google.maps.LatLng(item.viewer.latitude, item.viewer.longitude), zoom === 'auto' ? item.viewer.altitude : zoom);
        } else {
            bounds = new google.maps.LatLngBounds();
            item.extendBounds(bounds);
            centerOnBounds(bounds, zoom);
        }
    }

    function fetchKml(overlayId, featureId, name, additionalProxy, url, zoom, clustering, sender, msg) {
        var overlay,
            doc,
            oldDoc,
            errMsg;

        try {
            overlay = overlays[overlayId] || new Overlay(overlayId);
            oldDoc = overlay.docs[featureId];

            doc = jc2cui.mapWidget.kmlParser.loadKml(url, oldDoc ? oldDoc.visible : overlay.visible, null, function (result) {
                // dont remove old until load complete to help reduce flicker
                if (oldDoc) {
                    oldDoc.remove();
                }

                if (!result.error) {
                    if (zoom) { // TBD - only if user hasnt already manually zoomed while it was loading?
                        setView(doc, 'auto');
                    }
                }
            }, null, null, clustering);
            doc.featureId = featureId;
            doc.overlayId = overlayId;
            doc.name = name;
            overlay.docs[featureId] = doc;
        } catch (err) {
            errMsg = 'Failed to plot KML.';
            if (err) {
                errMsg += ': ' + err;
            }
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.plot', msg: msg, error: errMsg });
        }
    }

    function parseKml(overlayId, featureId, name, kml, zoom, clustering, sender, msg) {
        var overlay,
            doc,
            oldDoc,
            errMsg;
        try {
            overlay = overlays[overlayId] || new Overlay(overlayId);
            oldDoc = overlay.docs[featureId];

            doc = jc2cui.mapWidget.kmlParser.parseKmlString(kml, oldDoc ? oldDoc.visible : overlay.visible, null, function (result) {
                // dont remove old until load complete to help reduce flicker
                if (oldDoc) {
                    oldDoc.remove();
                }

                if (!result.error) {
                    if (zoom) { // TBD - only if user hasnt already manually zoomed while it was loading?
                        setView(doc, 'auto');
                    }
                }
            }, clustering);
            doc.featureId = featureId;
            doc.overlayId = overlayId;
            doc.name = name;
            overlay.docs[featureId] = doc;
        } catch (err) {
            errMsg = 'Failed to plot KML.';
            if (err) {
                errMsg += ': ' + err;
            }
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.plot', msg: msg, error: errMsg });
        }
    }

    function removeFeature(data, sender, msg) {
        var overlay = overlays[data.overlayId],
            kmlDoc,
            removedIt = false;
        if (!overlay) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.unplot', msg: msg, error: 'Unable to find overlay ' + data.overlayId });
            return;
        }

        // first try user drawn
        if (overlay.features[data.featureId]) {
            overlay.features[data.featureId].mapObject.setMap(null);
            delete overlay.features[data.featureId];
            removedIt = true;
            if (jc2cui.mapWidget.infoWindow.getMapItem() && jc2cui.mapWidget.infoWindow.getMapItem().id === data.featureId) {
                jc2cui.mapWidget.infoWindow.close();
            }
        }

        // then try kml
        if (!removedIt) {
            kmlDoc = overlay.docs[data.featureId];
            if (kmlDoc) {
                kmlDoc.remove();
                delete overlay.docs[data.featureId];
                removedIt = true;
            }
        }

        if (!removedIt) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.remove', msg: msg, error: 'Unable to find kml ' + data.featureId + ' in overlay ' + data.overlayId });
        }
    }

    function showFeature(data, sender, msg) {
        var overlay = overlays[data.overlayId],
            shown = false,
            doc;
        if (!overlay) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.show', msg: msg, error: 'No overlay with id ' + data.overlayId + ' found.' });
            return;
        }

        // first try user drawn
        if (overlay.features[data.featureId]) {
            overlay.features[data.featureId].mapObject.setMap(map);
            shown = true;
        }

        // then try kml
        if (!shown) {
            doc = overlay.docs[data.featureId];
            if (doc) {
                doc.setVisible(true, true);
                shown = true;
            }
        }

        if (!shown) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.show', msg: msg, error: 'No feature with id ' + data.featureId + ' found to show.' });
            return;
        }
    }

    function hideFeature(data, sender, msg) {
        var overlay = overlays[data.overlayId],
            hidden = false,
            doc;
        if (!overlay) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.hide', msg: msg, error: 'No overlay with id ' + data.overlayId + ' found.' });
            return;
        }

        // first try user drawn
        if (overlay.features[data.featureId]) {
            overlay.features[data.featureId].mapObject.setMap(null);
            hidden = true;
            if (jc2cui.mapWidget.infoWindow.getMapItem() && jc2cui.mapWidget.infoWindow.getMapItem().id === data.featureId) {
                jc2cui.mapWidget.infoWindow.close();
            }
        }

        // then try kml
        if (!hidden) {
            doc = overlay.docs[data.featureId];
            if (doc) {
                doc.setVisible(false, true);
                hidden = true;
            }
        }

        if (!hidden) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.hide', msg: msg, error: 'No feature with id ' + data.featureId + ' found to hide.' });
            return;
        }
    }

    function setOverlayVisibility(id, visibility, sender, msg) {
        var overlay = overlays[id];
        if (!overlay) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.overlay.' + (visibility ? 'show' : 'hide'), msg: msg, error: 'No overlay with id ' + id + ' found to ' + (visibility ? 'show.' : 'hide.') });
            return;
        }
        overlay.setVisibility(visibility);
    }

    function isOverlayVisible(id) {
        var overlay = overlays[id];
        if (overlay) {
            return overlay.visible;
        }
        return false;
    }

    function removeOverlay(id, sender, msg) {
        var overlay = overlays[id];
        if (!overlay) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'removeOverlay', msg: msg, error: 'No overlay with id ' + id + ' found to remove.' });
            return;
        }
        overlay.remove();
        delete overlayToId[id];
    }

    function findItem(itemId, overlayId) {
        var overlay = overlays[overlayId],
            theItem;
        if (overlay) {
            $.each(overlay.docs, function (index, doc) {
                theItem = findItemInContainer(itemId, doc);
                return !theItem;
            });
        }
        return theItem;
    }

    function centerOnOverlay(overlayId, zoom, sender, msg) {
        var overlay = overlays[overlayId];

        if (!overlay) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.view.center.overlay', msg: msg, error: 'Unable to find overlay ' + overlayId });
            return;
        }

        centerOnBounds(overlay.bounds(), zoom);
    }

    function centerOnFeature(data, sender, msg) {
        var overlay = overlays[data.overlayId],
            feature,
            selectedData,
            doc,
            bounds;

        if (!overlay) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.view.center.feature', msg: msg, error: 'Unable to find overlay ' + data.overlayId });
            return;
        }

        // first try user drawn
        feature = overlay.features[data.featureId];
        if (feature) {
            bounds = getFeatureBounds(feature);
            centerOnBounds(bounds, data.zoom);
            if (data.select) {
                selectedData = {
                    selectedId: feature.data.id || undefined,
                    selectedName: feature.data.title || undefined,
                    featureId: data.featureId,
                    overlayId: data.overlayId
                };
            }
        } else { // then try kml
            doc = overlay.docs[data.featureId];
            if (!doc) {
                jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.view.center.feature', msg: msg, error: 'Unable to find feature ' + data.featureId });
                return;
            }
            setView(doc, data.zoom);
            if (data.select && data.overlayId === jc2cui.mapWidget.USER_DRAWN_OVERLAY) {
                selectedData = {
                    selectedId: data.featureId || undefined,
                    selectedName: doc.features.length ? doc.features[0].name || undefined : undefined,
                    featureId: data.featureId,
                    overlayId: data.overlayId
                };
            }
        }

        if (selectedData) {
            jc2cui.mapWidget.itemSelected(selectedData);
        }
    }

    function centerOnItem(data) {
        var theItem = findItem(data.itemId, data.overlayId),
            parent,
            selectedData;

        if (theItem) {
            setView(theItem, data.zoom);
            if (data.select) {
                parent = theItem.parent;
                while (parent.parent) {
                    parent = parent.parent;
                }
                selectedData = {
                    selectedId: theItem.id || undefined,
                    selectedName: theItem.name || undefined,
                    featureId: parent.featureId,
                    overlayId: parent.overlayId
                };
                jc2cui.mapWidget.itemSelected(selectedData);
            }
        }
    }

    function showItem(data) {
        var theItem = findItem(data.itemId, data.overlayId),
            bounds;

        if (theItem) {
            theItem.setVisible(true, true);
            if (data.zoom) {
                bounds = new google.maps.LatLngBounds();
                theItem.extendBounds(bounds);
                centerOnBounds(bounds);
            }
        }
    }

    function hideItem(data) {
        var theItem = findItem(data.itemId, data.overlayId);

        if (theItem) {
            theItem.setVisible(false, true);
        }
    }

    function selected(data) {
        var overlay = overlays[data.overlayId],
            selectedItem,
            loc,
            bounds;

        if (!overlay) {
            console.log('maps V3 configured map widget unable to find overlay ' + data.overlayId + ' for selected item with id ' + data.selectedId + ' and name ' + data.selectedName);
            return;
        }

        // TBD - only look for selected in feature identified by featureId
        // TBD - If no selectedId and selectedName included but featureId contains only one feature, it is selected

        // first try user drawn
        selectedItem = overlay.features[data.selectedId];
        if (selectedItem) {
            switch (selectedItem.data.type) {
            case 'marker':
                loc = selectedItem.mapObject.getPosition();
                break;
            case 'line':
            case 'shape':
                bounds = new google.maps.LatLngBounds();
                selectedItem.mapObject.getPath().forEach(function (point, index) {
                    bounds.extend(point);
                });
                loc = bounds.getCenter();
                break;
            }
        } else {
            // then look for loaded kml by id
            if (data.selectedId && data.selectedId.length > 0) {
                $.each(overlay.docs, function (index, doc) {
                    var features = doc.getAllFeatures();
                    $.each(features, function (i, feature) {
                        if (feature.id === data.selectedId) {
                            selectedItem = feature;
                            return false;
                        }
                    });
                    return !selectedItem;
                });
            }

            // then loaded kml by name
            if (!selectedItem && data.selectedName && data.selectedName.length > 0) {
                $.each(overlay.docs, function (index, doc) {
                    var features = doc.getAllFeatures();
                    $.each(features, function (i, feature) {
                        if (feature.name === data.selectedName) {
                            selectedItem = feature;
                            return false;
                        }
                    });
                    return !selectedItem;
                });
            }

            if (selectedItem) {
                bounds = new google.maps.LatLngBounds();
                selectedItem.extendBounds(bounds);
                if (!bounds.isEmpty()) {
                    loc = bounds.getCenter();
                }
            }
        }

        if (selectedItem) {
            if (loc) {
                centerOnLocation(loc);
            } else {
                console.log('maps V3 configured map widget unable to determine location of selected item with id ' + data.selectedId + ' and name ' + data.selectedName);
            }
        } else {
            console.log('maps V3 configured map widget unable to find selected item with id ' + data.selectedId + ' and name ' + data.selectedName);
        }
    }

    function setExpanded(overlayId, itemId, expanded) {
        var overlay = overlays[overlayId],
            foundIt = false;

        if (overlay) {
            $.each(overlay.docs, function (index, doc) {
                var containers = doc.getAllContainers();
                $.each(containers, function (i, container) {
                    if (container.internalId === itemId) {
                        container.open = expanded;
                        foundIt = true;
                        return false;
                    }
                });
                return !foundIt;
            });
        }
    }

    return {
        init: function (config) {
            proxy = config.proxy;
            maxFileSize = config.constraints ? config.constraints.maxFileSize : undefined;
            maxPlacemarks = config.constraints ? config.constraints.maxPlacemarks : undefined;
            drawingSupported = config.sidebar && config.sidebar.drawing;
            var url = (config.server || 'https://maps.googleapis.com/maps/api/js') + '?v=3&sensor=false&callback=mapsLoaded&libraries=geometry';
            if (drawingSupported) {
                url += ',drawing';
            }
            $.ajax({
                url: url,
                dataType: 'script',
                timeout: 20000, // At least as of jQuery 1.7.1 no longer getting error callbacks if cross domain script loading fails
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    var msg = 'Error initializing Google Maps';
                    if (textStatus && textStatus !== 'error') {
                        msg += ': ' + textStatus;
                    }
                    jc2cui.mapWidget.showError(msg);
                }
            });
        },
        createOverlay: function (data, sender, msg) {
            if (overlays[data.overlayId]) {
                return;
            }
            var parent;
            if (data.parentId) {
                parent = overlays[data.parentId];
                if (!parent) {
                    console.log("maps V3 configured map widget unable to find parent overlay with id " + data.parentId);
                }
            }
            return new Overlay(data.overlayId, parent, data.clustering);
        },
        removeOverlay: function (id, sender, msg) {
            removeOverlay(id, sender, msg);
        },
        setOverlayVisibility: function (id, visibility, sender, msg) {
            setOverlayVisibility(id, visibility, sender, msg);
        },
        isOverlayVisible: function (id) {
            return isOverlayVisible(id);
        },
        updateOverlay: function (data, sender, msg) {
            var overlay = overlays[data.overlayId],
                newParent,
                oldParent,
                oldClusterer,
                newClusterer,
                recluster;
            if (!overlay) {
                return false;
            }
            if (data.clustering) {
                overlay.clustering = data.clustering;
                recluster = true;
            }
            if (data.parentId) {
                newParent = overlays[data.parentId];
                if (!newParent) {
                    console.log("maps V3 configured map widget unable to find parent overlay with id " + data.parentId);
                }

                oldParent = overlay.parent;
                if (oldParent !== newParent) {
                    oldClusterer = jc2cui.mapWidget.clusterManager.getClusterer(overlay);
                    if (oldParent) {
                        delete oldParent.children[overlay.id];
                    }
                    overlay.parent = newParent;
                    newParent.children[overlay.id] = overlay;
                    newClusterer = jc2cui.mapWidget.clusterManager.getClusterer(overlay);
                    if (oldClusterer !== newClusterer) {
                        recluster = true;
                    }
                }
            }

            if (recluster) {
                // TBD - Write more efficient method of reclustering just these 2 overlays
                jc2cui.mapWidget.clusterManager.setClustering(false);
                jc2cui.mapWidget.clusterManager.setClustering(true);
            }

            return true;
        },
        loadKml: function (data, sender, msg) {
            fetchKml(data.overlayId, data.featureId, (data.name || data.featureName || data.url), data.proxy, data.url, data.zoom, data.clustering, sender, msg);
        },
        loadWms: function (data, sender, msg) {
            loadWms(data.overlayId, data.featureId, (data.name || data.featureName || data.url), data.url, data.params, data.background, sender, msg);
        },
        parseKml: function (data, sender, msg) {
            parseKml(data.overlayId, data.featureId, (data.name || data.featureName || 'kml'), data.feature, data.zoom, data.clustering, sender, msg);
        },
        removeFeature: function (data, sender, msg) {
            removeFeature(data, sender, msg);
        },
        updateFeature: function (data, errors, sender, msg) {
            var overlay = overlays[data.overlayId],
                recluster,
                newOverlay,
                feature,
                oldClusterer,
                newClusterer;

            if (data.clustering) {
                recluster = true;
            }

            if (!overlay) {
                errors.push('Unable to find overlay ' + data.overlayId);
                return false;
            }
            // no need to check user drawn - makes no sense for individual item on map to have own clustering
            feature = overlay.docs[data.featureId];
            if (!feature) {
                errors.push('Unable to find feature ' + data.featureId + ' in overlay ' + data.overlayId);
                return false;
            }

            // if changed overlays need to move it and see if clusterer changed
            if (data.newOverlayId && data.newOverlayId !== data.overlayId) {
                if (!recluster) { // only check if we might not recluster
                    oldClusterer = jc2cui.mapWidget.clusterManager.getClusterer(feature);
                }
                newOverlay = overlays[data.newOverlayId];
                if (!newOverlay) {
                    errors.push('Unable to find overlay ' + data.newOverlayId);
                    return false;
                }
                feature.overlayId = data.newOverlayId;
                newOverlay.docs[data.featureId] = feature;
                delete overlay.docs[data.featureId];
                feature.clustering = data.clustering;
                if (!recluster) { // only check if we might not recluster
                    newClusterer = jc2cui.mapWidget.clusterManager.getClusterer(feature);
                    if (oldClusterer !== newClusterer) {
                        recluster = true;
                    }
                }
            } else if (recluster) {
                feature.clustering = data.clustering;
            }

            if (recluster) {
                // TBD - Write more efficient method of reclustering just these 2 overlays
                jc2cui.mapWidget.clusterManager.setClustering(false);
                jc2cui.mapWidget.clusterManager.setClustering(true);
            }

            return true;
        },
        showFeature: function (data, sender, msg) {
            showFeature(data, sender, msg);
        },
        hideFeature: function (data, sender, msg) {
            hideFeature(data, sender, msg);
        },
        showItem: function (data) {
            showItem(data);
        },
        hideItem: function (data) {
            hideItem(data);
        },
        centerOnOverlay: function (data, sender, msg) {
            centerOnOverlay(data.overlayId, data.zoom, sender, msg);
        },
        centerOnFeature: function (data, sender, msg) {
            centerOnFeature(data, sender, msg);
        },
        centerOnItem: function (data) {
            centerOnItem(data);
        },
        centerOnLocation: function (data, sender, msg) {
            var center = new google.maps.LatLng(data.location.lat, data.location.lon);
            centerOnLocation(center, data.zoom);
        },
        fitToBounds: function (bounds) {
            centerOnBounds(bounds, 'auto');
        },
        centerOnBounds: function (data, sender, msg) {
            var southWest = new google.maps.LatLng(data.bounds.southWest.lat, data.bounds.southWest.lon),
                northEast = new google.maps.LatLng(data.bounds.northEast.lat, data.bounds.northEast.lon),
                bounds = new google.maps.LatLngBounds(southWest, northEast);
            centerOnBounds(bounds, data.zoom);
        },
        zoomToRange: function (data, sender, msg) {
            zoomToRange(data.range);
        },
        selected: function (data, sender, msg) {
            selected(data);
        },
        getViewStatus: function (data, sender, msg) {
            return getViewStatus(data, sender, msg);
        },
        getDropLocation: function () {
            return { lat: currentLatLng.lat(), lon: currentLatLng.lng() };
        },
        checkResize: function () {
            if (map) { // May be called in IE before google loaded
                google.maps.event.trigger(map, "resize");
            }
        },
        setDrawingToolsVisibility: function (show) {
            setDrawingToolsVisibility(show);
        },
        setExpanded: function (overlayId, itemId, expanded) {
            setExpanded(overlayId, itemId, expanded);
        },
        optionChanged: function (option, value) {
            if (option === 'labels') {
                $.each(overlays, function (index, overlay) {
                    $.each(overlay.docs, function (index, doc) {
                        var containers = [doc];
                        doc.getAllContainers(containers);
                        $.each(containers, function (index, container) {
                            if (container.markerOverlay) {
                                container.markerOverlay.redraw(true);
                            }
                        });
                    });
                });
            } else if (option === 'clustering') {
                jc2cui.mapWidget.clusterManager.setClustering(value);
            }
        },
        mapsReady: function () {
            initMap();
        },
        info: function () {
            var nonKmlEntities = 0;
            $.each(overlays, function (index, overlay) {
                ++nonKmlEntities;
            });
            return { name: 'Google Maps V3', type: '2D', entities: jc2cui.mapWidget.kmlParser.getEntitiesString(nonKmlEntities) };
        }
    };
}());

