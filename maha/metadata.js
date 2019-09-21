'use strict';

const url = require('url');
const path = require('path');
const mahabhuta = require('../index');

// TODO JavaScript script tags
// TODO some metadata like rel=canonical
// TODO ograph && twitter cards
// TODO bootstrap-specific -- responsive embed support

const pluginName = "mahabhuta metadata built-in";

class SiteVerification extends mahabhuta.CustomElement {
	get elementName() { return "site-verification"; }
	async process($element, metadata, dirty) {
        var ret = '';
        var google = $element.attr('google');
        if (google) {
            ret += `<meta name="google-site-verification" content="${google}"/>`;
        }
        // TBD site verification for other services
        return ret;
    }
}

class DNSPrefetch extends mahabhuta.CustomElement {
	get elementName() { return "dns-prefetch"; }
	async process($element, metadata, dirty) {
        var control = $element.attr("control");
        var dnslist = $element.attr("dnslist");
        if (!control && !dnslist) {
            throw new Error("No control and no dnslist parameters");
        }
        if (!dnslist) {
            throw new Error("No dnslist parameters");
        }
        var dns = dnslist.split(',');

        var ret = '';

        if (control) {
            ret += `<meta http-equiv="x-dns-prefetch-control" content="${control}"/>`;
        }
        dns.forEach(item => { ret += `<link rel="dns-prefetch" href="${item}"/>`; });

        return ret;
    }
}

class XMLSitemap extends mahabhuta.CustomElement {
    get elementName() { return "xml-sitemap"; }
    async process($element, metadata, dirty) {
        // http://microformats.org/wiki/rel-sitemap
        var href = $element.attr("href");
        if (!href) href = "/sitemap.xml";

        // If a root_url is set we need to override the sitemap href
        if (this.array.options.root_url) {
            let pRootUrl = url.parse(this.array.options.root_url);
            href = path.normalize(
                    path.join(pRootUrl.pathname, href)
            );
        }
        var title = $element.attr("title");
        if (!title) {
            if (this.array.options.sitemap_title) {
                title = this.array.options.sitemap_title;
            } else {
                title = "Sitemap";
            }
        }
        return `<link rel="sitemap" type="application/xml" title="${title}" href="${href}" />`;
    }
}

class ExternalStylesheet extends mahabhuta.CustomElement {
    get elementName() { return "external-stylesheet"; }
    async process($element, metadata, dirty) {
        var href = $element.attr('href');
        if (!href) throw new Error("No href supplied");
        var media = $element.attr('media');
        if (media) {
            return `<link rel="stylesheet" type="text/css" href="${href}" media="${media}"/>`;
        } else {
            return `<link rel="stylesheet" type="text/css" href="${href}"/>`;
        }
    }
}

class RSSHeaderMeta extends mahabhuta.Munger {
    get selector() { return "rss-header-meta"; }

    async process($, $link, metadata, dirty) {
        if ($('html head').get(0)) {
            var href = $link.attr('href');
            if (!href) {
                throw new Error("No href in rss-header-meta tag");
            }
            if (this.array.options.root_url) {
                let pRootUrl = url.parse(this.array.options.root_url);
                href = path.normalize(
                        path.join(pRootUrl.pathname, href)
                );
            }
            $('head').append(`<link rel="alternate" type="application/rss+xml" href="${href}"/>`);
            $link.remove();
        }
    }
}

class BodyAddClass extends mahabhuta.Munger {
    get selector() { return "body-add-class"; }
    async process($, $link, metadata, dirty, done) {
        if ($('html body').get(0)) {
            var clazz = $link.attr('class');
            if (!clazz) {
                throw new Error("No class in body-add-class tag");
            }
            if (!$('html body').hasClass(clazz)) {
                $('html body').addClass(clazz);
            }
            $link.remove();
        }
    }
}

module.exports.mahabhutaArray = function(options) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new SiteVerification())
        .addMahafunc(new DNSPrefetch())
        .addMahafunc(new XMLSitemap())
        .addMahafunc(new ExternalStylesheet())
        .addMahafunc(new RSSHeaderMeta())
        .addMahafunc(new BodyAddClass());
    return ret;
};

