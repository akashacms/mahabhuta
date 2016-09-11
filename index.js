/**
 * Copyright 2014-2016 David Herron
 *
 * The MIT License (MIT)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

'use strict';

var cheerio = require('cheerio');
var util    = require('util');
var async   = require('async');

var configCheerio;

exports.config = function(_configCheerio) {
    configCheerio = _configCheerio;
};

/**
 * Simply parse the text, returning $ so the caller can do whatever they want.
 */
exports.parse = function(text) {
    return configCheerio ? cheerio.load(text, configCheerio) : cheerio.load(text);
};

exports.Mahafunc = class Mahafunc {
    get selector() { throw new Error("The 'selector' getter must be overridden"); }

    findElements($) {
        var ret = [];
        $(this.selector).each(function(i, elem) { ret.push(elem); });
        return ret;
    }

    process() { throw new Error("The 'process' function must be overridden"); }
    processAll() { throw new Error("The 'processAll' function must be overridden"); }
}

/**
 * Implements an HTML-ish element that is replaced with
 * some other HTML.  For example, <embed-video> might take
 * an href= and other attributes to describe a video from
 * a known service, the process function discerns the HTML code
 * to use for the player, rendering that into the output.
 */
exports.CustomElement = class CustomElement extends exports.Mahafunc {

    get elementName() { throw new Error("The 'elementName' getter must be overridden"); }
	get selector() { return this.elementName; }

    process($element, metadata, setDirty, done) {
        throw new Error("The 'process' function must be overridden");
    }

    processAll($, metadata, setDirty, done) {
        return new Promise((resolve, reject) => {
            // console.log(`CustomElement processAll ${this.elementName}`);
            var elements = this.findElements($);
            if (elements.length <= 0) return resolve();
            async.eachSeries(elements, (element, next) => {
                this.process($(element), metadata, setDirty)
                .then(replaceWith => {
                    // console.log(`CustomElement ${this.elementName} replaceWith ${replaceWith}`);
                    $(element).replaceWith(replaceWith);
                    next();
                })
                .catch(err => { next(err); });
            },
            err => {
                // log(`after ak-stylesheets ${metadata.document.path} ${$.html()}`);
                if (err) {
                    console.error(`CustomElement ${this.elementName} Errored with ${util.inspect(err)}`);
                    reject(err);
                } else resolve();
            });
        });
    }
}

exports.ElementTweaker = class ElementTweaker extends exports.Mahafunc {
    process() {
        throw new Error("The 'process' function must be overridden")
    }
}

exports.Munger = class Munger extends exports.Mahafunc {
    process($, $element, metadata, setDirty, done) {
        throw new Error("The 'process' function must be overridden")
    }
    processAll($, metadata, setDirty) {
        return new Promise((resolve, reject) => {
            // console.log(`Munger processAll`);
            var elements = this.findElements($);
            // console.log(`Munger for ${this.selector} found ${elements.length} items to process`);
            if (elements.length <= 0) return resolve();
            async.eachSeries(elements, (element, next) => {
                this.process($, $(element), metadata, setDirty)
                .then(() => { next(); })
                .catch(err => { next(err); });
            },
            err => {
                // log(`after ak-stylesheets ${metadata.document.path} ${$.html()}`);
                if (err) {
                    console.error(`${this.selector} Errored with ${util.inspect(err)}`);
                    reject(err);
                } else {
                    // console.log(`Munger finished with ${this.selector}`);
                    resolve();
                }
            });
        });
    }
}

exports.MahafuncArray = class MahafuncArray {

    constructor(name, config) {
        this._functions = [];
        this._name = name;
        this._config = config;
    }

    get name() { return this._name; }

    addMahafunc(func) {
        if (!(func instanceof exports.Mahafunc
           || func instanceof exports.MahafuncArray
           || Array.isArray(func))) {
            throw new Error("Improper addition "+ util.inspect(func));
        } else {
            this._functions.push(func);
        }
    }

    setMahafuncArray(functions) {
        if (!(Array.isArray(func))) {
            throw new Error("Improper mahafunction array "+ util.inspect(func));
        } else {
            this._functions = functions;
        }
    }

    process($, metadata, dirty) {
        return new Promise((resolve, reject) => {
            async.eachSeries(this._functions, (mahafunc, next) => {
                // util.log(util.inspect(mahafunc));
                if (mahafunc instanceof exports.CustomElement) {
                    // console.log(`Mahabhuta calling CustomElement ${mahafunc.elementName}`);
                    mahafunc.processAll($, metadata, dirty)
                    .then(() => { next(); })
                    .catch(err => { next(err); });
                } else if (mahafunc instanceof exports.Munger) {
                    // console.log(`Mahabhuta calling Munger ${mahafunc.selector}`);
                    mahafunc.processAll($, metadata, dirty)
                    .then(() => { next(); })
                    .catch(err => { next(err); });
                } else if (mahafunc instanceof exports.MahafuncArray) {
                    mahafunc.process($, metadata, dirty)
                    .then(() => { next(); })
                    .catch(err => { next(err); });
                } else if (typeof mahafunc === 'function') {
                    mahafunc($, metadata, dirty, next);
                } else if (Array.isArray(mahafunc)) {
                    let mhObj = new exports.MahafuncArray("inline", this._config);
                    mhObj.setMahafuncArray(mahafunc);
                    mhObj.process($, metadata, dirty)
                    .then(() => { next(); })
                    .catch(err => { next(err); });
                } else {
                    console.error("BAD MAHAFUNC "+ util.inspect(mahafunc));
                    next();
                }
            },
            err => {
                // console.log(`runMahaArray finished with ${err}`);
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

/**
 * Process the text using functions supplied in the array mahabhutaFuncs.
 */
exports.process = function(text, metadata, mahabhutaFuncs, done) {

	// If we were on a Synchronous platform, this might be
	//
	// var cleanOrDirty = 'first-time';
	// while (dirtyOrClean !== 'dirty' && dirtyOrClean !== 'first-time') {
	// 		cleanOrDirty = 'clean';
	//		mahabhutaFuncs.forEach(function(mahafunc) {
	//			mahafunc($, metadata, setDirty, function(err) { ... });
	//      }
	// }

    if (!mahabhutaFuncs || mahabhutaFuncs.length < 0) mahabhutaFuncs = [];

	var cleanOrDirty = 'first-time';
	var setDirty = function() { cleanOrDirty = 'dirty'; };

    // Allow a pre-parsed context to be passed in
    var $ = typeof text === 'function' ? text : exports.parse(text);

    // Keep running the functions until the page is clean
    var runMahaFuncs = function() {
        // console.log(`START RUNMAHAFUNCS`);
    	if (cleanOrDirty === 'dirty' || cleanOrDirty === 'first-time') {
    		cleanOrDirty = 'clean';
            var mhObj;
            if (Array.isArray(mahabhutaFuncs)) {
                mhObj = new exports.MahafuncArray("master", {});
                mhObj.setMahafuncArray(mahabhutaFuncs);
            } else if (mahabhutaFuncs instanceof exports.MahafuncArray) {
                mhObj = mahabhutaFuncs;
            } else {
                done(new Error(`Bad mahabhutaFuncs object supplied`));
            }
            mhObj.process($, metadata, setDirty)
            .then(() => { runMahaFuncs(); })
            .catch(err => { console.error(`runMahaFuncs finished with ERROR ${err.stack}`); done(err); });
		} else {
            // console.log(`runMahaFuncs finished normally`);
			done(undefined, $.html());
		}
	};
	runMahaFuncs();
};

exports.process1 = function(text, metadata, mahafunc, done) {
	exports.process(text, metadata, [ mahafunc ], done);
};

exports.builtin = require('./built-in');

/**
 * The beginnings of Express integration for Mahabhuta.  The only unclarity is
 * the source for the function array.
 * /
exports.express = function(filePath, options, callback) {
	fs.readFile(filePath, function (err, content) {
		if (err) callback(new Error(err));
		else {
			exports.process(content, options, "TBD - FUNCTIONS", function(err, html) {
				if (err) callback(err);
				else callback(null, html);
			});
		}
	})
};*/
