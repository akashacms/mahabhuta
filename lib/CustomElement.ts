
import { Mahafunc } from "./Mahafunc";
import * as util from 'util';
import { logProcessing, logPerformance } from './index';

/**
 * Implements an HTML-ish element that is replaced with
 * some other HTML.  For example, <embed-video> might take
 * an href= and other attributes to describe a video from
 * a known service, the process function discerns the HTML code
 * to use for the player, rendering that into the output.
 */
 export class CustomElement extends Mahafunc {

    /**
     * The name of the element that is implemented by
     * this function.
     */
    get elementName(): string {
        throw new Error("The 'elementName' getter must be overridden");
    }

    /**
     * The selector for a _CustomElement_ implementation
     * is simply the name of the element.
     */
    get selector(): string { return this.elementName; }

    async process($element, metadata, setDirty: Function, done?: Function): Promise<string | undefined> {
        throw new Error("The 'process' function must be overridden");
    }

    async processAll($, metadata, setDirty: Function) {
        try {
            let elements = this.findElements($);
            if (elements.length <= 0) return;
            // Performance testing
            const _start = new Date();

            for (let element of elements) {
                let replaceWith = await this.process($(element), metadata, setDirty);
                // console.log(`CustomElement ${this.elementName} process returned ${replaceWith}`);
                $(element).replaceWith(replaceWith);
            }
            /* if (this.elementName === "site-verification") {
                console.log(`CustomElement ${this.elementName} `, $.html());
            } */
            // Performance testing
            logPerformance(_start, `CustomElement ${this.array.name} ${this.elementName}`);
        } catch (e) {
            console.error(`CustomElement ${this.elementName} Errored with ${util.inspect(e)}`);
            throw e;
        }
    }
}
