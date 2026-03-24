/**
 * E2E Demo Human-Readable Output Formatter
 *
 * Transforms execution reports into human-friendly console output
 * with emoji indicators and structured stage information.
 */

import type {
  ExecutionReport,
  PipelineStage,
  DemoFlags,
  ErrorEntry,
  WarningEntry,
} from './entities.js';
import { StageStatus } from './entities.js';
import { formatElapsedTime } from './utils.js';

// ─────────────────────────────────────────────────────────────
// Emoji Indicators
// ─────────────────────────────────────────────────────────────

const EMOJI = {
  START: '🚀',
  RUNNING: '⏳',
  SUCCESS: '✓',
  FAILED: '✗',
  COMPLETE: '✅',
  ERROR: '❌',
} as const;

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Formats milliseconds into human-readable duration.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
}

/**
 * Formats timestamp to HH:MM:SS.
 */
function formatTimestamp(date: Date = new Date()): string {
  return date.toTimeString().slice(0, 8);
}

// ─────────────────────────────────────────────────────────────
// Main Formatter
// ─────────────────────────────────────────────────────────────

/**
 * Formats an ExecutionReport into human-readable console output.
 *
 * @param report - The execution report to format
 * @returns Formatted string with emoji indicators and structured output
 */
export function formatHumanOutput(report: ExecutionReport): string {
  const lines: string[] = [];
  const timestamp = formatTimestamp();

  // Header
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`${EMOJI.START} E2E Demo Execution Report`);
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  // Stage Progress Section
  lines.push('── Stage Progress ──────────────────────────────────────────');
  lines.push('');

  const totalStages = report.stagesCompleted + report.stagesFailed;
  const successIcon = report.stagesFailed === 0 ? EMOJI.COMPLETE : EMOJI.ERROR;
  const statusText =
    report.stagesFailed === 0
      ? `All ${report.stagesCompleted} stages completed successfully`
      : `${report.stagesCompleted}/${totalStages} stages completed, ${report.stagesFailed} failed`;

  lines.push(`  ${successIcon} ${statusText}`);
  lines.push(`  ${EMOJI.RUNNING} Total time: ${formatDuration(report.totalTimeMs)}`);
  lines.push('');

  // Artifacts Section
  if (report.artifacts.length > 0) {
    lines.push('── Artifacts ───────────────────────────────────────────────');
    lines.push('');

    for (const artifact of report.artifacts) {
      lines.push(`  ${EMOJI.SUCCESS} ${artifact.name}`);
      lines.push(`      Path: ${artifact.path}`);
      lines.push(`      Size: ${artifact.sizeKB}`);
    }
    lines.push('');
  }

  // Cleanup Section
  lines.push('── Cleanup ─────────────────────────────────────────────────');
  lines.push('');
  if (report.cleanupPerformed) {
    lines.push(`  ${EMOJI.SUCCESS} Demo directory cleaned up`);
  } else {
    lines.push(`  ${EMOJI.RUNNING} Demo artifacts preserved`);
  }
  lines.push('');

  // Error Summary (if present)
  if (report.errorSummary) {
    lines.push('── Errors ──────────────────────────────────────────────────');
    lines.push('');
    lines.push(`  ${EMOJI.FAILED} ${report.errorSummary}`);
    lines.push('');
  }

  // T035: Detailed error/warning summary collecting all entries from all stages
  const allErrors = report.errors ?? [];
  const allWarnings = report.warnings ?? [];

  if (allErrors.length > 0 || allWarnings.length > 0) {
    lines.push('── Error Summary ───────────────────────────────────────────');
    lines.push('');

    if (allErrors.length > 0) {
      lines.push(`  Errors (${allErrors.length}):`);
      for (const err of allErrors) {
        lines.push(`    ${EMOJI.FAILED} [${err.stage}] ${err.message}`);
        lines.push(`      Code: ${err.code} | Time: ${err.timestamp}`);
      }
      lines.push('');
    }

    if (allWarnings.length > 0) {
      lines.push(`  Warnings (${allWarnings.length}):`);
      for (const warn of allWarnings) {
        lines.push(`    ⚠ [${warn.stage}] ${warn.message}`);
        lines.push(`      Time: ${warn.timestamp}`);
      }
      lines.push('');
    }
  }

  // Footer
  lines.push('═══════════════════════════════════════════════════════════');
  const finalStatus = report.stagesFailed === 0 ? EMOJI.COMPLETE : EMOJI.ERROR;
  const finalText = report.stagesFailed === 0 ? 'Demo Complete' : 'Demo Failed';
  lines.push(`${finalStatus} ${finalText} at ${timestamp}`);
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// JSON Output Types (per cli-interface.md schema)
// ─────────────────────────────────────────────────────────────

interface JsonArtifact {
  name: string;
  path: string;
  sizeBytes: number;
  sizeKB: string;
}

interface JsonStageBase {
  name: string;
  displayName: string;
  status: string;
}

interface JsonStageSuccess extends JsonStageBase {
  status: 'success';
  elapsedMs: number;
  elapsedSeconds: string;
  artifact?: JsonArtifact;
  issuesCreated?: number;
  dryRun?: boolean;
}

interface JsonStageFailed extends JsonStageBase {
  status: 'failed';
  elapsedMs: number;
  elapsedSeconds: string;
  error: string;
}

interface JsonStagePending extends JsonStageBase {
  status: 'pending';
}

type JsonStage = JsonStageSuccess | JsonStageFailed | JsonStagePending;

interface JsonOutputBase {
  success: boolean;
  totalTimeMs: number;
  totalTimeSeconds: string;
  stages: JsonStage[];
  demoDir: string;
  cleanupPerformed: boolean;
  flags: DemoFlags;
  /** T036: Structured error entries */
  errors: ErrorEntry[];
  /** T036: Structured warning entries */
  warnings: WarningEntry[];
}

interface JsonOutputSuccess extends JsonOutputBase {
  success: true;
}

interface JsonOutputFailure extends JsonOutputBase {
  success: false;
  failedStage: string;
  errorSummary: string;
}

type JsonOutput = JsonOutputSuccess | JsonOutputFailure;

// ─────────────────────────────────────────────────────────────
// Extended Report for JSON formatting
// ─────────────────────────────────────────────────────────────

/**
 * Extended execution report with full stage details for JSON output.
 * This combines ExecutionReport with pipeline stage data.
 */
export interface ExtendedExecutionReport extends ExecutionReport {
  stages: PipelineStage[];
  demoDir: string;
  flags: DemoFlags;
}

// ─────────────────────────────────────────────────────────────
// JSON Output Formatter
// ─────────────────────────────────────────────────────────────

/**
 * Converts an ExecutionReport to a JSON string matching the schema
 * defined in specs/003-e2e-demo-script/contracts/cli-interface.md
 *
 * @param report - Extended execution report with stage details
 * @returns Pretty-printed JSON string with 2-space indentation
 */
export function formatJsonOutput(report: ExtendedExecutionReport): string {
  const success = report.stagesFailed === 0;

  // Build stage entries
  const stages: JsonStage[] = report.stages.map((stage) => {
    const base: JsonStageBase = {
      name: stage.name,
      displayName: stage.displayName,
      status: stage.status,
    };

    if (stage.status === StageStatus.Success) {
      const successStage: JsonStageSuccess = {
        ...base,
        status: 'success',
        elapsedMs: stage.elapsedMs ?? 0,
        elapsedSeconds: formatElapsedTime(stage.elapsedMs ?? 0),
      };

      // Add artifact info for non-issues stages
      if (stage.name !== 'issues') {
        const artifact = report.artifacts.find((a) => a.name === stage.artifact);
        if (artifact) {
          successStage.artifact = {
            name: artifact.name,
            path: artifact.path,
            sizeBytes: parseSizeKBToBytes(artifact.sizeKB),
            sizeKB: artifact.sizeKB,
          };
        }
      } else {
        // Issues stage has special fields
        successStage.issuesCreated = 0; // Placeholder - actual count would come from stage output
        successStage.dryRun = report.flags.dryRun;
      }

      return successStage;
    }

    if (stage.status === StageStatus.Failed) {
      const failedStage: JsonStageFailed = {
        ...base,
        status: 'failed',
        elapsedMs: stage.elapsedMs ?? 0,
        elapsedSeconds: formatElapsedTime(stage.elapsedMs ?? 0),
        error: stage.error ?? 'Unknown error',
      };
      return failedStage;
    }

    // Pending or Running (treated as pending in output)
    const pendingStage: JsonStagePending = {
      ...base,
      status: 'pending',
    };
    return pendingStage;
  });

  // T036: Collect errors and warnings
  const errors: ErrorEntry[] = report.errors ?? [];
  const allWarnings: WarningEntry[] = report.warnings ?? [];

  // Build output object
  const output: JsonOutput = success
    ? {
        success: true,
        totalTimeMs: report.totalTimeMs,
        totalTimeSeconds: formatElapsedTime(report.totalTimeMs),
        stages,
        demoDir: report.demoDir,
        cleanupPerformed: report.cleanupPerformed,
        flags: report.flags,
        errors,
        warnings: allWarnings,
      }
    : {
        success: false,
        totalTimeMs: report.totalTimeMs,
        totalTimeSeconds: formatElapsedTime(report.totalTimeMs),
        stages,
        failedStage: findFailedStageName(report.stages),
        errorSummary: report.errorSummary ?? 'Demo failed',
        demoDir: report.demoDir,
        cleanupPerformed: report.cleanupPerformed,
        flags: report.flags,
        errors,
        warnings: allWarnings,
      };

  return JSON.stringify(output, null, 2);
}

/**
 * Parses a size string like "1.2 KB" back to bytes.
 */
function parseSizeKBToBytes(sizeKB: string): number {
  const match = sizeKB.match(/^([\d.]+)\s*KB$/i);
  if (match) {
    return Math.round(parseFloat(match[1]) * 1024);
  }
  return 0;
}

/**
 * Finds the name of the first failed stage.
 */
function findFailedStageName(stages: PipelineStage[]): string {
  const failed = stages.find((s) => s.status === StageStatus.Failed);
  return failed?.name ?? 'unknown';
}
