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
│   ├── PerfDataStore.ts    # Performance measurement types and base class
│   ├── FilesystemPerfDataStore.ts  # Filesystem-based metrics storage
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
├── AI/Performance/         # Performance measurement documentation
│   ├── PERFORMANCE-MEASUREMENTS.md  # Feature specification
│   ├── PERFORMANCE-USAGE.md         # Usage guide
│   └── PERFORMANCE-PLAN.md          # Implementation tracking
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

### Processing HTML

```bash
mahabhuta process input.html \
    -o output.html \
    -m ./mahafuncs.js \
    --config cheerio-config.yaml \
    --metadata metadata.yaml \
    --partials \
    --partials-dir ./partials
```

### Performance Reports

```bash
# Generate performance reports from collected metrics
mahabhuta perf-report <type> --data-dir ./metrics

# Where <type> is one of:
#   total        - Top N by total time consumed
#   average      - Top N by average time per invocation
#   arrays       - Breakdown by MahafuncArray
#   distribution - Time distribution (min/max/median)
#   all          - All reports combined

# Additional options:
#   --format json    - Output as JSON instead of text
#   --top 10         - Limit to top 10 entries
#   --filter "name"  - Filter by array path pattern
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
```

For comprehensive performance measurement and analysis, see the [Performance Measurement](#performance-measurement) section below.

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

## Performance Measurement

Mahabhuta includes comprehensive performance measurement capabilities to help identify bottlenecks and optimize DOM processing.

### Overview

Performance measurement allows you to:
- Track execution time for individual Mahafuncs
- Track execution time for MahafuncArrays
- Analyze total, average, min, max, and median timing statistics
- Generate reports to identify performance bottlenecks
- Export data in JSON format for external analysis

**Key Feature**: When disabled, performance measurement has zero overhead - no hidden performance costs.

### Enabling Performance Measurement

Pass a `FilesystemPerfDataStore` instance to `processAsync()`:

```javascript
const mahabhuta = require('mahabhuta');
const { FilesystemPerfDataStore } = mahabhuta;

// Create a data store that saves metrics to ./metrics directory
const dataStore = new FilesystemPerfDataStore('./metrics');

// Process HTML with metrics collection enabled
const output = await mahabhuta.processAsync(
    htmlContent,
    metadata,
    mahafuncArrays,
    dataStore,           // Optional: enables metrics collection
    'my-document.html'   // Optional: document identifier
);
```

**Important**: When `dataStore` is not provided, metrics collection is completely disabled with zero performance overhead.

### Generating Reports

After collecting metrics, use the CLI to generate performance reports:

```bash
# Show top 20 Mahafuncs by total time consumed
npx mahabhuta perf-report total --data-dir ./metrics

# Show top 20 Mahafuncs by average time per invocation
npx mahabhuta perf-report average --data-dir ./metrics

# Show breakdown by MahafuncArray
npx mahabhuta perf-report arrays --data-dir ./metrics

# Show time distribution statistics (min/max/median)
npx mahabhuta perf-report distribution --data-dir ./metrics

# Show all reports combined
npx mahabhuta perf-report all --data-dir ./metrics

# Export as JSON for external analysis
npx mahabhuta perf-report all --data-dir ./metrics --format json > stats.json

# Filter to specific plugin
npx mahabhuta perf-report average --filter "plugin-name"

# Limit to top 10
npx mahabhuta perf-report total --top 10
```

### Report Types

1. **Total Time Report** - Identifies Mahafuncs with highest cumulative time
2. **Average Time Report** - Identifies slowest Mahafuncs per execution
3. **Arrays Report** - Shows time consumed by each MahafuncArray
4. **Distribution Report** - Shows min/max/median timing variability

### Example Report Output

```
=== Mahabhuta Performance Report ===

Documents processed: 150
Total processing time: 4523.45ms
Average per document: 30.16ms

--- Top 20 Mahafuncs by Total Time ---
  master > akashacms-builtin
    AkStylesheets (ak-stylesheets):
    423.12ms total, 150 calls

--- By MahafuncArray ---
  master > akashacms-builtin:
    1842.30ms total, 12.28ms avg, 150 calls
```

### Performance Characteristics

**Measured Overhead** (from test suite):
- With metrics enabled: 3-7% overhead
- With metrics disabled: ~0% overhead (true zero impact)
- Processing time: Typical 20-70ms per document

### Programmatic Access

Access metrics programmatically for custom analysis:

```javascript
const dataStore = new FilesystemPerfDataStore('./metrics');

// Get aggregated statistics
const stats = await dataStore.getAggregatedStats();

console.log(`Processed ${stats.documentCount} documents`);
console.log(`Average time: ${stats.avgProcessingMs.toFixed(2)}ms`);

// Find slowest Mahafunc
const slowest = stats.byMahafunc
    .sort((a, b) => b.totalDurationMs - a.totalDurationMs)[0];
console.log(`Slowest: ${slowest.className} - ${slowest.totalDurationMs.toFixed(2)}ms total`);

// Get all raw metrics
const allMetrics = await dataStore.getAllMetrics();

// Clear metrics when done
await dataStore.clear();
```

### Data Structure

Each document processing creates metrics with:
- **Full array path tracking** - E.g., `["master", "akashacms-builtin", "nested-plugin"]`
- **Mahafunc class names** - E.g., `SiteVerification`, `OpenGraphMunger`
- **Timing data** - Using high-precision `performance.now()`
- **Statistics** - min, max, median, avg, total time, invocation count

### Best Practices

**During Development:**
- Enable metrics for representative document samples
- Focus on outliers (high average or max times)
- Use distribution reports to identify inconsistent performance
- Filter reports to drill down into specific plugins

**In Production:**
- Keep metrics disabled unless debugging specific issues
- Enable selectively for problem documents using documentId
- Clear old metrics periodically to manage disk space

**Optimization Workflow:**
1. Run processing with metrics enabled
2. Generate "total" and "average" reports
3. Identify top 5-10 bottlenecks
4. Use "distribution" report to understand variability
5. Optimize identified Mahafuncs
6. Re-measure to verify improvements

### Implementation Notes

- **Zero overhead design**: Guard clauses ensure no performance impact when disabled
- **Backward compatible**: All new parameters are optional
- **High precision**: Uses `performance.now()` for microsecond-level timing
- **Nested array tracking**: Full path through nested MahafuncArrays
- **Flexible storage**: Abstract `PerfDataStore` allows custom implementations

### Documentation

For complete details, see:
- **[AI/Performance/PERFORMANCE-USAGE.md](./AI/Performance/PERFORMANCE-USAGE.md)** - Comprehensive usage guide
- **[AI/Performance/PERFORMANCE-MEASUREMENTS.md](./AI/Performance/PERFORMANCE-MEASUREMENTS.md)** - Feature specification
- **[AI/Performance/PERFORMANCE-PLAN.md](./AI/Performance/PERFORMANCE-PLAN.md)** - Implementation details

## Dependencies

- **cheerio** - jQuery-like DOM manipulation
- **commander** - CLI argument parsing
- **Peer dependencies** (optional): ejs, handlebars, liquidjs, nunjucks, js-yaml
