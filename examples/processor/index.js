
const mahabhuta = require('../../index');  // or require('mahabhuta')
const maha_partial = require('../../maha/partial');  // or require('mahabhuta/maha/partial')
const maha_metadata = require('../../maha/metadata');  // or require('mahabhuta/maha/metadata')
// const maha_microformats = require('../../maha/microformats'); // or require('mahabhuta/maha/microformats')

const path = require('path');
const fs = require('fs-extra');
const program   = require('commander');

program
    .command('process <htmlFN>')
    .description('Process an HTML file')
    .action(async (htmlFN) => {

        let master_funcs = new mahabhuta.MahafuncArray("master", {});
        master_funcs.addMahafunc(maha_partial.mahabhutaArray({
            partialDirs: [
                path.join(__dirname, 'partials')
            ]
        }));
        master_funcs.addMahafunc(maha_metadata.mahabhutaArray({
            // options
        }));
        const text = await fs.readFile(htmlFN, 'utf8');
        console.log(`****** process got input text\n`, text)
        console.log(`****** process resulted with\n`, await mahabhuta.processAsync(text, {}, master_funcs));
    });


program.parse(process.argv);
