
import { Mahafunc } from "./Mahafunc";
import * as util from 'util';
import { logProcessing, logPerformance } from './index';

export class Munger extends Mahafunc {
    get elementName(): string {
        return '';   // This is a default
    }
    async process($element, metadata, setDirty: Function, done?: Function) {
        throw new Error("The 'process' function must be overridden")
    }
    async processAll($, metadata, setDirty: Function) {
        var munger = this;
        try {
            var elements = munger.findElements($);
            if (elements.length <= 0) return;
            // Performance testing
            const _start = new Date();
            // console.log(`Munger ${this.array.name} ${this.elementName} found ${elements.length} elements`);
            for (let element of elements) {
                await munger.process($, $(element), metadata, setDirty);
            }
            // Performance testing
            logPerformance(_start, `Munger ${this.array.name} ${this.elementName}`);
        } catch (e) {
            console.error(`Munger ${munger.selector} Errored with ${util.inspect(e)}`);
            throw e;
        }
    }
}
