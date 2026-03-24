/**
 * E2E Demo Script Entities
 *
 * Pure domain types for demo pipeline execution.
 * No dependencies on external libraries or I/O.
 */

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

/**
 * Pipeline stage execution states.
 * Transitions: pending → running → (success | failed)
 */
export enum StageStatus {
  Pending = 'pending',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
}

/**
 * Artifact file classifications.
 */
export enum ArtifactType {
  Spec = 'spec',
  Plan = 'plan',
  Tasks = 'tasks',
  Review = 'review',
}

// ─────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────

/**
 * Boolean flags controlling demo behavior.
 */
export interface DemoFlags {
  /** If true, simulate GitHub issue creation without API calls (default: false) */
  dryRun: boolean;
  /** If true, preserve demo artifacts after completion (default: false) */
  keep: boolean;
  /** If true, display detailed logs for debugging (default: false) */
  verbose: boolean;
}

/**
 * Runtime configuration for a demo execution.
 */
export interface DemoConfiguration {
  /** Predefined feature description (hardcoded: User Authentication) */
  exampleFeature: string;
  /** Temporary directory path (e.g., specs/demo-20250323-143022/) */
  demoDir: string;
  /** Command-line flags (dryRun, keep, verbose) */
  flags: DemoFlags;
  /** Maximum seconds per pipeline stage (default: 30) */
  timeout: number;
  /** Path to Squad directory (for context building) */
  squadDir: string;
  /** Path to Spec Kit directory (for agent execution) */
  specifyDir: string;
}

/**
 * Captured output from stage command execution.
 */
export interface StageOutput {
  /** Standard output from the command */
  stdout: string;
  /** Standard error from the command */
  stderr: string;
}

/**
 * A single step in the demo workflow with execution metadata.
 */
export interface PipelineStage {
  /** Stage identifier (specify, plan, tasks, review, issues) */
  name: string;
  /** Human-readable name for output ("Generating specification") */
  displayName: string;
  /** Command to execute (e.g., ['speckit', 'specify', '...']) */
  command: string[];
  /** Expected output filename (e.g., spec.md) */
  artifact: string;
  /** Execution state */
  status: StageStatus;
  /** Timestamp (ms) when stage began */
  startTime?: number;
  /** Timestamp (ms) when stage completed */
  endTime?: number;
  /** Elapsed time in milliseconds for stage execution */
  elapsedMs?: number;
  /** Error message if status is 'failed' */
  error?: string;
  /** Captured stdout/stderr from command execution */
  output?: StageOutput;
}

/**
 * A generated file with validation status.
 */
export interface DemoArtifact {
  /** Absolute path to artifact file */
  path: string;
  /** File classification */
  type: ArtifactType;
  /** File size in bytes (0 if does not exist) */
  sizeBytes: number;
  /** True if file exists on filesystem */
  exists: boolean;
  /** True if file structure is correct (has frontmatter, required sections) */
  valid: boolean;
  /** Validation error messages (empty if valid) */
  errors: string[];
}

/**
 * Minimal artifact metadata for final report.
 */
export interface ArtifactSummary {
  /** Filename (e.g., "spec.md") */
  name: string;
  /** Absolute path */
  path: string;
  /** Human-readable size (e.g., "1.2 KB") */
  sizeKB: string;
}

/**
 * Final summary after demo completion.
 */
export interface ExecutionReport {
  /** Total execution time from start to finish */
  totalTimeMs: number;
  /** Count of stages with status 'success' */
  stagesCompleted: number;
  /** Count of stages with status 'failed' */
  stagesFailed: number;
  /** List of generated files with metadata */
  artifacts: ArtifactSummary[];
  /** True if demo directory was deleted */
  cleanupPerformed: boolean;
  /** High-level error description if demo failed */
  errorSummary?: string;
  /** Full pipeline stage details (populated when verbose) */
  stages?: PipelineStage[];
  /** Warnings collected during execution (shown only in verbose mode) */
  warnings?: string[];
}
