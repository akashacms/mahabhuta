# AGENTS.md - Mahabhuta

## Project Overview

Mahabhuta is a server-side DOM processing engine for Node.js that wraps [Cheerio](https://www.npmjs.com/package/cheerio) to provide jQuery-like HTML manipulation. It allows defining custom HTML-like tags (e.g., `<embed-video>`, `<site-verification>`) that are transformed into real HTML during processing.

Mahabhuta is an engine for DOM-processing using the jQuery-like API provided by Cheerio.  HTML is provided to Mahabhuta, which uses Cheerio to parse it into a DOM, it then runs a bunch of manipulation functions where the jQuery-like does manipulation, and at the end the DOM is converted back into HTML.

Part of the [AkashaCMS](https://akashacms.com/) ecosystem.

## Repository Structure

```
mahabhuta/
├── lib/                    # Core TypeScript source (compiles to dist/)
│   ├── index.ts            # Main entry point, exports, process functions
│   ├── Mahafunc.ts         # Base class for processor functions
│   ├── CustomElement.ts    # For custom tags that get replaced
│   ├── Munger.ts           # For modifying elements in-place
│   ├── PageProcessor.ts    # For processing entire pages
│   ├── ElementTweaker.ts   # Element processor variant
│   ├── MahafuncArray.ts    # Container for multiple Mahafuncs
│   └── cli.ts              # Command-line interface
├── maha/                   # Built-in Mahafunc implementations
│   ├── partial.js          # <partial> tag for template includes
│   └── metadata.js         # Metadata tags (site-verification, dns-prefetch, etc.)
├── test/                   # Test suite (Mocha/Chai)
│   ├── docs/               # Test HTML files
│   ├── partials1/          # Test partial templates
│   └── *.js                # Test files
├── examples/               # Example implementations
├── guide/                  # Documentation source files
└── dist/                   # Compiled JavaScript output (generated)
```

## Core Architecture

### Class Hierarchy

```
Mahafunc (base class)
├── CustomElement  - Replaces custom tags with HTML output
├── Munger         - Modifies existing elements, has access to full document
├── PageProcessor  - Processes entire page at once
└── ElementTweaker - Element modification variant

MahafuncArray      - Container that executes Mahafuncs in sequence
```

### Mahafuncs

The Mahafunc object, a.k.a. _Mahabhuta Function_, contains one type of DOM manipulation.  There are several Mahafunc subclasses for different purposes.  For each Mahafunc subclass, the `process` method is invoked to perform the DOM manipulation.  The bult-in Mahafunc subclasses are:

* _CustomElement_ - Replaces a custom HTML element with other HTML.
* _Munger_ - Access to anything on the page, can change anything.
* _function_ - Left-over for compatibility with older Mahabhuta versions that simply used functions
* The code also includes _ElementTweaker_ and _PageProcessor_ but it's not clear what these are for


### MahafuncArrays

The MahafuncArray object contains two arrays of Mahafuncs, `_mahaarray_functions` and `_mahaarray_final_functions`.  These arrays are to be executed to perform the desired DOM processing.  The arrays may also contain MahafuncArray objects allowing nested Mahafunc lists.

For compatibility with older Mahabhuta releases, the code also supports a bare array holding Mahafuncs, in which case it forms an _inline_ MahafuncArray.


### Key Concepts

1. **Selector**: Each Mahafunc defines a CSS selector to match elements
2. **Process Function**: Handles matched elements, returns replacement HTML or modifies in-place
3. **Dirty Flag**: Functions call `setDirty()` when inserting content that needs further processing
4. **Processing Loop**: Continues until no function sets the dirty flag

### Processing Flow

An application loads Mahafuncs into Mahafunc arrays.  This is likely to be nested Mahafunc arrays.  For example, in AkashaCMS, each plugin provides its own Mahafunc array.

The application is likely to follow this sequence of operation:

* Render the document content area using a template, producing HTML
* Render the content area using a page layout template, producing HTML
* Process that HTML with Mahabhuta using a Mahafunc array
* Output the final HTML to a rendering destination

```
HTML Input → parse() → Cheerio $ object
                ↓
         MahafuncArray.process()
                ↓
         For each Mahafunc:
           - findElements() using selector
           - process() each element
           - Replace or modify element
                ↓
         Repeat if dirty flag set
                ↓
         $.html() → HTML Output
```

## Development

### Build

```bash
npm run build:lib    # Compiles TypeScript to dist/
```

### Test

```bash
cd test
npm install
npm test
```

### Key Files to Understand

1. `lib/index.ts` - Start here for the main API (`process`, `processAsync`, `parse`)
2. `lib/MahafuncArray.ts` - Execution engine that runs Mahafuncs
3. `lib/CustomElement.ts` - Most common Mahafunc type for custom tags
4. `maha/partial.js` - Example of a real Mahafunc implementation

## Creating Mahafuncs

### CustomElement (most common)

```javascript
class MyTag extends mahabhuta.CustomElement {
    get elementName() { return "my-tag"; }
    
    async process($element, metadata, setDirty) {
        const attr = $element.attr("some-attr");
        // Return HTML to replace the element
        return `<div class="my-tag">${attr}</div>`;
    }
}
```

### Munger (modify in-place)

```javascript
class ModifyLinks extends mahabhuta.Munger {
    get selector() { return "a.external"; }
    
    async process($, $element, metadata, setDirty) {
        // Has access to full document ($) and element
        $element.attr("target", "_blank");
        // No return - modifies in place
    }
}
```

### PageProcessor (full page access)

```javascript
class ProcessPage extends mahabhuta.PageProcessor {
    async process($, metadata, setDirty) {
        // Process entire document
        $("img").each((i, el) => {
            // ...
        });
    }
}
```

### Registering Mahafuncs

```javascript
module.exports.mahabhutaArray = function(options) {
    let ret = new mahabhuta.MahafuncArray("my-plugin", options);
    ret.addMahafunc(new MyTag())
       .addMahafunc(new ModifyLinks());
    return ret;
};
```

## CLI Usage

```bash
mahabhuta process input.html \
    -o output.html \
    -m ./mahafuncs.js \
    --config cheerio-config.yaml \
    --metadata metadata.yaml \
    --partials \
    --partials-dir ./partials
```

## Template Engine Support

The `<partial>` tag supports multiple template engines (peer dependencies):
- EJS (`.ejs`)
- Nunjucks (`.njk`)
- Liquid (`.liquid`)
- Handlebars (`.handlebars`)
- Plain HTML (`.html`, `.xhtml`)

## Configuration

### Cheerio Config

```javascript
mahabhuta.config({
    _useHtmlParser2: true,  // Required for custom tags
    // Other Cheerio options...
});
```

### Tracing

```javascript
mahabhuta.setTraceProcessing(true);  // Log processing steps
mahabhuta.setTracePerformance(true); // Log timing information
```

## Testing Guidelines

- Tests are in `test/` directory using Mocha and Chai
- Run from the test directory: `cd test && npm test`
- Test files follow pattern `test-*.js`
- Sample HTML documents are in `test/docs/`

## Common Patterns

### Accessing Options

```javascript
// In a Mahafunc:
const value = this.array.options.myOption;
```

### Calling setDirty

```javascript
// When your output contains custom tags that need processing:
async process($element, metadata, setDirty) {
    setDirty();  // Signal that output needs further processing
    return `<another-custom-tag>...</another-custom-tag>`;
}
```

### Using Data Attributes

```javascript
async process($element, metadata, setDirty) {
    const data = $element.data();  // Gets all data-* attributes
    const body = $element.html();  // Gets inner HTML
    // ...
}
```

## Dependencies

- **cheerio** - jQuery-like DOM manipulation
- **commander** - CLI argument parsing
- **Peer dependencies** (optional): ejs, handlebars, liquidjs, nunjucks, js-yaml
