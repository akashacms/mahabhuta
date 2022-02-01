/**
 * Copyright 2014-2019 David Herron
 *
 * The MIT License (MIT)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

'use strict';

import * as cheerio from 'cheerio';
import * as util from 'util';

export { Mahafunc } from './Mahafunc';
export { CustomElement } from './CustomElement';
export { ElementTweaker } from './ElementTweaker';
export { MahafuncArray, MahafuncType } from './MahafuncArray';
export { Munger } from './Munger';
export { PageProcessor } from './PageProcessor';

import { Mahafunc } from './Mahafunc';
import { MahafuncArray, MahafuncType } from './MahafuncArray';

let configCheerio;
let traceFlag = false;
let tracePerf = false;

/**
 * Set the Cheerio configuration.
 * @param _configCheerio Object corresponding to Cheerio documentation
 * @see {@link https://www.npmjs.com/package/cheerio} for Cheerio documentation
 */
export function config(_configCheerio) {
    configCheerio = _configCheerio;
}

/**
 * Enable or disable "processing" tracing.  Controls whether `logProcessing` does anything.
 * @param _traceFlag 
 */
export function setTraceProcessing(_traceFlag: boolean): void {
    traceFlag = _traceFlag;
}

/**
 * Enable or disable "performance" tracing.
 * @param _traceFlag 
 */
export function setTracePerformance(_traceFlag: boolean): void {
    tracePerf = _traceFlag;
}

/**
 * Perform "processing" tracing, if enabled.
 * @param text 
 * @returns 
 */
export function logProcessing(text: string): void {
    if (!traceFlag) return;
    console.log(text);
}

/**
 * Perform "performance" tracing, if enabled.
 * @param start 
 * @param text 
 * @returns 
 */
export function logPerformance(start: Date, text: string): void {
    if (!tracePerf) return;
    // https://stackoverflow.com/questions/14980014/how-can-i-calculate-the-time-between-2-dates-in-typescript
    console.log(`${text} ${(new Date().getTime() - start.getTime()) / 1000} seconds`)
}

/**
 * Parse the supplied text using Cheerio.   If a Cheerio Config 
 * has been set, it will be used.
 * 
 * @param text The HTML text to parse
 * @returns The object returned by Cheerio
 */
export function parse(text: string) {
    return configCheerio 
            ? cheerio.load(text, configCheerio)
            : cheerio.load(text);
};

/**
 * Process an array of functions against HTML text.  This
 * function supports both Promise/async and Callback execution.
 * It uses {@link processAsync} for the processing and it
 * always returns the Promise generated by that function.  If
 * the callback function is supplied in `done`, then it is called.
 * 
 * @param text The HTML text to process
 * @param metadata Metadata object provided by the application and passed through to functions
 * @param mahabhutaFuncs The array of functions
 * @param done Optional callback function to call when processing is finished
 * @returns The Promise generated from processAsync
 */
export async function process(
            text: string, metadata,
            mahabhutaFuncs: MahafuncArray | Array<MahafuncType>,
            done?: Function) {
    
    let ret = processAsync(text, metadata, mahabhutaFuncs);
    if (done) {
        ret.then(html => { done(undefined, html); })
           .catch(err => { done(err); });
    }
    return ret;
}

/**
 * Process the text using functions supplied in the array mahabhutaFuncs.
 */
export async function processAsync(
                text: string, metadata: Object,
                mahabhutaFuncs: MahafuncArray | Array<MahafuncType>) {

    if (!mahabhutaFuncs || mahabhutaFuncs.length < 0) mahabhutaFuncs = [];

    let cleanOrDirty = 'first-time';

    // console.log(`processAsync text at start ${text}`);

    // Allow a pre-parsed context to be passed in
    const $ = typeof text === 'function' ? text : parse(text);

    // console.log(`processAsync $ at start `, $.html());

    // const loops = [];
    do {
        // let startProcessing = new Date();
        let mhObj;
        if (Array.isArray(mahabhutaFuncs)) {
            // console.log(`ARRAY substitution`);
            mhObj = new MahafuncArray("master", {});
            mhObj.setMahafuncArray(mahabhutaFuncs);
        } else if (mahabhutaFuncs instanceof MahafuncArray) {
            // console.log(`MahafuncArray`);
            mhObj = mahabhutaFuncs;
        } else throw new Error(`Bad mahabhutaFuncs object supplied`);

        cleanOrDirty = 'clean';
        /* let results = */ await mhObj.process($, metadata, () => { cleanOrDirty = 'dirty'; });

        // results.forEach(result => { loops.push(mhObj.name +'  '+ result); });
        // console.log(`MAHABHUTA processAsync ${metadata.document.path} FINISH ${(new Date() - startProcessing) / 1000} seconds ${cleanOrDirty}`);
    } while (cleanOrDirty === 'dirty');

    // loops.forEach(l => { console.log(l); });

    return $.html();
}

/**
 * Process one function against the supplied text.
 * 
 * @param text The text to process
 * @param metadata Metadata object provided by the application and passed through to functions
 * @param mahafunc A single function, or a {@link MahafuncArray}, to execute
 * @param done Optional callback function to call when processing is finished
 * @returns The Promise generated from processAsync
 */
export async function process1(
            text: string, metadata,
            mahafunc: MahafuncType,
            done?: Function) {

    return process(text, metadata, [ mahafunc ], done);
}

/**
 * Construct a MahafuncArray 
 * @param name The name for the array
 * @param config Configuration object 
 * @param functions An optional list of functions to add
 * @returns A MahafuncArray
 */
export default function(
        name: string, config: Object, functions?: MahafuncType): MahafuncArray {
    const array = new MahafuncArray(name, config);
    if (functions) array.addMahafunc(functions);
    return array;
}
