
const fsp = require('fs').promises;
const { assert } = require('chai');

const mahabhuta = require('../index');
const mahaPartial = require('../maha/partial');
const mahaMeta = require('../maha/metadata');

describe('process custom tags', function() {

    let sample;
    it('should read sample1.html', async function() {
        sample =  await fsp.readFile('./docs/sample1.html', 'utf8');
    });

    let result;
    it('should process sample text', async function() {

        result = await mahabhuta.processAsync(sample, {
            // Metadata
        }, [
            mahaPartial.mahabhutaArray({ }),
            mahaMeta.mahabhutaArray({ })
        ]);


    });

    it('should have result', function() {
        // console.log(result);
        assert.isOk(result);
        assert.typeOf(result, 'string');
    });

    it('should have good results', function() {
        let $;
        mahabhuta.config({
            // For cheerio rc.10 this undocumented flag is
            // required to handle the custom tags in
            // the sample HTML
            _useHtmlParser2: true
        });
        $ = mahabhuta.parse(result);
    
        assert.equal($('head meta[name=foo]').length, 1);
        assert.equal($('head meta[name=foo]').attr('content'), 'bar');

        assert.equal($('head funky-bump').length, 1);
        assert.equal($('head ak-stylesheets').length, 1);
        assert.equal($('head ak-headerjavascript').length, 1);
        assert.equal($('body ak-footerjavascript').length, 1);

        assert.equal($('rss-header-meta').length, 0);
        assert.equal($('head link[rel=alternate]').length, 1);
        assert.equal($('head link[rel=alternate]')
                    .attr('type'), 'application/rss+xml');
        assert.equal($('head link[rel=alternate]')
                    .attr('href'), '/rss-for-header.xml');

        assert.equal($('external-stylesheet').length, 0);
        assert.equal($('head link[rel=stylesheet]').length, 1);
        assert.equal($('head link[rel=stylesheet]').attr('type'), 'text/css');
        assert.equal($('head link[rel=stylesheet]').attr('href'), 'http://external.site/foo.css');

        assert.equal($('dns-prefetch').length, 0);
        assert.equal($('head meta[http-equiv=x-dns-prefetch-control]').length, 1);
        assert.equal($('head meta[http-equiv=x-dns-prefetch-control]')
                .attr('content'), "we must have control");

        assert.equal($('head link[rel=dns-prefetch]').length, 3);
        const isGoodPrefetch = (href) => {
            return href === 'foo1.com'
                || href === 'foo2.com'
                || href === 'foo3.com';
        };
        for (let elm of $('head link[rel=dns-prefetch]')) {
            assert.isOk(isGoodPrefetch($(elm).attr('href')));
        }

        assert.equal($('site-verification').length, 0);
        assert.equal($('head meta[name=google-site-verification]').length, 1);
        assert.equal($('head meta[name=google-site-verification]')
                .attr('content'), "We are good");

        const isGoodSitemapURL = (href) => {
            return href === '/sitemap.xml'
                || href === '/foo-bar-sitemap.xml';
        }
        assert.equal($('xml-sitemap').length, 0);
        assert.equal($('head link[rel=sitemap]').length, 2);
        for (let sm of $('head link[rel=sitemap]')) {
            assert.equal($(sm).attr('type'), 'application/xml');
            assert.isOk(isGoodSitemapURL($(sm).attr('href')));
        }
        
        assert.equal($('head show-content').length, 0);
        assert.equal($('body show-content').length, 4);
        assert.equal($('body section ak-teaser').length, 1);
        assert.equal($('body #duplicate ak-insert-body-content').length, 1);
    });
});
