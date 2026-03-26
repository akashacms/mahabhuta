# Performance Measurement Implementation Plan

This document tracks the implementation steps for adding performance measurements to Mahabhuta as specified in PERFORMANCE-MEASUREMENTS.md.

## Implementation Status

- [ ] Phase 1: Type definitions and base classes
- [ ] Phase 2: FilesystemPerfDataStore implementation
- [ ] Phase 3: Instrumentation in core processing
- [ ] Phase 4: CLI report generation
- [ ] Phase 5: Testing and validation

---

## Phase 1: Type definitions and base classes

Create the foundational types and abstract base class.

### Tasks

- [ ] Create `lib/PerfDataStore.ts` with:
  - [ ] `MahafuncTiming` interface
  - [ ] `MahafuncArrayTiming` interface
  - [ ] `ProcessMetrics` interface
  - [ ] `MahafuncStats` interface
  - [ ] `MahafuncArrayStats` interface
  - [ ] `AggregatedStats` interface
  - [ ] `PerfDataStore` abstract class with methods:
    - [ ] `recordProcessMetrics()`
    - [ ] `getAllMetrics()`
    - [ ] `clear()`
    - [ ] `getAggregatedStats()`

- [ ] Export types from `lib/index.ts`

- [ ] Build TypeScript and verify compilation

---

## Phase 2: FilesystemPerfDataStore implementation

Implement the concrete filesystem-based data store.

### Tasks

- [ ] Create `lib/FilesystemPerfDataStore.ts`:
  - [ ] Extend `PerfDataStore` abstract class
  - [ ] Constructor accepting directory path configuration
  - [ ] Implement `recordProcessMetrics()`:
    - [ ] Generate filename (timestamp-based or sequential)
    - [ ] Write ProcessMetrics as JSON to file
    - [ ] Handle errors gracefully
  - [ ] Implement `getAllMetrics()`:
    - [ ] Read all JSON files from directory
    - [ ] Parse and return array of ProcessMetrics
  - [ ] Implement `clear()`:
    - [ ] Delete all JSON files in directory
  - [ ] Implement `getAggregatedStats()`:
    - [ ] Load all metrics using `getAllMetrics()`
    - [ ] Compute aggregated statistics:
      - [ ] Group by Mahafunc (arrayPath + className + selector)
      - [ ] Group by MahafuncArray (arrayPath + name)
      - [ ] Calculate sum, count, avg, min, max, median for each group
    - [ ] Return `AggregatedStats` object

- [ ] Export from `lib/index.ts`

- [ ] Add basic tests for FilesystemPerfDataStore

---

## Phase 3: Instrumentation in core processing

Add timing measurements to the processing pipeline.

### 3.1: Modify lib/index.ts

- [ ] Add optional `dataStore?: PerfDataStore` parameter to `processAsync()`
- [ ] Add optional `documentId?: string` parameter to `processAsync()`
- [ ] Import `performance` from `perf_hooks`
- [ ] Add timing logic:
  - [ ] Record start time with `performance.now()` at beginning
  - [ ] Create `ProcessMetrics` object to collect data
  - [ ] Pass dataStore and metrics collector to MahafuncArray.process()
  - [ ] Record end time and calculate total duration
  - [ ] Call `dataStore.recordProcessMetrics()` if dataStore exists
- [ ] Ensure zero overhead when dataStore is not provided

### 3.2: Modify lib/MahafuncArray.ts

- [ ] Update `process()` method signature to accept:
  - [ ] Optional `dataStore` parameter
  - [ ] Array path context (current nesting path)
  - [ ] Metrics collector object reference
- [ ] Add timing for each Mahafunc type:
  - [ ] CustomElement:
    - [ ] Record start time
    - [ ] Execute processAll()
    - [ ] Record end time
    - [ ] Create MahafuncTiming with arrayPath, className, type, selector, duration
    - [ ] Add to metrics collector if dataStore exists
  - [ ] Munger:
    - [ ] Same pattern as CustomElement
  - [ ] PageProcessor:
    - [ ] Same pattern, selector = 'page'
  - [ ] MahafuncArray (nested):
    - [ ] Record start time
    - [ ] Call nested process() with extended arrayPath
    - [ ] Record end time
    - [ ] Create both MahafuncTiming and MahafuncArrayTiming
  - [ ] function:
    - [ ] Record timing, use function.name for className
  - [ ] Array (inline):
    - [ ] Record timing for inline array processing
- [ ] Create MahafuncArrayTiming for this array's execution
- [ ] Add to metrics collector if dataStore exists
- [ ] Ensure zero overhead when dataStore is not provided (guard all timing code)

### 3.3: Update function signatures

- [ ] Update `Mahafunc.ts` base class if needed
- [ ] Update `CustomElement.ts` if needed
- [ ] Update `Munger.ts` if needed
- [ ] Update `PageProcessor.ts` if needed
- [ ] Ensure backward compatibility

---

## Phase 4: CLI report generation

Add commands to cli.ts for generating reports from stored metrics.

### Tasks

- [ ] Modify `lib/cli.ts`:
  - [ ] Add `perf-report` command with subcommands:
    - [ ] `perf-report total` - Top N by total time consumed
    - [ ] `perf-report average` - Ranked by average time per invocation
    - [ ] `perf-report arrays` - Per-MahafuncArray breakdown
    - [ ] `perf-report distribution` - Time distribution statistics
    - [ ] `perf-report all` - Combined report with all sections
  - [ ] Command options:
    - [ ] `--data-dir <path>` - Path to performance data directory
    - [ ] `--top <N>` - Limit to top N entries (default: 20)
    - [ ] `--format <type>` - Output format: text or json (default: text)
    - [ ] `--filter <path>` - Filter by MahafuncArray path pattern
  - [ ] Report generation logic:
    - [ ] Load FilesystemPerfDataStore from specified directory
    - [ ] Call `getAggregatedStats()`
    - [ ] Format and display requested report type
    - [ ] Handle errors gracefully

- [ ] Implement report formatters:
  - [ ] Text formatter - human-readable tables
  - [ ] JSON formatter - structured output for further processing

---

## Phase 5: Testing and validation

Ensure the implementation works correctly.

### Tasks

- [ ] Unit tests:
  - [ ] Test PerfDataStore type definitions
  - [ ] Test FilesystemPerfDataStore:
    - [ ] Recording metrics
    - [ ] Reading metrics
    - [ ] Clearing metrics
    - [ ] Aggregating statistics
    - [ ] Min/max/median calculations
  - [ ] Test timing instrumentation with mock dataStore

- [ ] Integration tests:
  - [ ] Process HTML with dataStore enabled
  - [ ] Verify metrics are recorded correctly
  - [ ] Test nested MahafuncArray path tracking
  - [ ] Test all Mahafunc types (CustomElement, Munger, PageProcessor, etc.)
  - [ ] Verify zero overhead when dataStore not provided

- [ ] CLI tests:
  - [ ] Test each report command
  - [ ] Test filtering and formatting options
  - [ ] Test error handling

- [ ] Performance validation:
  - [ ] Measure overhead when metrics collection is disabled
  - [ ] Measure overhead when metrics collection is enabled
  - [ ] Verify acceptable performance impact

- [ ] Documentation:
  - [ ] Update README with performance measurement usage
  - [ ] Add examples of using dataStore
  - [ ] Document CLI report commands
  - [ ] Add example reports

---

## Notes and Questions

### Design Decisions

- Array path is tracked by passing context through nested process() calls
- Each process() call adds its name to the path before calling nested arrays
- Metrics are collected in-memory during processing, then persisted at end
- Zero overhead ensured by guard clauses: `if (!dataStore) return;`

### Open Questions

(Add any questions or issues that arise during implementation)

---

## Completion Checklist

Before considering this feature complete:

- [ ] All phases completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CLI commands working
- [ ] Example usage demonstrated
- [ ] Performance overhead validated
- [ ] Code reviewed
- [ ] Ready for integration with AkashaCMS
