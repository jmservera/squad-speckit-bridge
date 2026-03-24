/**
 * T011: Review Module — Port Interfaces
 *
 * Defines input ports for the review/fidelity use case.
 * Adapters implement these interfaces.
 * Imports ONLY from ../types.ts — no external packages.
 */

import type { FunctionalRequirement, ImplementationEvidence } from '../types.js';

/** Input port: reads functional requirements from spec files */
export interface SpecReader {
  readRequirements(specPath: string): Promise<FunctionalRequirement[]>;
}

/** Input port: scans source files for evidence of requirement coverage */
export interface ImplementationScanner {
  scan(srcDir: string, requirementIds: string[]): Promise<ImplementationEvidence[]>;
}
