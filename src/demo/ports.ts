/**
 * E2E Demo Script Port Interfaces
 *
 * Clean Architecture ports (interfaces) for demo pipeline execution.
 * Ports define contracts for external I/O; adapters implement them.
 * All methods use DTOs only — no raw file paths or shell commands cross boundaries.
 */

import type {
  DemoConfiguration,
  PipelineStage,
  DemoArtifact,
  ExecutionReport,
} from './entities.js';

// ─────────────────────────────────────────────────────────────
// Port Interfaces
// ─────────────────────────────────────────────────────────────

/**
 * Executes shell commands for pipeline stages.
 *
 * Adapters implement this to run Spec Kit CLI commands (speckit specify, etc.)
 * and capture output, exit codes, and timing metadata.
 */
export interface ProcessExecutor {
  /**
   * Execute a pipeline stage command.
   *
   * @param stage - Pipeline stage with command to execute
   * @param config - Demo configuration for timeout and paths
   * @returns Updated stage with status, timing, and error (if failed)
   */
  execute(stage: PipelineStage, config: DemoConfiguration): Promise<PipelineStage>;

  /**
   * Check if a command is available in the system PATH.
   *
   * @param command - Command name to check (e.g., 'speckit')
   * @returns True if command is available
   */
  isCommandAvailable(command: string): Promise<boolean>;
}

/**
 * Validates generated artifacts after pipeline stage execution.
 *
 * Adapters implement this to check file existence, size, and structure
 * (e.g., frontmatter presence, required sections).
 */
export interface ArtifactValidator {
  /**
   * Validate a generated artifact file.
   *
   * @param artifactPath - Absolute path to the artifact file
   * @param stage - Pipeline stage that produced the artifact
   * @returns Artifact with validation status, size, and errors
   */
  validate(artifactPath: string, stage: PipelineStage): Promise<DemoArtifact>;

  /**
   * Validate all artifacts in a demo directory.
   *
   * @param config - Demo configuration with demoDir path
   * @returns Array of validated artifacts
   */
  validateAll(config: DemoConfiguration): Promise<DemoArtifact[]>;
}

/**
 * Handles cleanup of demo artifacts after execution.
 *
 * Adapters implement this to delete temporary directories and files
 * while respecting the 'keep' flag from demo configuration.
 */
export interface CleanupHandler {
  /**
   * Clean up demo artifacts based on configuration.
   *
   * If config.flags.keep is true, no cleanup is performed.
   * If config.flags.keep is false, demoDir and its contents are deleted.
   *
   * @param config - Demo configuration with flags and demoDir
   * @param report - Execution report to update with cleanup status
   * @returns Updated report with cleanupPerformed flag
   */
  cleanup(config: DemoConfiguration, report: ExecutionReport): Promise<ExecutionReport>;

  /**
   * Check if a directory exists and is safe to delete.
   *
   * Validates the path is under specs/ to prevent accidental deletion
   * of important directories.
   *
   * @param path - Directory path to check
   * @returns True if directory exists and is safe to delete
   */
  isSafeToDelete(path: string): Promise<boolean>;
}
