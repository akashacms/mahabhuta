
import { Mahafunc } from "./Mahafunc"

export class PageProcessor extends Mahafunc {
    async process($, metadata, setDirty: Function): Promise<string | undefined> {
        throw new Error("The 'process' function must be overridden")
    }
}
