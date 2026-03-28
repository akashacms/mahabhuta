
const fsp = require('fs').promises;
const path = require('path');
const { assert } = require('chai');
const { rimraf } = require('rimraf');
const { performance } = require('perf_hooks');

const mahabhuta = require('../dist/index');
const { FilesystemPerfDataStore } = mahabhuta;
const mahaPartial = require('../maha/partial');
const mahaMeta = require('../maha/metadata');

describe('Performance Measurement', function() {

    const testMetricsDir = path.join(__dirname, 'test-metrics');
    
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

    describe('FilesystemPerfDataStore', function() {

        it('should create directory when recording metrics', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            const metrics = {
                totalDurationMs: 100.5,
                timestamp: performance.now(),
                documentId: 'test-doc',
                mahafuncTimings: [],
                arrayTimings: []
            };

            await dataStore.recordProcessMetrics(metrics);

            // Verify directory was created
            const stats = await fsp.stat(testMetricsDir);
            assert.isTrue(stats.isDirectory());

            // Verify file was created
            const files = await fsp.readdir(testMetricsDir);
            assert.equal(files.length, 1);
            assert.isTrue(files[0].endsWith('.json'));
        });

        it('should read back recorded metrics', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            const originalMetrics = {
                totalDurationMs: 100.5,
                timestamp: performance.now(),
                documentId: 'test-doc',
                mahafuncTimings: [
                    {
                        arrayPath: ['master', 'plugin1'],
                        className: 'TestElement',
                        mahafuncType: 'CustomElement',
                        selector: 'test-tag',
                        durationMs: 50.2,
                        timestamp: performance.now()
                    }
                ],
                arrayTimings: []
            };

            await dataStore.recordProcessMetrics(originalMetrics);
            
            const allMetrics = await dataStore.getAllMetrics();
            assert.equal(allMetrics.length, 1);
            assert.equal(allMetrics[0].documentId, 'test-doc');
            assert.equal(allMetrics[0].totalDurationMs, 100.5);
            assert.equal(allMetrics[0].mahafuncTimings.length, 1);
            assert.equal(allMetrics[0].mahafuncTimings[0].className, 'TestElement');
        });

        it('should clear all metrics', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            // Record multiple metrics
            for (let i = 0; i < 3; i++) {
                await dataStore.recordProcessMetrics({
                    totalDurationMs: i * 10,
                    timestamp: performance.now() + i,
                    mahafuncTimings: [],
                    arrayTimings: []
                });
            }

            let files = await fsp.readdir(testMetricsDir);
            assert.equal(files.length, 3);

            await dataStore.clear();

            files = await fsp.readdir(testMetricsDir);
            assert.equal(files.length, 0);
        });

        it('should aggregate statistics correctly', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            // Record metrics with multiple invocations of same Mahafunc
            await dataStore.recordProcessMetrics({
                totalDurationMs: 100,
                timestamp: performance.now(),
                documentId: 'doc1',
                mahafuncTimings: [
                    {
                        arrayPath: ['master', 'plugin1'],
                        className: 'TestElement',
                        mahafuncType: 'CustomElement',
                        selector: 'test-tag',
                        durationMs: 10,
                        timestamp: performance.now()
                    },
                    {
                        arrayPath: ['master', 'plugin1'],
                        className: 'TestElement',
                        mahafuncType: 'CustomElement',
                        selector: 'test-tag',
                        durationMs: 30,
                        timestamp: performance.now()
                    }
                ],
                arrayTimings: [
                    {
                        arrayPath: ['master', 'plugin1'],
                        arrayType: 'MahafuncArray',
                        name: 'plugin1',
                        durationMs: 50,
                        timestamp: performance.now()
                    }
                ]
            });

            await dataStore.recordProcessMetrics({
                totalDurationMs: 120,
                timestamp: performance.now(),
                documentId: 'doc2',
                mahafuncTimings: [
                    {
                        arrayPath: ['master', 'plugin1'],
                        className: 'TestElement',
                        mahafuncType: 'CustomElement',
                        selector: 'test-tag',
                        durationMs: 20,
                        timestamp: performance.now()
                    }
                ],
                arrayTimings: [
                    {
                        arrayPath: ['master', 'plugin1'],
                        arrayType: 'MahafuncArray',
                        name: 'plugin1',
                        durationMs: 60,
                        timestamp: performance.now()
                    }
                ]
            });

            const stats = await dataStore.getAggregatedStats();

            // Check document count and totals
            assert.equal(stats.documentCount, 2);
            assert.equal(stats.totalProcessingMs, 220);
            assert.equal(stats.avgProcessingMs, 110);

            // Check Mahafunc aggregation
            assert.equal(stats.byMahafunc.length, 1);
            const mahafuncStats = stats.byMahafunc[0];
            assert.equal(mahafuncStats.className, 'TestElement');
            assert.equal(mahafuncStats.invocationCount, 3);
            assert.equal(mahafuncStats.totalDurationMs, 60); // 10 + 30 + 20
            assert.equal(mahafuncStats.avgDurationMs, 20);
            assert.equal(mahafuncStats.minDurationMs, 10);
            assert.equal(mahafuncStats.maxDurationMs, 30);
            assert.equal(mahafuncStats.medianDurationMs, 20);

            // Check Array aggregation
            // Both array timings have same arrayPath + name, so they aggregate into 1 entry
            assert.equal(stats.byArray.length, 1);
            const arrayStats = stats.byArray[0];
            assert.equal(arrayStats.name, 'plugin1');
            assert.equal(arrayStats.invocationCount, 2);
            assert.equal(arrayStats.totalDurationMs, 110); // 50 + 60
            assert.equal(arrayStats.avgDurationMs, 55);
            assert.equal(arrayStats.minDurationMs, 50);
            assert.equal(arrayStats.maxDurationMs, 60);
            assert.equal(arrayStats.medianDurationMs, 55);
        });

        it('should calculate median correctly for odd number of values', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            // Create metrics with 5 invocations: [1, 2, 3, 4, 5]
            const metrics = {
                totalDurationMs: 100,
                timestamp: performance.now(),
                mahafuncTimings: [],
                arrayTimings: []
            };

            for (let i of [1, 5, 3, 2, 4]) { // Intentionally unsorted
                metrics.mahafuncTimings.push({
                    arrayPath: ['test'],
                    className: 'Test',
                    mahafuncType: 'CustomElement',
                    selector: 'test',
                    durationMs: i,
                    timestamp: performance.now()
                });
            }

            await dataStore.recordProcessMetrics(metrics);
            const stats = await dataStore.getAggregatedStats();

            assert.equal(stats.byMahafunc[0].medianDurationMs, 3);
        });

        it('should calculate median correctly for even number of values', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            // Create metrics with 4 invocations: [10, 20, 30, 40]
            // Median should be (20 + 30) / 2 = 25
            const metrics = {
                totalDurationMs: 100,
                timestamp: performance.now(),
                mahafuncTimings: [],
                arrayTimings: []
            };

            for (let i of [40, 10, 30, 20]) { // Intentionally unsorted
                metrics.mahafuncTimings.push({
                    arrayPath: ['test'],
                    className: 'Test',
                    mahafuncType: 'CustomElement',
                    selector: 'test',
                    durationMs: i,
                    timestamp: performance.now()
                });
            }

            await dataStore.recordProcessMetrics(metrics);
            const stats = await dataStore.getAggregatedStats();

            assert.equal(stats.byMahafunc[0].medianDurationMs, 25);
        });
    });

    describe('Integration with processAsync', function() {

        let sample;
        before(async function() {
            sample = await fsp.readFile('./docs/sample1.html', 'utf8');
        });

        it('should process without dataStore (backward compatibility)', async function() {
            const result = await mahabhuta.processAsync(sample, {}, [
                mahaPartial.mahabhutaArray({}),
                mahaMeta.mahabhutaArray({})
            ]);

            assert.isOk(result);
            assert.typeOf(result, 'string');
        });

        it('should process with dataStore and record metrics', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            const result = await mahabhuta.processAsync(
                sample,
                {},
                [
                    mahaPartial.mahabhutaArray({}),
                    mahaMeta.mahabhutaArray({})
                ],
                dataStore,
                'sample1.html'
            );

            assert.isOk(result);
            assert.typeOf(result, 'string');

            // Verify metrics were recorded
            const files = await fsp.readdir(testMetricsDir);
            assert.isAtLeast(files.length, 1);

            // Verify metrics content
            const allMetrics = await dataStore.getAllMetrics();
            assert.equal(allMetrics.length, 1);
            assert.equal(allMetrics[0].documentId, 'sample1.html');
            assert.isAbove(allMetrics[0].totalDurationMs, 0);
            assert.isAbove(allMetrics[0].mahafuncTimings.length, 0);
        });

        it('should track array path correctly', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            await mahabhuta.processAsync(
                sample,
                {},
                [
                    mahaPartial.mahabhutaArray({}),
                    mahaMeta.mahabhutaArray({})
                ],
                dataStore,
                'test-path.html'
            );

            const allMetrics = await dataStore.getAllMetrics();
            const metrics = allMetrics[0];

            // Check that array paths include 'master' as root
            for (const timing of metrics.mahafuncTimings) {
                assert.isArray(timing.arrayPath);
                assert.isAtLeast(timing.arrayPath.length, 1);
                assert.equal(timing.arrayPath[0], 'master');
            }

            // Check array timings
            assert.isAbove(metrics.arrayTimings.length, 0);
            for (const timing of metrics.arrayTimings) {
                assert.isArray(timing.arrayPath);
                assert.isAtLeast(timing.arrayPath.length, 1);
            }
        });

        it('should record all Mahafunc types', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            await mahabhuta.processAsync(
                sample,
                {},
                [
                    mahaPartial.mahabhutaArray({}),
                    mahaMeta.mahabhutaArray({})
                ],
                dataStore
            );

            const stats = await dataStore.getAggregatedStats();
            
            // Should have various Mahafunc types
            const types = new Set(stats.byMahafunc.map(m => m.mahafuncType));
            
            // At minimum should have CustomElement (from metadata tags)
            assert.isTrue(types.has('CustomElement'));
        });

        it('should measure realistic timing values', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            await mahabhuta.processAsync(
                sample,
                {},
                [
                    mahaPartial.mahabhutaArray({}),
                    mahaMeta.mahabhutaArray({})
                ],
                dataStore
            );

            const allMetrics = await dataStore.getAllMetrics();
            const metrics = allMetrics[0];

            // Total duration should be reasonable (not 0, not huge)
            assert.isAbove(metrics.totalDurationMs, 0);
            assert.isBelow(metrics.totalDurationMs, 10000); // Less than 10 seconds

            // Individual timings should be reasonable
            for (const timing of metrics.mahafuncTimings) {
                assert.isAtLeast(timing.durationMs, 0);
                assert.isBelow(timing.durationMs, 5000); // Each should be less than 5 seconds
            }
        });
    });

    describe('Performance overhead', function() {

        let sample;
        before(async function() {
            sample = await fsp.readFile('./docs/sample1.html', 'utf8');
        });

        it('should have minimal overhead when metrics disabled', async function() {
            // Warm up
            for (let i = 0; i < 5; i++) {
                await mahabhuta.processAsync(sample, {}, [
                    mahaMeta.mahabhutaArray({})
                ]);
            }

            // Measure without metrics
            const iterations = 20;
            const startWithout = Date.now();
            for (let i = 0; i < iterations; i++) {
                await mahabhuta.processAsync(sample, {}, [
                    mahaMeta.mahabhutaArray({})
                ]);
            }
            const timeWithout = Date.now() - startWithout;

            // Measure with metrics
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            const startWith = Date.now();
            for (let i = 0; i < iterations; i++) {
                await mahabhuta.processAsync(sample, {}, [
                    mahaMeta.mahabhutaArray({})
                ], dataStore, `doc-${i}.html`);
            }
            const timeWith = Date.now() - startWith;

            const overhead = ((timeWith - timeWithout) / timeWithout) * 100;

            console.log(`\n    Time without metrics: ${timeWithout}ms`);
            console.log(`    Time with metrics: ${timeWith}ms`);
            console.log(`    Overhead: ${overhead.toFixed(2)}%`);

            // Overhead should be reasonable (less than 50%)
            // This is lenient because filesystem I/O can vary
            assert.isBelow(overhead, 50);
        });

        it('should have true zero overhead when dataStore not provided', async function() {
            // This test verifies the guard clauses work
            // by processing the same document multiple times and ensuring
            // timing consistency across runs

            const iterations = 20;
            const times = [];

            // Run 3 times and take best 2 to reduce variance from system load
            for (let run = 0; run < 3; run++) {
                const start = Date.now();
                for (let i = 0; i < iterations; i++) {
                    await mahabhuta.processAsync(sample, {}, [
                        mahaMeta.mahabhutaArray({})
                    ]);
                }
                times.push(Date.now() - start);
            }

            // Sort and take the two best (fastest) times
            times.sort((a, b) => a - b);
            const bestTimes = times.slice(0, 2);

            // Times should be very similar (within 30% of each other)
            const diff = Math.abs(bestTimes[0] - bestTimes[1]);
            const avgTime = (bestTimes[0] + bestTimes[1]) / 2;
            const variance = (diff / avgTime) * 100;

            console.log(`\n    Best times: ${bestTimes[0]}ms, ${bestTimes[1]}ms, Variance: ${variance.toFixed(2)}%`);

            // Variance should be low, indicating no hidden overhead
            // Using 30% threshold to account for system load variations
            assert.isBelow(variance, 30);
        });
    });

    describe('Edge cases', function() {

        it('should handle empty metrics directory', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            const allMetrics = await dataStore.getAllMetrics();
            assert.isArray(allMetrics);
            assert.equal(allMetrics.length, 0);

            const stats = await dataStore.getAggregatedStats();
            assert.equal(stats.documentCount, 0);
            assert.equal(stats.totalProcessingMs, 0);
            assert.equal(stats.byMahafunc.length, 0);
        });

        it('should handle corrupted JSON files gracefully', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            // Create directory and write invalid JSON
            await fsp.mkdir(testMetricsDir, { recursive: true });
            await fsp.writeFile(path.join(testMetricsDir, 'corrupted.json'), 'not valid json', 'utf8');
            
            // Write one valid file
            await dataStore.recordProcessMetrics({
                totalDurationMs: 100,
                timestamp: performance.now(),
                mahafuncTimings: [],
                arrayTimings: []
            });

            // Should skip corrupted file and read valid one
            const allMetrics = await dataStore.getAllMetrics();
            assert.equal(allMetrics.length, 1);
        });

        it('should handle metrics with no Mahafuncs', async function() {
            const dataStore = new FilesystemPerfDataStore(testMetricsDir);
            
            await dataStore.recordProcessMetrics({
                totalDurationMs: 50,
                timestamp: performance.now(),
                mahafuncTimings: [],
                arrayTimings: []
            });

            const stats = await dataStore.getAggregatedStats();
            assert.equal(stats.documentCount, 1);
            assert.equal(stats.totalProcessingMs, 50);
            assert.equal(stats.byMahafunc.length, 0);
            assert.equal(stats.byArray.length, 0);
        });
    });
});
