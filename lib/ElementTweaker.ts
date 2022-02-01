
import { Mahafunc } from "./Mahafunc"

export class ElementTweaker extends Mahafunc {
    async process($element, metadata, setDirty: Function, done?: Function) {
        throw new Error("The 'process' function must be overridden")
    }
}
