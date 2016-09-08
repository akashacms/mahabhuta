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
                resolve(`<link rel="stylesheet" type="application/xml" href="${href}" media="${media}"/>`);
            } else {
                resolve(`<link rel="stylesheet" type="application/xml" href="${href}"/>`);
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

module.exports.configuration = {};

// JavaScript script tags

// some metadata like rel=canonical

// ograph && twitter cards

// bootstrap-specific -- responsive embed support

// is there a way to implement `partial` here?
