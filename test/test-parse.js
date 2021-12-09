
const fsp = require('fs').promises;
const { assert } = require('chai');

const mahabhuta = require('../index');

describe('properly handle custom tags', function() {

    let sample;
    it('should read sample1.html', async function() {
        sample =  await fsp.readFile('./docs/sample1.html', 'utf8');
    });

    let $;
    it('should parse sample text', function() {
        mahabhuta.config({
            // For cheerio rc.10 this undocumented flag is
            // required to handle the custom tags in
            // the sample HTML
            _useHtmlParser2: true
        });
        $ = mahabhuta.parse(sample);
    });

    it('should find custom tags', function() {
        assert.equal($('head funky-bump').length, 1);
        assert.equal($('head ak-stylesheets').length, 1);
        assert.equal($('head xml-sitemap').length, 2);
        assert.equal($('head show-content').length, 0);
        assert.equal($('body show-content').length, 4);
    });

    it('should be okay after serialization', function() {
        const txt = $.html();
        let $$ = mahabhuta.parse(txt);
        assert.equal($$('head funky-bump').length, 1);
        assert.equal($$('head ak-stylesheets').length, 1);
        assert.equal($$('head xml-sitemap').length, 2);
        assert.equal($$('head show-content').length, 0);
        assert.equal($$('body show-content').length, 4);
    });
});
