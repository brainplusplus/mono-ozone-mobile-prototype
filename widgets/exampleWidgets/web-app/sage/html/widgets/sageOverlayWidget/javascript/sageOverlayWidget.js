/*jslint continue: true, passfail: true, plusplus: true, regexp: true, maxerr: 50, indent: 4*/
/*global $:true, Ozone, window, alert, jQuery:true, owfdojo, console: true, document, location, prompt, setTimeout, XMLSerializer*/

var jc2cui = jc2cui || {};

jc2cui.sageOverlayWidget = (function () {
    "use strict";

    var config,
        widgetEventingController,
        overlayTree,
        ignoreSelection,
    // createdOverlays = {}, - for now recreating everytime so late coming widgets get overlays
        namespace,
        checkedFeatures = {},
        rootId = 'SAGE',
        sageLogoText,
		unselectableNodes = [],
		messages = {},
        $window = $(window),
        windowSize = { height: $window.innerHeight(), width: $window.innerWidth() };

    function xml2Str(xmlNode) {
        try {
            // Gecko- and Webkit-based browsers (Firefox, Chrome), Opera.
            return (new XMLSerializer()).serializeToString(xmlNode);
        } catch (e) {
            try {
                // Internet Explorer.
                return xmlNode.xml;
            } catch (ex) {
                //Other browsers without XML Serializer
                alert('Xmlserializer not supported');
            }
        }
        return false;
    }

    function getKml(url, callback) {
        var urlToUse = 'retrieveKml?id=' + encodeURIComponent(url);//url + config.sageRoot;
        if (config.proxy) {
            urlToUse = config.proxy + encodeURIComponent(urlToUse);
        }
        $.ajax({
            url: urlToUse,
            dataType: 'xml',
            cache: true,
            success: function (results) {
                callback(results);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                var msg = 'Error loading data from: ' + url;
                if (textStatus && textStatus !== 'error') {
                    msg += ' ' + textStatus;
                }
                Ozone.util.ErrorDlg.show('Error', msg);
            }
        });
    }

    function walkSageLinks($) {
        var root = overlayTree.getRoot(),
            parents = [root];
        root.removeChildren();
        $('tr:gt(0)').each(function processLinks(i, v) {
				var p = $(v).children('td:first').text();
                var k = [(parents.length > 1 ? parents[parents.length - 1].data.key : namespace), '.', p].join('');
				
				parents.push(parents[parents.length - 1].addChild({ title: p, isFolder: true, expand: true, key: k }));
				$(v).children('td:last').find('p').each(function(index){
					var text = $(this).text();
					var link = $(this).find('a:last').attr('href');
					var key = [(parents.length > 1 ? parents[parents.length - 1].data.key : namespace), '.', text].join('');
					parents[parents.length - 1].addChild({ title: text, isFolder: false, expand: true, key: key, href: link, select: checkedFeatures[key] === true });
 				});
				parents.pop();
        });
    }
	function setUnselectable() {
		unselectableNodes = [];
		var root = overlayTree.getRoot(),
			parent;
		root.visit(function (n) {
			if (n.data.isFolder) {
				parent = n.getParent();
				// Not necessary to do the work for 'root' 
				if (parent !== root && $.inArray(parent, unselectableNodes) === -1) {
					unselectableNodes.push(parent);
				}
			}
		});
    }
	function loadWhenReady(ifrm, screenOverlays) {
        if (!ifrm.jQuery) {
            setTimeout(function () {
                loadWhenReady(ifrm, screenOverlays);
            }, 200);
            return;
        }
        walkSageLinks(ifrm.jQuery);
		setUnselectable();

        if (screenOverlays.length) {
            sageLogoText = [];
            var firstLayerId = overlayTree.getRoot().getChildren()[0].data.key;
            screenOverlays.each(function (index, screenOverlay) {
                sageLogoText.push({ featureId: rootId + index, name: 'SAGE Logo', feature: xml2Str(screenOverlay), overlayId: firstLayerId });
            });
            sageLogoText = JSON.stringify(sageLogoText);
        }
    }

    // Northcom SAGE html is not well formed. Result of parsing as XML browser dependent
    // Using IFrame to load html before parsing so what you get is what you would see...
    function populateIframe(kml) {
        var ifrm = document.getElementById('sageLoaderIframe'),
            txt = $('description', kml).text(),
            screenOverlays = $(kml).find('ScreenOverlay');

        txt = txt.replace(/<\/body>/, '<script type="text/javascript" src="../js/lib/jc2cui-common/common/javascript/jquery-1.8.2.js"></script></body>');
        txt = txt.substr(txt.indexOf('<html'));
        ifrm = ifrm.contentWindow || ifrm.contentDocument.document || ifrm.contentDocument;
        ifrm.document.open();
        ifrm.document.write(txt);
        ifrm.document.close();

        /* Not always working on IE 
        $(ifrm).load(function () {
            
        });*/
        loadWhenReady(ifrm, screenOverlays);
    }

    function process(node, createdOverlays) {
        var url = node.data.link,
            overlays = [node],
            overlay,
            overlayInfos = [],
            overlayInfo,
            parent,
            key;

        node.visitParents(function (n) {
            if (n.getLevel() === 0) { // dont include invisible root
                return;
            }
            var u = n.data.link;
            if (!!u) {
                url = u + url;
            }
            overlays.push(n);
        }, false);

        if (node.hasSubSel) { // undocumented - if nothing selected removal will take place in onSelect
            while (overlays.length > 0) {
                overlay = overlays.pop();
                key = overlay.data.key;
                overlayInfo = createdOverlays[key];
                if (!overlayInfo) {
                    overlayInfo = { overlayId: key, name: overlay.data.title };
                    if (parent) {
                        overlayInfo.parentId = parent.overlayId;
                    }
                    overlayInfos.push(overlayInfo);
                    createdOverlays[key] = overlayInfo;
                }
                parent = overlayInfo;
            }

            if (overlayInfos.length > 0) {
                widgetEventingController.publish('map.overlay.create', JSON.stringify(overlayInfos));
            }
        }
    }

    function onSelect(select, node, createdOverlays) {
        if (ignoreSelection === node) { // ignore external selections
            ignoreSelection = null;
            return;
        }

        var childFolders = 0,
            overlayInfos = [],
            overlayInfo,
            parent;

        createdOverlays = createdOverlays || {};

        if (select) {
            if (node.data.isFolder) { // recursively pass down
                node.visit(function (n) {
                    onSelect(select, n, createdOverlays);
                });
            } else {
                process(node.getParent(), createdOverlays); // // possibly create parent overlays
                checkedFeatures[node.data.key] = true;
                widgetEventingController.publish('map.feature.plot', sageLogoText);
                widgetEventingController.publish('map.feature.plot.url', JSON.stringify({ featureId: node.data.key, name: node.data.title, url: node.data.href, overlayId: node.getParent().data.key, zoom: true }));
            }
        } else { // possibly remove empty parent overlays
            if (!node.data.isFolder) {
                delete checkedFeatures[node.data.key];
                widgetEventingController.publish('map.feature.unplot', JSON.stringify({ featureId: node.data.key, overlayId: node.getParent().data.key }));
            }
            parent = node.getParent();
            while (parent.getLevel() > 0 && !parent.hasSubSel) {
                node = parent;
                parent = parent.getParent();
            }
            if (node.data.isFolder && !node.hasSubSel) {
                widgetEventingController.publish('map.overlay.remove', JSON.stringify({ overlayId: node.data.key })); // only highest possible overlay
                /*node.visit(function (n) { // remove any subfolders
                delete createdOverlays[n.data.key];
                }, true);*/
            }
        }
    }

    function uncheckFolder(key) {
        //delete createdOverlays[key];
        var removedLayerNode = overlayTree.getNodeByKey(key);
        if (removedLayerNode) {
            // deselect all descendents - cant deselect parent as partial selection is considered unselected
            removedLayerNode.visit(function (n) {
                /*if (n.data.isFolder) {
                delete createdOverlays[n.data.key];
                } else {
                ignoreSelection = n;
                n.select(false);
                }*/
                if (!n.data.isFolder) {
                    ignoreSelection = n;
                    n.select(false);
                }
            }, false);
        }
    }

    function uncheckFeature(key) {
        delete checkedFeatures[key];
        var node = overlayTree.getNodeByKey(key);
        if (node) {
            ignoreSelection = node;
            node.select(false);
        }
    }
    /***/

    function initSage() {
        if (!config.sageRoot) {
            Ozone.util.ErrorDlg.show('Error', 'Missing sageRoot attribute in config file.');
            return;
        }

        overlayTree = $("#sage").dynatree({
            checkbox: true,
            selectMode: 3,
            clickFolderMode: 1, // on click just activate - no expand collapse
            persist: false,
            debugLevel: 0,
            onDblClick: function (node, event) {
                node.toggleSelect();
            },
            onKeydown: function (node, event) {
                if (event.which === 32) {
                    node.toggleSelect();
                    return false;
                }
            }, /*
            onActivate: function (node) {
                if (node.data.isFolder) {
                    //jc2cui.mapWidget.zoomToOverlay(node.data.id);
                } else {
                    //jc2cui.mapWidget.zoomToFeature(node.data.parentId, node.data.id);
                }
            },*/
			onQuerySelect: function (select, node) {
				if (select && $.inArray(node, unselectableNodes) > -1) {
					return false;
				}
			},
            onSelect: onSelect/*function (flag, node) {
                if (node.data.isFolder) {
                    //jc2cui.mapWidget.setOverlayVisibility(node.data.id, flag);
                } else {
                    //jc2cui.mapWidget.setFeatureVisibility(node.data.parentId, node.data.id, flag);
                }
            } / *,
            onCustomRender: function (node) {
                var tooltip = node.data.tooltip ? ' title="' + node.data.tooltip.replace(/\"/g, '&quot;') + '"' : '';
                return '<a href="#" class="' + this.options.classNames.title + '"' + tooltip + '>' + node.data.title + '</a><span id="r_' + node.data.key + '" class="ui-icon ui-icon-close" title="click to delete"></span>';
            }*/
        }).dynatree("getTree");

        getKml(config.sageRoot, function (kml) {
            var networkLink,
                doIt;

            $(kml).find('NetworkLink').each(function (i) {
                networkLink = {
                    name: $(this).children('name').text() // useless
                };
                $(this).find('Url').each(function (i) {
                    networkLink.href = $(this).children('href').text();
                    networkLink.refreshInterval = $(this).children('refreshInterval').text();
                });
            });

            if (networkLink) {
                doIt = function () {
                    getKml(networkLink.href, function (kml) {
                        populateIframe(kml);
                    });
                    if (networkLink.refreshInterval) {
                        setTimeout(doIt, networkLink.refreshInterval * 1000);
                    }
                };
                doIt();
            }
        });
    }
    
    // ShowDialog //
    function showDialog(html, title, height, width, buttons, closeCallback) {
        height = height || 160;
        width = 380;
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
    
    // ShowMessage //
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


   function s4() {
       return Math.floor((1 + Math.random()) * 0x10000)
                      .toString(16)
                                   .substring(1);
   };

   function guid() {
       return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                  s4() + '-' + s4() + s4() + s4();
   }

    function initOWF() {
        if (!config.owf) {
            // TBD - Ozone.util.ErrorDlg.show - Ozone not yet loaded!
            alert('Error', 'Missing owf configuration attribute in config file.');
            return;
        }

        var myVersionOfjQuery = jQuery,
            paramVal,
            url;
        
        var script = document.createElement('script');
        script.onload = function() {
          var widgetId,
              msg;

          $ = jQuery = myVersionOfjQuery || jQuery;
          owfdojo.config.dojoBlankHtmlUrl = '../js/lib/jc2cui-common/common/javascript/dojo-1.5.0-windowname-only/dojo/resources/blank.html';
          try {
        	  widgetEventingController = Ozone.eventing.Widget.getInstance();
          }
          catch(e){
        	  console.log(e);
          }
      	
          //widgetId = OWF.getWidgetGuid();
          widgetId = guid();
          namespace = 'jc2cui.overlayWidget.' + widgetId;
          initSage(); 
        };
        script.src = "../js/widget/owf-widget-min.js";
        document.getElementsByTagName('head')[0].appendChild(script);                   
    }

    return {
        init: function (configuration) {
            config = configuration;
            initOWF();
        }
    };
}());

$(document).ready(function () {
    "use strict";
    var url = 'html/widgets/sageOverlayWidget/config/sageOverlayWidgetConfig.json'; // JOL: Modified for grails environment orig - config/sageOverlayWidgetConfig.json
    $.ajax({
        url: url,
        dataType: 'json',
        success: function (config) {
            if (!config) {
                // TBD - Ozone.util.ErrorDlg.show - Ozone not yet loaded!
                alert('Error loading sage overlay widget configuration: No data');
                return;
            }

            jc2cui.sageOverlayWidget.init(config);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            var msg = 'Error loading sage overlay widget configuration: ' + url;
            if (textStatus && textStatus !== 'error') {
                msg += ' ' + textStatus;
            }
            // TBD - Ozone.util.ErrorDlg.show - Ozone not yet loaded!
            alert(msg);
        }
    });
});
