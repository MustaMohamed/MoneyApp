/**
 * Shared types for the §5 V2 dashboard. Lives outside dashboard.state.ts so
 * that components (e.g. SegmentSwitcher) can import the type without taking
 * a dependency on the full Zustand state module — useful when components are
 * authored in parallel before the state module exists.
 */

export type DashboardSegment = 'overview' | 'accounts';
