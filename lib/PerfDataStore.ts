/**
 * Performance measurement data structures and storage for Mahabhuta
 */

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
