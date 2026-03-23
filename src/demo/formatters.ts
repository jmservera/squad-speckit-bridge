/**
 * E2E Demo Human-Readable Output Formatter
 *
 * Transforms execution reports into human-friendly console output
 * with emoji indicators and structured stage information.
 */

import { ExecutionReport } from './entities';

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

  // Footer
  lines.push('═══════════════════════════════════════════════════════════');
  const finalStatus = report.stagesFailed === 0 ? EMOJI.COMPLETE : EMOJI.ERROR;
  const finalText = report.stagesFailed === 0 ? 'Demo Complete' : 'Demo Failed';
  lines.push(`${finalStatus} ${finalText} at ${timestamp}`);
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}
