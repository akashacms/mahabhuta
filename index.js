/**
 * Copyright 2014-2015 David Herron
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

var cheerio = require('cheerio');
var util    = require('util');
var async   = require('async');

/**
 * Simply parse the text, returning $ so the caller can do whatever they want.
 */
exports.parse = function(text) {
    return config.cheerio ? cheerio.load(text, config.cheerio) : cheerio.load(text);
};

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
    	if (cleanOrDirty === 'dirty' || cleanOrDirty === 'first-time') {
    		cleanOrDirty = 'clean';
			async.eachSeries(mahabhutaFuncs,
				function(mahafunc, next) {
					mahafunc($, metadata, setDirty, function(err) {
						if (err) next(err);
						else next();
					});
				},
				function(err) {
					if (err) done(err);
					else runMahaFuncs();
				});
		} else {
			done(undefined, $.html());
		}
	}
	runMahaFuncs();
};

exports.process1 = function(text, metadata, mahafunc, done) {
	exports.process(text, metadata, [ mahafunc ], done);
};