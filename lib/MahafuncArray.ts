
import { logProcessing, logPerformance } from './index';
import { Mahafunc } from './Mahafunc';
import { PageProcessor } from './PageProcessor';
import { CustomElement } from './CustomElement';
import { Munger } from './Munger';
import * as util from 'util';

export type MahafuncType = Mahafunc | MahafuncArray | Function | [];

const _mahaarray_name = Symbol('name');
const _mahaarray_options = Symbol('options');
const _mahaarray_functions = Symbol('functions');
const _mahaarray_final_functions = Symbol('final_functions');

/**
 * Holds a series of functions ({@link Mahafunc}) that 
 * will execute in the order they were added.
 */
export class MahafuncArray {

    constructor(name: string, config: Object) {
        this[_mahaarray_functions] = [];
        this[_mahaarray_final_functions] = [];
        this[_mahaarray_name] = name;
        this[_mahaarray_options] = config;
        // console.log(`new MahafuncArray ${this[_mahaarray_name]} ${util.inspect(this[_mahaarray_options])}`);
    }

    /**
     * Retrieve the configuration object supplied
     * to the array.
     */
    get options() { return this[_mahaarray_options]; }

    /**
     * Retrieve the name for the array.  This name is
     * purely for informational purposes.
     */
    get name() { return this[_mahaarray_name]; }

    /**
     * Retrieve the array of functions.
     */
    get functions() { return this[_mahaarray_functions]; }

    /**
     * Retrieve the array of _final_ functions.  These are
     * executed after the main array is fully finished.
     */
    get final_functions() { return this[_mahaarray_final_functions]; }

    /**
     * Return the number of elements in the function array.
     */
    get length(): number { return this[_mahaarray_functions].length; }

    /**
     * Return the number of elements in 
     * the final function array.
     */
    get length_final(): number { return this[_mahaarray_final_functions].length; }

    /**
     * Add a function to the array.
     * 
     * For historical purposes we support several types
     * of function.  It's preferable to use {@link Mahafunc}
     * objects, or other {@link MahafuncArray}'s.  But we
     * also allow bare functions.
     * 
     * @param func A single item of type {@link MahafuncType}
     * @returns To support chaining, the array is returned
     */
    addMahafunc(func: MahafuncType): MahafuncArray {
        if (!(func instanceof Mahafunc
           || func instanceof MahafuncArray
           || typeof func === 'function'
           || Array.isArray(func))) {
            throw new Error("Improper addition "+ util.inspect(func));
        } else {
            this.functions.push(func);
            if (func instanceof Mahafunc) {
                func.array = this;
            }
        }
        return this; // support chaining
    }

    /**
     * Replace any existing function array with a
     * new array of either {@link Mahafunc} or 
     * {@link MahafuncArray} objects
     * 
     * @param functions 
     * @returns To support chaining, the array is returned
     */
    setMahafuncArray(functions: Array<Mahafunc | MahafuncArray>): MahafuncArray {
        if (!(Array.isArray(functions))) {
            throw new Error("Improper mahafunction array "+ util.inspect(functions));
        } else {
            this[_mahaarray_functions] = functions;
            for (let func of this[_mahaarray_functions]) {
                if (func instanceof Mahafunc) {
                    func.array = this;
                }
            }
        }
        return this; // support chaining
    }

    /**
     * Replace any existing final function array with a
     * new array of either {@link Mahafunc} or 
     * {@link MahafuncArray} objects
     * 
     * @param functions 
     * @returns To support chaining, the array is returned
     */
    setFinalMahafuncArray(final_functions: Array<Mahafunc>): MahafuncArray {
        if (!(Array.isArray(final_functions))) {
            throw new Error("Improper mahafunction array "+ util.inspect(final_functions));
        } else {
            this[_mahaarray_final_functions] = final_functions;
            for (let func of this[_mahaarray_final_functions]) {
                if (func instanceof Mahafunc) {
                    func.array = this;
                }
            }
        }
        return this; // support chaining
    }

    /**
     * Add a function to the array.
     * 
     * For historical purposes we support several types
     * of function.  It's preferable to use {@link Mahafunc}
     * objects, or other {@link MahafuncArray}'s.  But we
     * also allow bare functions.
     * 
     * @param func A single item of type {@link MahafuncType}
     * @returns To support chaining, the array is returned
     */
    addFinalMahafunc(func: MahafuncType): MahafuncArray {
        if (!(func instanceof Mahafunc
           || func instanceof MahafuncArray
           || typeof func === 'function'
           || Array.isArray(func))) {
            throw new Error("Improper addition "+ util.inspect(func));
        } else {
            this.final_functions.push(func);
            if (func instanceof Mahafunc) {
                func.array = this;
            }
        }
        return this; // support chaining
    }

    /**
     * Execute the functions in the array.
     * 
     * @param $ The parsed form of the HTML ready to use with Cheerio functions
     * @param metadata A metadata object supplied by the application, and passed through to functions.
     * @param dirty A function provided by {@link processAsync} that notifies whether a function has inserted something in the HTML which requires further processing.
     * @returns 
     */
    async process($, metadata, dirty: Function) {
        logProcessing(`Mahabhuta starting array ${this.name}`);
        const loops = [];
        // const startProcessing = new Date();

        // Run the functions, then run the final_functions
        for (let funclist of [ this.functions, this.final_functions]) {
            for (let mahafunc of funclist) {
                if (mahafunc instanceof CustomElement) {
                    logProcessing(`Mahabhuta calling CustomElement ${this.name} ${mahafunc.elementName}`);
                    try {
                        await mahafunc.processAll($, metadata, dirty);
                    } catch (errCustom) {
                        throw new Error(`Mahabhuta ${this.name} caught error in CustomElement(${mahafunc.elementName}): ${errCustom.message}`);
                    }
                    // loops.push(`... CustomElement ${mahafunc.elementName} ${(new Date() - startProcessing) / 1000} seconds`);
                } else if (mahafunc instanceof Munger) {
                    logProcessing(`Mahabhuta calling Munger ${this.name} ${mahafunc.selector}`);
                    try {
                        await mahafunc.processAll($, metadata, dirty);
                    } catch (errMunger) {
                        throw new Error(`Mahabhuta ${this.name} caught error in Munger(${mahafunc.selector}): ${errMunger.message}`);
                    }
                    logProcessing(`Mahabhuta FINISHED Munger ${this.name} ${mahafunc.selector}`);
                    // loops.push(`... Munger ${mahafunc.selector} ${(new Date() - startProcessing) / 1000} seconds`);
                } else if (mahafunc instanceof PageProcessor) {
                    // Performance testing
                    const _start = new Date();
                    logProcessing(`Mahabhuta calling ${this.name} PageProcessor `);
                    try {
                        await mahafunc.process($, metadata, dirty);
                    } catch (errPageProcessor) {
                        throw new Error(`Mahabhuta ${this.name} caught error in PageProcessor: ${errPageProcessor.message}`);
                    }
                    // Performance testing
                    logPerformance(_start, `PageProcessor ${this.name}`);
                    // loops.push(`... PageProcessor ${(new Date() - startProcessing) / 1000} seconds`);
                } else if (mahafunc instanceof MahafuncArray) {
                    // Performance testing
                    const _start = new Date();
                    let results = [];
                    try {
                        results = await mahafunc.process($, metadata, dirty);
                    } catch (errMahafuncArray) {
                        throw new Error(`Mahabhuta ${this.name} caught error in MahafuncArray: ${errMahafuncArray.message}`);
                    }
                    // Performance testing
                    logPerformance(_start, `MahafuncArray ${this.name} ${mahafunc.name}`)

                    // results.forEach(result => { loops.push(`    ... "${mahafunc.name} result" ${result} ${(new Date() - startProcessing) / 1000} seconds`); });
                    // loops.push(`... MahafuncArray ${mahafunc.name} ${(new Date() - startProcessing) / 1000} seconds`);
                } else if (typeof mahafunc === 'function') {
                    // Performance testing
                    const _start = new Date();
                    logProcessing(`Mahabhuta calling an ${this.name} "function" `);
                    try {
                        await new Promise((resolve, reject) => {
                            mahafunc($, metadata, dirty, err => {
                                if (err) reject(err);
                                else resolve('ok');
                            });
                        });
                    } catch (errFunction) {
                        throw new Error(`Mahabhuta ${this.name} caught error in function: ${errFunction.message}`);
                    }
                    // Performance testing
                    logPerformance(_start, `function ${this.name}`);
                    // loops.push(`... MahafuncArray "function" ${(new Date() - startProcessing) / 1000} seconds`);
                } else if (Array.isArray(mahafunc)) {
                    // Performance testing
                    const _start = new Date();
                    let mhObj = new MahafuncArray("inline", this.options);
                    mhObj.setMahafuncArray(mahafunc);
                    let results = await mhObj.process($, metadata, dirty);
                    // Performance testing
                    logPerformance(_start, `Array ${this.name} inline`);
                    // results.forEach(result => { loops.push(`    ... "inline result" ${result} ${(new Date() - startProcessing) / 1000} seconds`); });
                    // loops.push(`... MahafuncArray "inline array" ${(new Date() - startProcessing) / 1000} seconds`);
                } else {
                    console.error(`BAD MAHAFUNC in array ${this.name} - ${util.inspect(mahafunc)}`);
                }
            }
        }
        // return $.html();
        return loops;
    }
}
