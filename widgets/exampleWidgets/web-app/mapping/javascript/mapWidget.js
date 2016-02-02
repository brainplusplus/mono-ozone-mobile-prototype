/*jslint continue: true, passfail: true, plusplus: true, regexp: true, maxerr: 50, indent: 4, unparam: true */
/*global $:true, window, owfdojo, document, location, console: true, setTimeout, clearTimeout, FileReader, util, jc2cui*/
var OWF,
    Ozone;

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget = (function (loadedModules) {
    "use strict";

    var rendererConfig,
        widgetId,
        namespace,
        createdDrawingOverlay,
        nextId = 0,
        defaultDrawingIcon,
        defaultIcon,
        errorIcon,
        configDlg,
        iframeShim,
        shims = 0,
        $window = $(window),
        windowSize = { height: $window.innerHeight(), width: $window.innerWidth() },
        messages = {},
        chooseRendererDiv,
        loadedMsg,
        lastTotal,
        loadKmlDlgUp,
        widgetDir;

    // IE and Chrome have problems showing stuff on top of Earth plugin
    function showShimIfNeeded() {
        if (!rendererConfig || rendererConfig.useShim) {
            if (!iframeShim) {
                iframeShim = document.createElement('iframe');
                iframeShim.frameBorder = 0;
                iframeShim.scrolling = 'no';
                //iframeShim.src = ['javascript', ':false;'].join(''); // join to avoid jslint complaint about javascript url
                iframeShim.style.position = 'absolute';
                iframeShim.style.top = '0px';
                iframeShim.style.left = '0px';
                iframeShim.style.width = '100%';
                iframeShim.style.height = '100%';
                //iframeShim.style.zIndex = 999;
                iframeShim.style['background-color'] = 'gray';
                $('body').append(iframeShim);
            } else {
                iframeShim.style.display = 'block';
            }
            ++shims;
        }
    }

    function hideShim() {
        if (iframeShim && --shims === 0) {
            iframeShim.style.display = 'none';
        }
    }

    function showDialog(html, title, height, width, buttons, closeCallback) {
        height = height || 160;
        width = 380;
        showShimIfNeeded();
        html.dialog({
            preferredHeight: height,
            preferredWidth: width,
            height: Math.min(height, windowSize.height - 20),
            width: Math.min(width, windowSize.width - 20),
            modal: true,
            title: title,
            buttons: buttons,
            close: function (ev, ui) {
                hideShim();
                html.remove();
                if (closeCallback) {
                    closeCallback();
                }
            }
        });
    }

    // OWF dialog doesnt show up on top of earth plugin in IE and Chrome (and is buggy)
    // if id passed, will prevent more then one of dialog with same id from being up at same time
    function showMessage(msgString, title, height, width, id) {
        if (id && messages[id]) {
            return;
        }
        messages[id] = true;
        var msg = $('<div>' + msgString + '</div>');
        showDialog(msg, title, height, width, {
            Ok: function () {
                msg.dialog('close');
            }
        }, function () {
            delete messages[id];
        });
    }

    function showErrorMessage(msgString) {
        showMessage(msgString, 'Error');
    }

    function initRenderer(renderer) {
        $.ajax({
            url: 'config/' + renderer.config + '.json',
            dataType: 'json',
            success: function (config, textStatus) {
                rendererConfig = config;
                $.ajax({
                    url: rendererConfig.path,
                    dataType: 'script',
                    timeout: 20000, // At least as of jQuery 1.7.1 no longer getting error callbacks if cross domain script loading fails
                    success: function (data, textStatus) {
                        if (jc2cui.mapWidget.renderer) {
                            var constraints = rendererConfig.constraints,
                                version;
                            if (constraints) {
                                if ($.browser.msie && constraints.ie) {
                                    constraints = constraints.ie;
                                } else if ($.browser.mozilla && constraints.firefox) {
                                    constraints = constraints.firefox;
                                } else if ($.browser.chrome && constraints.chrome) {
                                    constraints = constraints.chrome;
                                }
                                version = parseInt($.browser.version, 10).toString();
                                if (constraints[version]) {
                                    constraints = constraints[version];
                                } else if (constraints['default']) {
                                    constraints = constraints['default'];
                                }
                                rendererConfig.constraints = constraints;
                            }
                            if (rendererConfig.options) {
                                OWF.Preferences.getUserPreference({
                                    namespace: namespace,
                                    name: 'options',
                                    onSuccess: function (pref) {
                                        if (pref && pref.value) {
                                            var options = JSON.parse(pref.value);
                                            $.extend(true, rendererConfig.options, options);
                                        }
                                        jc2cui.mapWidget.renderer.init(rendererConfig);
                                    },
                                    onFailure: function (error, status) {
                                        if (status !== undefined && error !== 'undefined : undefined') { // OWF 3.5 bug causes timeout instead of 404 when preference doesnt exist  
                                            showErrorMessage('Got an error getting preferences! Status Code: ' + status + ' . Error message: ' + error);
                                        }
                                        jc2cui.mapWidget.renderer.init(rendererConfig);
                                    }
                                });
                            } else {
                                jc2cui.mapWidget.renderer.init(rendererConfig);
                            }
                        } else {
                            showErrorMessage('map renderer ' + rendererConfig.name + ' at ' + rendererConfig.path + ' failed to initialize properly.');
                        }
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        var msg = 'Error loading ' + rendererConfig.name + ' renderer script ' + rendererConfig.path;
                        if (textStatus && textStatus !== 'error') {
                            msg += ': ' + textStatus;
                        }
                        showErrorMessage(msg);
                    }
                });
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                var msg = 'Error loading ' + renderer.name + ' renderer config ' + renderer.config;
                if (textStatus && textStatus !== 'error') {
                    msg += ': ' + textStatus;
                }
                showErrorMessage(msg);
            }
        });
    }

    function chooseRenderer(renderers) {
        var html = '<div id="choose-renderer" class="selection">Choose the map renderer to be used by this widget:<br>';
        $.each(renderers, function (index, renderer) {
            html += '<div><label><input type="radio" name="renderer" value=' + index + '> ' + renderer.name + '</label></div>';
            if (renderer.note) {
                if (typeof renderer.note === 'string') {
                    renderer.note = [renderer.note];
                }
                $.each(renderer.note, function (index, note) {
                    html += '<span class="small">' + note + '</span><br>';
                });
            }
        });
        html += '</div>';
        chooseRendererDiv = $(html).appendTo($('body'));
        chooseRendererDiv.css({ 'left': ((windowSize.width - chooseRendererDiv.width()) / 2).toString() + 'px', 'top': ((windowSize.height - chooseRendererDiv.height()) / 2).toString() + 'px' }).show();

        $('input[name="renderer"]', chooseRendererDiv).click(function () {
            OWF.Preferences.setUserPreference({
                namespace: namespace,
                name: 'renderer',
                value: JSON.stringify(renderers[this.value]),
                onFailure: function (error, status) {
                    showErrorMessage('Error updating preferences. Status Code: ' + status + ' . Error message: ' + error);
                }
            });
            initRenderer(renderers[this.value]);
            chooseRendererDiv.remove();
            chooseRendererDiv = null;
        });
    }

    function getMapConfig() {
        var url = 'config/mapWidgetConfig.json';
        $.ajax({
            url: url,
            dataType: 'json',
            success: function (mapConfig) {
                if (!mapConfig) {
                    showErrorMessage('Error loading map widget configuration: No data');
                    return;
                }

                if (!mapConfig.renderers) {
                    showErrorMessage('Missing renderer configuration attribute in mapConfig file.');
                    return;
                }

                if (mapConfig.renderers.length > 1) {
                    chooseRenderer(mapConfig.renderers);
                } else {
                    initRenderer(mapConfig.renderers[0]);
                }
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                var msg = 'Error loading map widget configuration: ' + url;
                if (textStatus && textStatus !== 'error') {
                    msg += ' ' + textStatus;
                }
                showErrorMessage(msg);
            }
        });
    }

    function getRenderer() {
        OWF.Preferences.getUserPreference({
            namespace: namespace,
            name: 'renderer',
            onSuccess: function (pref) {
                var renderer;
                if (pref && pref.value) {
                    renderer = JSON.parse(pref.value);
                }
                if (renderer) {
                    initRenderer(renderer);
                } else {
                    getMapConfig();
                }
            },
            onFailure: function (error, status) {
                if (status !== undefined && error !== 'undefined : undefined') { // OWF 3.5 bug causes timeout instead of 404 when preference doesnt exist  
                    showErrorMessage('Got an error getting preferences! Status Code: ' + status + ' . Error message: ' + error);
                }
                getMapConfig();
            }
        });
    }

    function addOverlayToSidebar(id, name, overlayId) {
        jc2cui.mapWidget.sidebar.addOverlay(id, name || (id === jc2cui.mapWidget.USER_DRAWN_OVERLAY ? jc2cui.mapWidget.USER_DRAWN_OVERLAY : null), overlayId, id === jc2cui.mapWidget.USER_DRAWN_OVERLAY);
    }

    function processMessage(sender, msg, processor) {
        sender = typeof sender === 'string' ? JSON.parse(sender) : sender;
        if (sender.id === widgetId) { // Ignore own messages
            return;
        }

        var data = typeof msg === 'string' ? JSON.parse(msg) : msg,
            errors = [];

        if (!$.isArray(data)) {
            data = [data];
        }

        $.each(data, function (index, singleMsg) {
            processor.process(singleMsg, errors, sender, msg);
        });

        if (errors.length > 0) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: processor.type, msg: msg, error: errors.join(',') });
        }
    }

    function subscribe(channel, processor) {
        OWF.Eventing.subscribe(channel, function (sender, msg) {
            processMessage(sender, msg, { type: channel, process: processor });
        });
    }

    function createOverlay(overlayData, errors, sender, msg) {
        if (!overlayData.overlayId) {
            overlayData.overlayId = sender.id;
        }

        if (!overlayData.name) {
            overlayData.name = overlayData.overlayId;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.createOverlay(overlayData, sender, msg);
        }

        if (rendererConfig.sidebar) {
            addOverlayToSidebar(overlayData.overlayId, overlayData.name, overlayData.parentId);
        }
    }

    function removeOverlay(overlayData, errors, sender, msg) {
        if (!overlayData.overlayId) {
            overlayData.overlayId = sender.id;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.removeOverlay(overlayData.overlayId, sender, msg);
        }

        if (rendererConfig.sidebar) {
            jc2cui.mapWidget.sidebar.removeOverlay(overlayData.overlayId);
        }

        if (overlayData.overlayId === jc2cui.mapWidget.USER_DRAWN_OVERLAY) {
            createdDrawingOverlay = false;
        }
    }

    function showOverlay(overlayData, errors, sender, msg) {
        if (!overlayData.overlayId) {
            overlayData.overlayId = sender.id;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.setOverlayVisibility(overlayData.overlayId, true, sender, msg);
        }

        if (rendererConfig.sidebar) {
            jc2cui.mapWidget.sidebar.showOverlay(overlayData.overlayId);
        }
    }

    function hideOverlay(overlayData, errors, sender, msg) {
        if (!overlayData.overlayId) {
            overlayData.overlayId = sender.id;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.setOverlayVisibility(overlayData.overlayId, false, sender, msg);
        }

        if (rendererConfig.sidebar) {
            jc2cui.mapWidget.sidebar.hideOverlay(overlayData.overlayId);
        }
    }

    function updateOverlay(overlayData, errors, sender, msg) {
        if (!overlayData.overlayId) {
            overlayData.overlayId = sender.id;
        }

        // update renderer, only possibly makes a difference if parent or clustering changed.
        if ((overlayData.parentId || overlayData.clustering) && jc2cui.mapWidget.renderer) {
            if (!jc2cui.mapWidget.renderer.updateOverlay(overlayData, sender, msg)) {
                errors.push('Unable to find overlay ' + overlayData.overlayId);
                return;
            }
        }

        if (rendererConfig.sidebar) {
            if (!jc2cui.mapWidget.sidebar.updateOverlay(overlayData.overlayId, overlayData.name, overlayData.parentId)) {
                errors.push('Unable to find overlay ' + overlayData.overlayId);
                return;
            }
        }
    }

    function plotFeatureUrl(featureData, errors, sender, msg) {
        if (!featureData.overlayId) {
            featureData.overlayId = sender.id;
        }

        if (featureData.zoom === undefined) {
            featureData.zoom = false;
        }

        if (!featureData.url) {
            errors.push('No url in map.feature.plot.url message');
            return;
        }

        if (!featureData.featureId) {
            errors.push('No featureId in map.feature.plot.url message');
            return true;
        }

        // API says create overlay if non existant
        if (rendererConfig.sidebar) {
            addOverlayToSidebar(featureData.overlayId);
        }

        if (jc2cui.mapWidget.renderer) {
            var format = featureData.format ? featureData.format.toLowerCase() : 'kml';
            switch (format) {
            case 'kml':
                jc2cui.mapWidget.renderer.loadKml(featureData, sender, msg);
                break;
            case 'wms':
                jc2cui.mapWidget.renderer.loadWms(featureData, sender, msg);
                break;
            default:
                errors.push('Feature format: ' + featureData.format + ' not yet supported');
                return;
            }
        }
    }

    function plotFeature(featureData, errors, sender, msg) {
        if (featureData.format && featureData.format.toLowerCase() !== 'kml') {
            errors.push('Feature format: ' + featureData.format + ' not yet supported');
            return;
        }

        if (!featureData.overlayId) {
            featureData.overlayId = sender.id;
        }

        if (!featureData.feature) {
            errors.push('No feature data in map.feature.plot message');
            return;
        }

        if (!featureData.featureId) {
            errors.push('No featureId in map.feature.plot message');
            return;
        }

        if (featureData.zoom === undefined) {
            featureData.zoom = false;
        }

        // API says create overlay if non existant
        if (rendererConfig.sidebar) {
            addOverlayToSidebar(featureData.overlayId);
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.parseKml(featureData, sender, msg);
        }
    }

    function updateFeature(featureData, errors, sender, msg) {
        if (!featureData.overlayId) {
            featureData.overlayId = sender.id;
        }

        if (!featureData.featureId) {
            errors.push('No featureId in map.feature.plot.update message');
            return true;
        }

        // update renderer, only possibly makes a difference if parent or clustering changed.
        if ((featureData.newOverlayId || featureData.clustering) && jc2cui.mapWidget.renderer) {
            if (!jc2cui.mapWidget.renderer.updateFeature(featureData, errors, sender, msg)) {
                return;
            }
        }

        if (rendererConfig.sidebar) {
            if (!jc2cui.mapWidget.sidebar.updateFeature(featureData.overlayId, featureData.featureId, featureData.name, featureData.newOverlayId)) {
                errors.push('Unable to update feature ' + featureData.featureId);
                return;
            }
        }
    }

    function removeFeature(featureData, errors, sender, msg) {
        if (!featureData.overlayId) {
            featureData.overlayId = sender.id;
        }

        if (!featureData.featureId) {
            errors.push('No featureId in map.feature.unplot message');
            return;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.removeFeature(featureData, sender, msg);
        }

        if (rendererConfig.sidebar) {
            jc2cui.mapWidget.sidebar.removeFeature(featureData.featureId, featureData.overlayId);
        }
    }

    function showFeature(featureData, errors, sender, msg) {
        if (!featureData.overlayId) {
            featureData.overlayId = sender.id;
        }

        if (!featureData.featureId) {
            errors.push('No featureId in map.feature.show message');
            return;
        }

        if (featureData.zoom === undefined) {
            featureData.zoom = false;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.showFeature(featureData, sender, msg);
            if (featureData.zoom) {
                jc2cui.mapWidget.renderer.centerOnFeature({ overlayId: featureData.overlayId, featureId: featureData.featureId, zoom: 'auto' });
            }
        }

        if (rendererConfig.sidebar) {
            jc2cui.mapWidget.sidebar.showFeature(featureData.featureId, featureData.overlayId);
        }
    }

    function hideFeature(featureData, errors, sender, msg) {
        if (!featureData.overlayId) {
            featureData.overlayId = sender.id;
        }

        if (!featureData.featureId) {
            errors.push('No featureId in map.feature.hide message');
            return;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.hideFeature(featureData, sender, msg);
        }

        if (rendererConfig.sidebar) {
            jc2cui.mapWidget.sidebar.hideFeature(featureData.featureId, featureData.overlayId);
        }
    }

    function zoomToRange(zoomMsg, errors, sender, msg) {
        if (zoomMsg.range === undefined) {
            errors.push('No range in map.view.center.range message');
            return;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.zoomToRange(zoomMsg, sender, msg);
        }
    }

    function centerOnOverlay(centerMsg, errors, sender, msg) {
        if (!centerMsg.overlayId) {
            centerMsg.overlayId = sender.id;
        }
        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.centerOnOverlay(centerMsg, sender, msg);
        }
    }

    function centerOnFeature(centerMsg, errors, sender, msg) {
        if (jc2cui.mapWidget.renderer) {
            if (!centerMsg.overlayId) {
                centerMsg.overlayId = sender.id;
            }

            if (!centerMsg.featureId) {
                errors.push('No featureId in map.view.center.feature message');
                return;
            }

            jc2cui.mapWidget.renderer.centerOnFeature(centerMsg, sender, msg);
        }
    }

    function centerOnLocation(centerMsg, errors, sender, msg) {
        if (!centerMsg.location) {
            errors.push('No location in map.view.center.location message');
            return;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.centerOnLocation(centerMsg, sender, msg);
        }
    }

    function centerOnBounds(centerMsg, errors, sender, msg) {
        if (!centerMsg.bounds) {
            errors.push('No bounds in map.view.center.bounds message');
            return;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.centerOnBounds(centerMsg, sender, msg);
        }
    }

    function getStatus(statusMsg, errors, sender, msg) {
        if (jc2cui.mapWidget.renderer) {
            var blankStatus = { requester: sender.id },
                all = statusMsg.types === undefined,
                info,
                status;
            if (all || $.inArray('view', statusMsg.types) >= 0) {
                status = jc2cui.mapWidget.renderer.getViewStatus();
                $.extend(status, blankStatus);
                jc2cui.mapWidget.publishView(status);
            }
            if (all || $.inArray('format', statusMsg.types) >= 0) {
                status = { formats: ['kml', 'wms'] };
                $.extend(status, blankStatus);
                OWF.Eventing.publish('map.status.format', JSON.stringify(status));
            }
            if (all || $.inArray('about', statusMsg.types) >= 0) {
                info = jc2cui.mapWidget.renderer.info();
                status = { version: '1.1.0', "type": info.type, widgetName: 'JC2CUI Map Widget - ' + info.name };
                $.extend(status, blankStatus);
                OWF.Eventing.publish('map.status.about', JSON.stringify(status));
            }
        }
    }

    function selected(selectedData, errors, sender, msg) {
        if (!selectedData.overlayId) {
            selectedData.overlayId = sender.id;
        }

        if (!selectedData.featureId) {
            errors.push('No featureId in map.feature.selected message');
            return;
        }

        if (jc2cui.mapWidget.renderer) {
            jc2cui.mapWidget.renderer.selected(selectedData, sender, msg);
        }
    }

    function handleDrop(sender, msg) {
        sender = typeof sender === 'string' ? JSON.parse(sender) : sender;

        var overlayId = msg.overlayId || sender.id,
            dropLocation = jc2cui.mapWidget.renderer ? jc2cui.mapWidget.renderer.getDropLocation() : { lat: 0, lon: 0 },
            kml = [],
            outMsg,
            outMsgString,
            errors = [],
            name;
        // Just in case overlay doesnt yet exist - should really only send if needed
        OWF.Eventing.publish('map.overlay.create', JSON.stringify({ overlayId: overlayId }));
        if (msg.marker) {
            if (rendererConfig.sidebar) {
                addOverlayToSidebar(overlayId);
            }
            name = msg.name || msg.marker.title; // msg.marker.title to be API 1.0 backwards compatible
            kml.push('<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">');
            kml.push('<Placemark');
            kml.push(' id="');
            kml.push(msg.featureId);
            kml.push('">');
            if (name) {
                kml.push('<name>' + name + '</name>');
            }
            if (msg.marker.details) {
                kml.push('<description>' + msg.marker.details + '</description>');
            }
            if (msg.marker.iconUrl) {
                kml.push('<Style><IconStyle><Icon><href>' + msg.marker.iconUrl + '</href></Icon></IconStyle></Style>');
            }
            kml.push('<Point><coordinates>' + dropLocation.lon + ',' + dropLocation.lat + ',0</coordinates></Point></Placemark></kml>');

            kml = kml.join('');
            outMsg = { overlayId: overlayId, featureId: msg.featureId, zoom: msg.zoom, name: name, feature: kml };
            outMsgString = JSON.stringify(outMsg);
            plotFeature(outMsg, errors, sender, outMsgString);
            OWF.Eventing.publish('map.feature.plot', outMsgString);

            if (msg.zoom && jc2cui.mapWidget.renderer) {
                jc2cui.mapWidget.renderer.centerOnFeature({ overlayId: overlayId, featureId: msg.featureId, zoom: 'auto' });
            }
        }

        if (msg.feature) {
            name = msg.name || msg.feature.name; // msg.feature.name to be API 1.0 backwards compatible
            if (msg.feature.featureData) {
                outMsg = { overlayId: overlayId, featureId: msg.featureId, name: name, zoom: msg.zoom, format: msg.feature.format, feature: msg.feature.featureData };
                outMsgString = JSON.stringify(outMsg);
                plotFeature(outMsg, errors, sender, outMsgString);
                OWF.Eventing.publish('map.feature.plot', outMsgString);
            }

            if (msg.feature.url) {
                outMsg = { overlayId: overlayId, featureId: msg.featureId, name: name, zoom: msg.zoom, format: msg.feature.format, url: msg.feature.url };
                outMsgString = JSON.stringify(outMsg);
                plotFeatureUrl(outMsg, errors, sender, outMsgString);
                OWF.Eventing.publish('map.feature.plot.url', outMsgString);
            }
        }

        if (errors.length > 0) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'Drag Drop', msg: msg, error: errors.join(',') });
        }
    }

    function initOWFSubscriptions() {
        subscribe('map.overlay.create', createOverlay);
        subscribe('map.overlay.remove', removeOverlay);
        subscribe('map.overlay.show', showOverlay);
        subscribe('map.overlay.hide', hideOverlay);
        subscribe('map.overlay.update', updateOverlay);
        subscribe('map.feature.plot', plotFeature);
        subscribe('map.feature.plot.url', plotFeatureUrl);
        subscribe('map.feature.unplot', removeFeature);
        subscribe('map.feature.show', showFeature);
        subscribe('map.feature.hide', hideFeature);
        subscribe('map.feature.selected', selected);
        subscribe('map.feature.update', updateFeature);
        subscribe('map.view.center.overlay', centerOnOverlay);
        subscribe('map.view.center.feature', centerOnFeature);
        subscribe('map.view.center.location', centerOnLocation);
        subscribe('map.view.center.bounds', centerOnBounds);
        subscribe('map.view.zoom', zoomToRange);
        subscribe('map.status.request', getStatus);
    }

    function getURLParameter(paramName) {
        var queryStr,
            arrParams,
            sParam,
            i;

        if (window.location.search.length) {
            queryStr = window.location.search.substring(1);
        }

        if (queryStr) {
            arrParams = queryStr.split("&");
        }

        for (i = 0; i < arrParams.length; ++i) {
            sParam = arrParams[i].split("=");
            if (sParam.length === 2 && sParam[0].toString().toLowerCase() === paramName.toString().toLowerCase() && sParam[1].length) {
                return sParam[1];
            }
        }
    }

    function configureWidget() {
        if (configDlg) { // only 1 up at a time please
            return;
        }

        var html = ['<div class="config">'];

        if (rendererConfig.options) {
            $.each(rendererConfig.options, function (index, option) {
                html.push('<div><input type="checkbox" id="' + index + '" name="' + index + '" />' + option.text || option + '</div>');
            });
            html.push('</div>');
            configDlg = $(html.join('')).appendTo($('body'));

            $.each(rendererConfig.options, function (name, option) {
                var opt = $('#' + name, configDlg);
                if (option.value) {
                    opt.prop('checked', 'checked');
                }
                opt.click(function () {
                    option.value = opt[0].checked;
                    if (jc2cui.mapWidget.renderer) {
                        jc2cui.mapWidget.renderer.optionChanged(name, option.value);
                        OWF.Preferences.setUserPreference({
                            namespace: namespace,
                            name: 'options',
                            value: JSON.stringify(rendererConfig.options),
                            onFailure: function (error, status) {
                                showErrorMessage('Error updating preferences. Status Code: ' + status + ' . Error message: ' + error);
                            }
                        });
                    }
                });
            });
        } else {
            html.push('No configurable options</div>');
            configDlg = $(html.join('')).appendTo($('body'));
        }

        showDialog(configDlg, 'Configure', Math.min(240, windowSize.height - 20), Math.min(380, windowSize.width - 20), {
            Ok: function () {
                configDlg.dialog('close');
            }
        }, function (ev, ui) {
            configDlg = null;
        });
    }

    function showLoadKmlDialog() {
        if (loadKmlDlgUp) {
            return;
        }
        loadKmlDlgUp = true;
        var html = ['<form class="loadKml">',
                        '<fieldset>',
                            '<label for="overlay">Name:</label>',
                            '<input type="text" name="overlay" id="overlay" class="text ui-widget-content ui-corner-all" />',
                            '<label for="url">Enter URL to remote KML/KMZ:</label>',
                            '<input type="text" name="url" id="url" value="" class="text ui-widget-content ui-corner-all" />'
                ],
            dlg,
            overlay,
            url,
            regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,
            msg,
            files,
            fileSupport = window.FileReader !== undefined;
        if (fileSupport) {
            html.push('<label for="files">Or choose local KML file(s):</label><input type="file" id="files" name="files" multiple size="47" class="ui-corner-all"/>');
        }

        html.push('</fieldset></form>');
        html = html.join('');
        dlg = $(html).appendTo($('body'));
        overlay = $('#overlay', dlg);
        url = $('#url', dlg);

        if (fileSupport) {
            document.getElementById('files').addEventListener('change', function (evt) {
                files = evt.target.files;
            }, false);
        }

        showDialog(dlg, 'Load KML', fileSupport ? 245 : 190, 350, {
            'Load': function () {
                var n = $.trim(overlay.val()),
                    u = $.trim(url.val());
                if (!n.length) {
                    showErrorMessage('Please enter a name for this overlay.');
                    return;
                }
                if (!files && (!regexp.test(u) || u.indexOf('"') >= 0)) {
                    showErrorMessage('Please enter a valid URL.');
                    return;
                }

                if (u) {
                    OWF.Eventing.publish('map.overlay.create', JSON.stringify({ overlayId: n }));

                    msg = { overlayId: n, featureId: u, url: u };
                    plotFeatureUrl(msg, [], { id: 'userLoaded' });
                    OWF.Eventing.publish('map.feature.plot.url', JSON.stringify(msg));
                }

                if (files) {
                    $.each(files, function (index, file) {
                        var reader = new FileReader();
                        reader.onload = function (e) {
                            var n = $.trim(overlay.val());
                            if (!n.length) {
                                showErrorMessage('Please enter a name for this overlay.');
                                return;
                            }
                            OWF.Eventing.publish('map.overlay.create', JSON.stringify({ overlayId: n }));

                            msg = { overlayId: n, featureId: file.name, name: file.name, feature: e.target.result };
                            plotFeature(msg, [], { id: 'userLoaded' });
                            OWF.Eventing.publish('map.feature.plot', JSON.stringify(msg));
                        };
                        reader.onerror = function (error) {
                            console.log("error", error);
                            console.log(error.getMessage());
                        };
                        reader.readAsText(file);
                    });
                }
                $(this).dialog('close');
            },
            Cancel: function () {
                $(this).dialog('close');
            }
        }, function () {
            loadKmlDlgUp = false;
        });
    }

    function showAboutInfo() {
        var info,
            msg = ['<strong>JC2CUI Map Widget<hr>Widget Version</strong> - '],
            rendererMsg = ['<br><strong>Map Renderer</strong> - '],
            mapApiMsg = '<br><strong>Common Map API Version</strong> - 1.1';

        if (jc2cui.mapWidget.renderer) {
            info = jc2cui.mapWidget.renderer.info();
            rendererMsg.push(info.name);
            rendererMsg.push('<BR><strong>Map Type</strong> - ');
            rendererMsg.push(info.type);
        } else {
            rendererMsg.push('No map renderer configured');
        }
        $.ajax({
            url: 'pkginfo.json',
            dataType: 'json',
            success: function (pkginfo) {
                msg.push(pkginfo.version);
                msg.push(' Release: ');
                msg.push(pkginfo.release);
                msg.push(mapApiMsg);
                msg.push(rendererMsg.join(''));
                if (info.entities) {
                    msg.push('<hr>');
                    msg.push(info.entities);
                }
                showMessage(msg.join(''), 'About', 223, 300, 'about');
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                msg.push('Unknown');
                msg.push(mapApiMsg);
                msg.push(rendererMsg.join(''));
                if (info.entities) {
                    msg.push('<hr>');
                    msg.push(info.entities);
                }
                showMessage(msg.join(''), 'About', 223, 300, 'about');
            }
        });
    }

    function initOWF(owfConfig) {
        var renderer,
            paramVal,
            map;

        owfdojo.config.dojoBlankHtmlUrl = '../js/lib/jc2cui-common/common/javascript/dojo-1.5.0-windowname-only/dojo/resources/blank.html';

        if (owfConfig.owfRelay) {
            OWF.relayFile = owfConfig.owfRelay;
        }

        OWF.Chrome.isModified({
            callback: function (msg) {
                var res = JSON.parse(msg),
                    functionToUse;
                if (res.success) {
                    functionToUse = res.modified ? 'updateHeaderButtons' : 'insertHeaderButtons';
                    OWF.Chrome[functionToUse]({
                        items: [{
                            type: 'help',
                            itemId: 'help',
                            handler: function (sender, data) {
                                showAboutInfo();
                            }
                        }, {
                            type: 'gear',
                            itemId: 'gear',
                            handler: function (sender, data) {
                                configureWidget();
                            }
                        }, {
                            type: 'plus',
                            itemId: 'plus',
                            handler: function (sender, data) {
                                showLoadKmlDialog();
                            }
                        }]
                    });

                    if (JSON.parse(window.name).layout === 'fit') {
                        functionToUse = res.modified ? 'updateHeaderMenus' : 'addHeaderMenus';
                        OWF.Chrome[functionToUse]({
                            items: [{
                                itemId: 'load',
                                text: 'Load KML',
                                icon: widgetDir + 'images/plus.png',
                                handler: function (sender, data) {
                                    showLoadKmlDialog();
                                }
                            }, {
                                itemId: 'configure',
                                text: 'Configure',
                                icon: widgetDir + 'images/gear.png',
                                handler: function (sender, data) {
                                    configureWidget();
                                }
                            }, {
                                itemId: 'about',
                                text: 'About',
                                icon: widgetDir + 'images/help.png',
                                handler: function (sender, data) {
                                    showAboutInfo();
                                }
                            }]
                        });
                    }
                }
            }
        });

        OWF.DragAndDrop.onDrop(function (msg) {
            handleDrop(msg.dragSourceId, msg.dragDropData);
        });

        map = $('#map');
        map.mouseenter(function () {
            OWF.DragAndDrop.setDropEnabled(true);
        });

        map.mouseleave(function () {
            OWF.DragAndDrop.setDropEnabled(false);
        });

        loadedMsg = $('#loaded');

        widgetId = JSON.parse(Ozone.eventing.Widget.getInstance().getWidgetId()).id;
        namespace = 'jc2cui.mapWidget.' + widgetId;

        // check if config parameter specified
        // if so use that renderer by default
        paramVal = getURLParameter("config");
        if (paramVal !== undefined) {
            renderer = { name: paramVal, config: paramVal };
            initRenderer(renderer);
        } else {
            getRenderer();
        }

        /* Begin hard code for debugging capability of js in firebug
        rendererConfig = {
            "name": "Google Maps V3",
            "path": "javascript/google.maps.v3.all.min.js",
            "server": "https://maps.googleapis.com/maps/api/js",
            "sidebar": {
                "animate": true,
                "drawing": true
            },
            "options": {
                "labels": {
                    "text": "Show placemark labels",
                    "value": false
                },
                "clustering": {
                    "text": "Cluster placemarks",
                    "value": true
                }
            },
            "proxy": "https://localhost/widgets/common/kml/getKml.php?unzip=true&url=",
            "constraints": {
                "chrome": {
                    "default": {
                        "maxFileSize": 100,
                        "maxPlacemarks": 150000
                    }
                },
                "firefox": {
                    "default": {
                        "maxFileSize": 50,
                        "maxPlacemarks": 75000
                    }
                },
                "ie": {
                    "default": {
                        "maxFileSize": 5,
                        "maxPlacemarks": 2000
                    }
                }
            }
        };
        jc2cui.mapWidget.renderer.init(rendererConfig);
        // End hard code for debugging capability of js in firebug*/
    }

    function loadOWF(owfConfig) {
        if (!owfConfig.owf) {
            showErrorMessage('Missing owf configuration attribute in owfConfig file.');
            return;
        }

        $.ajax({
            url: '/presentationGrails/static/js/widget/owf-widget-min.js',
            dataType: 'script',
            cache: true,
            timeout: 20000, // At least as of jQuery 1.7.1 no longer getting error callbacks if cross domain script loading fails
            success: function (data, textStatus) {
        	/*if (OWF === undefined || !OWF.Util.isRunningInOWF()) {
                    showErrorMessage('Map Widget only works as a widget in an OWF dashboard.');
                    return;
                }*/

                OWF.ready(function () {
                    initOWF(owfConfig);
                });
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                var msg = 'Error loading OWF script ' + owfConfig.owf;
                if (textStatus && textStatus !== 'error') {
                    msg += ': ' + textStatus;
                }
                showErrorMessage(msg);
            }
        });
    }

    function createViewStatus(southWestLat, southWestLon, northEastLat, northEastLon, centerLat, centerLon, range) {
        var view = {
            bounds: {
                southWest: {
                    lat: southWestLat,
                    lon: southWestLon
                },
                northEast: {
                    lat: northEastLat,
                    lon: northEastLon
                }
            },
            center: {
                lat: centerLat,
                lon: centerLon
            },
            range: range
        };
        return view;
    }

    function addTreeItems(featureData, overlayId, featureId, parentId) {
        if (rendererConfig.sidebar) {
            jc2cui.mapWidget.sidebar.addItem(featureData, overlayId, featureId, parentId);
        }
    }

    function processDefaultMapLayer(layer, parentId) {
        var i,
            featureData;
        if (rendererConfig.sidebar) {
            jc2cui.mapWidget.sidebar.addOverlay(layer.id, layer.name, parentId, parentId === undefined, true);
            for (i = 0; i < layer.children.length; i++) {
                if (layer.children[i].children.length) { // recurse through children for folders
                    processDefaultMapLayer(layer.children[i], layer.id);
                } else {
                    featureData = {
                        key: layer.children[i].id,
                        title: layer.children[i].name,
                        select: layer.children[i].visibility,
                        isFeature: true
                    };
                    addTreeItems(featureData, layer.id);
                }
            }
        }
    }

    // Merge is in case anybody was loaded first and put submodules in a dummy jc2cui.mapWidget object - wont happen, but more correct...
    return $.extend(true, {
        init: function (owfConfig) {
            widgetDir = document.location.href;
            widgetDir = widgetDir.substring(0, widgetDir.lastIndexOf('/') + 1);
            loadOWF(owfConfig);
            var resizeTimer;
            $window.resize(function () {
                var width = $window.innerWidth(),
                    height = $window.innerHeight();

                if (Math.abs(windowSize.width - width) > 3 || Math.abs(windowSize.height - height) > 3) { // lots of false resize events in IE (e.g. mouse leave ANOTHER widget)
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(function () {
                        if (jc2cui.mapWidget.renderer) {
                            jc2cui.mapWidget.renderer.checkResize();
                        }

                        $(".ui-dialog-content:visible").each(function () {
                            var it = $(this),
                                dialog = it.data('ui-dialog') || it.data('uiDialog') || it.data('dialog'), // For some strange reason this is different in different versions of jQuery
                                dialogWidth = dialog.uiDialog.width(),
                                dialogHeight = dialog.uiDialog.height(),
                                maxHeight,
                                maxWidth,
                                newWidth,
                                newHeight,
                                options = {};

                            if (width < windowSize.width) {
                                maxWidth = width - 20;
                                if (dialogWidth > maxWidth) {
                                    newWidth = maxWidth;
                                }
                            } else if (width > windowSize.width && dialogWidth < dialog.options.preferredWidth) {
                                newWidth = dialogWidth + (width - windowSize.width);
                                newWidth = Math.min(dialog.options.preferredWidth, newWidth);
                            }

                            if (height < windowSize.height) {
                                maxHeight = height - 20;
                                if (dialogHeight > maxHeight) {
                                    newHeight = maxHeight;
                                }
                            } else if (height > windowSize.height && dialogHeight < dialog.options.preferredHeight) {
                                newHeight = dialogHeight + (height - windowSize.height);
                                newHeight = Math.min(dialog.options.preferredHeight, newHeight);
                            }

                            if (newWidth && newWidth !== dialogWidth) {
                                options.width = newWidth;
                            }

                            if (newHeight && newHeight !== dialogHeight) {
                                options.height = newHeight;
                            }

                            options.position = dialog.options.position;
                            dialog.option(options);
                        });

                        windowSize.width = width;
                        windowSize.height = height;

                        if (chooseRendererDiv) {
                            chooseRendererDiv.css({ 'left': ((windowSize.width - chooseRendererDiv.width()) / 2).toString() + 'px', 'top': ((windowSize.height - chooseRendererDiv.height()) / 2).toString() + 'px' });
                        }
                    }, 200);
                }
            });
        },
        setOverlayVisibility: function (id, visible) {
            var channel = visible ? 'show' : 'hide';
            if (jc2cui.mapWidget.renderer) {
                jc2cui.mapWidget.renderer.setOverlayVisibility(id, visible);
            }
            OWF.Eventing.publish('map.overlay.' + channel, JSON.stringify({ overlayId: id }));
        },
        setFeatureVisibility: function (overlayId, featureId, visible) {
            var channel = visible ? 'show' : 'hide';
            if (jc2cui.mapWidget.renderer) {
                if (visible) {
                    jc2cui.mapWidget.renderer.showFeature({ overlayId: overlayId, featureId: featureId });
                } else {
                    jc2cui.mapWidget.renderer.hideFeature({ overlayId: overlayId, featureId: featureId });
                }
            }
            OWF.Eventing.publish('map.feature.' + channel, JSON.stringify({ overlayId: overlayId, featureId: featureId }));
        },
        setItemVisibility: function (overlayId, itemId, visible) {
            if (jc2cui.mapWidget.renderer) {
                if (visible) {
                    jc2cui.mapWidget.renderer.showItem({ overlayId: overlayId, itemId: itemId });
                } else {
                    jc2cui.mapWidget.renderer.hideItem({ overlayId: overlayId, itemId: itemId });
                }
            }
            //For now, we don't publish show/hide item
        },
        itemSelected: function (item) {
            if (!item.selectedId && !item.selectedName) {
                console.log('mapWidget not sending selection for item with no selectedId or selectedName');
                return;
            }
            OWF.Eventing.publish('map.feature.selected', JSON.stringify(item));
        },
        mapClicked: function (lat, lon, clicks, button, shift, ctrl, alt) {
            var keys = [];
            if (shift) {
                keys.push('shift');
            }
            if (ctrl) {
                keys.push('ctrl');
            }
            if (alt) {
                keys.push('alt');
            }
            // API says this should be there despite consesus for it to not be there.
            // Since it makes no sense to populate an empty array to indicate that it is empty
            // we will leave it out as API also says that for backward compatibility assume none if nothing found.
            /*if (!keys.length) {
                keys.push('none');
            }*/
            OWF.Eventing.publish('map.view.clicked', JSON.stringify({ lat: lat, lon: lon, type: clicks === 2 ? 'double' : 'single', button: button === 3 ? 'right' : button === '2' ? 'middle' : 'left', keys: keys}));
        },
        publishView: function (viewStatus) {
            var msg = JSON.stringify(viewStatus);
            OWF.Eventing.publish('map.status.view', msg);

            OWF.Preferences.setUserPreference({
                namespace: namespace,
                name: 'view',
                value: msg,
                onFailure: function (error, status) {
                    showErrorMessage('Error updating preferences. Status Code: ' + status + ' . Error message: ' + error);
                }
            });
        },
        createViewStatus: function (southWestLat, southWestLon, northEastLat, northEastLon, centerLat, centerLon, range) {
            return createViewStatus(southWestLat, southWestLon, northEastLat, northEastLon, centerLat, centerLon, range);
        },
        removeOverlay: function (id) {
            if (jc2cui.mapWidget.renderer) {
                jc2cui.mapWidget.renderer.removeOverlay(id);
            }
            if (rendererConfig.sidebar) {
                jc2cui.mapWidget.sidebar.removeOverlay(id);
            }
            if (id === jc2cui.mapWidget.USER_DRAWN_OVERLAY) {
                createdDrawingOverlay = false;
            }
            OWF.Eventing.publish('map.overlay.remove', JSON.stringify({ overlayId: id }));
        },
        removeFeature: function (overlayId, featureId) {
            if (jc2cui.mapWidget.renderer) {
                jc2cui.mapWidget.renderer.removeFeature({ overlayId: overlayId, featureId: featureId });
            }
            if (rendererConfig.sidebar) {
                jc2cui.mapWidget.sidebar.removeFeature(featureId, overlayId);
            }
            OWF.Eventing.publish('map.feature.unplot', JSON.stringify({ overlayId: overlayId, featureId: featureId }));
        },
        showError: function (msg) { // display error to user
            showErrorMessage(msg);
        },
        showDialog: showDialog,
        error: function (msg) { // send error to Common Map API error channel
            //jc2cui.mapWidget.showError('Error: ' + msg.error);
            if (console) {
                console.log(msg);
            }
            OWF.Eventing.publish('map.error', JSON.stringify(msg));

            if (msg.sender.id === 'userLoaded') { // earth only will get an error if kml fails to load. Maps gets no error (opened enhancment request for error callback)
                showErrorMessage('Unable to load KML. Is URL correct?' + '<br/>' + msg.error);
            }
        },
        getNewId: function () {
            return widgetId + '.' + (++nextId);
        },
        publishDrawing: function (kml, id, name, visibility) {
            var featureData;
            if (!createdDrawingOverlay) {
                if (rendererConfig.sidebar) {
                    addOverlayToSidebar(jc2cui.mapWidget.USER_DRAWN_OVERLAY);
                }
                OWF.Eventing.publish('map.overlay.create', JSON.stringify({ overlayId: jc2cui.mapWidget.USER_DRAWN_OVERLAY }));
                createdDrawingOverlay = true;
            }
            if (rendererConfig.sidebar) {
                featureData = {
                    title: name || 'kml',
                    tooltip: 'click to zoom to',
                    key: id,
                    select: visibility !== undefined ? visibility : true, // if visibility is defined, use that (whether true or false). If it is undefined, then default to true.
                    isFeature: true
                };
                addTreeItems(featureData, jc2cui.mapWidget.USER_DRAWN_OVERLAY);
            }
            OWF.Eventing.publish('map.feature.plot', JSON.stringify({ overlayId: jc2cui.mapWidget.USER_DRAWN_OVERLAY, featureId: id, name: name, feature: kml }));
        },
        deleteDrawing: function (id) {
            var data = { overlayId: jc2cui.mapWidget.USER_DRAWN_OVERLAY, featureId: id },
                outMsg = JSON.stringify(data);
            removeFeature(data, [], { id: widgetId + '.userdrawn' }, outMsg); // fake out sender to local app by sending fake id until we make creater widget use markers instead...
            OWF.Eventing.publish('map.feature.unplot', outMsg);
        },
        rendererReady: function (mapLayers) {
            var i;
            if (rendererConfig.sidebar) {
                //Not doing dynamic load of sidebar script since every renderer currently uses it it is more efficient to load as part of base map widget
                jc2cui.mapWidget.sidebar.init(rendererConfig.sidebar);
            }
            if (mapLayers) {
                for (i = 0; i < mapLayers.length; i++) {
                    processDefaultMapLayer(mapLayers[i]);
                }
            }
            OWF.Preferences.getUserPreference({
                namespace: namespace,
                name: 'view',
                onSuccess: function (pref) {
                    if (pref && pref.value) {
                        var view = JSON.parse(pref.value);
                        view.zoom = view.range || 'auto';
                        centerOnBounds(view, {});
                    }
                },
                onFailure: function (error, status) {
                    if (status !== undefined && error !== 'undefined : undefined') { // OWF 3.5 bug causes timeout instead of 404 when preference doesnt exist  
                        showErrorMessage('Got an error getting preferences! Status Code: ' + status + ' . Error message: ' + error);
                    }
                }
            });
            initOWFSubscriptions();
        },
        getAppPath: function () {
            return document.location.href.replace(/\/[^\/]*$/, '/');
        },
        getDefaultDrawingIcon: function () {
            if (!defaultDrawingIcon) {
                defaultDrawingIcon = [jc2cui.mapWidget.getAppPath(), 'images/blu-circle.png'].join('');
            }
            return defaultDrawingIcon;
        },
        getDefaultIcon: function () { // Earth API says default is ylw pushpin.
            if (!defaultIcon) {
                defaultIcon = [jc2cui.mapWidget.getAppPath(), 'images/ylw-pushpin.png'].join('');
            }
            return defaultIcon;
        },
        getErrorIcon: function () {
            if (!errorIcon) {
                errorIcon = [jc2cui.mapWidget.getAppPath(), 'images/error-pushpin.png'].join('');
            }
            return errorIcon;
        },
        showPlacemarkInfoWindow: function (placemark, cluster) {
            // .title if user drawn .name if placemark from kml
            var title = placemark.name || placemark.title || '[no name]',
                theDescription = placemark.description,
                bgColor,
                textColor,
                infoWindowOptions,
                html,
                content;
            if (placemark.style && placemark.style.BalloonStyle && placemark.style.BalloonStyle.text) {
                if (typeof (placemark.style.BalloonStyle.text) === 'string') {
                    theDescription = placemark.style.BalloonStyle.text;
                } else if (placemark.style.BalloonStyle.text["#cdata-section"]) {
                    theDescription = placemark.style.BalloonStyle.text["#cdata-section"];
                }
                theDescription = theDescription.replace('$[description]', placemark.description);
                theDescription = theDescription.replace('$[name]', title);
                theDescription = theDescription.replace('$[id]', placemark.id);
                // snippet, address, geDirections...

                if (placemark.extendedData) {
                    // not yet supporting display name...
                    theDescription = theDescription.replace(/\$\[([\w.]+?)\]/g, function (str, match) {
                        return placemark.extendedData[match];
                    });
                }
                bgColor = placemark.style.BalloonStyle.bgColor;
                textColor = placemark.style.BalloonStyle.textColor;
            }
            if ((!theDescription || !theDescription.length) && placemark.extendedData) {
                theDescription = ['<table border="1" cellpadding="3">'];
                $.each(placemark.extendedData, function (name, attr) {
                    theDescription.push('<tr><td>');
                    theDescription.push(name);
                    theDescription.push('</td><td>');
                    theDescription.push(attr);
                    theDescription.push('</td></tr>');
                });
                theDescription.push('</table>');
                theDescription = theDescription.join('');
            }
            html = ['<div class="contents"><h3><span id="name"></span>'];
            if (cluster) {
                html.push('<img src="images/back.png" alt="back" title="back" class="back">');
            }
            html.push('</h3><div id="description" class="desc">');
            html.push('</div><div class="zoom"><span id="zoom" class="button">zoom to item</span></div></div>');
            content = $(html.join(''));
            $('#name', content).text(title || ''); // .text() html encodes
            $('#description', content).append($.parseHTML(theDescription, true));
            infoWindowOptions = {
                content: content,
                bgColor: bgColor,
                textColor: textColor
            };

            $('#zoom', infoWindowOptions.content).click(function () {
                jc2cui.mapWidget.renderer.fitToBounds(placemark.getBounds());
                jc2cui.mapWidget.infoWindow.close();
            });

            $('.back', infoWindowOptions.content).click(function () {
                jc2cui.mapWidget.showClusterInfoWindow(cluster);
            });

            jc2cui.mapWidget.infoWindow.close(); // in case new contents blank
            jc2cui.mapWidget.infoWindow.open(infoWindowOptions, placemark);
        },
        showUserDrawnEditWindow: function (userDrawn, callbacks) {
            var cb = {
                    deleted: function () {
                        jc2cui.mapWidget.infoWindow.close();
                        if (callbacks.deleted) {
                            callbacks.deleted();
                        }
                    },
                    updated: function (updatedProps) {
                        jc2cui.mapWidget.infoWindow.close();
                        if (callbacks.updated) {
                            callbacks.updated(updatedProps);
                        }
                    },
                    canceled: function () {
                        jc2cui.mapWidget.infoWindow.close();
                        if (callbacks.canceled) {
                            callbacks.canceled();
                        }
                    }
                },
                content = jc2cui.mapWidget.featureEditor.getEditFeatureHtml(userDrawn, cb);
            jc2cui.mapWidget.infoWindow.open({ content: content, width: '380px', height: '240px' }, userDrawn);
        },
        showClusterInfoWindow: function (clusterInfo) {
            var content = $('<div class="contents"><h3><span id="name">' + clusterInfo.name + '</span></h3><div id="description" class="desc"></div><div class="zoom"><span id="zoom" class="button">zoom to cluster</span></div></div>'),
                description = $('#description', content),
                html = ['<ul>'],
                placemarks,
                i;

            if (clusterInfo.placemarks) {
                placemarks = clusterInfo.placemarks.slice();
                placemarks.sort(function (a, b) {
                    a = a[clusterInfo.attributes].name || a[clusterInfo.attributes].title || '[no name]';
                    b = b[clusterInfo.attributes].name || b[clusterInfo.attributes].title || '[no name]';
                    if (a < b) {
                        return -1;
                    }
                    if (a > b) {
                        return 1;
                    }
                    return 0;
                });
                for (i = 0; i < placemarks.length; i++) {
                    html.push('<li><a href="" id="');
                    html.push(i);
                    html.push('" class="placemark">');
                    html.push(placemarks[i][clusterInfo.attributes].name || placemarks[i][clusterInfo.attributes].title || '[no name]');
                    html.push('</a></li>');
                }
            }

            html.push('</ul>');
            description.append(html.join(''));

            $('.placemark', description).click(function (e) {
                var id = $(this).attr('id'),
                    item = {
                        selectedId: placemarks[id][clusterInfo.attributes].id || undefined,
                        selectedName: placemarks[id][clusterInfo.attributes].name || undefined
                    },
                    parent = placemarks[id][clusterInfo.attributes].parent;

                while (parent) {
                    if (parent.featureId) {
                        item.featureId = parent.featureId;
                        item.overlayId = parent.overlayId;
                        break;
                    }
                    parent = parent.parent;
                }

                jc2cui.mapWidget.showPlacemarkInfoWindow(placemarks[id][clusterInfo.attributes], clusterInfo);
                jc2cui.mapWidget.itemSelected(item);
                e.preventDefault();
            });

            $('#zoom', content).click(function () {
                jc2cui.mapWidget.renderer.fitToBounds(clusterInfo.bounds);
                jc2cui.mapWidget.infoWindow.close();
            });

            jc2cui.mapWidget.infoWindow.close(); // in case new contents blank
            jc2cui.mapWidget.infoWindow.open({ content: content });
        },
        addTreeItems: function (featureData, overlayId, featureId, parentId) {
            addTreeItems(featureData, overlayId, featureId, parentId);
        },
        totalMarkersLoaded: function (total) {
            if (total > 0 && total !== lastTotal) {
                lastTotal = total;
                loadedMsg.text(total + ' entities now loaded').show().stop().css('opacity', '1').fadeOut(3000, function () { loadedMsg.hide(); });//animate({ 'opacity': '0' }, 3000);
            }
        },
        options: function () {
            return rendererConfig.options || {};
        },
        USER_DRAWN_OVERLAY: 'User drawn'
    }, loadedModules);
}(jc2cui.mapWidget || {})); // in case anybody was loaded first and put submodules in a dummy jc2cui.mapWidget object - wont happen, but more correct...

$(document).ready(function () {
    "use strict";

    $.ajaxSetup({
        cache: false // IE caches very aggressively, doesnt even bother checking with server to see if data changed
    });

    var url = 'config/owfConfig.json';
    $.ajax({
        url: url,
        dataType: 'json',
        success: function (owfConfig) {
            if (!owfConfig) {
                jc2cui.mapWidget.showError('Error loading map widget configuration: No data');
                return;
            }

            jc2cui.mapWidget.init(owfConfig);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            var msg = 'Error loading map widget configuration: ' + url;
            if (textStatus && textStatus !== 'error') {
                msg += ' ' + textStatus;
            }
            jc2cui.mapWidget.showError(msg);
        }
    });
});
