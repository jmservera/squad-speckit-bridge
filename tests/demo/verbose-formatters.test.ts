/**
 * T030: Verbose logging in formatHumanOutput
 *
 * Tests that the human output formatter includes stage durations, artifact file sizes,
 * command outputs, and suppressed warnings when verbose mode is active.
 */

import { describe, it, expect } from 'vitest';
import { formatHumanOutput } from '../../src/demo/formatters.js';
import type { ExecutionReport, PipelineStage } from '../../src/demo/entities.js';
import { StageStatus } from '../../src/demo/entities.js';

// ── Helpers ──────────────────────────────────────────────────

function makeStages(): PipelineStage[] {
  return [
    {
      name: 'specify',
      displayName: 'Generating specification',
      command: ['speckit', 'specify', 'Test feature'],
      artifact: 'spec.md',
      status: StageStatus.Success,
      startTime: 1000,
      endTime: 2500,
      elapsedMs: 1500,
      output: { stdout: 'Spec generated successfully', stderr: '' },
    },
    {
      name: 'plan',
      displayName: 'Creating implementation plan',
      command: ['speckit', 'plan'],
      artifact: 'plan.md',
      status: StageStatus.Success,
      startTime: 2500,
      endTime: 4000,
      elapsedMs: 1500,
      output: { stdout: 'Plan created', stderr: '' },
    },
    {
      name: 'tasks',
      displayName: 'Generating task breakdown',
      command: ['speckit', 'tasks'],
      artifact: 'tasks.md',
      status: StageStatus.Failed,
      startTime: 4000,
      endTime: 5000,
      elapsedMs: 1000,
      error: 'Command failed with exit code 1',
      output: { stdout: '', stderr: 'Error: template not found' },
    },
    {
      name: 'review',
      displayName: 'Running quality review',
      command: ['speckit', 'analyze'],
      artifact: 'review.md',
      status: StageStatus.Pending,
    },
    {
      name: 'issues',
      displayName: 'Creating GitHub issues',
      command: ['speckit', 'taskstoissues'],
      artifact: 'issues.json',
      status: StageStatus.Pending,
    },
  ];
}

function makeReport(overrides: Partial<ExecutionReport> = {}): ExecutionReport {
  return {
    totalTimeMs: 5000,
    stagesCompleted: 2,
    stagesFailed: 1,
    artifacts: [
      { name: 'spec.md', path: 'specs/demo-test/spec.md', sizeKB: '1.2 KB' },
      { name: 'plan.md', path: 'specs/demo-test/plan.md', sizeKB: '0.8 KB' },
    ],
    cleanupPerformed: false,
    errorSummary: 'Stage tasks failed',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('T030: formatHumanOutput verbose mode', () => {
  it('should include Stage Details section when verbose with stages', () => {
    const report = makeReport({
      stages: makeStages(),
    });

    const output = formatHumanOutput(report, { verbose: true });

    expect(output).toContain('── Stage Details');
  });

  it('should not include Stage Details when verbose=false', () => {
    const report = makeReport({
      stages: makeStages(),
    });

    const output = formatHumanOutput(report, { verbose: false });

    expect(output).not.toContain('── Stage Details');
  });

  it('should not include Stage Details when verbose is omitted', () => {
    const report = makeReport({
      stages: makeStages(),
    });

    const output = formatHumanOutput(report);

    expect(output).not.toContain('── Stage Details');
  });

  it('should show per-stage duration in verbose mode', () => {
    const report = makeReport({
      stages: makeStages(),
    });

    const output = formatHumanOutput(report, { verbose: true });

    expect(output).toContain('1.50s');
  });

  it('should show command for each stage in verbose mode', () => {
    const report = makeReport({
      stages: makeStages(),
    });

    const output = formatHumanOutput(report, { verbose: true });

    expect(output).toContain('Command: speckit specify Test feature');
    expect(output).toContain('Command: speckit plan');
  });

  it('should show stage status in verbose mode', () => {
    const report = makeReport({
      stages: makeStages(),
    });

    const output = formatHumanOutput(report, { verbose: true });

    expect(output).toContain('Status: success');
    expect(output).toContain('Status: failed');
  });

  it('should show stdout preview in verbose mode', () => {
    const report = makeReport({
      stages: makeStages(),
    });

    const output = formatHumanOutput(report, { verbose: true });

    expect(output).toContain('Stdout: Spec generated successfully');
  });

  it('should show stderr preview in verbose mode', () => {
    const report = makeReport({
      stages: makeStages(),
    });

    const output = formatHumanOutput(report, { verbose: true });

    expect(output).toContain('Stderr: Error: template not found');
  });

  it('should show error details for failed stages', () => {
    const report = makeReport({
      stages: makeStages(),
    });

    const output = formatHumanOutput(report, { verbose: true });

    expect(output).toContain('Error: Command failed with exit code 1');
  });

  it('should show Warnings section when verbose with warnings', () => {
    const report = makeReport({
      stages: makeStages(),
      warnings: [
        "Stage 'tasks' stderr: Error: template not found",
        "Stage 'review' was skipped due to earlier failure",
      ],
    });

    const output = formatHumanOutput(report, { verbose: true });

    expect(output).toContain('── Warnings');
    expect(output).toContain('template not found');
    expect(output).toContain('skipped due to earlier failure');
  });

  it('should not show Warnings section when not verbose', () => {
    const report = makeReport({
      warnings: ['Some warning'],
    });

    const output = formatHumanOutput(report, { verbose: false });

    expect(output).not.toContain('── Warnings');
  });

  it('should not show Warnings section when no warnings', () => {
    const report = makeReport({
      stages: makeStages(),
      warnings: [],
    });

    const output = formatHumanOutput(report, { verbose: true });

    expect(output).not.toContain('── Warnings');
  });

  it('should still show standard sections in verbose mode', () => {
    const report = makeReport({
      stages: makeStages(),
    });

    const output = formatHumanOutput(report, { verbose: true });

    expect(output).toContain('E2E Demo Execution Report');
    expect(output).toContain('── Stage Progress');
    expect(output).toContain('── Artifacts');
    expect(output).toContain('── Cleanup');
    expect(output).toContain('── Errors');
    expect(output).toContain('Demo Failed');
  });

  it('should backward-compatible with no options', () => {
    const report = makeReport();

    const output = formatHumanOutput(report);

    expect(output).toContain('E2E Demo Execution Report');
    expect(output).toContain('2/3 stages completed, 1 failed');
    expect(output).not.toContain('── Stage Details');
  });

  it('should truncate long stdout in verbose stage details', () => {
    const longOutput = 'x'.repeat(300);
    const stages = makeStages();
    stages[0].output = { stdout: longOutput, stderr: '' };

    const report = makeReport({ stages });
    const output = formatHumanOutput(report, { verbose: true });

    expect(output).toContain('...');
    // Should not contain the full 300-char string
    expect(output).not.toContain(longOutput);
  });
});
