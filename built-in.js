'use strict';

const mahabhuta = require('./index');

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
            /* var $ret = mahabhuta.parse('<link rel="sitemap" type="text/css"/>');
            $ret("link")
                .attr('title', 'Sitemap')
                .attr('href', $element.attr('href'));
            resolve($ret.html()); */
        });
    }
}

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

class RSSHeaderMeta extends mahabhuta.Munger {
	get selector() { return "rss-header-meta"; }

	process($, $link, metadata, dirty, done) {
        return new Promise((resolve, reject) => {
            var href = $link.attr('href');
            if (!href) {
                return reject(new Error("No href in rss-header-meta tag"));
            }
            var $ret = mahabhuta.parse('<link/>');
            $ret("link")
                .attr('rel', 'alternate')
                .attr('type', 'application/rss+xml')
                .attr('href', href);

            $('head').append($ret.html());
            $link.remove();
            resolve();
        });
    }
}

module.exports = [
    new SiteVerification(),
    new DNSPrefetch(),
    new XMLSitemap(),
    new ExternalStylesheet(),
    new RSSHeaderMeta()
];

// JavaScript script tags

// some metadata like rel=canonical

// ograph && twitter cards

// bootstrap-specific -- responsive embed support

// is there a way to implement `partial` here?
