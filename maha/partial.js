'use strict';

const mahabhuta = require('../index');
const globfs    = require('globfs');
const co        = require('co');
const ejs       = require('ejs');
const path      = require('path');
const util      = require('util');
const fs        = require('fs-extra-promise');

exports.mahabhuta = new mahabhuta.MahafuncArray("mahabhuta partials built-in", {});

class Partial extends mahabhuta.CustomElement {
    get elementName() { return "partial"; }
    process($element, metadata, dirty) {
        return co(function* () {
            var data  = $element.data();
            var fname = $element.attr("file-name");
            var body  = $element.html();

            var d = {};
            for (var mprop in metadata) { d[mprop] = metadata[mprop]; }
            var data = $element.data();
            for (var dprop in data) { d[dprop] = data[dprop]; }
            d["partialBody"] = body;

            dirty();
            return exports.doPartialAsync(fname, d);

        });
    }
}
module.exports.mahabhuta.addMahafunc(new Partial());

module.exports.configuration = {};

module.exports.doPartialAsync = co.wrap(function* (fname, attrs) {

    // find the partial
    // render the partial using the data provided

    // TBD configuration for partialDirs
    // console.log(`doPartialAsync ${fname} ${util.inspect(attrs)} ${util.inspect(module.exports.configuration.partialDirs)}`);
    var partialFound = yield globfs.findAsync(module.exports.configuration.partialDirs, fname);
    // console.log(`doPartialAsync ${partialFound}`);
    if (!partialFound) throw new Error(`No partial directory found for ${fname}`);
    // Pick the first partial found
    partialFound = partialFound[0];

    var partialFname = path.join(partialFound.basedir, partialFound.path);
    // console.log(`doPartialAsync before reading ${partialFname}`);
    var stats = yield new Promise((resolve, reject) => {
        fs.stat(partialFname, (err, stats) => {
            if (err) reject(err);
            else resolve(stats);
        });
    });
    if (!stats.isFile()) {
        throw new Error(`doPartialAsync non-file found for ${fname} - ${partialFname}`);
    }
    var partialText = yield fs.readFileAsync(partialFname, 'utf8');
    // console.log(`doPartialAsync after reading ${partialFname} text length=${partialText.length}`);

    // TODO based on file extension render through a template engine
    // TODO Need support for a broader spectrum of template engines

    // dirty();
    if (/\.ejs$/i.test(partialFname)) {
        try { return ejs.render(partialText, attrs); } catch (e) {
            throw new Error(`EJS rendering of ${fname} failed because of ${e}`);
        }
    } else if (/\.html$/i.test(partialFname)) {
        // NOTE: The partialBody gets lost in this case
        return partialText;
    } else {
        throw new Error("No rendering support for ${fname}");
    }
});


module.exports.doPartialSync = function(fname, attrs) {
    var partialFound = globfs.findSync(module.exports.configuration.partialDirs, fname);
    if (!partialFound) throw new Error(`No partial directory found for ${fname}`);
    // Pick the first partial found
    partialFound = partialFound[0];

    // console.log(`doPartialSync found ${util.inspect(partialFound)} for ${util.inspect(module.exports.configuration.partialDirs)} ${fname}`);

    var partialFname = path.join(partialFound.basedir, partialFound.path);
    // console.log(`doPartialSync before reading ${partialFname}`);
    var stats = fs.statSync(partialFname);
    if (!stats.isFile()) {
        throw new Error(`doPartialSync non-file found for ${fname} - ${partialFname}`);
    }
    var partialText = fs.readFileSync(partialFname, 'utf8');

    // TODO based on file extension render through a template engine
    // TODO Need support for a broader spectrum of template engines

    // dirty();
    if (/\.ejs$/i.test(partialFname)) {
        try { return ejs.render(partialText, attrs); } catch (e) {
            throw new Error(`EJS rendering of ${fname} failed because of ${e}`);
        }
    } else if (/\.html$/i.test(partialFname)) {
        // NOTE: The partialBody gets lost in this case
        return partialText;
    } else {
        throw new Error("No rendering support for ${fname}");
    }
};
