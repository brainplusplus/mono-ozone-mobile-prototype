/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4, unparam: true */

var util = {};

// var jc2cui = jc2cui || {}; no longer passes JSlint :(
// providing namepsace function to do same thing...
util.namespace = function (ns) {
    "use strict";

    var nsParts = ns.split("."),
        root = window,
        i;

    for (i = 0; i < nsParts.length; i++) {
        if (root[nsParts[i]] === undefined) {
            root[nsParts[i]] = {};
        }

        root = root[nsParts[i]];
    }
};

// TBD - Move to own file and use Modernizr to load if needed

// Console-polyfill. MIT license.
// https://github.com/paulmillr/console-polyfill
// Make it safe to do console.log() always.
(function (con) {
    'use strict';
    var prop, method;
    var empty = {};
    var dummy = function () { };
    var properties = 'memory'.split(',');
    var methods = ('assert,count,debug,dir,dirxml,error,exception,group,' +
       'groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,' +
       'time,timeEnd,trace,warn').split(',');
    while (prop = properties.pop()) con[prop] = con[prop] || empty;
    while (method = methods.pop()) con[method] = con[method] || dummy;
})(window.console = window.console || {});