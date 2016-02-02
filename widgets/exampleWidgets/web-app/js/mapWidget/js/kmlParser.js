kmlParser = (function () {
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
            // this.features[i].removeFromMap();
        }
        // if (jc2cui.mapWidget.infoWindow && jc2cui.mapWidget.infoWindow.getMapItem() && jc2cui.mapWidget.infoWindow.getMapItem().internalId === this.internalId) {
//             jc2cui.mapWidget.infoWindow.close();
        // }
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
        // if (!visible && jc2cui.mapWidget.infoWindow && jc2cui.mapWidget.infoWindow.getMapItem() && jc2cui.mapWidget.infoWindow.getMapItem().internalId === this.internalId) {
//             jc2cui.mapWidget.infoWindow.close();
//         }
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
                this.interval = 60; //parseFloat(findAndGetTextValue(node, 'refreshInterval'));
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
            // if (jc2cui.mapWidget.infoWindow && jc2cui.mapWidget.infoWindow.getMapItem() && jc2cui.mapWidget.infoWindow.getMapItem().internalId === old.internalId) {
//                 if (settings.refreshInfoWindow) {
//                     settings.refreshInfoWindow(placemark);
//                 }
//             }
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
				doc.kml = kml;
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