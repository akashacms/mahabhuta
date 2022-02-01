
import { Mahafunc } from "./Mahafunc";
import * as util from 'util';
import { logProcessing, logPerformance } from './index';

export class Munger extends Mahafunc {
    get elementName(): string {
        return '';   // This is a default
    }

    /**
     * For _Munger_ classes, the `process` function has access
     * to the entire HTML for the page.  Hence, it is passed
     * both `$` for the whole page, and `$element` matching
     * a specific element on the page.
     * 
     * @param $ 
     * @param $element 
     * @param metadata 
     * @param setDirty 
     * @param done 
     */
    async process($, $element, metadata, setDirty: Function, done?: Function) {
        throw new Error("The 'process' function must be overridden")
    }

    async processAll($, metadata, setDirty: Function) {
        try {
            var elements = this.findElements($);
            if (elements.length <= 0) return;
            // Performance testing
            const _start = new Date();
            // console.log(`Munger ${this.array.name} ${this.elementName} found ${elements.length} elements`);
            for (let element of elements) {
                await this.process($, $(element), metadata, setDirty);
            }
            // Performance testing
            logPerformance(_start, `Munger ${this.array.name} ${this.elementName}`);
        } catch (e) {
            console.error(`Munger ${this.selector} Errored with ${util.inspect(e)}`);
            throw e;
        }
    }
}
