---
layout: ebook-page.html.ejs
title: Using the Mahabhuta command-line tool
publicationDate: July 24, 2022
---

```
Usage: mahabhuta [options] [command]

Options:
  -v, --version                output the current version
  -h, --help                   display help for command

Commands:
  process [options] <inputFN>  Process an input file using supplied mahabhuta arrays
  help [command]               display help for command
```

There is one command -- `mahabhuta process`

```
Usage: mahabhuta process [options] <inputFN>

Process an input file using supplied mahabhuta arrays

Options:
  -o, --output <outputFN>       Specify output file name
  -m, --module <mahafuncFN...>  JavaScript file (or files) containing a defined MahafuncArray
  -c, --config <cheerioConfig>  YAML file containing Cheerio configuration
  --trace-performance           Trace performance data
  --trace-processing            Trace processing
  --metadata <metadataFN>       YAML file containing data
  --options <optionsFN          YAML file containing options for mahabhuta arrays
  --partials                    Enable the <partial> MahaFuncs
  --partials-dir <dirFN...>     Directory name for partial templates
  -h, --help                    display help for command
```

On the command line we put a file name to process -- `inputFN` -- and add the options to tailor its processing.

The `--output` option sends the processed output to the file.

The `--config` option is to control the Cheerio configuration.

The `--module` option can be used multiple times.  It specifies the file name for a JavaScript file to `require` that contains a `mahabhutaArray` function.  Specifically, it must be a Node.js module with the following function:

```js
module.exports.mahabhutaArray = function(options) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    // add Mahafuncs
    return ret;
};
```

The `--metadata` option specifies a file containing metadata to supply in the `metadata` parameter of Mahafuncs.

The `--options` option is a file containing values to supply as the `options` argument of the `mahabhutaArray` function, and are then used by Mahabhuta plugins to tailor their behavior.

The `--partials` option enables the Mahabhuta plugin which handles `<partial>`.

The `--partials-dir` options can be used multiple times.  It specifies the path name for a directory to search for partial templates.


