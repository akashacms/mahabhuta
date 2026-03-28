/**
 * Filesystem-based implementation of PerfDataStore
 * Stores performance metrics as JSON files in a directory
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
    PerfDataStore,
    ProcessMetrics,
    AggregatedStats,
    MahafuncStats,
    MahafuncArrayStats,
    MahafuncTiming,
    MahafuncArrayTiming
} from './PerfDataStore';

export class FilesystemPerfDataStore extends PerfDataStore {
    private dirPath: string;

    /**
     * Create a new FilesystemPerfDataStore
     * @param dirPath Directory path where metrics files will be stored
     */
    constructor(dirPath: string) {
        super();
        this.dirPath = dirPath;
    }

    /**
     * Ensure the storage directory exists
     */
    private async ensureDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.dirPath, { recursive: true });
        } catch (err) {
            throw new Error(`Failed to create metrics directory ${this.dirPath}: ${err.message}`);
        }
    }

    /**
     * Generate a filename for storing metrics
     * Uses timestamp and optional documentId for uniqueness
     */
    private generateFilename(metrics: ProcessMetrics): string {
        const timestamp = Math.floor(metrics.timestamp);
        const docPart = metrics.documentId 
            ? `-${metrics.documentId.replace(/[^a-zA-Z0-9]/g, '_')}` 
            : '';
        return `metrics-${timestamp}${docPart}.json`;
    }

    /**
     * Record metrics from a single process() execution
     */
    async recordProcessMetrics(metrics: ProcessMetrics): Promise<void> {
        await this.ensureDirectory();
        
        const filename = this.generateFilename(metrics);
        const filePath = path.join(this.dirPath, filename);
        
        try {
            const json = JSON.stringify(metrics, null, 2);
            await fs.writeFile(filePath, json, 'utf8');
        } catch (err) {
            throw new Error(`Failed to write metrics to ${filePath}: ${err.message}`);
        }
    }

    /**
     * Retrieve all stored metrics
     */
    async getAllMetrics(): Promise<ProcessMetrics[]> {
        try {
            const files = await fs.readdir(this.dirPath);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            const metrics: ProcessMetrics[] = [];
            
            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(this.dirPath, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const parsed = JSON.parse(content);
                    metrics.push(parsed);
                } catch (err) {
                    // Skip files that can't be read or parsed
                    console.warn(`Warning: Could not read metrics file ${file}: ${err.message}`);
                }
            }
            
            return metrics;
        } catch (err) {
            if ((err as any).code === 'ENOENT') {
                // Directory doesn't exist yet, return empty array
                return [];
            }
            throw new Error(`Failed to read metrics from ${this.dirPath}: ${err.message}`);
        }
    }

    /**
     * Clear all stored metrics
     */
    async clear(): Promise<void> {
        try {
            const files = await fs.readdir(this.dirPath);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            for (const file of jsonFiles) {
                const filePath = path.join(this.dirPath, file);
                await fs.unlink(filePath);
            }
        } catch (err) {
            if ((err as any).code === 'ENOENT') {
                // Directory doesn't exist, nothing to clear
                return;
            }
            throw new Error(`Failed to clear metrics from ${this.dirPath}: ${err.message}`);
        }
    }

    /**
     * Calculate median from an array of numbers
     */
    private calculateMedian(values: number[]): number {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        } else {
            return sorted[mid];
        }
    }

    /**
     * Get aggregated statistics across all stored metrics
     */
    async getAggregatedStats(): Promise<AggregatedStats> {
        const allMetrics = await this.getAllMetrics();
        
        const stats: AggregatedStats = {
            documentCount: allMetrics.length,
            totalProcessingMs: 0,
            avgProcessingMs: 0,
            byMahafunc: [],
            byArray: []
        };

        // Calculate total processing time
        for (const metrics of allMetrics) {
            stats.totalProcessingMs += metrics.totalDurationMs;
        }
        
        if (stats.documentCount > 0) {
            stats.avgProcessingMs = stats.totalProcessingMs / stats.documentCount;
        }

        // Aggregate by Mahafunc
        // Key: arrayPath + className + selector
        const mahafuncMap = new Map<string, {
            arrayPath: string[];
            className: string;
            mahafuncType: string;
            selector: string;
            durations: number[];
        }>();

        for (const metrics of allMetrics) {
            for (const timing of metrics.mahafuncTimings) {
                const key = JSON.stringify(timing.arrayPath) + '::' + timing.className + '::' + timing.selector;
                
                if (!mahafuncMap.has(key)) {
                    mahafuncMap.set(key, {
                        arrayPath: timing.arrayPath,
                        className: timing.className,
                        mahafuncType: timing.mahafuncType,
                        selector: timing.selector,
                        durations: []
                    });
                }
                
                mahafuncMap.get(key)!.durations.push(timing.durationMs);
            }
        }

        // Convert to stats
        for (const [key, data] of mahafuncMap) {
            const durations = data.durations;
            const totalDuration = durations.reduce((sum, d) => sum + d, 0);
            
            stats.byMahafunc.push({
                arrayPath: data.arrayPath,
                className: data.className,
                mahafuncType: data.mahafuncType,
                selector: data.selector,
                invocationCount: durations.length,
                totalDurationMs: totalDuration,
                avgDurationMs: totalDuration / durations.length,
                minDurationMs: Math.min(...durations),
                maxDurationMs: Math.max(...durations),
                medianDurationMs: this.calculateMedian(durations)
            });
        }

        // Aggregate by MahafuncArray
        // Key: arrayPath + name
        const arrayMap = new Map<string, {
            arrayPath: string[];
            arrayType: string;
            name: string;
            durations: number[];
        }>();

        for (const metrics of allMetrics) {
            for (const timing of metrics.arrayTimings) {
                const key = JSON.stringify(timing.arrayPath) + '::' + timing.name;
                
                if (!arrayMap.has(key)) {
                    arrayMap.set(key, {
                        arrayPath: timing.arrayPath,
                        arrayType: timing.arrayType,
                        name: timing.name,
                        durations: []
                    });
                }
                
                arrayMap.get(key)!.durations.push(timing.durationMs);
            }
        }

        // Convert to stats
        for (const [key, data] of arrayMap) {
            const durations = data.durations;
            const totalDuration = durations.reduce((sum, d) => sum + d, 0);
            
            stats.byArray.push({
                arrayPath: data.arrayPath,
                arrayType: data.arrayType,
                name: data.name,
                invocationCount: durations.length,
                totalDurationMs: totalDuration,
                avgDurationMs: totalDuration / durations.length,
                minDurationMs: Math.min(...durations),
                maxDurationMs: Math.max(...durations),
                medianDurationMs: this.calculateMedian(durations)
            });
        }

        return stats;
    }
}
