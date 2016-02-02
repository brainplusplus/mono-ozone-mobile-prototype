/*jslint continue: true, passfail: true, plusplus: true, regexp: true, maxerr: 50, indent: 4, nomen: true, unparam: true */
/*global $, window, setTimeout, clearTimeout, console, setInterval, clearInterval, util, jc2cui*/

if (!String.prototype.ltrim) {
    String.prototype.ltrim = function () { "use strict"; return this.replace(/^\s+/, ''); };
}

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.sidebar = (function () {
    "use strict";

    var config,
        map = $('#map'),
        sidebar,
        title,
        overlayDiv,
        overlayTree,
        windowWidth,
        openWidth = 150,
        firstTime = true, // Chrome bug? sidebar width is 0 at start then 15 instead of 16. Causes problems.
        updateTreeTimer;

    function validateId(id) {
        var regexp = /[A-Za-z]/;
        if (!regexp.test(id)) {
            id = 'a' + id;
        }
        id = id.replace(/[^\-A-Za-z0-9_:.]/g, "_");
        return id;
    }

    function toggleSidebar() {
        var currentSidebarWidth = sidebar.width(),
            newSidebarWidth,
            nsw,
            newMapWidth;

        if (currentSidebarWidth <= 16 && !firstTime) { // open
            nsw = openWidth;
            newSidebarWidth = openWidth.toString() + 'px';
            newMapWidth = Math.max(0, (windowWidth - openWidth)).toString() + 'px';
            title.addClass('expanded');
        } else { // close
            nsw = 16;
            newSidebarWidth = '16px';
            newMapWidth = Math.max(0, (windowWidth - 16)).toString() + 'px';
            title.removeClass('expanded');
        }

        if (config.animate) {
            map.animate({ 'width': newMapWidth }, 'slow', null, function () {
                jc2cui.mapWidget.renderer.checkResize();
            });
            sidebar.animate({ 'width': newSidebarWidth }, {
                duration: 'slow',
                step: function (now, fx) {
                    overlayDiv.css('width', Math.max(0, now - 20) + 'px');
                }
            });
        } else {
            map.css('width', newMapWidth);
            sidebar.css('width', newSidebarWidth);
            overlayDiv.css('width', Math.max(0, (nsw - 20)) + 'px');
            jc2cui.mapWidget.renderer.checkResize();
            map.focus(); // try to prevent the "ghost" sidebar left on top the plugin sometimes
        }
    }

    function sort(a, b) {
        // if topmost it goes on top
        if (a.data.topMost || b.data.topMost) {
            return a.data.topMost && b.data.topMost ? 0 : a.data.topMost ? -1 : 1;
        }

        // else same as default dynatree sort
        var x = a.data.title.toLowerCase(),
            y = b.data.title.toLowerCase();
        return x === y ? 0 : x > y ? 1 : -1;
    }

    function trimNames(item) {
        var i;
        item.title = item.title ? item.title.ltrim() : '';
        if (item.children) {
            for (i = 0; i < item.children.length; i++) {
                trimNames(item.children[i]);
            }
        }
    }

    function addFeature(feature, overlayId) {
        var idToUse = validateId(overlayId),
            parent = overlayTree.getNodeByKey(idToUse),
            oldNode;
        feature.id = feature.key; // save original without validation passed in for use when sent out
        feature.key = validateId(feature.key + overlayId);
        if (!parent) {
            console.log('addFeature unable to find parent with key: ' + idToUse);
            parent = overlayTree.getRoot();
        }
        oldNode = overlayTree.getNodeByKey(feature.key);
        if (oldNode) {
            oldNode.remove();
        }
        trimNames(feature);
        parent.addChild(feature).sortChildren(sort, true); // deep sort new node
        parent.sortChildren(sort, false); // shallow sort parent
    }

    // network link refresh
    function updateItem(item, overlayId, featureId, parentId) {
        var idToUse = validateId(parentId),
            parent = overlayTree.getNodeByKey(idToUse),
            i,
            node,
            oldNode,
            newName;

        trimNames(item);

        if (!parent) {
            console.log('Child: ' + item.key + ' - ' + item.title + ' unable to find parent with key: ' + idToUse + ' will try to reparent it later');

            // try feature
            idToUse = validateId(overlayId + featureId);
            parent = overlayTree.getNodeByKey(idToUse);

            // try overlay
            if (!parent) {
                idToUse = validateId(overlayId);
                parent = overlayTree.getNodeByKey(idToUse);
            }

            // last resort
            if (!parent) {
                parent = overlayTree.getRoot();
            }

            oldNode = overlayTree.getNodeByKey(item.key);
            if (oldNode) {
                console.log('updateItem didnt find parent but found old node?');
                oldNode.remove();
            }

            node = parent.addChild(item);
            node.sortChildren(sort, true); // deep sort new node
            parent.sortChildren(sort, false); // shallow sort parent

            idToUse = validateId(parentId);
            node.retryParentingTries = 0;
            node.retryParenting = setInterval(function () {
                ++node.retryParentingTries;
                parent = overlayTree.getNodeByKey(idToUse);
                if (parent) {
                    clearInterval(node.retryParenting);

                    // Desperate times call for desperate measures. node.move fails if everything not rendered!
                    var needToEnable = !overlayTree.bEnableUpdate,
                        nodes = [node],
                        tp = parent,
                        children;
                    if (needToEnable) {
                        overlayTree.enableUpdate(true);
                    }
                    while (tp) {
                        nodes.push(tp);
                        tp = tp.parent;
                    }
                    nodes.reverse();
                    for (i = 0; i < nodes.length; i++) {
                        nodes[i].render();
                    }
                    parent.removeChildren();
                    if (node.data.title && node.data.title.length) {
                        if ((!parent.data.title || !parent.data.title.length || parent.data.title === '[no name]') ||
                                node.data.title.indexOf('- LOAD FAILED', node.data.title.length - 13) !== -1 ||
                                node.data.title.indexOf('- LOAD CANCELED', node.data.title.length - 15) !== -1) {
                            newName = (parent.data.title && parent.data.title !== '[no name]') ? (parent.data.title + ' ') : '';
                            newName += node.data.title;
                            parent.data.title = newName; // needed?
                            parent.setTitle(newName);
                            if (parent.getParent()) {
                                parent.getParent().sortChildren(sort, false);
                            }
                        }
                    }
                    children = node.getChildren();
                    if (children) {
                        children = children.slice();
                        for (i = 0; i < children.length; i++) {
                            children[i].move(parent, 'child');
                        }
                    }
                    node.remove();
                    if (needToEnable) {
                        overlayTree.enableUpdate(false);
                    }
                } else if (node.retryParentingTries > 36) {
                    clearInterval(node.retryParenting);
                }
            }, 5000);
        } else {
            if (item.title && item.title.length) {
                if ((!parent.data.title || !parent.data.title.length || parent.data.title === '[no name]') ||
                        item.title.indexOf('- LOAD FAILED', item.title.length - 13) !== -1 ||
                        item.title.indexOf('- LOAD CANCELED', item.title.length - 15) !== -1) {
                    newName = (parent.data.title && parent.data.title !== '[no name]') ? (parent.data.title + ' ') : '';
                    newName += item.title;
                    parent.data.title = newName; // needed?
                    parent.setTitle(newName);
                    if (parent.getParent()) {
                        parent.getParent().sortChildren(sort, false);
                    }
                }
            }
            parent.removeChildren();
            if (item.children) {
                for (i = 0; i < item.children.length; i++) {
                    parent.addChild(item.children[i]);
                }
                parent.sortChildren(sort, true); // deep sort parent
            }
        }
    }

    // mostly borrowed from dynatree src
    function fixParentSelection(parent, nodeSelected) {
        var allChildrenSelected,
            i,
            l,
            n,
            isPartSel;
        if (nodeSelected) {
            // Select parents, if all children are selected
            while (parent) {
                parent._select(false, false, false); // remove selected style if set
                parent._setSubSel(true); // assume partial selection
                allChildrenSelected = true;
                for (i = 0, l = parent.childList.length; i < l; i++) {
                    n = parent.childList[i];
                    if (!n.bSelected && !n.data.isStatusNode && !n.data.unselectable) {
                        allChildrenSelected = false;
                        break;
                    }
                }
                if (allChildrenSelected) {
                    parent._select(true, false, false); // change to full selection
                }
                parent = parent.parent;
            }
        } else {
            // Deselect parents, and recalc hasSubSel
            while (parent) {
                parent._select(false, false, false); // assume no selection
                isPartSel = false;
                for (i = 0, l = parent.childList.length; i < l; i++) {
                    if (parent.childList[i].bSelected || parent.childList[i].hasSubSel) {
                        isPartSel = true;
                        break;
                    }
                }
                parent._setSubSel(isPartSel); // change to partial
                parent = parent.parent;
            }
        }
    }
    function updateFeature(oldParentId, featureId, name, newParentId) {
        var oldId = validateId(featureId + oldParentId),
            node = overlayTree.getNodeByKey(oldId),
            parent,
            parentSelected,
            nodeSelected;
        if (!node) {
            console.log('Update feature - unable to find feature ' + featureId + ' in overlay ' + oldParentId);
            return false;
        }
        if (name) {
            name = name.ltrim();
            node.setTitle(name);
        }
        if (newParentId && newParentId !== oldParentId) {
            parent = overlayTree.getNodeByKey(validateId(newParentId));

            if (!parent) {
                console.log('Update feature - unable to find new parent ' + newParentId);
                return false;
            }

            if (parent !== node.parent) {
                node.data.key = validateId(node.data.id + newParentId);
                //node.li.id = opts.idPrefix + data.id; - generate IDs is currently false - need to look at that could improve performance...

                parentSelected = parent.bSelected ? 1 : parent.hasSubSel ? 2 : 0;
                nodeSelected = node.bSelected ? 1 : node.hasSubSel ? 2 : 0;
                // TBD - Based on past experience, may need to ensure node and parent have been rendered or dynatree may fail here...
                node.move(parent, 'child');
            }
            parent.sortChildren(sort, false);

            // may need to fix parent check boxes...
            if (nodeSelected !== parentSelected) {
                fixParentSelection(parent, nodeSelected);
            }
        }
        return true;
    }

    // add NEW overlay
    function addOverlay(id, name, parentOverlayId, topMost, dontExpand) {
        var idToUse = validateId(id),
            parent,
            node;

        // As per API, if node already exists IGNORE
        node = overlayTree.getNodeByKey(idToUse);
        if (node) {
            return;
        }

        if (parentOverlayId) {
            parent = overlayTree.getNodeByKey(validateId(parentOverlayId));
        }

        if (!parent) {
            parent = overlayTree.getRoot();
        }

        // save original without validation passed in as id for use when sent out
        node = { title: name ? name.ltrim() : id, isFolder: true, key: idToUse, id: id, isOverlay: true, tooltip: 'click to zoom to', expand: !dontExpand, select: jc2cui.mapWidget.renderer.isOverlayVisible(id), topMost: topMost }; // selected is inital status, checked will be used to track parent changes due to children
        parent.addChild(node);
        parent.sortChildren(sort, false);
    }

    // Rename, or move overlay
    function updateOverlay(id, name, parentOverlayId) {
        var idToUse = validateId(id),
            parent,
            node,
            parentSelected,
            nodeSelected;

        // As per API node must already exist
        node = overlayTree.getNodeByKey(idToUse);
        if (!node) {
            // error
            return false;
        }

        if (name) {
            node.setTitle(name.ltrim());
        }

        if (parentOverlayId) {
            parent = overlayTree.getNodeByKey(validateId(parentOverlayId));

            if (!parent) {
                // error
                return false;
            }

            if (parent !== node.parent) {
                parentSelected = parent.bSelected ? 1 : parent.hasSubSel ? 2 : 0;
                nodeSelected = node.bSelected ? 1 : node.hasSubSel ? 2 : 0;
                // TBD - Based on past experience, may need to ensure node and parent have been rendered or dynatree may fail here...
                node.move(parent, 'child');
            }
            parent.sortChildren(sort, false);

            // may need to fix parent check boxes...
            if (nodeSelected !== parentSelected) {
                fixParentSelection(parent, nodeSelected);
            }
        }
        return true;
    }

    function remove(id) {
        var idToUse = validateId(id),
            node = overlayTree.getNodeByKey(idToUse);
        if (node) {
            node.remove();
        }
    }

    function show(id, fire) {
        var idToUse = validateId(id),
            node = overlayTree.getNodeByKey(idToUse);
        if (node) {
            node._select(true, fire, true);
        }
    }

    function hide(id, fire) {
        var idToUse = validateId(id),
            node = overlayTree.getNodeByKey(idToUse);
        if (node) {
            node._select(false, fire, true);
        }
    }

    function getOverlayId(node) {
        while (node) {
            if (node.data.isOverlay) {
                break;
            }
            node = node.getParent();
        }
        return node.data.id;
    }

    return {
        init: function (sidebarConfig) {
            config = typeof sidebarConfig === 'object' ? sidebarConfig : {};
            if (config.animate === undefined) { // TBD - Use jQuery extend to merge options here instead
                config.animate = true;
            }

            var w = $(window),
                drawingButton,
                drawing = false,
                overlayDivHeight,
                overlayDivWidth;
            windowWidth = w.width();
            w.resize(function (event) {
                var oldWidth = windowWidth,
                    oldSidebarWidth = sidebar.width(),
                    newSidebarWidth,
                    newOverlayDivHeight = sidebar.height() - 2,
                    newOverlayDivWidth;

                windowWidth = w.width();

                newSidebarWidth = oldSidebarWidth > 16 ? windowWidth * (oldSidebarWidth / oldWidth) : 16;
                sidebar.css('width', newSidebarWidth.toString() + 'px');
                map.css('width', (windowWidth - newSidebarWidth).toString() + 'px');

                if (newSidebarWidth > 16) {
                    openWidth = newSidebarWidth;
                }

                if (config.drawing) {
                    newOverlayDivHeight -= 16;
                }

                newOverlayDivWidth = newSidebarWidth - 20; // or title covers scrollbar!
                overlayDiv.css({ height: newOverlayDivHeight.toString() + 'px', width: newOverlayDivWidth.toString() + 'px' });
            });

            $('body').append('<div id="sidebar"><div class="title"></div><div id="overlayTree" class="selection"></div></div>');
            sidebar = $('#sidebar');

            sidebar.resizable(
                {
                    handles: 'e',
                    minWidth: 16,
                    resize: function (event, ui) {
                        var width = sidebar.width(),
                            newMapWidth,
                            newOverlayDivWidth = width - 20; // or title covers scrollbar!
                        if (width > 16) {
                            title.addClass('expanded');
                        } else {
                            title.removeClass('expanded');
                        }
                        newMapWidth = windowWidth - width;
                        map.css('width', newMapWidth.toString() + 'px');
                        overlayDiv.css('width', newOverlayDivWidth.toString() + 'px');
                    },
                    stop: function (event, ui) {
                        var width = sidebar.width();
                        if (width > 16) {
                            openWidth = width;
                        }
                        sidebar.css('height', '100%'); // bad bad jQuery.
                        jc2cui.mapWidget.renderer.checkResize();
                    }
                }
            );

            title = $('.title', sidebar);
            title.hover(
                function () {
                    title.addClass('highlight');
                },
                function () {
                    title.removeClass('highlight');
                }
            );
            title.click(function (event) {
                toggleSidebar();
            });

            overlayDiv = $('#overlayTree', sidebar);
            overlayDivHeight = sidebar.height() - 2;
            overlayDivWidth = openWidth - 20; // or title covers scrollbar!

            overlayTree = $("#overlayTree", sidebar).dynatree({
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
                },
                onActivate: function (node) {
                    if (jc2cui.mapWidget.renderer) {
                        var parentId = getOverlayId(node);
                        if (node.data.isOverlay) {
                            jc2cui.mapWidget.renderer.centerOnOverlay({ overlayId: node.data.id, zoom: 'auto' });
                        } else if (node.data.isFeature) {
                            jc2cui.mapWidget.renderer.centerOnFeature({ overlayId: parentId, featureId: node.data.id, zoom: 'auto', select: true });
                        } else {
                            jc2cui.mapWidget.renderer.centerOnItem({ overlayId: parentId, itemId: node.data.key, zoom: 'auto', select: true });
                        }
                    }
                },
                onSelect: function (flag, node) {
                    var parentId = getOverlayId(node);
                    if (node.data.isOverlay) {
                        //node.data.checked = flag;
                        jc2cui.mapWidget.setOverlayVisibility(node.data.id, flag);
                    } else if (node.data.isFeature) {
                        /*var parent = node.getParent();
                        // Check if last (or only) child is changing parent state
                        if (!parent.hasSubSel && parent.isSelected() !== parent.data.checked) {
                        parent.data.checked = flag;
                        jc2cui.mapWidget.setOverlayVisibility(parent.data.key, flag);
                        return;
                        }*/
                        jc2cui.mapWidget.setFeatureVisibility(parentId, node.data.id, flag);
                    } else {
                        if (jc2cui.mapWidget.setItemVisibility(parentId, node.data.key, flag) === false) {
                            node._select(!flag, false, false);
                        }
                    }
                },
                onQueryExpand: function (flag, node) {
                    if (jc2cui.mapWidget.renderer) {
                        var parentId = getOverlayId(node);
                        jc2cui.mapWidget.renderer.setExpanded(parentId, node.data.key, flag);
                    }
                },
                onCustomRender: function (node) {
                    var tooltip = node.data.tooltip ? ' title="' + node.data.tooltip.replace(/\"/g, '&quot;') + '"' : '',
                        iconClose = (node.data.isOverlay || node.data.isFeature) ? '" class="ui-icon ui-icon-close" title="click to delete"></span>' : '';
                    return '<a href="#" class="' + this.options.classNames.title + '"' + tooltip + '>' + node.data.title + '</a><span id="r_' + node.data.key + iconClose;
                }
            }).dynatree("getTree");

            if (config.drawing) {
                sidebar.append('<div id="drawing" title="Draw/edit on map">Draw</div>');

                //overlayDiv.css('margin-top', '14px'); //Doesnt work in IE7
                overlayDiv.css('padding-top', (parseInt(overlayDiv.css('padding-top'), 10) + 14).toString() + 'px');
                overlayDivHeight -= 14; // or padding/margin pushes us down
                drawingButton = $('#drawing', sidebar)
                    .click(function (event) {
                        drawing = !drawing;
                        if (drawing) {
                            drawingButton.html('Done');
                            drawingButton.attr('title', 'Stop drawing/editing');
                        } else {
                            drawingButton.html('Draw');
                            drawingButton.attr('title', 'Draw/edit on map');
                        }
                        jc2cui.mapWidget.renderer.setDrawingToolsVisibility(drawing);
                    });
            }

            overlayDiv.css({ height: overlayDivHeight.toString() + 'px', width: overlayDivWidth.toString() + 'px' });

            overlayDiv.on("mouseenter", ".ui-icon-close", function (event) {
                $(this).addClass('ui-state-hover');
            }).on("mouseleave", ".ui-icon-close", function () {
                $(this).removeClass('ui-state-hover');
            }).on("click", ".ui-icon-close", function (event) {
                var id = $(this).attr('id').substring(2),
                    node = overlayTree.getNodeByKey(id),
                    parentId;


                if (node.data.isOverlay) {
                    jc2cui.mapWidget.removeOverlay(node.data.id);
                } else {
                    parentId = getOverlayId(node);
                    jc2cui.mapWidget.removeFeature(parentId, node.data.id);
                }
                event.stopPropagation();
            });

            toggleSidebar();
            firstTime = false;
        },
        addOverlay: function (id, name, parentOverlayId, topMost, dontExpand) {
            addOverlay(id, name, parentOverlayId, topMost, dontExpand);
        },
        updateOverlay: function (id, name, parentOverlayId) {
            return updateOverlay(id, name, parentOverlayId);
        },
        addItem: function (item, overlayId, featureId, parentId) {
            clearTimeout(updateTreeTimer);
            overlayTree.enableUpdate(false); // dont render multiple times. Wait until done (otherwise may cause multiple renders even while building single "feature")
            if (!parentId) { // normal load
                addFeature(item, overlayId);
            } else { // network link
                updateItem(item, overlayId, featureId, parentId);
            }
            updateTreeTimer = setTimeout(function () { // use timer in case multiple "features" loaded by user at once
                overlayTree.enableUpdate(true);
                console.log('Sidebar tree now has ' + overlayTree.count() + ' nodes');
            }, 200);
        },
        removeOverlay: function (id) {
            remove(id);
        },
        removeFeature: function (id, parentOverlayId) {
            remove(id + parentOverlayId);
        },
        updateFeature: function (oldParentId, featureId, name, newParentId) {
            return updateFeature(oldParentId, featureId, name, newParentId);
        },
        showOverlay: function (id, fire) {
            show(id, fire);
        },
        showFeature: function (id, parentOverlayId, fire) {
            show(id + parentOverlayId, fire);
        },
        hideOverlay: function (id, fire) {
            hide(id);
        },
        hideFeature: function (id, parentOverlayId, fire) {
            hide(id + parentOverlayId, fire);
        }
    };
}());