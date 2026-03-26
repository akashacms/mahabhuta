# Plan for implementing performance measurements in Mahabhuta

The task is to resolve an issue https://github.com/akashacms/akasharender/issues/96 that is listed in the AkashaRender project but is really about Mahabhuta.

In the existing report when a site is built, we see the time consumed for MAHABHUTA while building a page.  But, this number doesn't break down how the Mahabhuta time is consumed, so that we can reason about how to redesign Mahabhuta for greater efficiency.

As the implementor of Mahabhuta, I want to understand where the computation time goes, and how to improve its efficiency.  

An existing planning document is in the file: AI/Performance/PROPOSED-BENCHMARKING.md

That file may be useful for reference.  But, it is old, and may not be accurate.

# Architecture review

Suggest reviewing the file [AGENTS.md](./AGENTS.md)

# Desired measurements

Each Mahafunc is executed from a MahafuncArray which may be nested from a chain of MahafuncArray's.  Therefore, over the course of running an application, we want to record for each Mahafunc an object containing this data:

* The full path of MahafuncArray names as an array, representing the nesting hierarchy. For example: `["akashacms-builtin", "sub-array", "nested-array"]`
* The Mahafunc class name (e.g., `SiteVerification`, `OpenGraphMunger`), obtained using `mahafunc.constructor.name`
* The Mahafunc type: [ `CustomElement`, `Munger`, `PageProcessor`, `MahafuncArray`, `function`, `Array` ]
* The `name`, `elementName` or `selector` for the function depending on the function type
* The sum of the execution time for all invocations of this Mahafunc, where the timing for each execution is measured using `performance.now()`
* The number of invocations of the Mahafunc
* From that, an average execution time per invocation:  `sum / count`

That dataset tells us which Mahafunc's impose the largest CPU consumption.

The next dataset is to record, per MahafuncArray, similar execution time data, resulting in an object containing this data:

* The full path of MahafuncArray names as an array, representing the nesting hierarchy
* The MahafuncArray type: [ `MahafuncArray`, `array` ]
* The `name`
* The sum of the execution time for all invocations of this MahafuncArray, where the timing for each execution is measured using `performance.now()`
* The number of invocations of the MahafuncArray
* From that, an average execution time per invocation:  `sum / count`

Finally, for the `process` function in `index.ts`, a total execution time can be computed using `performance.now()`

# Storing performance report data

The `process` function in `index.ts` should have a new optional parameter, an object `dataStore`, allowing the calling function to store this data where it wishes.

The `dataStore` parameter would be an implementation of PerfDataStore.  This class could provide a convenient superclass for applications wishing to persistently store performance data.

Mahabhuta will supply a default PerfDataStore implementation called `FilesystemPerfDataStore` that stores data as JSON in files in the filesystem.  GOAL: Make _FilesystemPerfDataStore_ good enough that AkashaCMS will use it unmodified.

## PerfDataStore class definition

```typescript
/**
 * Timing data for a single Mahafunc execution
 */
export interface MahafuncTiming {
    /** Full path of MahafuncArray names, e.g., ["akashacms-builtin", "sub-array"] */
    arrayPath: string[];
    /** The class name of the Mahafunc (e.g., "SiteVerification") */
    className: string;
    /** Base type: 'CustomElement' | 'Munger' | 'PageProcessor' | 'MahafuncArray' | 'function' | 'Array' */
    mahafuncType: string;
    /** The selector, elementName, or name depending on type */
    selector: string;
    /** Execution duration in milliseconds */
    durationMs: number;
    /** Timestamp when execution started */
    timestamp: number;
}

/**
 * Timing data for a MahafuncArray execution
 */
export interface MahafuncArrayTiming {
    /** Full path of MahafuncArray names */
    arrayPath: string[];
    /** Type: 'MahafuncArray' | 'array' */
    arrayType: string;
    /** Name of this MahafuncArray */
    name: string;
    /** Execution duration in milliseconds */
    durationMs: number;
    /** Timestamp when execution started */
    timestamp: number;
}

/**
 * Complete metrics for a single processAsync() call
 */
export interface ProcessMetrics {
    /** Total duration of processAsync() in milliseconds */
    totalDurationMs: number;
    /** Timestamp when processing started */
    timestamp: number;
    /** Optional identifier for the document being processed */
    documentId?: string;
    /** Timings for each individual Mahafunc execution */
    mahafuncTimings: MahafuncTiming[];
    /** Timings for each MahafuncArray execution */
    arrayTimings: MahafuncArrayTiming[];
}

/**
 * Abstract base class for storing and retrieving performance data
 */
export abstract class PerfDataStore {
    /**
     * Record metrics from a single process() execution
     * Called at the end of each processAsync() call
     */
    abstract recordProcessMetrics(metrics: ProcessMetrics): Promise<void>;

    /**
     * Retrieve all stored metrics
     * Used by report generation to load historical data
     */
    abstract getAllMetrics(): Promise<ProcessMetrics[]>;

    /**
     * Clear all stored metrics
     * Useful for starting fresh or managing storage size
     */
    abstract clear(): Promise<void>;

    /**
     * Get aggregated statistics across all stored metrics
     * Returns computed statistics for report generation
     */
    abstract getAggregatedStats(): Promise<AggregatedStats>;
}

/**
 * Aggregated statistics computed from multiple ProcessMetrics
 */
export interface AggregatedStats {
    /** Total number of documents processed */
    documentCount: number;
    /** Total processing time across all documents */
    totalProcessingMs: number;
    /** Average processing time per document */
    avgProcessingMs: number;
    
    /** Per-Mahafunc aggregated statistics */
    byMahafunc: MahafuncStats[];
    
    /** Per-MahafuncArray aggregated statistics */
    byArray: MahafuncArrayStats[];
}

/**
 * Aggregated statistics for a specific Mahafunc
 */
export interface MahafuncStats {
    /** Full path of MahafuncArray names */
    arrayPath: string[];
    /** The class name of the Mahafunc */
    className: string;
    /** Base type */
    mahafuncType: string;
    /** The selector/elementName/name */
    selector: string;
    /** Number of times this Mahafunc was invoked */
    invocationCount: number;
    /** Sum of execution time across all invocations */
    totalDurationMs: number;
    /** Average execution time per invocation */
    avgDurationMs: number;
    /** Minimum execution time */
    minDurationMs: number;
    /** Maximum execution time */
    maxDurationMs: number;
    /** Median execution time */
    medianDurationMs: number;
}

/**
 * Aggregated statistics for a specific MahafuncArray
 */
export interface MahafuncArrayStats {
    /** Full path of MahafuncArray names */
    arrayPath: string[];
    /** Type: 'MahafuncArray' | 'array' */
    arrayType: string;
    /** Name of this MahafuncArray */
    name: string;
    /** Number of times this MahafuncArray was invoked */
    invocationCount: number;
    /** Sum of execution time across all invocations */
    totalDurationMs: number;
    /** Average execution time per invocation */
    avgDurationMs: number;
    /** Minimum execution time */
    minDurationMs: number;
    /** Maximum execution time */
    maxDurationMs: number;
    /** Median execution time */
    medianDurationMs: number;
}
```

### FilesystemPerfDataStore implementation

The `FilesystemPerfDataStore` class will extend `PerfDataStore` and:

* Store each `ProcessMetrics` object as a separate JSON file in a configured directory
* Use timestamps or sequential numbering for filenames
* Implement `getAllMetrics()` by reading and parsing all JSON files in the directory
* Implement `getAggregatedStats()` by computing statistics from all stored metrics
* Provide configuration options for the storage directory path

## Metrics collection enablement

Metrics collection is controlled by the presence of the `dataStore` parameter:

* When `dataStore` is not supplied (undefined/null), metrics collection is disabled
* When `dataStore` is supplied, metrics collection is automatically enabled
* When metrics collection is disabled, there must be zero runtime performance impact
* No additional method or flag is needed to enable/disable metrics collection - the presence of the `dataStore` object is sufficient

## Report generation

The following reports should be implemented:

1. **Top N slowest Mahafuncs by total time consumed** - Identifies which Mahafuncs consume the most cumulative time across all invocations
2. **Per-Mahafunc ranked by average time per invocation** - Identifies which Mahafuncs are slowest on average per execution
3. **Per-MahafuncArray breakdown** - Shows time consumed by each MahafuncArray, both total and average
4. **Time distribution statistics** - For each Mahafunc and MahafuncArray, track min/max/median execution times, not just averages

These reports should provide sufficient insight to identify performance bottlenecks and optimization opportunities.

### CLI commands for report generation

One or more commands should be added to `cli.ts` for processing a PerfDataStore and generating reports. These commands will:

* Read performance data from a PerfDataStore (typically FilesystemPerfDataStore)
* Generate the various report types listed above
* Output reports in human-readable format (and optionally JSON format for further processing)
* Allow filtering and customization (e.g., top N limit, sort order, filtering by MahafuncArray path) 

# Use of `performance.now()`

The `performance.now()` function is relatively new to Node.js, and provides highly precise time measurements.

It should be enough to simply do:

```js
const start = performance.now();
// Execute some stuff such as await mhObj.process($, metadata, () => { cleanOrDirty = 'dirty'; });
const end = performance.now();
const elapsed = end - start;
```

The `elapsed` value is what we're interested in as the measurement.


