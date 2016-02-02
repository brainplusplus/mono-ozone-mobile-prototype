/*jslint continue: true, passfail: true, plusplus: true, regexp: true, maxerr: 50, indent: 4, unparam: true */
/*global $: true, jQuery: true, Ozone, owfdojo, window, document, Slick, setTimeout, clearTimeout, jc2cui, util, console*/

util.namespace('jc2cui');

jc2cui.logWidget = (function () {
    "use strict";

    var first_run = true;

    var $window = $(window), windowSize = {
		height : $window.innerHeight(),
		width : $window.innerWidth()
	}, namespace, widgetEventingController, widgetChrome, config, configDlg, gcssSuiteConfigDlg, selectWatchboardDlg, setWatchboardListExpireTimeDlg, setWatchboardRefreshTimeDlg, thresholdDlg, movingAverageDlg, defaultExpansionsDlg, thresholdCutoffDlg, defaults = {
		gcssSuiteUrl : null,
		watchboardsTimeout : 10, // how many MINUTES until current watchboard
									// list is considered stale and needs to be
									// refreshed
		selectedWatchboard : null,
		watchboardRefreshTime : 720, // how many MINUTES until loaded
										// watchboard is refreshed
		movingAverage : 1,
		defaultExpansion : 4,
		thresholds : {
			green : 80,
			amber : 60,
			red : 40
		},
		lowestThreshold : 'none',
		columnsToShow : null,
		rowsToShow : null,
		copWidgetSyncState : false
	}, options = $.extend(true, {}, defaults), data, dataView, grid, allColumns, columnPicker, columnPreferenceTimeout, filter, selectLocationsDlg, timeLastFetchedWatchboards = 0, currentWatchboards, refreshWatchboardTimer, timeLastRefreshedWatchboard = 0, refreshWatchboard, messages = {}, widgetDir, lastCopWidgetMsg, watchboardNamesMap;

	// OWF dialog ugly and is buggy
	// if id passed, will prevent more then one of dialog with same id from
	// being up at same time
	function showMessage(msgString, title, height, width, id, nonModal, toast) {
		if (id && messages[id]) {
			return;
		}
		messages[id] = true;
		height = 160;
		width =  380;
		var msg = $('<div>' + msgString + '</div>'), buttons;

		if (!toast) {
			buttons = {
				Ok : function() {
					msg.dialog('close');
				}
			};
		}

		console.log(width);
		console.log(windowSize.width-20);
		
		msg.dialog({
			//preferredHeight : height,
			//preferredWidth : width,
			height : Math.min(height, windowSize.height - 20),
			width : Math.min(width, windowSize.width - 20),
			modal : !toast && !nonModal,
			title : title,
			buttons : buttons,
			close : function(ev, ui) {
				delete messages[id];
				clearTimeout(msg.timeout);
				msg.remove();
			}
		});

		if (toast) {
			msg.click(function() {
				delete messages[id];
				showMessage(msgString, title, height, width, id, true);// ,
																		// toast);
				msg.dialog('option', 'hide', null).dialog('close');
			});

			msg.timeout = setTimeout(function() {
				msg.dialog('option', 'hide', {
					effect : "fadeOut",
					duration : 3000
				}).dialog('close');
			}, 2000);
		}
	}

	function showErrorMessage(msgString) {
		showMessage(msgString, 'Error');
	}

	function acceptNumbersOnly(event) {
		// Allow backspace and delete and arrows
		if (event.keyCode === 46 || event.keyCode === 8
				|| (event.keyCode >= 37 && event.keyCode <= 40)) {
			return;
		}
		// Ensure that it is a number or stop the keypress
		if ((event.keyCode < 48 || event.keyCode > 57)
				&& (event.keyCode < 96 || event.keyCode > 105)) {
			event.preventDefault();
		}
	}

	function setUserPreferences() {
		// When synched, dont save site list. It is automatically generated from
		// ship list
		var theRowsToShow = options.rowsToShow;
		if (options.copWidgetSyncState) {
			options.rowsToShow = {};
		}
		Ozone.pref.PrefServer.setUserPreference({
			namespace : namespace,
			name : 'options',
			value : JSON.stringify(options),
            async : false, // This should be false to make it async???? I have no idea.
			onFailure : function(error, status) {
				showErrorMessage('Error updating preferences. Status Code: '
						+ status + ' . Error message: ' + error);
			}
		});
		options.rowsToShow = theRowsToShow;
	}

	function configureGcssJUrl() {
		if (gcssSuiteConfigDlg) { // only 1 up at a time please
			return;
		}

		var html = [
				'<form class="config">',
				'<fieldset>',
				'<label for="gcssSuite">GCSS Suite:</label>',
				'<input type="text" name="gcssSuite" id="gcssSuite" class="text ui-widget-content ui-corner-all" />',
				'</fieldset>', '</form>' ].join(''), dlg = $(html).appendTo(
				$('body')), gcssSuite = $('#gcssSuite', dlg), regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
		gcssSuite.val(options.gcssSuiteUrl || '');
		gcssSuiteConfigDlg = dlg;
		gcssSuiteConfigDlg.dialog({
			//preferredHeight : 225,
			//preferredWidth : 350,
			height : Math.min(225, windowSize.height - 20),
			width : Math.min(380, windowSize.width - 20),
			modal : true,
			title : 'Set URL to GCSS Suite',
			buttons : {
				'Set' : function() {
					var u = $.trim(gcssSuite.val());
					if (!regexp.test(u) || u.indexOf('"') >= 0) {
						showErrorMessage('Please enter a valid URL.');
						return;
					}
					if (options.gcssSuiteUrl !== u) {
						options.gcssSuiteUrl = u;
						setUserPreferences();
					}
					gcssSuiteConfigDlg.dialog('close');
				},
				Cancel : function() {
					gcssSuiteConfigDlg.dialog('close');
				}
			},
			close : function(ev, ui) {
				gcssSuiteConfigDlg.remove();
				gcssSuiteConfigDlg = null;
			}
		});
	}

	function getWatchboards(callback) {
		if (!options.gcssSuiteUrl) {
			showErrorMessage('No GCSS Suite URL set. Unable to fetch watchboard data. Use configure toolbar button to set URL.');
			return;
		}
		var now = new Date().getTime(), url;
		if (currentWatchboards) {
			if ((now - timeLastFetchedWatchboards) < (options.watchboardsTimeout * 60000)) {
				callback(currentWatchboards);
				return;
			}
		}
		timeLastFetchedWatchboards = now;
		url = options.gcssSuiteUrl + 'supply-rest/watchboard';
		url = config.proxy + encodeURIComponent(url);
		url = appServerConfig.baseDirectory + '/data/watchboard.xml';
        $.get(url, function(result)
        {
            try 
            {
                var watchboards = result;
                currentWatchboards = watchboards;
                callback(watchboards);
            }
            catch(e)
            {
                showErrorMessage(e.message);
            }
		}, "xml").fail(function() {
            var msg = 'Error getting watchboard data from ' + url;
            showErrorMessage(msg);
            callback();
        });
	}

	function getColumnsToUse() {
		var columns, columnsToUse, lowest = 100, i;
		if (options.lowestThreshold === 'none') {
			columns = allColumns;
		} else { // TBD - Once all columns set to show, can break. No need to
					// finish looking at all data
			columns = [];
			columnsToUse = {
				location : true
			};
			if (options.lowestThreshold === 'amber') {
				lowest = options.thresholds.green - 1;
			} else if (options.lowestThreshold === 'red') {
				lowest = options.thresholds.amber - 1;
			} else if (options.lowestThreshold === 'black') {
				lowest = options.thresholds.red - 1;
			}
			// go through each visible row - or should this be dependent on
			// defaultExpansion and not worry that user may have opened or
			// closed things?
			if (data) {
				$
						.each(
								data,
								function(index, datum) {
									// if (datum.indent + 1 >=
									// options.defaultExpansion) { // if should
									// be visible
									if (filter(datum)) { // if visible
										for (i = 1; i < allColumns.length; i++) {
											if (datum[allColumns[i].field].statusPercentage <= lowest) {
												columnsToUse[allColumns[i].field] = true;
											}
										}
									}
								});
			}
			if (allColumns) {
				$.each(allColumns, function(index, column) {
					if (columnsToUse[column.field]) {
						columns.push(column);
					}
				});
			}
		}
		return columns;
	}

	function saveUserColumnChanges() {
		var i, columns = grid.getColumns();
		options.userModifiedColumnData = {
			order : [],
			widths : {}
		};
		for (i = 0; i < columns.length; i++) {
			options.userModifiedColumnData.order.push(columns[i].id);
			options.userModifiedColumnData.widths[columns[i].id] = columns[i].width;
		}
		setUserPreferences();
	}

	function refreshGrid() {
		if (grid) {
			grid.destroy();
			grid = null;
		}
		$('#grid').empty();

		var columns, columnsToUse, i, j, placed = {};
		if (options.columnsToShow) { // If user set up custom columns to
										// show, use them
			columns = [];
			$.each(allColumns, function(index, column) {
				if (options.columnsToShow[column.field]) {
					columns.push(column);
				}
			});
		} else { // else show only those that are at selected default minimum
					// threshold or below.
			columns = getColumnsToUse();
		}

		// If user reordered columns, need to restrore users order - and add any
		// new ones at end
		if (options.userModifiedColumnData) {
			columnsToUse = [];
			for (i = 0; i < options.userModifiedColumnData.order.length; i++) {
				for (j = 0; j < columns.length; j++) {
					if (columns[j].id === options.userModifiedColumnData.order[i]) {
						placed[columns[j].id] = true;
						columnsToUse.push(columns[j]);
						break;
					}
				}
			}
			for (i = 0; i < columns.length; i++) {
				if (!placed[columns[i].id]) {
					columnsToUse.push(columns[i]);
				}
			}
		} else {
			columnsToUse = columns;
		}
		grid = new Slick.Grid("#grid", dataView, columnsToUse, {
			frozenColumn : 0
		/* , syncColumnCellResize: true */});
		grid.onClick.subscribe(function(e, args) {
			var item;
			if ($(e.target).hasClass("toggle")) {
				item = dataView.getItem(args.row);
				if (item) {
					if (!item.collapsed) {
						item.collapsed = true;
					} else {
						item.collapsed = false;
					}
					dataView.updateItem(item.id, item);

					// could update columns here in case using minimum threshold
					// option but user probably doesnt want that
					// refreshColumns();
				}
				e.stopImmediatePropagation();
			}
		});

		grid.onColumnsResized.subscribe(function(e, args) {
			saveUserColumnChanges();
		});

		grid.onColumnsReordered.subscribe(function(e, args) {
			saveUserColumnChanges();
		});

		columnPicker = new Slick.Controls.ColumnPicker(allColumns, grid);
		columnPicker.onColumnChanged.subscribe(function(e, args) {
			// No more minimum threshold - user chose custom columns instead
			options.lowestThreshold = 'none';
			options.columnsToShow = {};
			$.each(grid.getColumns(), function(index, column) {
				options.columnsToShow[column.field] = true;
			});
			clearTimeout(columnPreferenceTimeout);
			columnPreferenceTimeout = setTimeout(function() {
				setUserPreferences();
			}, 1000);
		});
	}

	// TBD - Calculations of parent values are duplicated here and in
	// chooseLocations - refactor
	function showWatchboard(showLoadedMessage) {
		var title = $('#title'), url;

        if(first_run == true) {
            first_run = false;
            return;
        }

		if (!options.selectedWatchboard) {
			showErrorMessage('No watchboard selected. Please configure watchboard using configure toolbar button');
			return;
		}

		if (grid) {
			grid.destroy();
			grid = null;
		}
		$('#grid').empty();
		data = [];

		title.empty();
		title
				.append('<div><span></span><img src="' + appServerConfig.baseCommonDirectory + '/common/images/activity.gif" alt="..." /></div>');
		$('span', title).text('Loading ' + options.selectedWatchboard.name);

		$('#title')[0].onclick = (function() {
			selectWatchboard();
		});

		url = options.gcssSuiteUrl + 'supply-rest/watchboard/'
				+ options.selectedWatchboard.id;
		url = config.proxy + encodeURIComponent(url);
		url = appServerConfig.baseDirectory + '/data/watchboard/'
				+ options.selectedWatchboard.id + '.xml';
		$.get(url, 
        function(result)
        {
            var watchboard = result;
            timeLastRefreshedWatchboard = new Date().getTime();
            clearTimeout(refreshWatchboardTimer);
            refreshWatchboardTimer = setTimeout(function() {
                refreshWatchboard();
            }, options.watchboardRefreshTime * 60000);
            if (showLoadedMessage) {
                $('#loaded')
                        .text(
                                options.selectedWatchboard.name
                                        + ' Loaded').show()
                        .fadeOut(2000);
            }
            $('.ui-dialog').remove();
            title.text(options.selectedWatchboard.name);
            var locations = [], parents = [], locationNameFormatter = function(
                    row, cell, value, columnDef, dataContext) {
                var spacer = [
                        "<span class='spacer' style='width:",
                        (15 * dataContext.indent),
                        "px;'></span><span class='toggle" ], idx = dataView
                        .getIdxById(dataContext.id);
                if (data[idx + 1]
                        && data[idx + 1].indent > data[idx].indent) {
                    if (dataContext.collapsed) {
                        spacer.push(" expand");
                    } else {
                        spacer.push(" collapse");
                    }
                }
                spacer.push("'></span>&nbsp;");
                spacer.push(value);
                return spacer.join('');
            }, colorCellFormatter = function(row, cell, value,
                    columnDef, dataContext) {
                var html = [
                        '<span title="',
                        !value
                                || (isNaN(value.objective)
                                        && isNaN(value.quantity) && isNaN(value.statusPercentage)) ? 'no data'
                                : ([
                                        'objective: ',
                                        isNaN(value.objective) ? 'unknown'
                                                : value.objective,
                                        ', quantity: ',
                                        isNaN(value.quantity) ? 'unknown'
                                                : value.quantity,
                                        ', status: ',
                                        isNaN(value.statusPercentage) ? 'unknown'
                                                : isFinite(value.statusPercentage) ? (value.statusPercentage + '%')
                                                        : 'NA' ]
                                        .join('')), // May be good
                                                    // value, NAN if
                                                    // missing data,
                                                    // or Infinity
                                                    // if objective
                                                    // is 0
                        '"' ], color = '';

                if (value) {
                    if (!isNaN(value.statusPercentage)) {
                        if (value.statusPercentage >= options.thresholds.green) {
                            color = 'green';
                        } else if (value.statusPercentage >= options.thresholds.amber) {
                            color = 'amber';
                        } else if (value.statusPercentage >= options.thresholds.red) {
                            color = 'red';
                        } else {
                            color = 'black';
                        }
                    }
                    html.push(" class='colorCell ui-corner-all ");
                    html.push(color);
                    html.push("'>");
                    if (!isNaN(value.quantity)) {
                        html.push(value.quantity);
                    }
                } else {
                    html.push(" class='emptyCell'>");
                }
                html.push('</span>');
                return html.join('');
            };
            filter = function(item) {
                var parent;
                if (!item.included) { // site not included
                    return false;
                }
                if (item.parent !== null) { // check if row
                                            // collapsed
                    parent = data[item.parent];
                    while (parent) {
                        if (parent.collapsed) {
                            return false;
                        }
                        parent = data[parent.parent];
                    }
                }
                return true;
            };
            allColumns = [ {
                id : "location",
                name : "Location",
                field : "location",
                cssClass : "cell-title",
                width : 160,
                formatter : locationNameFormatter
            } ];

            $(watchboard).find('locations').each(
                    function(i) {
                        var location = {
                            name : $(this).children('displayName')
                                    .text(),
                            depth : parseInt($(this).children(
                                    'levelDepth').text(), 10)
                        // ,
                        // type:
                        // $(this).children('levelType').text()
                        };
                        locations.push(location);
                    });

            $(watchboard)
                    .find('items')
                    .each(
                            function(i) {
                                var name = $(this).children(
                                        'displayName').text(), width = config.columnWidth;
                                if (options.userModifiedColumnData
                                        && options.userModifiedColumnData.widths[name]) {
                                    width = options.userModifiedColumnData.widths[name];
                                }
                                allColumns.push({
                                    id : name,
                                    name : name,
                                    field : name,
                                    width : width,
                                    formatter : colorCellFormatter
                                });
                            });

            $
                    .each(
                            locations,
                            function(i, location) {
                                while (parents.length
                                        && parents[parents.length - 1].indent + 1 >= location.depth) {
                                    parents.pop();
                                }
                                data[i] = {
                                    location : location.name,
                                    indent : location.depth - 1,
                                    id : i,
                                    included : !options.rowsToShow
                                            || options.rowsToShow[i]
                                };
                                if (location.depth >= options.defaultExpansion) { // really
                                                                                    // only
                                                                                    // need
                                                                                    // this
                                                                                    // if
                                                                                    // have
                                                                                    // children.
                                                                                    // Worth
                                                                                    // looping
                                                                                    // again?
                                    data[i].collapsed = true;
                                }
                                if (parents.length) {
                                    data[i].parent = parents[parents.length - 1].id;
                                    parents[parents.length - 1].hasChildren = true;
                                }
                                parents.push(data[i]);
                            });

            // Ignoring GCSS-J status percentage, calculating our
            // own
            // Ignoring all GCSS-J rollup values in any non leaf
            // node. We will roll up ourselves (no self assets) -
            // Need to check this with SME
            // Ignoring any node that doesnt have a value for either
            // quantity or status (or rollup will be out of wack) -
            // Need to check this with SME
            $(watchboard)
                    .find('measures')
                    .each(
                            function(i) {
                                // Ignore any GCSS-J rollups (and no
                                // self assets)
                                if (data[i].hasChildren) {
                                    // console.log('skipping parent
                                    // ' + data[i].location);
                                    var j;
                                    for (j = 1; j < allColumns.length; j++) {
                                        data[i][allColumns[j].field] = {
                                            objective : NaN,
                                            quantity : NaN,
                                            statusPercentage : NaN
                                        };
                                    }
                                    return true;
                                }

                                $(this)
                                        .find('item')
                                        .each(
                                                function(j) {
                                                    var objective = parseInt(
                                                            $(this)
                                                                    .children(
                                                                            'objective')
                                                                    .text(),
                                                            10), quantity = parseInt(
                                                            $(this)
                                                                    .children(
                                                                            'quantity')
                                                                    .text(),
                                                            10), statusPercentage = Math
                                                            .round((quantity / objective) * 100), // Ignore
                                                                                                    // GCSS-J
                                                                                                    // status
                                                    child, parent;

                                                    /*
                                                     * no partials
                                                     * if
                                                     * (isNaN(statusPercentage)) {
                                                     * objective =
                                                     * NaN; quantity =
                                                     * NaN; }
                                                     */

                                                    data[i][allColumns[j + 1].field] = {
                                                        objective : objective,
                                                        quantity : quantity,
                                                        statusPercentage : statusPercentage
                                                    };
                                                    // console.log('set
                                                    // ' +
                                                    // data[i].location
                                                    // + ' ' +
                                                    // allColumns[j
                                                    // + 1].field +
                                                    // ' to ' +
                                                    // JSON.stringify(data[i][allColumns[j
                                                    // +
                                                    // 1].field]));
                                                    // if
                                                    // ((!options.rowsToShow
                                                    // ||
                                                    // options.rowsToShow[i])
                                                    // &&
                                                    // (!isNaN(objective)
                                                    // &&
                                                    // !isNaN(quantity)
                                                    // &&
                                                    // !isNaN(statusPercentage)))
                                                    // {
                                                    if ((!options.rowsToShow || options.rowsToShow[i])
                                                            && (!isNaN(objective) || !isNaN(quantity))) {
                                                        child = data[i];
                                                        while (child.parent !== undefined) {
                                                            parent = data[child.parent];
                                                            // console.log('increasing
                                                            // parent
                                                            // ' +
                                                            // parent.location
                                                            // + ' '
                                                            // +
                                                            // allColumns[j
                                                            // +
                                                            // 1].field);
                                                            if (!isNaN(objective)) {
                                                                parent[allColumns[j + 1].field].objective = isNaN(parent[allColumns[j + 1].field].objective) ? objective
                                                                        : parent[allColumns[j + 1].field].objective
                                                                                + objective;
                                                            }
                                                            if (!isNaN(quantity)) {
                                                                parent[allColumns[j + 1].field].quantity = isNaN(parent[allColumns[j + 1].field].quantity) ? quantity
                                                                        : parent[allColumns[j + 1].field].quantity
                                                                                + quantity;
                                                            }
                                                            parent[allColumns[j + 1].field].statusPercentage = Math
                                                                    .round((parent[allColumns[j + 1].field].quantity / parent[allColumns[j + 1].field].objective) * 100);
                                                            child = parent;
                                                            // console.log('set
                                                            // ' +
                                                            // parent.location
                                                            // + ' '
                                                            // +
                                                            // allColumns[j
                                                            // +
                                                            // 1].field
                                                            // + '
                                                            // to '
                                                            // +
                                                            // JSON.stringify(parent[allColumns[j
                                                            // +
                                                            // 1].field]));
                                                        }
                                                    }
                                                });
                            });

            dataView = new Slick.Data.DataView();
            dataView.beginUpdate();
            dataView.setItems(data);
            dataView.setFilter(filter);
            dataView.endUpdate();

            dataView.onRowCountChanged.subscribe(function(e, args) {
                grid.updateRowCount();
                grid.render();
            });

            dataView.onRowsChanged.subscribe(function(e, args) {
                grid.invalidateRows(args.rows);
                grid.render();
            });

            refreshGrid();
        }, "xml").fail(function() {;
            var msg = 'Error getting watchboard data from ' + url;
            showErrorMessage(msg);
            title.empty();
            title.text('Unable to load '
                    + options.selectedWatchboard.name);
        });
	}

	refreshWatchboard = function() {
		if (options.selectedWatchboard) {
			var now = new Date().getTime();
			if ((now - timeLastRefreshedWatchboard) >= (options.watchboardRefreshTime * 60000)) {
				showWatchboard();
			}
		}
	};

	function selectWatchboard() {
		if (selectWatchboardDlg) { // only 1 up at a time please
			return;
		}

		var html = '<div id="watchboards"><div>Loading... <img src="' + appServerConfig.baseCommonDirectory + '/common/images/activity.gif" alt="..." /></div></div>';
		selectWatchboardDlg = $(html).appendTo($('body'));
		selectWatchboardDlg.dialog({
			//preferredHeight : 300,
			//preferredWidth : 400,
			height : Math.min(380, windowSize.height - 20),
			width : Math.min(380, windowSize.width - 20),
			modal : true,
			title : 'Select Watchboard',
			buttons : {
				Ok : function() {
					selectWatchboardDlg.dialog('close');
				},
				Cancel : function() {
					selectWatchboardDlg.dialog('close');
				}
			},
			close : function(ev, ui) {
				selectWatchboardDlg.remove();
				selectWatchboardDlg = null;
			}
		});
		getWatchboards(function(watchboards) {
			if (!selectWatchboardDlg) { // impatient user hit cancel!
				return;
			}

			if (!watchboards) {
				showErrorMessage('No watchboard data found.');
				selectWatchboardDlg.dialog('close');
				return;
			}

			selectWatchboardDlg.empty();

			var tree = selectWatchboardDlg
					.dynatree(
							{
								onActivate : function(node) {
									if (node.data.id) {
										if (!options.selectedWatchboard
												|| options.selectedWatchboard.id !== node.data.id) {
											options = $.extend(true, {},
													defaults); // blow away any
																// settings -
																// TBD - should
																// we keep some
																// / all ?
																// (probably not
																// all, rows
																// likely to not
																// match up in
																// particular,
																// columns also
																// likely
																// mismatched,
																// others may
																// make sense)
											options.selectedWatchboard = {
												id : node.data.id,
												name : node.data.title
											};
											setUserPreferences();
										}
										selectWatchboardDlg.dialog('close');
										showWatchboard(true);
									}
								},
								persist : false, // cookieId not needed even
													// though 2 trees since no
													// persist
								idPrefix : 'watchboard_', // in case both
															// trees are ever up
															// at same time
								debugLevel : 0
							}).dynatree("getTree"), ownerNode;
			$(watchboards).find('Owner').each(function(i) {
				ownerNode = tree.getRoot().addChild({
					title : $(this).children('name').text(),
					isFolder : true
				});
				$(this).find('CommodityType').each(function(i) {
					var commodityNode = ownerNode.addChild({
						title : $(this).children('name').text(),
						isFolder : true
					});
					$(this).find('Watchboard').each(function(i) {
						var node = {
							title : $(this).children('name').text(),
							id : $(this).children('id').text()
						};
						commodityNode.addChild(node);
					});
				});
			});
		});
	}

	function setWatchboardListExpireTime() {
		if (setWatchboardListExpireTimeDlg) { // only 1 up at a time please
			return;
		}

		var html = [
				'<form class="movingAverage">',
				'<fieldset>',
				'<label for="expireTime">Time until watchboard list expires (minutes): </label> ',
				'<input type="text" name="expireTime" id="expireTime" value="',
				options.watchboardsTimeout || '',
				'" class="text ui-widget-content ui-corner-all" />',
				'</fieldset>', '</form>' ].join(''), expireTimeInput;
		setWatchboardListExpireTimeDlg = $(html).appendTo($('body'));
		expireTimeInput = $('#expireTime', setWatchboardListExpireTimeDlg);
		expireTimeInput.keydown(acceptNumbersOnly);
		setWatchboardListExpireTimeDlg.dialog({
			preferredHeight : 225,
			preferredWidth : 350,
			height : Math.min(225, windowSize.height - 20),
			width : Math.min(380, windowSize.width - 20),
			modal : true,
			title : 'Set Watchboard List Expiration Time',
			buttons : {
				'Set' : function() {
					var et = parseInt(expireTimeInput.val(), 10);
					if (options.watchboardsTimeout !== et) {
						options.watchboardsTimeout = et;
						setUserPreferences();
					}
					setWatchboardListExpireTimeDlg.dialog('close');
				},
				Cancel : function() {
					setWatchboardListExpireTimeDlg.dialog('close');
				}
			},
			close : function(ev, ui) {
				setWatchboardListExpireTimeDlg.remove();
				setWatchboardListExpireTimeDlg = null;
			}
		});
	}

	function setWatchboardRefreshTime() {
		if (setWatchboardRefreshTimeDlg) { // only 1 up at a time please
			return;
		}

		var html = [
				'<form class="movingAverage">',
				'<fieldset>',
				'<label for="refreshTime">Time until loaded watchboard refreshes (minutes): </label> ',
				'<input type="text" name="refreshTime" id="refreshTime" value="',
				options.watchboardRefreshTime || '',
				'" class="text ui-widget-content ui-corner-all" />',
				'</fieldset>', '</form>' ].join(''), refreshTimeInput;
		setWatchboardRefreshTimeDlg = $(html).appendTo($('body'));
		refreshTimeInput = $('#refreshTime', setWatchboardRefreshTimeDlg);
		refreshTimeInput.keydown(acceptNumbersOnly);
		setWatchboardRefreshTimeDlg
				.dialog({
					preferredHeight : 225,
					preferredWidth : 350,
					height : Math.min(225, windowSize.height - 20),
					width : Math.min(380, windowSize.width - 20),
					modal : true,
					title : 'Set Watchboard Refresh Time',
					buttons : {
						'Set' : function() {
							var et = parseInt(refreshTimeInput.val(), 10), waitTime;
							if (options.watchboardRefreshTime !== et) {
								options.watchboardRefreshTime = et;
								setUserPreferences();
								// Need to restart timer to refresh at new
								// refresh time (from when last refreshed). May
								// even need to refresh now
								waitTime = (options.watchboardRefreshTime * 60000)
										- (new Date().getTime() - timeLastRefreshedWatchboard);
								if (waitTime > 0) {
									clearTimeout(refreshWatchboardTimer);
									refreshWatchboardTimer = setTimeout(
											function() {
												refreshWatchboard();
											}, waitTime);
								} else {
									refreshWatchboard();
								}
							}
							setWatchboardRefreshTimeDlg.dialog('close');
						},
						Cancel : function() {
							setWatchboardRefreshTimeDlg.dialog('close');
						}
					},
					close : function(ev, ui) {
						setWatchboardRefreshTimeDlg.remove();
						setWatchboardRefreshTimeDlg = null;
					}
				});
	}

	function refreshColumns() {
		var columnsToUse;
		if (options.columnsToShow) { // If user set up custom columns to
										// show, use them
			columnsToUse = [];
			$.each(allColumns, function(index, column) {
				if (options.columnsToShow[column.field]) {
					columnsToUse.push(column);
				}
			});
		} else { // else show only those that are at selected default minimum
					// threshold or below.
			columnsToUse = getColumnsToUse();
		}
		if (grid) {
			grid.setColumns(columnsToUse);
		}
	}

	// Lots of bizzare behavior in IE7 - some strange workarounds included below
	// and in css
	function configureThresholds() {
		if (thresholdDlg) { // only 1 up at a time please
			return;
		}

		var height = $.browser.msie && parseInt($.browser.version, 10) === 7 ? 330
				: 280, html = [
				'<form class="threshold">',
				'<fieldset>',
				'<div id="slider"></div>',
				'<div><label for="green" class="bigLabel">Green: </label>',
				'<input type="text" name="green" id="green" value="',
				options.thresholds.green,
				'" class="text ui-widget-content ui-corner-all" /> <label class="smallLabel">&nbsp;-&nbsp;</label> ',
				'<input type="text" readonly="true" name="green2" id="green2" value="100" class="text ui-widget-content ui-corner-all" />',
				'</div>',
				'<div><label for="amber" class="bigLabel">Amber: </label>',
				'<input type="text" name="amber" id="amber" value="',
				options.thresholds.amber,
				'" class="text ui-widget-content ui-corner-all" /> <label class="smallLabel">&nbsp;-&nbsp;</label> ',
				'<input type="text" name="amber2" id="amber2" value="',
				options.thresholds.green - 1,
				'" class="text ui-widget-content ui-corner-all" />',
				'</div>',
				'<div><label for="red" class="bigLabel">Red: </label>',
				'<input type="text" name="red" id="red" value="',
				options.thresholds.red,
				'" class="text ui-widget-content ui-corner-all" /> <label class="smallLabel">&nbsp;-&nbsp;</label> ',
				'<input type="text" name="red2" id="red2" value="',
				options.thresholds.amber - 1,
				'" class="text ui-widget-content ui-corner-all" />',
				'</div>',
				'<div><label for="black" class="bigLabel">Black: </label>',
				'<input type="text" readonly="true" name="black" id="black" value="0" class="text ui-widget-content ui-corner-all" /> <label class="smallLabel">&nbsp;-&nbsp;</label> ',
				'<input type="text" name="black2" id="black2" value="',
				options.thresholds.red - 1,
				'" class="text ui-widget-content ui-corner-all" />', '</div>',
				'</fieldset>', '</form>' ].join(''), slider, i = 0, tick, thumbs, setColors = function() {
			thumbs = thumbs.sort(function(a, b) {
				return $(b).position().left - $(a).position().left;
			});
			thumbs.removeClass('green amber red');
			$(thumbs[0]).addClass('green');
			$(thumbs[1]).addClass('amber');
			$(thumbs[2]).addClass('red');

			$('#blackSlider', slider).css(
					'width',
					(($(thumbs[2]).position().left / slider.width()) * 100)
							+ '%');
			$('#redSlider', slider).css(
					'width',
					(($(thumbs[1]).position().left / slider.width()) * 100)
							+ '%');
			$('#amberSlider', slider).css(
					'width',
					(($(thumbs[0]).position().left / slider.width()) * 100)
							+ '%');
		}, textInputs, blackTo, redFrom, redTo, amberFrom, amberTo, greenFrom, inputValues = [
				0, options.thresholds.red - 1, options.thresholds.red,
				options.thresholds.amber - 1, options.thresholds.amber,
				options.thresholds.green - 1, options.thresholds.green, 100 ], updateInputs = function() {
			blackTo.val(inputValues[1]);
			redFrom.val(inputValues[2]);
			redTo.val(inputValues[3]);
			amberFrom.val(inputValues[4]);
			amberTo.val(inputValues[5]);
			greenFrom.val(inputValues[6]);
		}, validateValues = function(startIndex) {
			var i, values, min = 0, max = 100;
			for (i = startIndex - 1; i > 0; i--) {
				if (i % 2 !== 0 && inputValues[i] >= inputValues[i + 1]) {
					inputValues[i] = inputValues[i + 1] - 1;
				} else if (inputValues[i] > inputValues[i + 1]) {
					inputValues[i] = inputValues[i + 1];
				}
			}
			for (i = startIndex + 1; i < inputValues.length - 1; i++) {
				if (i % 2 === 0 && inputValues[i] <= inputValues[i - 1]) {
					inputValues[i] = inputValues[i - 1] + 1;
				} else if (inputValues[i] < inputValues[i - 1]) {
					inputValues[i] = inputValues[i - 1];
				}
			}

			// ensure mins are good
			for (i = 0; i < inputValues.length; i++) {
				if (inputValues[i] < min) {
					inputValues[i] = min;
				}
				if (i % 2 !== 0) {
					min++;
				}
			}

			// ensure maxs are good
			for (i = inputValues.length - 1; i > 0; i--) {
				if (inputValues[i] > max) {
					inputValues[i] = max;
				}
				if (i % 2 === 0) {
					max--;
				}
			}

			updateInputs();
			values = [ inputValues[2], inputValues[4], inputValues[6] ];
			slider.slider("values", values);
			setColors();
		};
		thresholdDlg = $(html).appendTo($('body'));
		slider = $("#slider", thresholdDlg)
				.slider(
						{
							values : [ options.thresholds.red,
									options.thresholds.amber,
									options.thresholds.green ],
							slide : function(event, ui) {
								setColors();
								return true;
							},
							stop : function(event, ui) {
								setColors();
								var values = slider.slider("values").sort(
										function(a, b) {
											return a - b;
										});
								inputValues = [ 0, values[0] - 1, values[0],
										values[1] - 1, values[1],
										values[2] - 1, values[2], 100 ];
								updateInputs();
								validateValues(0);
							}
						})
				.append(
						[
								'<div id="blackSlider" class="black dummySlider ui-slider-horizontal ui-corner-left"></div>',
								'<div id="redSlider" class="red dummySlider ui-slider-horizontal ui-corner-left"></div>',
								'<div id="amberSlider" class="amber dummySlider ui-slider-horizontal ui-widget-content ui-corner-left"></div>',
								'<div id="greenSlider" class="green dummySlider ui-slider ui-slider-horizontal ui-widget ui-widget-content ui-corner-all"></div>' ]
								.join(''));

		for (i = 0; i < 110; i += 10) {
			tick = $('<span class="tick">' + i + '</span>').appendTo(slider);
			tick.css({
				left : i + '%',
				width : '10%'
			});
		}
		thumbs = $('.ui-slider-handle', slider);
		setColors();
		textInputs = $('input:text', thresholdDlg);
		blackTo = $('#black2', thresholdDlg);
		redFrom = $('#red', thresholdDlg);
		redTo = $('#red2', thresholdDlg);
		amberFrom = $('#amber', thresholdDlg);
		amberTo = $('#amber2', thresholdDlg);
		greenFrom = $('#green', thresholdDlg);

		textInputs.keydown(acceptNumbersOnly);
		blackTo.change(function() {
			var val = parseInt(blackTo.val(), 10);
			inputValues[1] = val;
			inputValues[2] = val + 1;
			validateValues(1);
		});

		redFrom.change(function() {
			var val = parseInt(redFrom.val(), 10);
			inputValues[2] = val;
			inputValues[1] = val - 1;
			validateValues(2);
		});

		redTo.change(function() {
			var val = parseInt(redTo.val(), 10);
			inputValues[3] = val;
			inputValues[4] = val + 1;
			validateValues(3);
		});

		amberFrom.change(function() {
			var val = parseInt(amberFrom.val(), 10);
			inputValues[4] = val;
			inputValues[3] = val - 1;
			validateValues(4);
		});

		amberTo.change(function() {
			var val = parseInt(amberTo.val(), 10);
			inputValues[5] = val;
			inputValues[6] = val + 1;
			validateValues(5);
		});

		greenFrom.change(function() {
			var val = parseInt(greenFrom.val(), 10);
			inputValues[6] = val;
			inputValues[5] = val - 1;
			validateValues(6);
		});

		thresholdDlg
				.dialog({
					//preferredHeight : height,
					//preferredWidth : 350,
					height : Math.min(height, windowSize.height - 20),
					width : Math.min(380, windowSize.width - 20),
					modal : true,
					title : 'Set Thresholds',
					buttons : {
						'Set' : function() {
							var green = parseInt($('#green', thresholdDlg)
									.val(), 10), amber = parseInt($('#amber',
									thresholdDlg).val(), 10), red = parseInt($(
									'#red', thresholdDlg).val(), 10), changed = options.thresholds.green !== green
									|| options.thresholds.amber !== amber
									|| options.thresholds.red !== red;
							if (changed) {
								options.thresholds.green = green;
								options.thresholds.amber = amber;
								options.thresholds.red = red;

								setUserPreferences();

								// new expansion may cause different column
								// visibility if using minimum threshold option
								refreshColumns();

								// Needed or is refreshColumns good enough?
								if (grid) {
									grid.invalidate();
								}
							}
							thresholdDlg.dialog('close');
						},
						Cancel : function() {
							thresholdDlg.dialog('close');
						}
					},
					close : function(ev, ui) {
						thresholdDlg.remove();
						thresholdDlg = null;
					}
				});
		$.ui.dialog.overlay.resize(); // jQuery bug (or are we misusing it?)
										// modal overlay size often wrong in IE
										// 7 only
	}

	function configureMovingAverage() {
		if (movingAverageDlg) { // only 1 up at a time please
			return;
		}

		var html = [
				'<form class="movingAverage">',
				'<fieldset>',
				'<label for="movingAverage">Number of days: </label> ',
				'<input type="text" name="movingAverage" id="movingAverage" value="',
				options.movingAverage || '',
				'" class="text ui-widget-content ui-corner-all" readonly/>',
				'</fieldset>',
				'<h4>NOTE: This value not yet supported by GCSS-J. Actual current values are provided.</h4>',
				'</form>' ].join(''), movingAverageInput;
		movingAverageDlg = $(html).appendTo($('body'));
		movingAverageInput = $('#movingAverage', movingAverageDlg);
		movingAverageInput.keydown(acceptNumbersOnly);
		movingAverageDlg.dialog({
			//preferredHeight : 225,
			//preferredWidth : 350,
			height : Math.min(225, windowSize.height - 20),
			width : Math.min(380, windowSize.width - 20),
			modal : true,
			title : 'Set Number Of Days In Moving Average',
			buttons : [ {
				id : "setButton",
				text : "Set",
				click : function() {
					var ma = parseInt(movingAverageInput.val(), 10);
					if (options.movingAverage !== ma) {
						options.movingAverage = ma;
						setUserPreferences();
						// update cells
						// update columns if using default minimum threshold
					}
					movingAverageDlg.dialog('close');
				}
			}, {
				text : "Cancel",
				click : function() {
					movingAverageDlg.dialog('close');
				}
			} ],
			close : function(ev, ui) {
				movingAverageDlg.remove();
				movingAverageDlg = null;
			}
		});
		$("#setButton").button("disable");
	}

	function chooseColumns(event) {
		if (columnPicker) {
			if (configDlg) {
				configDlg.dialog('close');
			}
			event.pageY -= 120; // it appears to low on page and user may not be
								// able to get at all columns!
			columnPicker.show(event);
		} else {
			showErrorMessage('No watchboard loaded. Unable to choose columns');
		}
	}

	// TBD - Calculations of parent values are duplicated here and in initial
	// load - refactor
	function chooseLocations(event) {
		if (selectLocationsDlg) { // only 1 up at a time please
			return;
		}

		var html = '<div id="watchboards"></div>', tree, parents = {}, nodes = [], configureRows = function() {
			var rows = {}, changed = false;
			tree
					.visit(function(node) {
						var datum = data[node.data.key], parent, included = node
								.isSelected()
								|| node.hasSubSel;
						if (included) {
							rows[node.data.key] = true;
						}
						if (datum.included !== included) {
							changed = true;
							datum.included = included;

							if (datum.hasChildren) {
								return true;
							}

							// subtract leaf node values from all parents
							$
									.each(
											allColumns,
											function(index, column) {
												if (column.name === 'Location') {
													return true;
												}
												var values = datum[column.field], objective, quantity;

												// if (values &&
												// !isNaN(values.objective) &&
												// !isNaN(values.quantity) &&
												// !isNaN(values.statusPercentage))
												// {
												if (values
														&& (!isNaN(values.objective) || !isNaN(values.quantity))) {
													if (!isNaN(values.objective)) {
														objective = included ? values.objective
																: -values.objective;
													}
													if (!isNaN(values.quantity)) {
														quantity = included ? values.quantity
																: -values.quantity;
													}
													parent = data[datum.parent];
													while (parent) {
														if (!isNaN(objective)) {
															parent[column.field].objective = isNaN(parent[column.field].objective) ? objective
																	: parent[column.field].objective
																			+ objective;
														}
														if (!isNaN(quantity)) {
															parent[column.field].quantity = isNaN(parent[column.field].quantity) ? quantity
																	: parent[column.field].quantity
																			+ quantity;
														}
														parent[column.field].statusPercentage = Math
																.round((parent[column.field].quantity / parent[column.field].objective) * 100);
														parent = data[parent.parent];
													}
												}
											});
						}
					});

			if (changed) {
				options.rowsToShow = rows;

				setUserPreferences();

				if (dataView) {
					dataView.refresh();
				}

				// new expansion may cause different column visibility if using
				// minimum threshold option - expected behavior?
				refreshColumns();
			}
		};

		selectLocationsDlg = $(html).appendTo($('body'));
		selectLocationsDlg.dialog({
			//preferredHeight : 300,
			//preferredWidth : 400,
			height : Math.min(300, windowSize.height - 20),
			width : Math.min(380, windowSize.width - 20),
			modal : true,
			title : 'Select Sites',
			buttons : {
				Ok : function() {
					configureRows();
					selectLocationsDlg.dialog('close');
				},
				Cancel : function() {
					selectLocationsDlg.dialog('close');
				}
			},
			close : function(ev, ui) {
				selectLocationsDlg.remove();
				selectLocationsDlg = null;
			}
		});
		if (!data || data.length === 0) {
			showErrorMessage('No watchboard loaded. Unable to choose sites');
			selectLocationsDlg.dialog('close');
			return;
		}

		selectLocationsDlg.empty();

		$.each(data, function(index, datum) {
			var node = {
				title : datum.location,
				isFolder : datum.hasChildren,
				expand : true,
				select : !options.rowsToShow || options.rowsToShow[datum.id],
				key : datum.id
			}; // store id and look up data on change - copy stored here!
			if (node.isFolder) {
				parents[node.key] = node;
			}

			if (datum.parent !== undefined) {
				parents[datum.parent].children = parents[datum.parent].children
						|| [];
				parents[datum.parent].children.push(node);
			} else {
				nodes.push(node);
			}
		});

		tree = selectLocationsDlg.dynatree({
			checkbox : true,
			selectMode : 2,
			children : nodes,
			onDblClick : function(node, event) {
				node.toggleSelect();
			},
			onKeydown : function(node, event) {
				if (event.which === 32) {
					node.toggleSelect();
					return false;
				}
			},
			persist : false, // cookieId not needed even though 2 trees since
								// no persist
			idPrefix : 'location_', // in case both trees are ever up at same
									// time
			debugLevel : 0
		}).dynatree("getTree");
	}

	function setDefaultExpansion(event) {
		if (defaultExpansionsDlg) { // only 1 up at a time please
			return;
		}

		var html = [
				'<form class="defaultExpansion">',
				'<fieldset>',
				'<label for="defaultExpansion">Default Rollup Level: </label> ',
				'<select id="defaultExpansion" class="text ui-widget-content ui-corner-left">',
				'<option value="1">COCOM</option>',
				'<option value="2">JOA/Region/Operation</option>',
				'<option value="3">Service</option>',
				'<option value="4">Supply Point</option>', '</select>',
				'</fieldset>', '</form>' ].join(''), defaultExpansionsSelect;
		defaultExpansionsDlg = $(html).appendTo($('body'));
		defaultExpansionsSelect = $('#defaultExpansion', defaultExpansionsDlg);
		defaultExpansionsSelect.val(options.defaultExpansion).attr('selected',
				'selected');
		defaultExpansionsDlg
				.dialog({
					//preferredHeight : 200,
					//preferredWidth : 300,
					height : Math.min(225, windowSize.height - 20),
					width : Math.min(380, windowSize.width - 20),
					modal : true,
					title : 'Set Default Rollup Level',
					buttons : {
						'Set' : function() {
							var de = defaultExpansionsSelect.find(
									"option:selected").val();
							if (options.defaultExpansion !== de) {
								options.defaultExpansion = de;
								setUserPreferences();
								defaultExpansionsDlg.dialog('close');

								$
										.each(
												data,
												function(index, datum) {
													if (datum.hasChildren
															&& datum.indent + 1 >= options.defaultExpansion) {
														datum.collapsed = true;
													} else {
														datum.collapsed = false;
													}
												});

								if (dataView) {
									dataView.refresh();
								}

								// new expansion may cause different column
								// visibility if using minimum threshold option
								refreshColumns();
							}
						},
						Cancel : function() {
							defaultExpansionsDlg.dialog('close');
						}
					},
					close : function(ev, ui) {
						defaultExpansionsDlg.remove();
						defaultExpansionsDlg = null;
					}
				});
	}

	function setThresholdCutoff(event) {
		if (thresholdCutoffDlg) { // only 1 up at a time please
			return;
		}

		var html = [
				'<form class="defaultExpansion">',
				'<fieldset>',
				'<label for="thresholdCutoff">Default Minimum Displayed Threshold: </label> ',
				'<select id="thresholdCutoff" class="',
				options.lowestThreshold,
				' text ui-widget-content ui-corner-left">',
				'<option value="none">None</option>',
				'<option class="green" value="green">Green</option>',
				'<option class="amber" value="amber">Amber</option>',
				'<option class="red" value="red">Red</option>',
				'<option class="black" value="black">Black</option>',
				'</select>', '</fieldset>', '</form>' ].join(''), thresholdCutoffSelect;
		thresholdCutoffDlg = $(html).appendTo($('body'));
		thresholdCutoffSelect = $('#thresholdCutoff', thresholdCutoffDlg);
		thresholdCutoffSelect.val(options.lowestThreshold).attr('selected',
				'selected');
		thresholdCutoffSelect.change(function() {
			var lt = thresholdCutoffSelect.find("option:selected").val();
			thresholdCutoffSelect.removeClass('none green amber red black');
			thresholdCutoffSelect.addClass(lt);
		});
		thresholdCutoffDlg.dialog({
			//preferredHeight : 200,
			//preferredWidth : 300,
			height : Math.min(225, windowSize.height - 20),
			width : Math.min(380, windowSize.width - 20),
			modal : true,
			title : 'Set Default Minimum Displayed Threshold',
			buttons : {
				'Set' : function() {
					var lt = thresholdCutoffSelect.find("option:selected")
							.val();
					if (options.lowestThreshold !== lt) {
						options.lowestThreshold = lt;
						// No more custom columns - user chose minimum threshold
						// instead
						options.columnsToShow = null;
						setUserPreferences();
						refreshColumns();
					}
					thresholdCutoffDlg.dialog('close');
				},
				Cancel : function() {
					thresholdCutoffDlg.dialog('close');
				}
			},
			close : function(ev, ui) {
				thresholdCutoffDlg.remove();
				thresholdCutoffDlg = null;
			}
		});
	}

	function applyCopWidgetFilter(msg) {
		var shipNames, html, i;

		if (!msg.shipNames || !$.isArray(msg.shipNames)) {
			console
					.log('copwid.maritime.shipNames message with no ship names array received!');
			return;
		}

		if (!data || data.length === 0) {
			console
					.log('All ships watchboard either not loaded or has no data!');
			return;
		}

		shipNames = msg.shipNames.slice();
		options.rowsToShow = {};
		$
				.each(
						data,
						function(di, datum) {
							// in case it was previously set higher
							if (datum.hasChildren) {
								datum.collapsed = false;
							}
							// Could probably do this as an else and always set
							// parents to ! included but better be safe...
							var index = -1, watchboardShipName = datum.location
									.toLowerCase(), copWidgetShipName;
							for (i = 0; i < shipNames.length; i++) {
								copWidgetShipName = shipNames[i].toLowerCase();
								// first try new GCSS-J name mapping if
								// available (not yet deployed)
								if (watchboardNamesMap) {
									if (watchboardNamesMap[copWidgetShipName] === watchboardShipName) {
										index = i;
										break;
									}
									// Try exact match too. - User wont notice
									// the extra check and may save us when
									// GCSS-J ship name lookup goes bad
									if (copWidgetShipName === watchboardShipName) {
										index = i;
										break;
									}
								} else if (watchboardShipName
										.indexOf(copWidgetShipName) > -1
										|| copWidgetShipName
												.indexOf(watchboardShipName) > -1) {
									index = i;
									break;
								}
							}
							if (index > -1) {
								shipNames.splice(index, 1);
							}
							datum.included = index > -1;
							options.rowsToShow[datum.id] = datum.included;
						});

		if (dataView) {
			dataView.refresh();
		}

		// new expansion may cause different column visibility if using minimum
		// threshold option - expected behavior?
		refreshColumns();

		if (options.showNonMatchedPopup && shipNames.length) {
			html = [ '<div>No data found for the following vessels:<ul>' ];
			for (i = 0; i < shipNames.length; i++) {
				html.push('<li>');
				html.push(shipNames[i]);
				html.push('</li>');
			}
			showMessage(html.join(''), 'Missing Vessels', null, null, null,
					true, true);
		}

		// maybe - but probably not. If done will allow reloaded widget to have
		// last state - BUT
		// last state is WRONG if in sync!
		// setUserPreferences();
	}

	function subscribeToCopWidgetUpdates() {
		widgetEventingController
				.subscribe(
						'copwid.maritime.shipNames',
						function(sender, msg) {
							try {
								msg = typeof msg === 'string' ? JSON.parse(msg)
										: msg;
							} catch (e) {
								console
										.log('invalid JSON in copwid.maritime.shipNames message!');
							}
							lastCopWidgetMsg = msg;
							if (options.copWidgetSyncState) {
								applyCopWidgetFilter(lastCopWidgetMsg);
							}
						});
	}

	function updateSyncStateButton() {
		widgetChrome.updateHeaderButtons({
			items : [ {
				itemId : 'sync',
				xtype : 'button', // needed
				icon : widgetDir
						+ 'images/'
						+ (options.copWidgetSyncState ? 'syncon.png'
								: 'syncoff.png'),
				text : 'Sync ' + (options.copWidgetSyncState ? 'On ' : 'Off'),
				tooltip : {
					text : (options.copWidgetSyncState ? '' : 'not ')
							+ 'synchronizing with Maritime COP widget'
				}
			} ]
		});
		$('#copWidgetSync', configDlg).prop('checked',
				options.copWidgetSyncState);
	}

	function getWatchboardNameMap() {
		var url = options.gcssSuiteUrl + 'supply-rest/supplypoint/afloat';
		url = config.proxy + encodeURIComponent(url);
		// var url = 'https://localhost/widgets/logWidget/data/shipNames.xml';

		watchboardNamesMap = null;
        $.get(url, 
        function(result)
        {
            var shipenameData = result;
            watchboardNamesMap = {};
            $(shipnameData)
                    .find('afloatSupplyPointResult')
                    .each(
                            function(i) {
                                var shipData = $(this), name = shipData
                                        .children('name').text(), shipName = shipData
                                        .children('shipName')
                                        .text();

                                if (name && shipName) {
                                    watchboardNamesMap[shipName
                                            .toLowerCase()] = name
                                            .toLowerCase();
                                }
                            });

            if (lastCopWidgetMsg) {
                applyCopWidgetFilter(lastCopWidgetMsg);
            }
        }, "xml").fail(function() {
            var msg = 'Error getting ship name data from ' + url;
            showErrorMessage(msg);
        });
	}

	function turnOffAllData() {
		options.rowsToShow = {};
		$.each(data, function(i, datum) {
			datum.included = false;
			options.rowsToShow[datum.id] = false;

			// in case it was previously set higher
			if (datum.hasChildren) {
				datum.collapsed = false;
			}
		});

		if (dataView) {
			dataView.refresh();
		}

		// new expansion may cause different column visibility if using minimum
		// threshold option - expected behavior?
		refreshColumns();
	}

	function updateCopWidgetSyncState() {
		if (options.copWidgetSyncState) {
			// try once to get GCSS-J name mapping
			if (watchboardNamesMap === undefined) {
				if (data) {
					turnOffAllData();
				}
				getWatchboardNameMap();
			} else {
				if (lastCopWidgetMsg) {
					applyCopWidgetFilter(lastCopWidgetMsg);
				} else if (data) {
					// For now show nothing until cop widget sends ship names -
					// one day maybe be able to request data
					turnOffAllData();
				}
			}
		}
		updateSyncStateButton();
	}

	function toggleCopWidgetSync() {
		options.copWidgetSyncState = !options.copWidgetSyncState;
		if (options.copWidgetSyncState) {
			options.defaultExpansion = 4;
			options.rowsToShow = {};
		}
		updateCopWidgetSyncState();
		setUserPreferences();
	}

	function configureWidget() {
		if (configDlg) { // only 1 up at a time please
			return;
		}

		var html = [
				'<div class="config">',
				'<div><a id="watchboards">Select Watchboard</a></div>',
				'<div><a id="thresholds">Configure Thresholds</a></div>',
				'<div><a id="average">Configure Moving Average</a></div>',
				'<div><a id="expansion">Set Default Rollup Level</a></div>',
				'<div><a id="thresholdCutoff">Set Default Minimum Displayed Threshold</a></div>',
				'<div><a id="columns">Choose Columns</a></div>',
				'<div><a id="locations">Choose Sites</a></div>',
				'<hr/>',
				'<div><input type="checkbox" id="copWidgetSync">Sync with Maritime COP widget</div>',
				'<hr/>',
				'<div><input type="checkbox" id="showNonMatchedPopup">Show non matched vessel warning</div>',
				'<hr/>',
				'<div><a id="gcssUrl">Set GCSS Suite URL</a></div>',
				'<div><a id="watchboardListExpire">Set Watchboard List Refresh Time</a></div>',
				'<div><a id="watchboardRefresh">Set Watchboard Refresh Time</a></div>',
				'</div>' ].join('');
		configDlg = $(html).appendTo($('body'));
		$('#gcssUrl', configDlg).click(function() {
			configureGcssJUrl();
		});
		$('#watchboards', configDlg).click(function() {
			selectWatchboard();
		});
		$('#watchboardListExpire', configDlg).click(function() {
			setWatchboardListExpireTime();
		});
		$('#watchboardRefresh', configDlg).click(function() {
			setWatchboardRefreshTime();
		});
		$('#thresholds', configDlg).click(function() {
			configureThresholds();
		});
		$('#average', configDlg).click(function() {
			configureMovingAverage();
		});
		$('#columns', configDlg).click(function(event) {
			chooseColumns(event);
		});
		$('#locations', configDlg)
				.click(
						function(event) {
							if (options.copWidgetSyncState) {
								showMessage(
										'Sites are selected automatically when synchronized with Maritime COP widget',
										'Select Sites');
								return;
							}
							chooseLocations(event);
						});
		$('#copWidgetSync', configDlg).prop('checked',
				options.copWidgetSyncState).change(function() {
			toggleCopWidgetSync();
		});
		$('#showNonMatchedPopup', configDlg).prop('checked',
				options.showNonMatchedPopup).change(function() {
			options.showNonMatchedPopup = !options.showNonMatchedPopup;
			setUserPreferences();
		});
		$('#expansion', configDlg)
				.click(
						function(event) {
							if (options.copWidgetSyncState) {
								showMessage(
										'Rollup Level is automatically set to "Supply Point" when synchronized with Maritime COP widget',
										'Set Default Rollup Level');
								return;
							}
							setDefaultExpansion(event);
						});
		$('#thresholdCutoff', configDlg).click(function(event) {
			setThresholdCutoff(event);
		});
		configDlg
				.dialog({
					//preferredHeight : 272,
					//preferredWidth : 350,
					height : Math.min(300, windowSize.height - 20),
					width : Math.min(380, windowSize.width - 20),
					modal : true,
					title : 'Configure',
					buttons : {
						Ok : function() {
							configDlg.dialog('close');
						}
					},
					close : function(ev, ui) {
						configDlg.remove();
						configDlg = null;

						if (!options.gcssSuiteUrl) {
							showErrorMessage('No GCSS Suite URL set. Unable to fetch watchboard data. Use configure toolbar button to set URL.');
							return;
						}
						if (!options.selectedWatchboard) {
							showErrorMessage('No watchboard selected. Unable to display watchboard data. Use configure toolbar button to select watchboard.');
							return;
						}
					}
				});
	}

	function getUserPreferences(callback) {
		Ozone.pref.PrefServer
				.getUserPreference({
					namespace : namespace,
					name : 'options',
					onSuccess : function(pref) {
						callback(pref);
					},
					onFailure : function(error, status) {
						if (status !== undefined
								&& error !== 'undefined : undefined') { // OWF
																		// 3.5
																		// bug
																		// causes
																		// timeout
																		// instead
																		// of
																		// 404
																		// when
																		// preference
																		// doesnt
																		// exist
							showErrorMessage('Got an error getting preferences! Status Code: '
									+ status + ' . Error message: ' + error);
						}
						callback();
					}
				});
	}

	function showAboutInfo() {
		var msg = [ '<strong>JC2CUI Log Widget<hr>Widget Version</strong> - ' ];
	 
        $.get('pkginfo.json', function(result) {
            var pkginfo = result;
            console.log(pkginfo);
            if(pkginfo){
                msg.push(pkginfo.version);
                msg.push(' Release: ');
                msg.push(pkginfo.release);
            }
            showMessage(msg.join(''), 'About', 160, 300, 'about');
		}, "json").fail(function() {
            msg.push('Unknown');
            showMessage(msg.join(''), 'About', 160, 300, 'about');
        });
	}

	function init() {
		if (!config.owf) {
			showErrorMessage('Missing owf configuration attribute in config file.');
			return;
		}
		var myVersionOfjQuery = jQuery;
//		$.ajax({
//					url : config.owf + '/js-min/owf-widget-min.js',
//					dataType : 'script',
//					cache : true,
//					timeout : 20000, // At least as of jQuery 1.7.1 no longer
//										// getting error callbacks if cross
//										// domain script loading fails
//					success : function(data, textStatus) {
						var resizeTimer, widgetId;
//						if (typeof Ozone !== 'object'
//								|| !Ozone.util.isRunningInOWF()) {
//							showErrorMessage('Watchboard Widget only works as a widget in an OWF dashboard');
//							return;
//						}

						$ = jQuery = myVersionOfjQuery || jQuery;
						owfdojo.config.dojoBlankHtmlUrl = appServerConfig.baseCommonDirectory
								+ '/common/javascript/dojo-1.5.0-windowname-only/dojo/resources/blank.html';

						if (!config.owfRelay) {
							showErrorMessage('Missing owfRelay configuration attribute in config file.');
							return;
						}

						try {
							Ozone.eventing.Widget.widgetRelayURL = appServerConfig.baseCommonDirectory
									+ config.owfRelay;
							widgetEventingController = Ozone.eventing.Widget
									.getInstance();
							widgetId = JSON.parse(widgetEventingController
									.getWidgetId()).id;
							namespace = 'jc2cui.mapWidget.' + widgetId;
							subscribeToCopWidgetUpdates();
							widgetChrome = Ozone.chrome.WidgetChrome
									.getInstance({
										widgetEventingController : widgetEventingController
									});
							widgetChrome
									.isModified({
										callback : function(msg) {
											var res = JSON.parse(msg), functionToUse;
											if (res.success) {
												functionToUse = res.modified ? 'updateHeaderButtons'
														: 'insertHeaderButtons';
												widgetChrome[functionToUse]
														({
															items : [
																	{
																		itemId : 'sync',
																		xtype : 'button',
																		icon : widgetDir + 'images/syncoff.png',
																		text : "Sync off",
																		handler : function(
																				sender,
																				data) {
																			toggleCopWidgetSync();
																		}
																	},
																	{
																		type : 'help',
																		itemId : 'help',
																		handler : function(
																				sender,
																				data) {
																			showAboutInfo();
																		}
																	},
																	{
																		type : 'gear',
																		itemId : 'gear',
																		handler : function(
																				sender,
																				data) {
																			configureWidget();
																		}
																	} ]
														});

												if (JSON.parse(window.name).layout === 'fit') {
													functionToUse = res.modified ? 'updateHeaderMenus'
															: 'addHeaderMenus';
													widgetChrome[functionToUse]
															({
																items : [
																		{
																			itemId : 'configure',
																			text : 'Configure',
																			icon : widgetDir
																					+ 'images/gear.png',
																			handler : function(
																					sender,
																					data) {
																				configureWidget();
																			}
																		},
																		{
																			itemId : 'about',
																			text : 'About',
																			icon : widgetDir
																					+ 'images/help.png',
																			handler : function(
																					sender,
																					data) {
																				showAboutInfo();
																			}
																		} ]
															});
												}
											}
										}
									});
						} catch (err) {
//							showErrorMessage('Error setting up OWF eventing'
//									+ err ? (': ' + err) : '');
						}

						if (!config.proxy) {
							showErrorMessage('Missing proxy configuration attribute in config file.');
						}

						defaults.gcssSuiteUrl = $.trim(config.gcssSuiteUrl);
						options.gcssSuiteUrl = defaults.gcssSuiteUrl;
//						getUserPreferences(function(pref) {
//							if (pref && pref.value) {
//								var savedOptions = JSON.parse(pref.value);
//								options = $.extend({}, defaults, savedOptions);
//							} else {
//								// user settable but widget config file sets
//								// initial default
//								options.showNonMatchedPopup = config.showNonMatchedPopup;
//							}
//							updateCopWidgetSyncState();
//							if (!options.gcssSuiteUrl
//									|| !options.selectedWatchboard) {
//								configureWidget();
//								return;
//							}
							options = defaults;
							configureWidget();
							showWatchboard();
//						});

						$window
								.resize(function() {
									var newWindowSize = {
										height : $window.innerHeight(),
										width : $window.innerWidth()
									};
									if (Math.abs(windowSize.width
											- newWindowSize.width) > 3
											|| Math.abs(windowSize.height
													- newWindowSize.height) > 3) { // lots
																					// of
																					// false
																					// resize
																					// events
																					// in
																					// IE
																					// (e.g.
																					// mouse
																					// leave
																					// ANOTHER
																					// widget)
										clearTimeout(resizeTimer);
										resizeTimer = setTimeout(
												function() {
													if (grid) {
														grid.resizeCanvas();
													}
													// User doesnt want to have
													// to manually resize
													// dialogs when window
													// resized!
													$(
															".ui-dialog-content:visible")
															.each(
																	function() {
																		var it = $(this), dialog = it
																				.data('ui-dialog')
																				|| it
																						.data('uiDialog')
																				|| it
																						.data('dialog'), // For
																											// some
																											// strange
																											// reason
																											// this
																											// is
																											// different
																											// in
																											// different
																											// versions
																											// of
																											// jQuery
																		dialogWidth = dialog.uiDialog
																				.width(), dialogHeight = dialog.uiDialog
																				.height(), maxHeight, maxWidth, newWidth, newHeight;

																		if (newWindowSize.width < windowSize.width) {
																			maxWidth = newWindowSize.width - 20;
																			if (dialogWidth > maxWidth) {
																				newWidth = maxWidth;
																			}
																		} else if (newWindowSize.width > windowSize.width
																				&& dialogWidth < dialog.options.preferredWidth) {
																			newWidth = dialogWidth
																					+ (newWindowSize.width - windowSize.width);
																			newWidth = Math
																					.min(
																							dialog.options.preferredWidth,
																							newWidth);
																		}

																		if (newWindowSize.height < windowSize.height) {
																			maxHeight = newWindowSize.height - 20;
																			if (dialogHeight > maxHeight) {
																				newHeight = maxHeight;
																			}
																		} else if (newWindowSize.height > windowSize.height
																				&& dialogHeight < dialog.options.preferredHeight) {
																			newHeight = dialogHeight
																					+ (newWindowSize.height - windowSize.height);
																			newHeight = Math
																					.min(
																							dialog.options.preferredHeight,
																							newHeight);
																		}

																		if (newWidth
																				&& newWidth !== dialogWidth) {
																			dialog
																					.option(
																							"width",
																							newWidth);
																		}

																		if (newHeight
																				&& newHeight !== dialogHeight) {
																			dialog
																					.option(
																							"height",
																							newHeight);
																		}

																		setTimeout(
																				function() {
																					dialog
																							.option(
																									"position",
																									dialog.options.position);
																					$.ui.dialog.overlay
																							.resize(); // jQuery
																										// bug
																										// (or
																										// are
																										// we
																										// misusing
																										// it?)
																										// modal
																										// overlay
																										// size
																										// often
																										// wrong
																										// after
																										// increasing
																										// width
																										// and
																										// height
																										// causing
																										// unwanted
																										// scrollbars
																										// in
																										// parent
																				},
																				1);
																	});
													windowSize = newWindowSize;
												}, 200);
									}
								});
//					},
//					error : function(XMLHttpRequest, textStatus, errorThrown) {
//						var msg = 'Error loading OWF script ' + config.owf;
//						if (textStatus && textStatus !== 'error') {
//							msg += ': ' + textStatus;
//						}
//						showErrorMessage(msg);
//					}
//				});
	}

	return {
		init : function(widgetConfig) {
			widgetDir = document.location.href;
			widgetDir = widgetDir.substring(0, widgetDir.lastIndexOf('/') + 1);
			config = widgetConfig;
			init();
		},
        getWatchboards : getWatchboards,
		showErrorMessage : showErrorMessage
	};
}());

$(document)
		.ready(
				function() {
					"use strict";
					
					appServerConfig = $.extend({baseCommonDirectory: '', baseDirectory: '', configOverrides: {}}, appServerConfig);
					
					$.ajaxSetup({
						cache : true
                        // Force caching to true
					});

					var url = 'config/logWidgetConfig.json';
                    $.get(url,
                    function(result)
                    {
                        var config = result;
                        if (!config) {
                            jc2cui.logWidget
                                    .showErrorMessage('Error loading log widget configuration: No data');
                            return;
                        }
                        config = $.extend(config, appServerConfig.configOverrides);
                        jc2cui.logWidget.init(config);

                        if(Mono.IsNative())
                        {
                            // Cache everything to begin with -- that way, if connectivity is lost, we'll be able to later retrieve it
                            jc2cui.logWidget.getWatchboards(
                            function(watchboards)
                            {
                                $(watchboards).find('Watchboard').each(function(i) {
                                    var id = $(this).children('id').text();
                                    url = appServerConfig.baseDirectory + '/data/watchboard/'
                                            + id + '.xml';
                                    $.get(url, null);
                                });
                            }, true);
                        }
                        $(".ui-widget-content").scrollTop(0);

                        $('#title')[0].onclick = (function() {
                            document.location.reload();
                        });
                    }, "json").fail(function() {
                        jc2cui.logWidget
                            .showErrorMessage('Error retrieving from ' + url + ' during load!');
                        console.log("Error getting watchboards for caching during load!");

                        $('#title')[0].onclick = (function() {
                            document.location.reload();
                        });
                    });
				});
