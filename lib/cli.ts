
import { program } from 'commander';
import * as mahabhuta from './index.js';
import { promises as fsp } from 'fs';
import YAML from 'js-yaml';
import { FilesystemPerfDataStore } from './FilesystemPerfDataStore.js';
import { AggregatedStats, MahafuncStats, MahafuncArrayStats } from './PerfDataStore.js';

// mahabhuta process file.html -o file2.html -m mahafuncs.js -m mahafuncs2.js -m mahafuncs3.js --options options.yaml --metadata metadata.yaml

const packageJSON = require('../package.json');

process.title = 'mahabhuta';
program.version(packageJSON.version, '-v, --version', 'output the current version');

// DEFAULT CHEERIO CONFIG

// Cheerio Config
// Trace Processing
// Trace Performance
// metadata

program
    .command('process <inputFN>')
    .description('Process an input file using supplied mahabhuta arrays')
    .option('-o, --output <outputFN>', 'Specify output file name')
    .option('-m, --module <mahafuncFN...>', 'JavaScript file (or files) containing a defined MahafuncArray')
    .option('-c, --config <cheerioConfig>', 'YAML file containing Cheerio configuration')
    .option('--trace-performance', 'Trace performance data')
    .option('--trace-processing', 'Trace processing')
    .option('--metadata <metadataFN>', 'YAML file containing data')
    .option('--options <optionsFN', 'YAML file containing options for mahabhuta arrays')
    .option('--partials', 'Enable the <partial> MahaFuncs')
    .option('--partials-dir <dirFN...>', 'Directory name for partial templates')
    .action(async (inputFN, cmdObj) => {
        try {
            // console.log(inputFN);
            // console.log(cmdObj);

            if (!inputFN) throw new Error('No input file specified');

            if (cmdObj.config) {

                const txt = await fsp.readFile(cmdObj.config, 'utf8');
                // console.log(`Read config ${cmdObj.config}`, txt);
                const cheerioConfig: any = YAML.load(txt);

                // For cheerio 1.0.0-rc.10 we need to use this setting.
                // If the configuration has set this, we must not
                // override their setting.  But, generally, for correct
                // operation and handling of Mahabhuta tags, we need
                // this setting to be <code>true</code>
                if (!('_useHtmlParser2' in cheerioConfig)) {
                    cheerioConfig._useHtmlParser2 = true;
                }
                // console.log(`Setting cheerioConfig `, cheerioConfig);
                mahabhuta.config(cheerioConfig);
            }
            // console.log('After config');

            if (cmdObj.tracePerformance) mahabhuta.setTracePerformance(true);
            if (cmdObj.traceProcessing)  mahabhuta.setTraceProcessing(true);

            let metadata = {};
            if (cmdObj.metadata) {
                const txt = await fsp.readFile(cmdObj.metadata, 'utf8');
                // console.log(`Read metadata ${cmdObj.metadata}`, txt);
                metadata = YAML.load(txt);
            }
            // console.log('After metadata');

            let mhOptions = {};
            if (cmdObj.options) {
                const txt = await fsp.readFile(cmdObj.options, 'utf8');
                // console.log(`Read options ${cmdObj.options}`, txt);
                mhOptions = YAML.load(txt);
            }
            // console.log('After options');

            const inputFile = await fsp.readFile(inputFN, 'utf8');
            // console.log(`input file ${inputFile}`, inputFile);

            const mahafuncs = [];
            for (const arrayFN of cmdObj.module) {
                const arrayModule = require(arrayFN);
                // console.log(`MahafuncArray ${arrayFN}`);
                if (!arrayModule.mahabhutaArray) {
                    throw new Error(`No mahabhutaArray function in ${arrayFN}`);
                }
                mahafuncs.push(arrayModule.mahabhutaArray(mhOptions));
            }

            let partialsModule;
            if (cmdObj.partials) {
                partialsModule = require('../maha/partial.js');
                // console.log(partialsModule);
                if (!partialsModule.configuration.partialDirs) {
                    partialsModule.configuration.partialDirs = [];
                }

                if (cmdObj.partialsDir) {
                    for (const dirFN of cmdObj.partialsDir) {
                        partialsModule.configuration.partialDirs.push(dirFN);
                    }
                }
                mahafuncs.push(partialsModule.mahabhutaArray(mhOptions));
            }

            const output = await mahabhuta.processAsync(
                inputFile,
                metadata,
                mahafuncs
            );
            if (cmdObj.output) {
                await fsp.writeFile(cmdObj.output, output, 'utf8');
            } else {
                // console.log('////////////////////////// OUTPUT');
                console.log(output);
                // console.log('\\\\\\\\\\\\\\\\\\\\\\\\\\ OUTPUT');
            }
        } catch (e) {
            console.error(`process command ERRORED ${e.stack}`);
        }

    });

// Performance reporting commands
program
    .command('perf-report')
    .description('Generate performance reports from stored metrics')
    .argument('<report-type>', 'Report type: total, average, arrays, distribution, or all')
    .option('--data-dir <path>', 'Path to performance data directory', './mahabhuta-metrics')
    .option('--top <N>', 'Limit to top N entries', '20')
    .option('--format <type>', 'Output format: text or json', 'text')
    .option('--filter <pattern>', 'Filter by MahafuncArray path pattern')
    .action(async (reportType, cmdObj) => {
        try {
            const dataStore = new FilesystemPerfDataStore(cmdObj.dataDir);
            const stats = await dataStore.getAggregatedStats();
            const topN = parseInt(cmdObj.top, 10);
            const filter = cmdObj.filter || null;

            if (cmdObj.format === 'json') {
                // JSON output
                const output = generateJSONReport(reportType, stats, topN, filter);
                console.log(JSON.stringify(output, null, 2));
            } else {
                // Text output
                const output = generateTextReport(reportType, stats, topN, filter);
                console.log(output);
            }
        } catch (e) {
            console.error(`perf-report command ERRORED ${e.stack}`);
        }
    });

/**
 * Filter stats by array path pattern if provided
 */
function filterByPath<T extends { arrayPath: string[] }>(items: T[], pattern: string | null): T[] {
    if (!pattern) return items;
    return items.filter(item => {
        const pathStr = item.arrayPath.join('/');
        return pathStr.includes(pattern);
    });
}

/**
 * Generate JSON format report
 */
function generateJSONReport(reportType: string, stats: AggregatedStats, topN: number, filter: string | null): any {
    const output: any = {
        documentCount: stats.documentCount,
        totalProcessingMs: stats.totalProcessingMs,
        avgProcessingMs: stats.avgProcessingMs
    };

    if (reportType === 'total' || reportType === 'all') {
        const filtered = filterByPath(stats.byMahafunc, filter);
        output.topByTotalTime = filtered
            .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
            .slice(0, topN);
    }

    if (reportType === 'average' || reportType === 'all') {
        const filtered = filterByPath(stats.byMahafunc, filter);
        output.topByAverageTime = filtered
            .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
            .slice(0, topN);
    }

    if (reportType === 'arrays' || reportType === 'all') {
        const filtered = filterByPath(stats.byArray, filter);
        output.byArray = filtered
            .sort((a, b) => b.totalDurationMs - a.totalDurationMs);
    }

    if (reportType === 'distribution' || reportType === 'all') {
        const filtered = filterByPath(stats.byMahafunc, filter);
        output.distribution = filtered
            .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
            .slice(0, topN)
            .map(s => ({
                arrayPath: s.arrayPath,
                className: s.className,
                selector: s.selector,
                invocationCount: s.invocationCount,
                min: s.minDurationMs,
                max: s.maxDurationMs,
                median: s.medianDurationMs,
                avg: s.avgDurationMs
            }));
    }

    return output;
}

/**
 * Generate text format report
 */
function generateTextReport(reportType: string, stats: AggregatedStats, topN: number, filter: string | null): string {
    const lines: string[] = [];

    lines.push('=== Mahabhuta Performance Report ===\n');
    lines.push(`Documents processed: ${stats.documentCount}`);
    lines.push(`Total processing time: ${stats.totalProcessingMs.toFixed(2)}ms`);
    lines.push(`Average per document: ${stats.avgProcessingMs.toFixed(2)}ms`);
    if (filter) {
        lines.push(`Filter: ${filter}`);
    }
    lines.push('');

    if (reportType === 'total' || reportType === 'all') {
        lines.push(`--- Top ${topN} Mahafuncs by Total Time ---`);
        const filtered = filterByPath(stats.byMahafunc, filter);
        const sorted = filtered
            .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
            .slice(0, topN);
        
        for (const s of sorted) {
            const pathStr = s.arrayPath.join(' > ');
            lines.push(`  ${pathStr}`);
            lines.push(`    ${s.className} (${s.selector}):`);
            lines.push(`    ${s.totalDurationMs.toFixed(2)}ms total, ${s.invocationCount} calls`);
        }
        lines.push('');
    }

    if (reportType === 'average' || reportType === 'all') {
        lines.push(`--- Top ${topN} Mahafuncs by Average Time ---`);
        const filtered = filterByPath(stats.byMahafunc, filter);
        const sorted = filtered
            .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
            .slice(0, topN);
        
        for (const s of sorted) {
            const pathStr = s.arrayPath.join(' > ');
            lines.push(`  ${pathStr}`);
            lines.push(`    ${s.className} (${s.selector}):`);
            lines.push(`    ${s.avgDurationMs.toFixed(2)}ms avg, ${s.invocationCount} calls`);
        }
        lines.push('');
    }

    if (reportType === 'arrays' || reportType === 'all') {
        lines.push('--- By MahafuncArray ---');
        const filtered = filterByPath(stats.byArray, filter);
        const sorted = filtered
            .sort((a, b) => b.totalDurationMs - a.totalDurationMs);
        
        for (const s of sorted) {
            const pathStr = s.arrayPath.join(' > ');
            lines.push(`  ${pathStr}:`);
            lines.push(`    ${s.totalDurationMs.toFixed(2)}ms total, ${s.avgDurationMs.toFixed(2)}ms avg, ${s.invocationCount} calls`);
        }
        lines.push('');
    }

    if (reportType === 'distribution' || reportType === 'all') {
        lines.push(`--- Time Distribution (Top ${topN}) ---`);
        const filtered = filterByPath(stats.byMahafunc, filter);
        const sorted = filtered
            .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
            .slice(0, topN);
        
        for (const s of sorted) {
            const pathStr = s.arrayPath.join(' > ');
            lines.push(`  ${pathStr}`);
            lines.push(`    ${s.className} (${s.selector}):`);
            lines.push(`    Min: ${s.minDurationMs.toFixed(2)}ms, Max: ${s.maxDurationMs.toFixed(2)}ms`);
            lines.push(`    Median: ${s.medianDurationMs.toFixed(2)}ms, Avg: ${s.avgDurationMs.toFixed(2)}ms`);
            lines.push(`    ${s.invocationCount} calls`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

program.parse();
