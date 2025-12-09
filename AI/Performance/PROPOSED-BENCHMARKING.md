# Proposed Benchmarking System for Mahabhuta

This document outlines a proposed performance measurement system for Mahabhuta, building on the existing tracing infrastructure.

## Current State

Mahabhuta currently has basic performance tracing in `lib/index.ts`:

```typescript
let tracePerf = false;

export function setTracePerformance(_traceFlag: boolean): void {
    tracePerf = _traceFlag;
}

export function logPerformance(start: Date, text: string): void {
    if (!tracePerf) return;
    console.log(`${text} ${(new Date().getTime() - start.getTime()) / 1000} seconds`)
}
```

**Limitations:**
- Uses `Date` (millisecond precision only)
- Logs to console only (no structured data)
- No aggregation or analysis capability
- No tracking of element counts or dirty loop iterations

## Performance Measurement Approaches

### Option 1: `performance.now()` with Stored Measurements

```typescript
const start = performance.now();
await mahafunc.processAll($, metadata, dirty);
const elapsed = performance.now() - start;
// Store in data structure
```

**Pros:**
- High precision (microsecond resolution)
- You control exactly what gets measured
- Data can be aggregated, analyzed, exported
- Low overhead when disabled
- Already familiar from AkashaRender

**Cons:**
- Manual instrumentation required
- Need to design the data structure and reporting

### Option 2: Node.js Performance Hooks API (`perf_hooks`)

```typescript
const { performance, PerformanceObserver } = require('perf_hooks');

performance.mark('mahafunc-start');
await mahafunc.processAll($, metadata, dirty);
performance.mark('mahafunc-end');
performance.measure('mahafunc-execution', 'mahafunc-start', 'mahafunc-end');
```

**Pros:**
- Standardized API
- Built-in observer pattern for collecting measurements
- Integrates with APM tools
- Can measure across async boundaries

**Cons:**
- Slightly more verbose
- Mark/measure names need management

### Recommendation

The `performance.now()` approach is recommended. It's what the V8 team recommends for microbenchmarking, and it avoids the precision limitations of `Date`.

---

## Proposed Implementation

### Data Structures

```typescript
// lib/metrics.ts

/**
 * Timing data for a single Mahafunc execution
 */
export interface MahafuncTiming {
    /** Name of the containing MahafuncArray */
    arrayName: string;
    /** The class name of the Mahafunc subclass (e.g., "SiteVerification", "OpenGraphMunger") */
    className: string;
    /** Base type: 'CustomElement' | 'Munger' | 'PageProcessor' | 'MahafuncArray' | 'function' | 'inline-array' */
    mahafuncType: string;
    /** The selector or elementName used */
    selector: string;
    /** Number of elements that matched the selector */
    elementCount: number;
    /** Execution duration in milliseconds */
    durationMs: number;
    /** Timestamp when execution started */
    timestamp: number;
}

/**
 * Timing data for a MahafuncArray execution
 */
export interface ArrayTiming {
    /** Name of the MahafuncArray */
    arrayName: string;
    /** Total execution duration in milliseconds */
    durationMs: number;
    /** Number of Mahafuncs executed */
    mahafuncCount: number;
    /** Timestamp when execution started */
    timestamp: number;
}

/**
 * Complete metrics for a single processAsync() call
 */
export interface ProcessingMetrics {
    /** Total duration of processAsync() in milliseconds */
    totalDurationMs: number;
    /** How many times the dirty loop executed */
    dirtyLoopCount: number;
    /** Timings for each MahafuncArray execution */
    arrayTimings: ArrayTiming[];
    /** Timings for each individual Mahafunc execution */
    mahafuncTimings: MahafuncTiming[];
    /** Timestamp when processing started */
    timestamp: number;
    /** Optional identifier for the document being processed */
    documentId?: string;
}

/**
 * Aggregated statistics for analysis
 */
export interface AggregatedStats {
    /** Total documents processed */
    documentCount: number;
    /** Total processing time across all documents */
    totalProcessingMs: number;
    /** Average processing time per document */
    avgProcessingMs: number;
    /** Total dirty loop iterations */
    totalDirtyLoops: number;
    /** Average dirty loops per document */
    avgDirtyLoops: number;
    /** Per-Mahafunc statistics */
    byMahafunc: Map<string, {
        callCount: number;
        totalDurationMs: number;
        avgDurationMs: number;
        totalElements: number;
        avgElements: number;
    }>;
    /** Per-MahafuncArray statistics */
    byArray: Map<string, {
        callCount: number;
        totalDurationMs: number;
        avgDurationMs: number;
    }>;
}
```

### Metrics Collector Class

```typescript
// lib/metrics.ts

export class MetricsCollector {
    private enabled: boolean = false;
    private currentMetrics: ProcessingMetrics | null = null;
    private allMetrics: ProcessingMetrics[] = [];

    /**
     * Enable or disable metrics collection
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if metrics collection is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Start collecting metrics for a new document processing run
     */
    startProcessing(documentId?: string): void {
        if (!this.enabled) return;
        this.currentMetrics = {
            totalDurationMs: 0,
            dirtyLoopCount: 0,
            arrayTimings: [],
            mahafuncTimings: [],
            timestamp: performance.now(),
            documentId
        };
    }

    /**
     * Record completion of a dirty loop iteration
     */
    recordDirtyLoop(): void {
        if (!this.enabled || !this.currentMetrics) return;
        this.currentMetrics.dirtyLoopCount++;
    }

    /**
     * Record timing for a MahafuncArray execution
     */
    recordArrayTiming(timing: ArrayTiming): void {
        if (!this.enabled || !this.currentMetrics) return;
        this.currentMetrics.arrayTimings.push(timing);
    }

    /**
     * Record timing for a single Mahafunc execution
     */
    recordMahafuncTiming(timing: MahafuncTiming): void {
        if (!this.enabled || !this.currentMetrics) return;
        this.currentMetrics.mahafuncTimings.push(timing);
    }

    /**
     * Finish collecting metrics for the current document
     */
    finishProcessing(): ProcessingMetrics | null {
        if (!this.enabled || !this.currentMetrics) return null;
        
        this.currentMetrics.totalDurationMs = 
            performance.now() - this.currentMetrics.timestamp;
        
        const metrics = this.currentMetrics;
        this.allMetrics.push(metrics);
        this.currentMetrics = null;
        
        return metrics;
    }

    /**
     * Get all collected metrics
     */
    getAllMetrics(): ProcessingMetrics[] {
        return [...this.allMetrics];
    }

    /**
     * Clear all collected metrics
     */
    clear(): void {
        this.allMetrics = [];
        this.currentMetrics = null;
    }

    /**
     * Generate aggregated statistics from all collected metrics
     */
    getAggregatedStats(): AggregatedStats {
        const stats: AggregatedStats = {
            documentCount: this.allMetrics.length,
            totalProcessingMs: 0,
            avgProcessingMs: 0,
            totalDirtyLoops: 0,
            avgDirtyLoops: 0,
            byMahafunc: new Map(),
            byArray: new Map()
        };

        for (const metrics of this.allMetrics) {
            stats.totalProcessingMs += metrics.totalDurationMs;
            stats.totalDirtyLoops += metrics.dirtyLoopCount;

            // Aggregate by Mahafunc
            for (const timing of metrics.mahafuncTimings) {
                const key = `${timing.arrayName}:${timing.className}:${timing.selector}`;
                const existing = stats.byMahafunc.get(key) || {
                    callCount: 0,
                    totalDurationMs: 0,
                    avgDurationMs: 0,
                    totalElements: 0,
                    avgElements: 0
                };
                existing.callCount++;
                existing.totalDurationMs += timing.durationMs;
                existing.totalElements += timing.elementCount;
                stats.byMahafunc.set(key, existing);
            }

            // Aggregate by Array
            for (const timing of metrics.arrayTimings) {
                const existing = stats.byArray.get(timing.arrayName) || {
                    callCount: 0,
                    totalDurationMs: 0,
                    avgDurationMs: 0
                };
                existing.callCount++;
                existing.totalDurationMs += timing.durationMs;
                stats.byArray.set(timing.arrayName, existing);
            }
        }

        // Calculate averages
        if (stats.documentCount > 0) {
            stats.avgProcessingMs = stats.totalProcessingMs / stats.documentCount;
            stats.avgDirtyLoops = stats.totalDirtyLoops / stats.documentCount;
        }

        for (const [key, data] of stats.byMahafunc) {
            data.avgDurationMs = data.totalDurationMs / data.callCount;
            data.avgElements = data.totalElements / data.callCount;
        }

        for (const [key, data] of stats.byArray) {
            data.avgDurationMs = data.totalDurationMs / data.callCount;
        }

        return stats;
    }

    /**
     * Generate a human-readable report
     */
    generateReport(): string {
        const stats = this.getAggregatedStats();
        const lines: string[] = [];

        lines.push('=== Mahabhuta Performance Report ===\n');
        lines.push(`Documents processed: ${stats.documentCount}`);
        lines.push(`Total processing time: ${stats.totalProcessingMs.toFixed(2)}ms`);
        lines.push(`Average per document: ${stats.avgProcessingMs.toFixed(2)}ms`);
        lines.push(`Total dirty loops: ${stats.totalDirtyLoops}`);
        lines.push(`Average dirty loops per document: ${stats.avgDirtyLoops.toFixed(2)}`);

        lines.push('\n--- By MahafuncArray ---');
        const sortedArrays = [...stats.byArray.entries()]
            .sort((a, b) => b[1].totalDurationMs - a[1].totalDurationMs);
        for (const [name, data] of sortedArrays) {
            lines.push(`  ${name}: ${data.totalDurationMs.toFixed(2)}ms total, ${data.avgDurationMs.toFixed(2)}ms avg, ${data.callCount} calls`);
        }

        lines.push('\n--- By Mahafunc (top 20 by total time) ---');
        const sortedMahafuncs = [...stats.byMahafunc.entries()]
            .sort((a, b) => b[1].totalDurationMs - a[1].totalDurationMs)
            .slice(0, 20);
        for (const [key, data] of sortedMahafuncs) {
            // key format: "arrayName:className:selector"
            const [arrayName, className, selector] = key.split(':');
            lines.push(`  ${arrayName}:${className} (${selector}):`);
            lines.push(`    ${data.totalDurationMs.toFixed(2)}ms total, ${data.avgDurationMs.toFixed(2)}ms avg`);
            lines.push(`    ${data.callCount} calls, ${data.avgElements.toFixed(1)} elements avg`);
        }

        return lines.join('\n');
    }
}

// Global singleton instance
export const metrics = new MetricsCollector();
```

### Integration with index.ts

```typescript
// lib/index.ts (modified sections)

import { performance } from 'perf_hooks';
import { metrics, ProcessingMetrics } from './metrics';

// Re-export metrics functionality
export { metrics, MetricsCollector, ProcessingMetrics, AggregatedStats } from './metrics';

/**
 * Enable or disable metrics collection
 */
export function setMetricsEnabled(enabled: boolean): void {
    metrics.setEnabled(enabled);
}

/**
 * Process the text using functions supplied in the array mahabhutaFuncs.
 */
export async function processAsync(
                text: string, 
                metadata: Object,
                mahabhutaFuncs: MahafuncArray | Array<MahafuncType>,
                documentId?: string): Promise<string> {

    if (!mahabhutaFuncs || mahabhutaFuncs.length < 0) mahabhutaFuncs = [];

    // Start metrics collection for this document
    metrics.startProcessing(documentId);

    let cleanOrDirty = 'first-time';
    const $ = typeof text === 'function' ? text : parse(text);

    do {
        let mhObj;
        if (Array.isArray(mahabhutaFuncs)) {
            mhObj = new MahafuncArray("master", {});
            mhObj.setMahafuncArray(mahabhutaFuncs);
        } else if (mahabhutaFuncs instanceof MahafuncArray) {
            mhObj = mahabhutaFuncs;
        } else throw new Error(`Bad mahabhutaFuncs object supplied`);

        cleanOrDirty = 'clean';
        await mhObj.process($, metadata, () => { cleanOrDirty = 'dirty'; });

        // Record dirty loop iteration
        metrics.recordDirtyLoop();

    } while (cleanOrDirty === 'dirty');

    // Finish metrics collection
    metrics.finishProcessing();

    return $.html();
}
```

### Integration with MahafuncArray.ts

```typescript
// lib/MahafuncArray.ts (modified process method)

import { performance } from 'perf_hooks';
import { metrics } from './metrics';

async process($, metadata, dirty: Function) {
    logProcessing(`Mahabhuta starting array ${this.name}`);
    
    const arrayStart = performance.now();
    let mahafuncCount = 0;

    for (let funclist of [this.functions, this.final_functions]) {
        for (let mahafunc of funclist) {
            mahafuncCount++;
            
            if (mahafunc instanceof CustomElement) {
                logProcessing(`Mahabhuta calling CustomElement ${this.name} ${mahafunc.elementName}`);
                
                const start = performance.now();
                const elementCount = mahafunc.findElements($).length;
                
                try {
                    await mahafunc.processAll($, metadata, dirty);
                } catch (errCustom) {
                    throw new Error(`Mahabhuta ${this.name} caught error in CustomElement(${mahafunc.elementName}): ${errCustom.message}`);
                }
                
                metrics.recordMahafuncTiming({
                    arrayName: this.name,
                    className: mahafunc.constructor.name,
                    mahafuncType: 'CustomElement',
                    selector: mahafunc.elementName,
                    elementCount,
                    durationMs: performance.now() - start,
                    timestamp: start
                });

            } else if (mahafunc instanceof Munger) {
                logProcessing(`Mahabhuta calling Munger ${this.name} ${mahafunc.selector}`);
                
                const start = performance.now();
                const elementCount = mahafunc.findElements($).length;
                
                try {
                    await mahafunc.processAll($, metadata, dirty);
                } catch (errMunger) {
                    throw new Error(`Mahabhuta ${this.name} caught error in Munger(${mahafunc.selector}): ${errMunger.message}`);
                }
                
                logProcessing(`Mahabhuta FINISHED Munger ${this.name} ${mahafunc.selector}`);
                
                metrics.recordMahafuncTiming({
                    arrayName: this.name,
                    className: mahafunc.constructor.name,
                    mahafuncType: 'Munger',
                    selector: mahafunc.selector,
                    elementCount,
                    durationMs: performance.now() - start,
                    timestamp: start
                });

            } else if (mahafunc instanceof PageProcessor) {
                const start = performance.now();
                logProcessing(`Mahabhuta calling ${this.name} PageProcessor`);
                
                try {
                    await mahafunc.process($, metadata, dirty);
                } catch (errPageProcessor) {
                    throw new Error(`Mahabhuta ${this.name} caught error in PageProcessor: ${errPageProcessor.message}`);
                }
                
                metrics.recordMahafuncTiming({
                    arrayName: this.name,
                    className: mahafunc.constructor.name,
                    mahafuncType: 'PageProcessor',
                    selector: 'page',
                    elementCount: 1,
                    durationMs: performance.now() - start,
                    timestamp: start
                });

            } else if (mahafunc instanceof MahafuncArray) {
                const start = performance.now();
                
                try {
                    await mahafunc.process($, metadata, dirty);
                } catch (errMahafuncArray) {
                    throw new Error(`Mahabhuta ${this.name} caught error in MahafuncArray: ${errMahafuncArray.message}`);
                }
                
                metrics.recordMahafuncTiming({
                    arrayName: this.name,
                    className: 'MahafuncArray',
                    mahafuncType: 'MahafuncArray',
                    selector: mahafunc.name,
                    elementCount: mahafunc.length,
                    durationMs: performance.now() - start,
                    timestamp: start
                });

            } else if (typeof mahafunc === 'function') {
                const start = performance.now();
                logProcessing(`Mahabhuta calling an ${this.name} "function"`);
                
                try {
                    await new Promise((resolve, reject) => {
                        mahafunc($, metadata, dirty, err => {
                            if (err) reject(err);
                            else resolve('ok');
                        });
                    });
                } catch (errFunction) {
                    throw new Error(`Mahabhuta ${this.name} caught error in function: ${errFunction.message}`);
                }
                
                metrics.recordMahafuncTiming({
                    arrayName: this.name,
                    className: mahafunc.name || 'anonymous',
                    mahafuncType: 'function',
                    selector: 'function',
                    elementCount: 0,
                    durationMs: performance.now() - start,
                    timestamp: start
                });

            } else if (Array.isArray(mahafunc)) {
                const start = performance.now();
                let mhObj = new MahafuncArray("inline", this.options);
                mhObj.setMahafuncArray(mahafunc);
                await mhObj.process($, metadata, dirty);
                
                metrics.recordMahafuncTiming({
                    arrayName: this.name,
                    className: 'Array',
                    mahafuncType: 'inline-array',
                    selector: 'inline',
                    elementCount: mahafunc.length,
                    durationMs: performance.now() - start,
                    timestamp: start
                });

            } else {
                console.error(`BAD MAHAFUNC in array ${this.name} - ${util.inspect(mahafunc)}`);
            }
        }
    }

    // Record array-level timing
    metrics.recordArrayTiming({
        arrayName: this.name,
        durationMs: performance.now() - arrayStart,
        mahafuncCount,
        timestamp: arrayStart
    });

    return [];
}
```

### Usage Example

```typescript
import * as mahabhuta from 'mahabhuta';

// Enable metrics collection
mahabhuta.setMetricsEnabled(true);

// Process multiple documents
for (const doc of documents) {
    await mahabhuta.processAsync(
        doc.content,
        doc.metadata,
        mahafuncArrays,
        doc.path  // documentId for tracking
    );
}

// Generate and print report
console.log(mahabhuta.metrics.generateReport());

// Or get raw data for custom analysis
const allMetrics = mahabhuta.metrics.getAllMetrics();
const stats = mahabhuta.metrics.getAggregatedStats();

// Export to JSON for external analysis
fs.writeFileSync('metrics.json', JSON.stringify(allMetrics, null, 2));

// Clear metrics for next batch
mahabhuta.metrics.clear();
```

### Sample Report Output

```
=== Mahabhuta Performance Report ===

Documents processed: 150
Total processing time: 4523.45ms
Average per document: 30.16ms
Total dirty loops: 312
Average dirty loops per document: 2.08

--- By MahafuncArray ---
  akashacms-builtin: 1842.30ms total, 12.28ms avg, 150 calls
  akashacms-blog: 892.15ms total, 5.95ms avg, 150 calls
  mahabhuta-partials: 756.22ms total, 5.04ms avg, 150 calls

--- By Mahafunc (top 20 by total time) ---
  akashacms-builtin:AkStylesheets (ak-stylesheets):
    423.12ms total, 2.82ms avg
    150 calls, 1.0 elements avg
  akashacms-blog:OpenGraphMunger (article.blog-post):
    312.45ms total, 2.08ms avg
    150 calls, 3.2 elements avg
  mahabhuta-partials:Partial (partial):
    289.33ms total, 0.96ms avg
    301 calls, 1.0 elements avg
  ...
```

---

## Benefits of This Approach

1. **Identify slow Mahafuncs**: See which specific functions consume the most time
2. **Track element counts**: Understand if selectors are matching too many elements
3. **Monitor dirty loops**: Detect if certain documents trigger excessive re-processing
4. **Compare across documents**: Identify outlier documents that take longer to process
5. **Zero overhead when disabled**: No performance impact in production
6. **Exportable data**: JSON export enables external analysis tools
7. **Backward compatible**: Existing code continues to work unchanged

## Implementation Notes

### Retrieving Class Names

The `className` field in `MahafuncTiming` is populated using JavaScript's `constructor.name` property:

```typescript
mahafunc.constructor.name  // e.g., "SiteVerification", "OpenGraphMunger"
```

This works for any object instance and returns the actual subclass name, not the parent class. For example:

```typescript
class SiteVerification extends CustomElement {
    get elementName() { return "site-verification"; }
}

const instance = new SiteVerification();
console.log(instance.constructor.name);  // "SiteVerification"
```

This provides more meaningful identification in reports than just knowing the base type (`CustomElement`, `Munger`, etc.).

For bare functions, we use `mahafunc.name` which returns the function name if it's a named function, or an empty string for anonymous functions.

---

## Future Enhancements

1. **Histogram support**: Track distribution of timings, not just averages
2. **Memory tracking**: Add `process.memoryUsage()` snapshots
3. **Flame graph export**: Generate data compatible with flame graph visualizers
4. **Real-time streaming**: Option to stream metrics to external collectors
5. **Threshold alerts**: Warn when Mahafuncs exceed configured time limits
