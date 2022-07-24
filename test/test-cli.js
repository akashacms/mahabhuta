
const mahabhuta = require('../dist/index');
const { assert } = require('chai');
const shell = require('shelljs');
const packageJSON = require('../package.json');

async function awaitCMD(cmd) {
    return new Promise((resolve, reject) => {
        shell.exec(cmd, { silent: true }, (code, stdout, stderr) => {
            if (code !== 0) {
                reject(new Error(`Process exited with non-zero exit code ${code}`));
            }
            if (stderr && stderr.length > 0) {
                reject(new Error(`Command had error output ${stderr}`));
            }
            resolve(stdout);
        });
    });
}

// This only affects the Mahabhuta/Cheerio config in the test script,
// so that we can use mahabhuta.parse to inspect the HTML.
// The Mahabhuta/Cheerio config for the test process is
// to be set on the command line
mahabhuta.config({
    // For cheerio rc.10 this undocumented flag is
    // required to handle the custom tags in
    // the sample HTML
    _useHtmlParser2: true,
    recognizeSelfClosing: true,
    recognizeCDATA: true
});

describe('Process version', function() {
    it('Should output correct package version', async function() {
        const stdout = await awaitCMD('node ../dist/cli.js --version');
        if (stdout.trim() !== packageJSON.version) {
            reject(new Error(`Command version ${stdout} !== ${packageJSON.version}`));
        }
    });
});

describe('Tag processing', function() {
    it('Should handle metadata tags', async function() {
        const stdout = await awaitCMD(`node ../dist/cli.js process docs/sample1.html --config ${process.cwd()}/config-cheerio.yaml -m ../maha/metadata.js`);
        const html = stdout.trim();

        // console.log(`after processing`, html);

        let $;
        $ = mahabhuta.parse(html);

        // console.log(`parsed HTML`, $.html());


        assert.equal($('head meta[name=foo]').length, 1,
                                'meta foo length 1');
        assert.equal($('head meta[name=foo]').attr('content'), 'bar',
                                'meta foo content bar');

        assert.equal($('head funky-bump').length, 1,
                                'funky-bump 1');
        assert.equal($('head ak-stylesheets').length, 1,
                                'ak-stylesheets 1');
        assert.equal($('head ak-headerjavascript').length, 1,
                                'ak-headerJS 1');
        assert.equal($('body ak-footerjavascript').length, 1,
                                'ak-footerJS 1');

        assert.equal($('rss-header-meta').length, 0,
                                'rss-header-meta 0');
        assert.equal($('head link[rel=alternate]').length, 1,
                                'rel=alternative 1');
        assert.equal($('head link[rel=alternate]').attr('type'),
                                'application/rss+xml',
                                'alternative type application/rss+xml');
        assert.equal($('head link[rel=alternate]').attr('href'),
                                '/rss-for-header.xml',
                                'alternative href');

        assert.equal($('external-stylesheet').length, 0,
                                'external-stylesheet length 0');
        assert.equal($('head link[rel=stylesheet]').length, 1,
                                'head link stylesheet 1');
        assert.equal($('head link[rel=stylesheet]').attr('type'), 'text/css',
                                'head link stylesheet type text/css');
        assert.equal($('head link[rel=stylesheet]').attr('href'),
                                'http://external.site/foo.css',
                                'head link stylesheet external');

        assert.equal($('dns-prefetch').length, 0,
                                'dns-prefetch length 0');
        assert.equal($('head meta[http-equiv=x-dns-prefetch-control]').length, 1,
                                'meta x-dns-prefetch-control 1');
        assert.equal($('head meta[http-equiv=x-dns-prefetch-control]').attr('content'),
                                "we must have control",
                                'meta x-dns-prefetch-control must have control');

        assert.equal($('head link[rel=dns-prefetch]').length, 3,
                                'meta dns-prefetch 3');
        const isGoodPrefetch = (href) => {
            return href === 'foo1.com'
                || href === 'foo2.com'
                || href === 'foo3.com';
        };
        for (let elm of $('head link[rel=dns-prefetch]')) {
            assert.isOk(isGoodPrefetch($(elm).attr('href')),
                                'is good prefetch');
        }

        assert.equal($('site-verification').length, 0,
                                'site-verification 0');
        assert.equal($('head meta[name=google-site-verification]').length, 1,
                                'google-site-verification 1');
        assert.equal($('head meta[name=google-site-verification]').attr('content'),
                                "We are good",
                                'google-site-verification we are good');

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

        assert.equal($('body-add-class').length, 0);
        assert.isOk($('body').hasClass('saw-body-add-class'));
    });

    it('Should handle <partial> tags', async function() {

        const stdout = await awaitCMD(`node ../dist/cli.js process docs/dopartial.html --config ${process.cwd()}/config-cheerio.yaml --partials --partials-dir ${process.cwd()}/partials1 --metadata ${process.cwd()}/config-metadata-partials.yaml -m ../maha/metadata.js`);
        const html = stdout.trim();

        // console.log(html);

        let $;
        $ = mahabhuta.parse(html);

        assert.include($('head title').html(), 'Partials Title');
        assert.include($('body h1').html(), 'Partials Title');

        assert.include($('body #ejs .hello').html(), 'Hello, world');
        assert.include($('body #ejs .middle').html(), 'Middle World');

        assert.include($('body #handlebars .hello').html(), 'Hello, world');
        assert.include($('body #handlebars .middle').html(), 'Middle World');

        assert.include($('body #liquid .hello').html(), 'Hello, world');
        assert.include($('body #liquid .middle').html(), 'Middle World');

        assert.include($('body #njk .hello').html(), 'Hello, world');
        assert.include($('body #njk .middle').html(), 'Middle World');
    });

    it('Should handle <funky-bump> custom tag', async function() {

        const stdout = await awaitCMD(`node ../dist/cli.js process docs/sample1.html --config ${process.cwd()}/config-cheerio.yaml --partials --partials-dir ${process.cwd()}/partials1 --metadata ${process.cwd()}/config-metadata-partials.yaml -m ${process.cwd()}/../maha/metadata.js -m ${process.cwd()}/mahafuncs/array1.js`);
        const html = stdout.trim();

        // console.log(html);

        let $;
        $ = mahabhuta.parse(html);

        assert.include($('head .funky-bump').html(), 'Do the funky bump');
    });

    it('Should handle <show-options> custom tag', async function() {

        const stdout = await awaitCMD(`node ../dist/cli.js process docs/show-options.html --config ${process.cwd()}/config-cheerio.yaml --partials --partials-dir ${process.cwd()}/partials1 --metadata ${process.cwd()}/config-metadata-partials.yaml -m ${process.cwd()}/../maha/metadata.js -m ${process.cwd()}/mahafuncs/array1.js --options ${process.cwd()}/config-options-partials.yaml --trace-processing`);
        const html = stdout.trim();

        // console.log(html);

        let $;
        $ = mahabhuta.parse(html);

        assert.include($('head title').html(), 'Partials Title');
        assert.include($('body h1').html(), 'Partials Title');

        assert.equal($('body #show-options table').length, 1);
        assert.equal($('body #show-options table tr').length, 3);

        assert.equal($('body #show-options table tr:nth-child(1) td:nth-child(1)').html(),
                    'option1');
        assert.equal($('body #show-options table tr:nth-child(1) td:nth-child(2)').html(),
                    'Value 1');
        
        assert.equal($('body #show-options table tr:nth-child(2) td:nth-child(1)').html(),
                    'option2');
        assert.equal($('body #show-options table tr:nth-child(2) td:nth-child(2)').html(),
                    'true');
        
        assert.equal($('body #show-options table tr:nth-child(3) td:nth-child(1)').html(),
                    'option3');
        assert.equal($('body #show-options table tr:nth-child(3) td:nth-child(2)').html(),
                    '123.45');
    });
    
});
