
const { assert } = require('chai');

const mahabhuta = require('../dist/index');
const mahaPartial = require('../maha/partial');

describe('render using templates', function() {
    it('should configure mahaPartial', function() {
        mahaPartial.configuration.partialDirs.push('partials1');
    });

    it('should process test1.ejs template', async function() {

        const result = await mahabhuta.processAsync(`
        <header>Head of the page</header>
        
        <partial file-name="test1.ejs"></partial>
        
        <footer>Bottom of the page</footer>
        `, {
            hello: "Hello, World!",
            middle: "A paragraph for the middle of somewhere.",
            helloFunction: () => {
                return "Hello, Function!";
            }
        }, [
            mahaPartial.mahabhutaArray({ })
        ]);

        assert.include(result, 'Hello, World!');
        assert.include(result, 'Head of the page');
        assert.include(result, 'A paragraph for the middle of somewhere.');
        // assert.include(result, 'Hello, Function!');
        assert.include(result, 'Bottom of the page');
    });


    it('should process test1.njk template', async function() {

        const result = await mahabhuta.processAsync(`
        <header>Head of the page</header>
        
        <partial file-name="test1.njk"></partial>
        
        <footer>Bottom of the page</footer>
        `, {
            hello: "Hello, World!",
            middle: "A paragraph for the middle of somewhere.",
            helloFunction: () => {
                return "Hello, Function!";
            }
        }, [
            mahaPartial.mahabhutaArray({ })
        ]);

        assert.include(result, 'Hello, World!');
        assert.include(result, 'Head of the page');
        assert.include(result, 'A paragraph for the middle of somewhere.');
        // assert.include(result, 'Hello, Function!');
        assert.include(result, 'Bottom of the page');
    });

    it('should process test1.handlebars template', async function() {

        const result = await mahabhuta.processAsync(`
        <header>Head of the page</header>
        
        <partial file-name="test1.handlebars"></partial>
        
        <footer>Bottom of the page</footer>
        `, {
            hello: "Hello, World!",
            middle: "A paragraph for the middle of somewhere.",
            helloFunction: () => {
                return "Hello, Function!";
            }
        }, [
            mahaPartial.mahabhutaArray({ })
        ]);

        assert.include(result, 'Hello, World!');
        assert.include(result, 'Head of the page');
        assert.include(result, 'A paragraph for the middle of somewhere.');
        // Handlebars doesn't support calling functions
        // assert.include(result, 'Hello, Function!');
        assert.include(result, 'Bottom of the page');
    });

    it('should process test1.liquid template', async function() {

        const result = await mahabhuta.processAsync(`
        <header>Head of the page</header>
        
        <partial file-name="test1.liquid"></partial>
        
        <footer>Bottom of the page</footer>
        `, {
            hello: "Hello, World!",
            middle: "A paragraph for the middle of somewhere.",
            helloFunction: () => {
                return "Hello, Function!";
            }
        }, [
            mahaPartial.mahabhutaArray({ })
        ]);

        assert.include(result, 'Hello, World!');
        assert.include(result, 'Head of the page');
        assert.include(result, 'A paragraph for the middle of somewhere.');
        // Handlebars doesn't support calling functions
        // assert.include(result, 'Hello, Function!');
        assert.include(result, 'Bottom of the page');
    });
});
