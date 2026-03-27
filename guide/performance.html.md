---
layout: ebook-page.html.ejs
title: Performance Measurement and Optimization
publicationDate: March 26, 2026
---

Mahabhuta includes performance measurement capabilities to help you identify bottlenecks and optimize DOM processing. This guide covers how to collect metrics, generate reports, and use the data to improve performance.

# Overview

The performance measurement system allows you to:

* Track execution time for individual Mahafuncs
* Track execution time for MahafuncArrays
* Analyze total, average, minimum, maximum, and median timing statistics
* Generate reports to identify performance bottlenecks
* Export data in JSON format for external analysis

**Important**: When disabled, performance measurement has **zero overhead** - there are no hidden performance costs.

# Quick Start

Enable performance measurement by passing a `FilesystemPerfDataStore` to `processAsync()`:

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

When `dataStore` is not provided, metrics collection is completely disabled with zero performance overhead.

# Generating Reports

After collecting metrics, use the CLI to generate performance reports:

## Basic Report Commands

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
```

## Report Options

```bash
# Export as JSON for external analysis
npx mahabhuta perf-report all --data-dir ./metrics --format json > stats.json

# Filter to specific plugin
npx mahabhuta perf-report average --filter "plugin-name"

# Limit to top 10 entries
npx mahabhuta perf-report total --top 10

# Combine options
npx mahabhuta perf-report total --data-dir ./metrics --top 5 --filter "akashacms"
```

# Understanding Reports

## Total Time Report

Shows Mahafuncs that consume the most cumulative time across all invocations.

```
--- Top 20 Mahafuncs by Total Time ---
  master > akashacms-builtin
    AkStylesheets (ak-stylesheets):
    423.12ms total, 150 calls
```

**Use this to identify:**
- Mahafuncs that are executed frequently
- Cumulative impact on overall processing time
- Candidates for optimization based on total impact

## Average Time Report

Shows Mahafuncs with the highest average execution time per call.

```
--- Top 20 Mahafuncs by Average Time ---
  master > akashacms-blog
    OpenGraphMunger (article.blog-post):
    2.08ms avg, 150 calls
```

**Use this to identify:**
- Individual Mahafuncs that are slow per execution
- Optimization opportunities for expensive operations
- Mahafuncs doing too much work per invocation

## Arrays Report

Shows time consumed by each MahafuncArray (typically plugins).

```
--- By MahafuncArray ---
  master > akashacms-builtin:
    1842.30ms total, 12.28ms avg, 150 calls
```

**Use this to identify:**
- Which plugin or array contributes most to processing time
- Relative cost of different MahafuncArray groups
- Candidates for disabling or optimization

## Distribution Report

Shows timing variability for each Mahafunc with min/max/median statistics.

```
--- Time Distribution (Top 20) ---
  master > mahabhuta-partials
    Partial (partial):
    Min: 0.45ms, Max: 15.23ms
    Median: 0.96ms, Avg: 1.12ms
    301 calls
```

**Use this to identify:**
- Inconsistent performance (high max vs median indicates variability)
- Outliers that might indicate issues or special cases
- Typical vs worst-case performance scenarios

# Complete Report Example

Here's an example of the full report output:

```
=== Mahabhuta Performance Report ===

Documents processed: 150
Total processing time: 4523.45ms
Average per document: 30.16ms

--- Top 20 Mahafuncs by Total Time ---
  master > akashacms-builtin
    AkStylesheets (ak-stylesheets):
    423.12ms total, 150 calls

  master > akashacms-blog
    OpenGraphMunger (article.blog-post):
    312.45ms total, 150 calls

  master > mahabhuta-partials
    Partial (partial):
    289.33ms total, 301 calls

--- Top 20 Mahafuncs by Average Time ---
  master > akashacms-builtin
    AkStylesheets (ak-stylesheets):
    2.82ms avg, 150 calls

  master > akashacms-blog
    OpenGraphMunger (article.blog-post):
    2.08ms avg, 150 calls

--- By MahafuncArray ---
  master > akashacms-builtin:
    1842.30ms total, 12.28ms avg, 150 calls
  
  master > akashacms-blog:
    892.15ms total, 5.95ms avg, 150 calls

--- Time Distribution (Top 20) ---
  master > akashacms-builtin
    AkStylesheets (ak-stylesheets):
    Min: 1.23ms, Max: 8.45ms
    Median: 2.56ms, Avg: 2.82ms
    150 calls
```

# Programmatic Access

You can also access metrics programmatically for custom analysis:

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

// Find Mahafuncs with high variability
for (const mahafunc of stats.byMahafunc) {
    const variability = mahafunc.maxDurationMs / mahafunc.medianDurationMs;
    if (variability > 3) {
        console.log(`High variability in ${mahafunc.className}: ${variability.toFixed(2)}x`);
    }
}

// Get all raw metrics
const allMetrics = await dataStore.getAllMetrics();

// Process each document's metrics
for (const metrics of allMetrics) {
    console.log(`Document: ${metrics.documentId}`);
    console.log(`Total time: ${metrics.totalDurationMs}ms`);
    console.log(`Mahafuncs executed: ${metrics.mahafuncTimings.length}`);
}

// Clear metrics when done
await dataStore.clear();
```

# Data Structure

Each document processing creates metrics with the following structure:

## ProcessMetrics

```typescript
{
  totalDurationMs: number,      // Total time for processAsync()
  timestamp: number,            // When processing started
  documentId?: string,          // Optional document identifier
  mahafuncTimings: [...],       // Timing for each Mahafunc execution
  arrayTimings: [...]           // Timing for each MahafuncArray
}
```

## MahafuncTiming

```typescript
{
  arrayPath: string[],          // Full nesting path, e.g., ["master", "plugin"]
  className: string,            // Mahafunc class name
  mahafuncType: string,         // Type: CustomElement, Munger, etc.
  selector: string,             // CSS selector or element name
  durationMs: number,           // Execution time in milliseconds
  timestamp: number             // When execution started
}
```

## AggregatedStats

After processing multiple documents, you get aggregated statistics:

```typescript
{
  documentCount: number,        // Total documents processed
  totalProcessingMs: number,    // Total time across all documents
  avgProcessingMs: number,      // Average time per document
  byMahafunc: [...],            // Per-Mahafunc statistics
  byArray: [...]                // Per-MahafuncArray statistics
}
```

Each entry in `byMahafunc` includes:
- `invocationCount`: Number of times invoked
- `totalDurationMs`: Sum of all execution times
- `avgDurationMs`: Average per invocation
- `minDurationMs`: Fastest execution
- `maxDurationMs`: Slowest execution
- `medianDurationMs`: Median execution time

# Performance Characteristics

## Measured Overhead

From the test suite with real Mahafuncs:

- **With metrics enabled**: 3-7% overhead
- **With metrics disabled**: ~0% overhead (true zero impact)
- **Processing time**: Typical 20-70ms per document (varies by complexity)

The overhead when enabled comes primarily from:
1. Filesystem I/O for writing metrics files
2. High-precision timing calls (`performance.now()`)
3. Array path construction and storage

## Zero Overhead Design

When metrics collection is disabled (no `dataStore` provided), guard clauses ensure no performance impact:

```javascript
// Inside Mahabhuta processing
if (processMetrics) {
    // Only executed when metrics enabled
    const start = performance.now();
    // ... do work ...
    processMetrics.mahafuncTimings.push({...});
}
```

This design means:
- No timing calls when disabled
- No object creation when disabled
- No array manipulation when disabled
- True zero overhead validated by tests

# Best Practices

## During Development

1. **Enable metrics for representative samples**: Don't need to measure every document
2. **Focus on outliers**: Look for Mahafuncs with high average or max times
3. **Use distribution reports**: High variance indicates inconsistent performance
4. **Filter to specific areas**: Drill down into specific plugins or arrays
5. **Compare before/after**: Measure impact of optimizations

## In Production

1. **Keep metrics disabled by default**: Zero overhead means no impact
2. **Enable selectively**: For problem documents using documentId
3. **Time-limited collection**: Collect metrics for limited periods
4. **Clear old metrics**: Manage disk space by periodically clearing
5. **Aggregate results**: Use reports to identify systemic issues

## Optimization Workflow

Follow this systematic approach to optimize performance:

1. **Collect metrics** from representative document set
2. **Generate "total" report** to identify biggest time consumers
3. **Generate "average" report** to identify slowest individual operations
4. **Generate "distribution" report** to understand variability
5. **Identify top 5-10 bottlenecks** from combined analysis
6. **Optimize identified Mahafuncs**:
   - Cache expensive operations
   - Reduce DOM queries
   - Simplify selectors
   - Optimize algorithms
7. **Re-measure** to verify improvements
8. **Iterate** until performance goals met

## Common Optimization Targets

Based on analysis, common optimization opportunities include:

**Frequent execution + low time per call**:
- Consider batching operations
- Cache selector results
- Reduce function call overhead

**Infrequent execution + high time per call**:
- Optimize the expensive operation itself
- Consider lazy evaluation
- Add caching for repeated work

**High variability (max >> median)**:
- Investigate outlier cases
- Add caching for expensive paths
- Consider special handling for complex cases

**Many small operations**:
- Consider combining related Mahafuncs
- Reduce DOM traversals
- Batch element modifications

# Integration Examples

## AkashaCMS Integration

```javascript
// In AkashaCMS configuration
config.mahabhutaConfig = {
    enablePerfMetrics: process.env.ENABLE_PERF_METRICS === 'true',
    metricsDir: './output/.metrics'
};

// In render pipeline
let perfStore;
if (config.mahabhutaConfig.enablePerfMetrics) {
    const { FilesystemPerfDataStore } = require('mahabhuta');
    perfStore = new FilesystemPerfDataStore(config.mahabhutaConfig.metricsDir);
}

// During document rendering
const rendered = await mahabhuta.processAsync(
    content,
    metadata,
    mahafuncArrays,
    perfStore,           // undefined if metrics disabled
    documentPath
);

// After build
if (perfStore) {
    console.log('Performance metrics collected.');
    console.log('Generate reports with:');
    console.log(`  npx mahabhuta perf-report all --data-dir ${config.mahabhutaConfig.metricsDir}`);
}
```

## Custom Data Store

You can implement your own storage by extending `PerfDataStore`:

```javascript
const { PerfDataStore } = require('mahabhuta');

class DatabasePerfDataStore extends PerfDataStore {
    constructor(dbConnection) {
        super();
        this.db = dbConnection;
    }
    
    async recordProcessMetrics(metrics) {
        await this.db.insert('perf_metrics', metrics);
    }
    
    async getAllMetrics() {
        return await this.db.query('SELECT * FROM perf_metrics');
    }
    
    async clear() {
        await this.db.delete('perf_metrics');
    }
    
    async getAggregatedStats() {
        // Compute statistics from database
        const allMetrics = await this.getAllMetrics();
        // ... aggregation logic ...
    }
}
```

# Troubleshooting

## No metrics files created

**Symptoms**: No JSON files appear in metrics directory.

**Solutions**:
- Verify `dataStore` parameter is passed to `processAsync()`
- Check directory permissions for metrics directory
- Ensure processing completes without errors
- Check that Mahafuncs are actually executing

## Reports show no data

**Symptoms**: `perf-report` shows "Documents processed: 0".

**Solutions**:
- Verify correct `--data-dir` path
- Check that JSON files exist in metrics directory
- Ensure files are valid JSON (not corrupted)
- Try absolute path instead of relative

## High overhead when metrics enabled

**Symptoms**: Processing takes significantly longer with metrics.

**Expected**: 3-7% overhead is normal.

**If higher**:
- Check disk I/O performance
- Consider using faster storage for metrics directory
- Batch document processing to amortize overhead
- Use separate disk for metrics to avoid contention

## Corrupted metrics files

**Symptoms**: Warning messages about invalid JSON.

**Solutions**:
- FilesystemPerfDataStore skips corrupted files automatically
- Check disk space availability
- Ensure proper shutdown (metrics written at end of processing)
- Use `clear()` to remove corrupted files and start fresh

## Memory usage concerns

**Symptoms**: High memory usage during metrics collection.

**Notes**:
- Metrics collected in-memory during processing, written at end
- Memory usage proportional to number of Mahafuncs executed
- For very large documents with many Mahafuncs, memory usage increases

**Solutions**:
- Process documents in batches
- Clear metrics periodically
- Consider custom PerfDataStore with streaming writes

# Advanced Topics

## Nested Array Path Tracking

Mahabhuta tracks the full path through nested MahafuncArrays:

```javascript
// If you have nested arrays:
master
  └─> akashacms-builtin
      └─> nested-plugin
          └─> deep-array

// Metrics will show:
arrayPath: ["master", "akashacms-builtin", "nested-plugin", "deep-array"]
```

This allows you to see exactly where time is spent in complex plugin hierarchies.

## High-Precision Timing

Mahabhuta uses `performance.now()` for microsecond-level precision:

```javascript
const start = performance.now();  // e.g., 1234567.890123
// ... execute Mahafunc ...
const end = performance.now();    // e.g., 1234570.234567
const duration = end - start;     // e.g., 2.344444 ms
```

This precision allows accurate measurement even for very fast operations.

## Filtering Techniques

Use filters effectively to narrow analysis:

```bash
# Find all Mahafuncs in a specific plugin
npx mahabhuta perf-report total --filter "akashacms-builtin"

# Find nested arrays
npx mahabhuta perf-report arrays --filter "nested"

# Combine with top limit for focused view
npx mahabhuta perf-report average --filter "blog" --top 5
```

## JSON Export for Analysis

Export metrics to JSON for custom analysis:

```bash
npx mahabhuta perf-report all --format json > stats.json
```

Then analyze with external tools:

```javascript
const stats = require('./stats.json');

// Find Mahafuncs with high variance
const highVariance = stats.distribution
    .filter(m => m.max / m.median > 5)
    .sort((a, b) => b.max - a.max);

console.log('High variance Mahafuncs:', highVariance);
```

# Summary

Performance measurement in Mahabhuta provides:

- Detailed timing for all Mahafuncs and arrays
- Multiple report types for different analyses
- Zero overhead when disabled
- Minimal overhead when enabled (3-7%)
- Flexible storage options
- Both CLI and programmatic access
- Export to JSON for external tools

Use performance measurement to:
- Identify bottlenecks in DOM processing
- Compare performance of different plugins
- Guide optimization efforts with data
- Track performance over time
- Validate optimization improvements

For more technical details, see these files in the repository:
  `AI/Performance/PERFORMANCE-USAGE.md`
- `AI/Performance/PERFORMANCE-MEASUREMENTS.md`
- `AGENTS.md` in the Performance Section
