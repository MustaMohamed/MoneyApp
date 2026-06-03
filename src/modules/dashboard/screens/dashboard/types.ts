/**
 * Shared types for the §5 V2 dashboard. Lives outside dashboard.state.ts so
 * that components can import the type without taking a dependency on the full
 * screen state module.
 */

export type DashboardSegment = 'overview' | 'accounts';
