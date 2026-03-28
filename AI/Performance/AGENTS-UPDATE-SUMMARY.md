# AGENTS.md Update Summary

**Date**: March 26, 2026

## Changes Made

Updated AGENTS.md to include comprehensive documentation about the performance measurement feature.

## Sections Added

### 1. Repository Structure Update
- Added `PerfDataStore.ts` to lib/ directory listing
- Added `FilesystemPerfDataStore.ts` to lib/ directory listing
- Added `AI/Performance/` directory with documentation files

### 2. New Performance Measurement Section

Added a complete "Performance Measurement" section (~200 lines) covering:

#### Overview
- Description of performance measurement capabilities
- Key features and benefits
- Zero overhead guarantee

#### Enabling Performance Measurement
- Code example showing how to create FilesystemPerfDataStore
- Code example showing how to pass dataStore to processAsync()
- Explanation of optional parameters
- Note about zero overhead when disabled

#### Generating Reports
- CLI commands for all report types (total, average, arrays, distribution, all)
- Examples of using filters and format options
- Export to JSON example
- Top-N limiting example

#### Report Types
- Explanation of each report type and its purpose
- What information each report provides

#### Example Report Output
- Sample text output showing what reports look like
- Shows hierarchy with array paths
- Shows timing statistics

#### Performance Characteristics
- Documented overhead measurements from test suite
- 3-7% with metrics enabled
- ~0% with metrics disabled
- Typical processing times

#### Programmatic Access
- Code examples for accessing metrics in code
- Getting aggregated statistics
- Finding slowest Mahafuncs
- Clearing metrics

#### Data Structure
- Explanation of what data is collected
- Array path tracking
- Class name recording
- Timing precision
- Statistics collected

#### Best Practices
- **During Development**: When and how to use metrics
- **In Production**: Selective enablement guidelines
- **Optimization Workflow**: Step-by-step process for using metrics to optimize

#### Implementation Notes
- Zero overhead design explanation
- Backward compatibility
- High precision timing
- Nested array tracking
- Flexible storage abstraction

#### Documentation References
- Links to detailed documentation in AI/Performance/
- PERFORMANCE-USAGE.md
- PERFORMANCE-MEASUREMENTS.md
- PERFORMANCE-PLAN.md

### 3. CLI Usage Section Update

Enhanced the CLI Usage section with:
- Separated "Processing HTML" subsection
- New "Performance Reports" subsection with complete command reference
- Examples of all command options

## Statistics

**Before:**
- Lines: 256
- Sections: ~12

**After:**
- Lines: 453
- Sections: ~14 (added Performance Measurement + CLI subsections)
- New content: ~200 lines

## Content Organization

The performance measurement documentation is organized as:
1. **Quick overview** - What it is and why use it
2. **How to enable** - Minimal example to get started
3. **How to generate reports** - CLI commands
4. **Understanding reports** - What each report shows
5. **Advanced usage** - Programmatic access
6. **Best practices** - When and how to use effectively
7. **Technical details** - Implementation notes
8. **References** - Links to detailed docs

## Key Benefits of This Update

1. **Discoverability**: Developers reading AGENTS.md will now know about performance measurement
2. **Quick Start**: Copy-paste examples get users started immediately
3. **Complete Reference**: All CLI commands documented in one place
4. **Best Practices**: Guidance on when/how to use the feature
5. **Links to Details**: Points to comprehensive documentation for deep dives

## Documentation Hierarchy

```
AGENTS.md
  ├── Quick overview & examples
  │
  └── Links to detailed docs:
      ├── AI/Performance/PERFORMANCE-USAGE.md
      │   └── Comprehensive usage guide with examples
      │
      ├── AI/Performance/PERFORMANCE-MEASUREMENTS.md
      │   └── Feature specification
      │
      └── AI/Performance/PERFORMANCE-PLAN.md
          └── Implementation tracking & details
```

## Integration Points

The update connects performance measurement documentation with existing AGENTS.md content:

1. **Repository Structure** - Shows where performance files are located
2. **CLI Usage** - Documents perf-report command alongside process command
3. **Development** - Performance measurement fits into development workflow
4. **Dependencies** - Performance measurement has no additional dependencies

## User Journey

A developer reading AGENTS.md can now:

1. **Discover** the performance measurement feature
2. **Understand** what it does and why it's useful
3. **Enable** it with a simple code example
4. **Generate reports** using documented CLI commands
5. **Interpret** reports using provided examples
6. **Optimize** their code using best practices
7. **Deep dive** into detailed documentation if needed

## Validation

- [x] All code examples are correct and tested
- [x] All CLI commands are accurate
- [x] Links to documentation files are correct
- [x] Performance measurements match test results
- [x] Overhead percentages accurate (from Phase 5 testing)
- [x] Best practices reflect lessons learned during implementation

## Conclusion

AGENTS.md now provides comprehensive coverage of the performance measurement feature while maintaining its role as an overview document. The addition is well-integrated with existing content and provides clear pathways to more detailed documentation.
