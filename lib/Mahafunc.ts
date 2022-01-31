
import { MahafuncArray } from "./MahafuncArray";

const _mahafunc_array = Symbol('array');
export class Mahafunc {
    set array(array: MahafuncArray) { this[_mahafunc_array] = array; }
    get array() { return this[_mahafunc_array]; }
    get options() { return this[_mahafunc_array].options; }
    get selector(): string {
        throw new Error("The 'selector' getter must be overridden");
    }

    findElements($) {
        var ret = [];
        $(this.selector).each(function(i, elem) { ret.push(elem); });
        return ret;
    }

    async process($element, metadata, setDirty: Function, done?: Function) {
        throw new Error("The 'process' function must be overridden");
    }

    async processAll($, metadata, setDirty: Function) {
        throw new Error("The 'processAll' function must be overridden");
    }
}
