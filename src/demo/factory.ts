/**
 * Demo Composition Root Factory
 *
 * Dependency injection entry point for E2E demo execution.
 * Wires adapters to the orchestrator and returns a demo runner.
 */

import type { DemoConfiguration, ExecutionReport } from './entities.js';
import { runDemo, createDemoDirectory, type DemoDependencies } from './orchestrator.js';
import { NodeProcessExecutor } from './adapters/process-executor.js';
import { FileSystemArtifactValidator } from './adapters/artifact-validator.js';
import { FileSystemCleanupHandler } from './adapters/cleanup-handler.js';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Demo runner interface returned by the factory.
 */
export interface DemoRunner {
  /**
   * Execute the demo pipeline with the given configuration.
   *
   * @param config - Demo configuration with flags and paths
   * @returns Execution report with timing, artifacts, and status
   */
  run(config: DemoConfiguration): Promise<ExecutionReport>;
}

/**
 * Options for creating a demo runner.
 */
export interface DemoRunnerOptions {
  /** Custom process executor (for testing) */
  processExecutor?: DemoDependencies['processExecutor'];
  /** Custom artifact validator (for testing) */
  artifactValidator?: DemoDependencies['artifactValidator'];
  /** Custom cleanup handler (for testing) */
  cleanupHandler?: DemoDependencies['cleanupHandler'];
}

// ─────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────

/**
 * Create a demo runner with wired dependencies.
 *
 * This is the composition root for the E2E demo pipeline.
 * Wires together:
 * - NodeProcessExecutor: executes pipeline stage commands
 * - FileSystemArtifactValidator: validates generated artifacts
 * - FileSystemCleanupHandler: cleans up demo directory after execution
 *
 * @param options - Optional dependency overrides for testing
 * @returns DemoRunner with run(config) method
 */
export function createDemoRunner(options: DemoRunnerOptions = {}): DemoRunner {
  // Wire default adapters or use provided overrides
  const deps: DemoDependencies = {
    processExecutor: options.processExecutor ?? new NodeProcessExecutor(),
    artifactValidator: options.artifactValidator ?? new FileSystemArtifactValidator(),
    cleanupHandler: options.cleanupHandler ?? new FileSystemCleanupHandler(),
  };

  return {
    async run(config: DemoConfiguration): Promise<ExecutionReport> {
      return runDemo(config, deps);
    },
  };
}

// Re-export createDemoDirectory for convenience
export { createDemoDirectory };
