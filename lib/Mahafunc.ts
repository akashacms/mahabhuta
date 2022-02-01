
import { MahafuncArray } from "./MahafuncArray";

const _mahafunc_array = Symbol('array');

/**
 * A superclass for implementing processor functions
 * for use with Mahabhuta.  This class is not meant to
 * be instantiated directly, but to be extended.  Instead
 * it is meant for applications to instantiate subclasses
 * of this class.
 */
export class Mahafunc {

    /**
     * Store the {@link MahafuncArray} containing
     * this function.
     */
    set array(array: MahafuncArray) { this[_mahafunc_array] = array; }

    /**
     * Retrieve the {@link MahafuncArray} containing
     * this function.
     */
    get array() { return this[_mahafunc_array]; }

    /**
     * Retrieve the options/configuration object
     * stored in the array containing this function.
     */
    get options() { return this[_mahafunc_array].options; }

    /**
     * Retrieve the jQuery-like _selector_ associated with
     * a Mahafunc.  When the containing {@link MahafuncArray}
     * determines whether to execute this function, it uses
     * the selector to determine if it matches any elements.
     * 
     * @returns the selector to use
     */
    get selector(): string {
        throw new Error("The 'selector' getter must be overridden");
    }

    /**
     * Look for any elements matching the _selector_.
     * 
     * @param $ The parsed HTML
     * @returns An array of elements matching the selector.  If none match, the array will have zero elements.
     */
    findElements($) {
        var ret = [];
        $(this.selector).each(function(i, elem) { ret.push(elem); });
        return ret;
    }

    /**
     * Run the function against an element.
     * 
     * @param $element The element to process
     * @param metadata The metadata object passed from the application
     * @param setDirty The function to call if an element inserts code requiring further processing
     * @param done Callback function if needed
     */
    async process($element, metadata, setDirty: Function, done?: Function) {
        throw new Error("The 'process' function must be overridden");
    }

    /**
     * Call {@link process} for every matching element.
     * The {@link findElements} function is meant to be
     * used to determine the matching elements.
     * 
     * @param $ The parsed version of the HTML
     * @param metadata The metadata object passed from the application
     * @param setDirty The function to call if an element inserts code requiring further processing
     */
    async processAll($, metadata, setDirty: Function) {
        throw new Error("The 'processAll' function must be overridden");
    }
}
