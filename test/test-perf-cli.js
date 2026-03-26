
const fsp = require('fs').promises;
const path = require('path');
const { assert } = require('chai');
const { rimraf } = require('rimraf');
const { execSync } = require('child_process');

const mahabhuta = require('../dist/index');
const { FilesystemPerfDataStore } = mahabhuta;
const mahaMeta = require('../maha/metadata');

describe('Performance CLI', function() {

    const testMetricsDir = path.join(__dirname, 'test-cli-metrics');
    const cli = path.join(__dirname, '..', 'dist', 'cli.js');
    
    // Clean up before and after tests
    beforeEach(async function() {
        try {
            await rimraf(testMetricsDir);
        } catch (err) {
            // Ignore if doesn't exist
        }
    });

    after(async function() {
        try {
            await rimraf(testMetricsDir);
        } catch (err) {
            // Ignore if doesn't exist
        }
    });

    // Helper to create test metrics
    async function createTestMetrics() {
        const dataStore = new FilesystemPerfDataStore(testMetricsDir);
        const sample = await fsp.readFile('./docs/sample1.html', 'utf8');
        
        // Process multiple times to create metrics
        for (let i = 0; i < 3; i++) {
            await mahabhuta.processAsync(
                sample,
                {},
                [mahaMeta.mahabhutaArray({})],
                dataStore,
                `doc-${i}.html`
            );
        }
    }

    describe('perf-report command', function() {

        it('should display help', function() {
            const output = execSync(`node ${cli} perf-report --help`, {
                encoding: 'utf8'
            });

            assert.include(output, 'Generate performance reports');
            assert.include(output, 'report-type');
            assert.include(output, '--data-dir');
            assert.include(output, '--format');
        });

        it('should generate total report in text format', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report total --data-dir ${testMetricsDir}`, {
                encoding: 'utf8'
            });

            assert.include(output, 'Mahabhuta Performance Report');
            assert.include(output, 'Documents processed: 3');
            assert.include(output, 'Top');
            assert.include(output, 'Mahafuncs by Total Time');
        });

        it('should generate average report in text format', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report average --data-dir ${testMetricsDir}`, {
                encoding: 'utf8'
            });

            assert.include(output, 'Mahabhuta Performance Report');
            assert.include(output, 'Top');
            assert.include(output, 'Mahafuncs by Average Time');
        });

        it('should generate arrays report in text format', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report arrays --data-dir ${testMetricsDir}`, {
                encoding: 'utf8'
            });

            assert.include(output, 'Mahabhuta Performance Report');
            assert.include(output, 'By MahafuncArray');
        });

        it('should generate distribution report in text format', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report distribution --data-dir ${testMetricsDir}`, {
                encoding: 'utf8'
            });

            assert.include(output, 'Mahabhuta Performance Report');
            assert.include(output, 'Time Distribution');
            assert.include(output, 'Min:');
            assert.include(output, 'Max:');
            assert.include(output, 'Median:');
        });

        it('should generate all reports in text format', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report all --data-dir ${testMetricsDir}`, {
                encoding: 'utf8'
            });

            assert.include(output, 'Mahabhuta Performance Report');
            assert.include(output, 'by Total Time');
            assert.include(output, 'by Average Time');
            assert.include(output, 'By MahafuncArray');
            assert.include(output, 'Time Distribution');
        });

        it('should generate report in JSON format', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report all --data-dir ${testMetricsDir} --format json`, {
                encoding: 'utf8'
            });

            // Parse as JSON
            const data = JSON.parse(output);
            
            assert.isObject(data);
            assert.equal(data.documentCount, 3);
            assert.isNumber(data.totalProcessingMs);
            assert.isNumber(data.avgProcessingMs);
            assert.isArray(data.topByTotalTime);
            assert.isArray(data.topByAverageTime);
            assert.isArray(data.byArray);
            assert.isArray(data.distribution);
        });

        it('should respect --top option', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report total --data-dir ${testMetricsDir} --top 5 --format json`, {
                encoding: 'utf8'
            });

            const data = JSON.parse(output);
            assert.isAtMost(data.topByTotalTime.length, 5);
        });

        it('should filter by path pattern', async function() {
            await createTestMetrics();

            const outputAll = execSync(`node ${cli} perf-report total --data-dir ${testMetricsDir} --format json`, {
                encoding: 'utf8'
            });

            const outputFiltered = execSync(`node ${cli} perf-report total --data-dir ${testMetricsDir} --format json --filter "built"`, {
                encoding: 'utf8'
            });

            const dataAll = JSON.parse(outputAll);
            const dataFiltered = JSON.parse(outputFiltered);

            // Filtered should have fewer or equal items
            assert.isAtMost(dataFiltered.topByTotalTime.length, dataAll.topByTotalTime.length);
            
            // All filtered items should contain "built" in their path
            for (const item of dataFiltered.topByTotalTime) {
                const pathStr = item.arrayPath.join('/');
                assert.include(pathStr, 'built');
            }
        });

        it('should handle empty metrics directory gracefully', function() {
            // Don't create any metrics, just try to report
            const output = execSync(`node ${cli} perf-report all --data-dir ${testMetricsDir}`, {
                encoding: 'utf8'
            });

            assert.include(output, 'Documents processed: 0');
        });

        it('should handle non-existent metrics directory', function() {
            const nonExistentDir = path.join(__dirname, 'does-not-exist-dir');
            
            const output = execSync(`node ${cli} perf-report all --data-dir ${nonExistentDir}`, {
                encoding: 'utf8'
            });

            assert.include(output, 'Documents processed: 0');
        });
    });

    describe('Report content validation', function() {

        it('should include correct data in reports', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report all --data-dir ${testMetricsDir} --format json`, {
                encoding: 'utf8'
            });

            const data = JSON.parse(output);

            // Validate structure
            assert.equal(data.documentCount, 3);
            assert.isAbove(data.totalProcessingMs, 0);
            assert.isAbove(data.avgProcessingMs, 0);

            // Check topByTotalTime
            if (data.topByTotalTime.length > 0) {
                const item = data.topByTotalTime[0];
                assert.isArray(item.arrayPath);
                assert.isString(item.className);
                assert.isString(item.mahafuncType);
                assert.isString(item.selector);
                assert.isNumber(item.invocationCount);
                assert.isNumber(item.totalDurationMs);
                assert.isNumber(item.avgDurationMs);
                assert.isNumber(item.minDurationMs);
                assert.isNumber(item.maxDurationMs);
                assert.isNumber(item.medianDurationMs);
            }

            // Check byArray
            if (data.byArray.length > 0) {
                const item = data.byArray[0];
                assert.isArray(item.arrayPath);
                assert.isString(item.arrayType);
                assert.isString(item.name);
                assert.isNumber(item.invocationCount);
                assert.isNumber(item.totalDurationMs);
                assert.isNumber(item.avgDurationMs);
            }

            // Check distribution
            if (data.distribution.length > 0) {
                const item = data.distribution[0];
                assert.isArray(item.arrayPath);
                assert.isString(item.className);
                assert.isString(item.selector);
                assert.isNumber(item.invocationCount);
                assert.isNumber(item.min);
                assert.isNumber(item.max);
                assert.isNumber(item.median);
                assert.isNumber(item.avg);
            }
        });

        it('should sort by total time correctly', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report total --data-dir ${testMetricsDir} --format json`, {
                encoding: 'utf8'
            });

            const data = JSON.parse(output);

            // Verify sorting (descending by totalDurationMs)
            for (let i = 1; i < data.topByTotalTime.length; i++) {
                assert.isAtLeast(
                    data.topByTotalTime[i - 1].totalDurationMs,
                    data.topByTotalTime[i].totalDurationMs
                );
            }
        });

        it('should sort by average time correctly', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report average --data-dir ${testMetricsDir} --format json`, {
                encoding: 'utf8'
            });

            const data = JSON.parse(output);

            // Verify sorting (descending by avgDurationMs)
            for (let i = 1; i < data.topByAverageTime.length; i++) {
                assert.isAtLeast(
                    data.topByAverageTime[i - 1].avgDurationMs,
                    data.topByAverageTime[i].avgDurationMs
                );
            }
        });
    });

    describe('Text format readability', function() {

        it('should format array paths with separators', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report total --data-dir ${testMetricsDir}`, {
                encoding: 'utf8'
            });

            // Should show paths like "master > plugin-name"
            assert.match(output, /master\s+>\s+\w+/);
        });

        it('should show timing values with appropriate precision', async function() {
            await createTestMetrics();

            const output = execSync(`node ${cli} perf-report distribution --data-dir ${testMetricsDir}`, {
                encoding: 'utf8'
            });

            // Should show values like "12.34ms"
            assert.match(output, /\d+\.\d{2}ms/);
        });
    });
});
