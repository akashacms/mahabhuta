# Performance Measurement Usage Guide

This guide explains how to use Mahabhuta's performance measurement features to analyze and optimize DOM processing.

## Overview

Mahabhuta now includes built-in performance measurement capabilities that allow you to:

- Track execution time for individual Mahafuncs
- Track execution time for MahafuncArrays
- Analyze total, average, min, max, and median timing statistics
- Generate reports to identify bottlenecks
- Export data in JSON format for external analysis

## Quick Start

### 1. Enable Performance Measurement

To enable performance measurement, pass a `FilesystemPerfDataStore` instance to the `processAsync()` function:

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

### 2. Generate Reports

After processing documents, use the CLI to generate performance reports:

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

## API Reference

### FilesystemPerfDataStore

Creates a data store that persists performance metrics as JSON files.

```javascript
const dataStore = new FilesystemPerfDataStore(dirPath);
```

**Parameters:**
- `dirPath` (string): Directory where metrics files will be stored

**Methods:**
- `recordProcessMetrics(metrics)`: Save metrics from a single process() call
- `getAllMetrics()`: Retrieve all stored metrics
- `clear()`: Delete all stored metrics
- `getAggregatedStats()`: Compute statistics across all metrics

### processAsync()

Updated signature with optional performance measurement parameters:

```javascript
await mahabhuta.processAsync(
    text,              // HTML text to process
    metadata,          // Metadata object
    mahabhutaFuncs,    // MahafuncArray or array of Mahafuncs
    dataStore?,        // Optional: PerfDataStore instance
    documentId?        // Optional: document identifier for tracking
)
```

**When dataStore is provided:**
- Metrics collection is automatically enabled
- Timing data is collected for all Mahafuncs and arrays
- Metrics are persisted at the end of processing

**When dataStore is not provided:**
- Zero performance overhead
- No metrics collection occurs

## CLI Commands

### perf-report

Generate performance reports from stored metrics.

```bash
npx mahabhuta perf-report <report-type> [options]
```

**Report Types:**
- `total` - Top N Mahafuncs by total time consumed
- `average` - Top N Mahafuncs by average time per invocation  
- `arrays` - Breakdown by MahafuncArray
- `distribution` - Time distribution statistics (min/max/median/avg)
- `all` - Combined report with all sections

**Options:**
- `--data-dir <path>` - Path to metrics directory (default: ./mahabhuta-metrics)
- `--top <N>` - Limit to top N entries (default: 20)
- `--format <type>` - Output format: text or json (default: text)
- `--filter <pattern>` - Filter by MahafuncArray path pattern

**Examples:**

```bash
# Show top 10 slowest Mahafuncs
npx mahabhuta perf-report total --top 10

# Export statistics as JSON
npx mahabhuta perf-report all --format json > stats.json

# Filter to specific array path
npx mahabhuta perf-report average --filter "akashacms-builtin"

# Use custom metrics directory
npx mahabhuta perf-report distribution --data-dir /path/to/metrics
```

## Understanding the Reports

### Total Time Report

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

### Average Time Report

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

### Arrays Report

Shows time consumed by each MahafuncArray.

```
--- By MahafuncArray ---
  master > akashacms-builtin:
    1842.30ms total, 12.28ms avg, 150 calls
```

**Use this to identify:**
- Which plugin or array contributes most to processing time
- Relative cost of different MahafuncArray groups

### Distribution Report

Shows timing variability for each Mahafunc.

```
--- Time Distribution (Top 20) ---
  master > mahabhuta-partials
    Partial (partial):
    Min: 0.45ms, Max: 15.23ms
    Median: 0.96ms, Avg: 1.12ms
    301 calls
```

**Use this to identify:**
- Inconsistent performance (high max vs median)
- Outliers that might indicate issues
- Typical vs worst-case performance

## Data Structure

### ProcessMetrics

Each document processing creates a `ProcessMetrics` object:

```typescript
{
  totalDurationMs: number,      // Total time for processAsync()
  timestamp: number,            // When processing started
  documentId?: string,          // Optional document identifier
  mahafuncTimings: [...],       // Timing for each Mahafunc execution
  arrayTimings: [...]           // Timing for each MahafuncArray
}
```

### MahafuncTiming

Records execution of a single Mahafunc:

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

## Best Practices

### During Development

1. **Enable metrics for a representative sample** of documents
2. **Focus on outliers** - Mahafuncs with high average or max times
3. **Check distribution** - High variance suggests inconsistent performance
4. **Use filtering** to drill down into specific plugins

### In Production

1. **Keep metrics disabled** unless debugging specific performance issues
2. **Enable selectively** for problem documents using documentId
3. **Clear old metrics** periodically to manage disk space

### Optimization Workflow

1. Run processing with metrics enabled
2. Generate "total" and "average" reports
3. Identify top 5-10 bottlenecks
4. Use "distribution" report to understand variability
5. Optimize identified Mahafuncs
6. Re-measure to verify improvements

## Example: Complete Workflow

```javascript
// 1. Setup
const mahabhuta = require('mahabhuta');
const { FilesystemPerfDataStore } = mahabhuta;
const path = require('path');

// 2. Create data store
const metricsDir = path.join(__dirname, 'metrics');
const dataStore = new FilesystemPerfDataStore(metricsDir);

// 3. Process documents with metrics
for (const doc of documents) {
    const output = await mahabhuta.processAsync(
        doc.content,
        doc.metadata,
        mahafuncArrays,
        dataStore,
        doc.filename
    );
    // ... save output ...
}

// 4. Generate reports (via CLI)
// npx mahabhuta perf-report all --data-dir ./metrics

// 5. Or programmatically access stats
const stats = await dataStore.getAggregatedStats();
console.log(`Processed ${stats.documentCount} documents`);
console.log(`Average time: ${stats.avgProcessingMs.toFixed(2)}ms`);

// 6. Find slowest Mahafunc
const slowest = stats.byMahafunc
    .sort((a, b) => b.totalDurationMs - a.totalDurationMs)[0];
console.log(`Slowest: ${slowest.className} - ${slowest.totalDurationMs.toFixed(2)}ms total`);

// 7. Clean up when done
await dataStore.clear();
```

## Troubleshooting

### No metrics files created

- Verify dataStore parameter is passed to processAsync()
- Check directory permissions for metrics directory
- Ensure processing completes without errors

### Reports show no data

- Verify correct --data-dir path
- Check that JSON files exist in metrics directory
- Ensure files are valid JSON (not corrupted)

### High overhead when metrics enabled

- Performance impact should be minimal (< 5%)
- Check disk I/O if many small documents are processed
- Consider batching or using separate data store instance per batch

## Advanced Usage

### Custom Data Store

Implement your own data store by extending `PerfDataStore`:

```javascript
class DatabasePerfDataStore extends mahabhuta.PerfDataStore {
    async recordProcessMetrics(metrics) {
        // Write to database
    }
    
    async getAllMetrics() {
        // Read from database
    }
    
    async clear() {
        // Clear database
    }
    
    async getAggregatedStats() {
        // Compute stats from database
    }
}
```

### Programmatic Report Generation

Instead of using CLI, generate reports in code:

```javascript
const stats = await dataStore.getAggregatedStats();

// Filter and sort
const topByTotal = stats.byMahafunc
    .filter(m => m.arrayPath.includes('my-plugin'))
    .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
    .slice(0, 10);

// Custom formatting
for (const m of topByTotal) {
    console.log(`${m.className}: ${m.totalDurationMs.toFixed(2)}ms`);
}
```

## See Also

- [PERFORMANCE-MEASUREMENTS.md](./PERFORMANCE-MEASUREMENTS.md) - Implementation specification
- [PERFORMANCE-PLAN.md](./PERFORMANCE-PLAN.md) - Implementation tracking
- [AGENTS.md](./AGENTS.md) - Mahabhuta architecture overview
