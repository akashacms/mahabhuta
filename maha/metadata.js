'use strict';

const url = require('url');
const path = require('path');
// const util = require('util');
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
            let $ = mahabhuta.parse('<meta name="google-site-verification" content=""/>');
            $('meta').attr('content', google);
            ret += $.html();
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
            let $ = mahabhuta.parse('<meta name="x-dns-prefetch-control" content=""/>');
            $('meta').attr('content', control);
            ret += $.html();
        }
        dns.forEach(item => { 
            let $ = mahabhuta.parse('<link rel="dns-prefetch" href=""/>');
            $('link').attr('href', item);
            ret += $.html();
        });

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
        let $ = mahabhuta.parse('<link rel="sitemap" type="application/xml" href=""/>');
        $('link').attr('href', href);
        $('link').attr('title', title);
        return $.html();
    }
}

class ExternalStylesheet extends mahabhuta.CustomElement {
    get elementName() { return "external-stylesheet"; }
    async process($element, metadata, dirty) {
        var href = $element.attr('href');
        if (!href) throw new Error("No href supplied");
        var media = $element.attr('media');
        let $ = mahabhuta.parse('<link rel="stylesheet" type="text/css" href=""/>');
        $('link').attr('href', href);
        if (media) {
            $('link').attr('media', media);
        }
        return $.html();
    }
}

class RSSHeaderMeta extends mahabhuta.Munger {
    get selector() { return "rss-header-meta"; }
    get elementName() { return "rss-header-meta"; }

    async process($, $element, metadata, dirty) {
        if ($('html head').get(0)) {
            var href = $element.attr('href');
            if (!href) {
                throw new Error("No href in rss-header-meta tag");
            }
            if (this.array.options.root_url) {
                let pRootUrl = url.parse(this.array.options.root_url);
                href = path.normalize(
                        path.join(pRootUrl.pathname, href)
                );
            }
            let $link = mahabhuta.parse('<link rel="alternate" type="application/rss+xml" href=""/>');
            $link('link').attr('href', href);
            $('head').append($link.html());
            $element.remove();
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

