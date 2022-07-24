
const mahabhuta = require('../dist/index');
const ejs       = require('ejs');
const nunjucks  = require('nunjucks');
const { Liquid } = require('liquidjs');
const Handlebars = require("handlebars");
const path      = require('path');
const util      = require('util');
const fs        = require('fs/promises');

const pluginName = "mahabhuta partials built-in";

class Partial extends mahabhuta.CustomElement {
    get elementName() { return "partial"; }
    async process($element, metadata, dirty) {
        const data  = $element.data();
        const fname = $element.attr("file-name");
        const body  = $element.html();

        const d = {};
        for (let mprop in metadata) { d[mprop] = metadata[mprop]; }
        // const data = $element.data();
        for (let dprop in data) { d[dprop] = data[dprop]; }
        d["partialBody"] = body;

        // console.log(`mahabhuta Partial partialBody=${d["partialBody"]}`);

        if ($element.attr("dirty")) dirty();

        let array = this.array;
        // console.log(`Partial array.options ${util.inspect(array.options)}`);
        return array.options.renderPartial
            ? array.options.renderPartial(fname, d, array.options)
            : module.exports.renderPartial(fname, d, array.options);
    }
}

async function lookForPartial(partialDirs, partialfn) {
    // console.log(`lookForPartial checking in ${partialDirs} for ${partialfn}`);
    for (let dir of partialDirs) {
        // console.log(`lookForPartial check ${dir} ${partialfn}`);
        let fn2check = path.join(dir, partialfn);
        let stats;
        try {
            stats = await fs.stat(fn2check);
        } catch (err) { console.error(err); stats = undefined; }
        if (stats && stats.isFile()) {
            return {
                basedir: dir,
                path: partialfn,
                fullpath: fn2check
            };
        }
    }
    return undefined;
}

module.exports.renderPartial = async function (fname, attrs, options) {
        
    let partialDirs;

    if (typeof options.partialDirs === 'undefined'
     || !options.partialDirs
     || options.partialDirs.length <= 0) {
        if (typeof exports.configuration.partialDirs !== 'undefined'
         && exports.configuration.partialDirs
         && Array.isArray(exports.configuration.partialDirs)
         && exports.configuration.partialDirs.length > 0) {
            partialDirs = exports.configuration.partialDirs;
        } else {
            partialDirs = [ __dirname ];
        }
    } else {
        partialDirs = options.partialDirs;
    }

    // console.log(`renderPartial looking for ${util.inspect(partialDirs)} ${fname}`);
    const partialFound = await lookForPartial(partialDirs, fname);
    if (!partialFound) throw new Error(`No partial found for ${fname} in ${util.inspect(partialDirs)}`);
    // console.log(`module.exports.configuration renderPartial ${util.inspect(partialFound)}`);

    var stats = await fs.stat(partialFound.fullpath);
    if (!stats.isFile()) {
        throw new Error(`doPartialAsync non-file found for ${fname} - ${partialFound.fullpath}`);
    }
    if (/\.ejs$/i.test(partialFound.fullpath)) {
        try {
            let partialText = await fs.readFile(partialFound.fullpath, 'utf8');
            // console.log(`EJS loaded partial ${fname} => ${partialText}`);
            let rendered = ejs.render(partialText, attrs); 
            // console.log(`EJS rendered ${fname} ==> ${rendered}`);
            return rendered;
        } catch (e) {
            throw new Error(`EJS rendering of ${fname} failed because of ${e}`);
        }
    } else if (/\.liquid$/i.test(partialFound.fullpath)) {
        try {
            let partialText = await fs.readFile(partialFound.fullpath, 'utf8');
            const engine    = new Liquid({
                partials: partialDirs,
                extname: '.liquid'
            });
            return await engine.parseAndRender(partialText, attrs);
        } catch (e) {
            throw new Error(`Liquid rendering of ${fname} failed because of ${e}`);
        }
    } else if (/\.njk$/i.test(partialFound.fullpath)) {
        try {
            let partialText = await fs.readFile(partialFound.fullpath, 'utf8'); 
            nunjucks.configure({ autoescape: false });
            return nunjucks.renderString(partialText, attrs);
        } catch (e) {
            throw new Error(`Nunjucks rendering of ${fname} failed because of ${e}`);
        }
    } else if (/\.handlebars$/i.test(partialFound.fullpath)) {
        try {
            let partialText = await fs.readFile(partialFound.fullpath, 'utf8'); 
            const template = Handlebars.compile(partialText);
            return template(attrs);
        } catch (e) {
            throw new Error(`Handlebars rendering of ${fname} failed because of ${e}`);
        }
    } else if (partialFound.fullpath.toLowerCase().endsWith('.html')
               || partialFound.fullpath.toLowerCase().endsWith('.xhtml')) {
        // NOTE: The partialBody gets lost in this case
        let partialText = await fs.readFile(partialFound.fullpath, 'utf8');
        // console.log(`renderPartial got text `, partialText);
        return partialText;
    } else {
        throw new Error(`No rendering support for ${fname}`);
    }
}

module.exports.configuration = {
    partialDirs: [], 

    // Replaceable function to handle rendering
    renderPartial: async function (fname, attrs) {
        
        let partialDirs;

        if (typeof module.exports.configuration.partialDirs === 'undefined'
         || !module.exports.configuration.partialDirs
         || module.exports.configuration.partialDirs.length <= 0) {
            partialDirs = [ __dirname ];
         } else {
            partialDirs = module.exports.configuration.partialDirs;
         }

        const partialFound = await lookForPartial(partialDirs, fname);
        if (!partialFound) throw new Error(`No partial found for ${fname} in ${util.inspect(partialDirs)}`);
        // console.log(`module.exports.configuration renderPartial ${partialFound}`);
    
        var partialFname = path.join(partialFound.basedir, partialFound.path);
        var stats = await fs.stat(partialFname);
        if (!stats.isFile()) {
            throw new Error(`doPartialAsync non-file found for ${fname} - ${partialFname}`);
        }
        var partialText = await fs.readFile(partialFname, 'utf8');
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
    }
};

module.exports.mahabhutaArray = function(options) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new Partial());
    return ret;
};


exports.mahabhuta = module.exports.mahabhutaArray({});

