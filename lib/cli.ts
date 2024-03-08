
import { program } from 'commander';
import * as mahabhuta from './index.js';
import { promises as fsp } from 'fs';
import YAML from 'js-yaml';

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

program.parse();
