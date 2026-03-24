/**
 * Demo Composition Root Factory
 *
 * Dependency injection entry point for E2E demo execution.
 * Wires adapters to the orchestrator and returns a demo runner.
 */

import type { DemoConfiguration, ExecutionReport } from './entities.js';
import { runDemo, createDemoDirectory, type DemoDependencies, type RunDemoOptions } from './orchestrator.js';
import { NodeProcessExecutor } from './adapters/process-executor.js';
import { FileSystemArtifactValidator } from './adapters/artifact-validator.js';
import { FileSystemCleanupHandler } from './adapters/cleanup-handler.js';
import type { Logger } from '../cli/logger.js';

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
   * @param options - Optional execution controls (abort signal)
   * @returns Execution report with timing, artifacts, and status
   */
  run(config: DemoConfiguration, options?: RunDemoOptions): Promise<ExecutionReport>;
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
  /** Optional logger for verbose diagnostics */
  logger?: Logger;
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
  const logger = options.logger;

  // Wire default adapters or use provided overrides
  const deps: DemoDependencies = {
    processExecutor: options.processExecutor ?? new NodeProcessExecutor(logger),
    artifactValidator: options.artifactValidator ?? new FileSystemArtifactValidator(logger),
    cleanupHandler: options.cleanupHandler ?? new FileSystemCleanupHandler(),
    logger,
  };

  return {
    async run(config: DemoConfiguration, options?: RunDemoOptions): Promise<ExecutionReport> {
      return runDemo(config, deps, options);
    },
  };
}

// Re-export createDemoDirectory for convenience
export { createDemoDirectory };
