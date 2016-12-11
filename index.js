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

const cheerio = require('cheerio');
const util    = require('util');
const async   = require('async');
const co      = require('co');
const fs      = require('fs');

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

    processAll($, metadata, setDirty) {
        var custom = this;
        return co(function *() {
            try {
                var elements = custom.findElements($);
                if (elements.length <= 0) return;
                for (var element of elements) {
                    let replaceWith = yield custom.process($(element), metadata, setDirty);
                    $(element).replaceWith(replaceWith);
                }
            } catch (e) {
                console.error(`CustomElement ${custom.elementName} Errored with ${util.inspect(e)}`);
                throw e;
            }
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
        var munger = this;
        return co(function *() {
            try {
                var elements = munger.findElements($);
                if (elements.length <= 0) return;
                for (var element of elements) {
                    yield munger.process($, $(element), metadata, setDirty);
                }
            } catch (e) {
                console.error(`Munger ${munger.selector} Errored with ${util.inspect(e)}`);
                throw e;
            }
        });
    }
}

exports.PageProcessor = class PageProcessor extends exports.Mahafunc {
    process($, metadata, setDirty) {
        throw new Error("The 'process' function must be overridden")
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
           || typeof func === 'function'
           || Array.isArray(func))) {
            throw new Error("Improper addition "+ util.inspect(func));
        } else {
            this._functions.push(func);
        }
    }

    setMahafuncArray(functions) {
        if (!(Array.isArray(functions))) {
            throw new Error("Improper mahafunction array "+ util.inspect(functions));
        } else {
            this._functions = functions;
        }
    }

    process($, metadata, dirty) {
        var mhArray = this;
        return co(function *() {
            for (var mahafunc of mhArray._functions) {
                if (mahafunc instanceof exports.CustomElement) {
                    // console.log(`Mahabhuta calling CustomElement ${mahafunc.elementName}`);
                    yield mahafunc.processAll($, metadata, dirty);
                } else if (mahafunc instanceof exports.Munger) {
                    // console.log(`Mahabhuta calling Munger ${mahafunc.selector}`);
                    yield mahafunc.processAll($, metadata, dirty);
                } else if (mahafunc instanceof exports.PageProcessor) {
                    // console.log(`Mahabhuta calling PageProcessor `);
                    yield mahafunc.process($, metadata, dirty);
                } else if (mahafunc instanceof exports.MahafuncArray) {
                    yield mahafunc.process($, metadata, dirty);
                } else if (typeof mahafunc === 'function') {
                    yield new Promise((resolve, reject) => {
                        mahafunc($, metadata, dirty, err => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                } else if (Array.isArray(mahafunc)) {
                    let mhObj = new exports.MahafuncArray("inline", mhArray._config);
                    mhObj.setMahafuncArray(mahafunc);
                    yield mhObj.process($, metadata, dirty);
                } else {
                    console.error("BAD MAHAFUNC "+ util.inspect(mahafunc));
                }
            }
            return $.html();
        });
    }
}

/**
 * Process the text using functions supplied in the array mahabhutaFuncs.
 */
exports.process = function(text, metadata, mahabhutaFuncs, done) {

    exports.processAsync(text, metadata, mahabhutaFuncs)
    .then(html => { done(undefined, html); })
    .catch(err => { done(err); });

    // If we were on a Synchronous platform, this might be
    //
    // var cleanOrDirty = 'first-time';
    // while (dirtyOrClean !== 'dirty' && dirtyOrClean !== 'first-time') {
    // 		cleanOrDirty = 'clean';
    //		mahabhutaFuncs.forEach(function(mahafunc) {
    //			mahafunc($, metadata, setDirty, function(err) { ... });
    //      }
    // }
};

exports.processAsync =  co.wrap(function *(text, metadata, mahabhutaFuncs) {

    if (!mahabhutaFuncs || mahabhutaFuncs.length < 0) mahabhutaFuncs = [];

    var cleanOrDirty = 'first-time';

    // Allow a pre-parsed context to be passed in
    var $ = typeof text === 'function' ? text : exports.parse(text);

    do {
        var mhObj;
        if (Array.isArray(mahabhutaFuncs)) {
            // console.log(`ARRAY substitution`);
            mhObj = new exports.MahafuncArray("master", {});
            mhObj.setMahafuncArray(mahabhutaFuncs);
        } else if (mahabhutaFuncs instanceof exports.MahafuncArray) {
            // console.log(`MahafuncArray`);
            mhObj = mahabhutaFuncs;
        } else throw new Error(`Bad mahabhutaFuncs object supplied`);

        cleanOrDirty = 'clean';
        yield mhObj.process($, metadata, () => { cleanOrDirty = 'dirty'; });
    } while (cleanOrDirty === 'dirty');

    return $.html();
});

exports.process1 = function(text, metadata, mahafunc, done) {
    exports.process(text, metadata, [ mahafunc ], done);
};
