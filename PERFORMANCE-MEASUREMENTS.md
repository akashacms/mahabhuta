# Plan for implementing performance measurements in Mahabhuta

The task is to resolve an issue https://github.com/akashacms/akasharender/issues/96 that is listed in the AkashaRender project but is really about Mahabhuta.

In the existing report when a site is built, we see the time consumed for MAHABHUTA while building a page.  But, this number doesn't break down how the Mahabhuta time is consumed, so that we can reason about how to redesign Mahabhuta for greater efficiency.

As the implementor of Mahabhuta, I want to understand where the computation time goes, and how to improve its efficiency.  

An existing planning document is in the file: AI/Performance/PROPOSED-BENCHMARKING.md

That file may be useful for reference.  But, it is old, and may not be accurate.

# Architecture review

Suggest reviewing the file [AGENTS.md](./AGENTS.md)

# Desired measurements

Each Mahafunc is executed from a MahafuncArray which may be nested from a chain of MahafuncArray's.  Therefore, over the course of running an application, we want to record for each Mahafunc an object containing this data:

* The list of MahafuncArray names
* The Mahafunc type: [ `CustomElement`, `Munger`, `PageProcessor`, `MahafuncArray`, `function` `Array` ]
* The `name`, `elementName` or `selector` for the function depending on the function type
* The sum of the execution time for all invocations of this Mahafunc, where the timing for each execution is measured using `performance.now()`
* The number of invocations of the Mahafunc
* From that, an average execution time per invocation:  `sum / count`

That dataset tells us which Mahafunc's impose the largest CPU consumption.

The next dataset is to record, per MahafuncArray, similar execution time data, resulting in an object containing this data:

* The list of MahafuncArray names
* The MahafuncArray type: [ `MahafuncArray`, `array` ]
* The `name`
* The sum of the execution time for all invocations of this MahafuncArray, where the timing for each execution is measured using `performance.now()`
* The number of invocations of the Mahafunc
* From that, an average execution time per invocation:  `sum / count`

Finally, for the `process` function in `index.ts`, a total execution time can be computed using `process.now()`

# Use of `performance.now()`

The `performance.now()` function is relatively new to Node.js, and provides highly precise time measurements.

It should be enough to simply do:

```js
const start = performance.now();
// Execute some stuff such as await mhObj.process($, metadata, () => { cleanOrDirty = 'dirty'; });
const end = performance.now();
const elapsed = end - start;
```

The `elapsed` value is what we're interested in as the measurement.


