'use strict';

const mahabhuta = require('./index');

exports.mahabhuta = new mahabhuta.MahafuncArray("mahabhuta built-in", {});

class SiteVerification extends mahabhuta.CustomElement {
	get elementName() { return "site-verification"; }
	process($element, metadata, dirty) {
        return new Promise((resolve, reject) => {
            var ret = '';
            var google = $element.attr('google');
            if (google) {
                ret += `<meta name="google-site-verification" content="${google}"/>`;
            }
            // TBD site verification for other services
            resolve(ret);
        });
    }
}
exports.mahabhuta.addMahafunc(new SiteVerification());

class DNSPrefetch extends mahabhuta.CustomElement {
	get elementName() { return "dns-prefetch"; }
	process($element, metadata, dirty) {
        return new Promise((resolve, reject) => {
            var control = $element.attr("control");
            var dnslist = $element.attr("dnslist");
            if (!control && !dnslist) {
                return reject(new Error("No control and no dnslist parameters"));
            }
            if (!dnslist) {
                return reject(new Error("No dnslist parameters"));
            }
            var dns = dnslist.split(',');

            var ret = '';

            if (control) {
                ret += `<meta http-equiv="x-dns-prefetch-control" content="${control}"/>`;
            }
            dns.forEach(item => { ret += `<link rel="dns-prefetch" href="${item}"/>`; });

            resolve(ret);
        });
    }
}
exports.mahabhuta.addMahafunc(new DNSPrefetch());

class XMLSitemap extends mahabhuta.CustomElement {
	get elementName() { return "xml-sitemap"; }
	process($element, metadata, dirty) {
        return new Promise((resolve, reject) => {
            // http://microformats.org/wiki/rel-sitemap
    		var href = $element.attr("href");
    		if (!href) href = "/sitemap.xml";
    		var title = $element.attr("title");
    		if (!title) title = "Sitemap";
    		resolve(`<link rel="sitemap" type="application/xml" title="${title}" href="${href}" />`);
        });
    }
}
exports.mahabhuta.addMahafunc(new XMLSitemap());

class ExternalStylesheet extends mahabhuta.CustomElement {
	get elementName() { return "external-stylesheet"; }
	process($element, metadata, dirty) {
        return new Promise((resolve, reject) => {
            var href = $element.attr('href');
            if (!href) return reject(new Error("No href supplied"));
            var media = $element.attr('media');
            if (media) {
                resolve(`<link rel="stylesheet" type="text/css" href="${href}" media="${media}"/>`);
            } else {
                resolve(`<link rel="stylesheet" type="text/css" href="${href}"/>`);
            }
        });
    }
}
exports.mahabhuta.addMahafunc(new ExternalStylesheet());

class RSSHeaderMeta extends mahabhuta.Munger {
	get selector() { return "rss-header-meta"; }

	process($, $link, metadata, dirty, done) {
        if ($('html head').get(0)) {
            return new Promise((resolve, reject) => {
                var href = $link.attr('href');
                if (!href) {
                    return reject(new Error("No href in rss-header-meta tag"));
                }
                $('head').append(`<link rel="alternate" type="application/rss+xml" href="${href}"/>`);
                $link.remove();
                resolve();
            });
        } else return Promise.resolve();
    }
}
exports.mahabhuta.addMahafunc(new RSSHeaderMeta());

class BodyAddClass extends mahabhuta.Munger {
	get selector() { return "body-add-class"; }
	process($, $link, metadata, dirty, done) {
        if ($('html body').get(0)) {
            return new Promise((resolve, reject) => {
				var clazz = $link.attr('class');
				if (!clazz) {
					return reject(new Error("No class in body-add-class tag"));
				}
				if (!$('html body').hasClass(clazz)) {
					$('html body').addClass(clazz);
				}
				$link.remove();
				resolve();
			});
	    } else return Promise.resolve();
	}
}
exports.mahabhuta.addMahafunc(new BodyAddClass());


class Partial extends mahabhuta.CustomElement {
	get elementName() { return "partial"; }
	process($element, metadata, dirty) {
        return new Promise((resolve, reject) => {

            var data  = $element.data();
    		var fname = $element.attr("file-name");
    		var txt   = $element.html();

            var d = {};
            for (var mprop in metadata) { d[mprop] = metadata[mprop]; }
    		var data = $element.data();
    		for (var dprop in data) { d[dprop] = data[dprop]; }
    		d["partialBody"] = txt;

            // find the partial
            // render the partial using the data provided

            if (module.exports.configuration.renderPartial) {
                dirty();
                resolve({ fname, body: txt, data: d});
            } else {
                reject(new Error(`CONFIGURATION ERROR: Unable to render partial ${fname}`));
            }
        })
        .then(context => {
            return module.exports.configuration.renderPartial(context.fname, context.body, context.data);
        })/*
		.then(rendered => {
			console.log(`partial got rendered ${rendered}`);
			return rendered;
		})*/;
    }
}
exports.mahabhuta.addMahafunc(new Partial());

module.exports.configuration = {};

// JavaScript script tags

// some metadata like rel=canonical

// ograph && twitter cards

// bootstrap-specific -- responsive embed support
