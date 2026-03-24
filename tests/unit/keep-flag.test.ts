/**
 * T023-T026: --keep flag feature tests
 *
 * Tests for the complete --keep flag chain:
 * - T023: CLI argument parsing with -k/--keep
 * - T024: Cleanup logic respects --keep
 * - T025: Artifact preservation messages
 * - T026: JSON output includes kept/artifactPaths
 */

import { describe, it, expect, vi } from 'vitest';
import { runDemo, createPipelineStages, createDemoDirectory } from '../../src/demo/orchestrator.js';
import { formatHumanOutput, formatJsonOutput, type ExtendedExecutionReport } from '../../src/demo/formatters.js';
import { FileSystemCleanupHandler } from '../../src/demo/adapters/cleanup-handler.js';
import { StageStatus } from '../../src/demo/entities.js';
import type { DemoConfiguration, ExecutionReport, PipelineStage } from '../../src/demo/entities.js';
import type { DemoDependencies } from '../../src/demo/orchestrator.js';

// ─────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<DemoConfiguration> = {}): DemoConfiguration {
  return {
    exampleFeature: 'Test Feature',
    demoDir: 'specs/demo-20250101-120000',
    flags: {
      dryRun: false,
      keep: false,
      verbose: false,
    },
    timeout: 30,
    squadDir: '.squad',
    specifyDir: 'specs',
    ...overrides,
  };
}

function makeKeepConfig(overrides: Partial<DemoConfiguration> = {}): DemoConfiguration {
  return makeConfig({
    flags: { dryRun: false, keep: true, verbose: false },
    ...overrides,
  });
}

function makeSuccessResult() {
  return {
    success: true,
    exitCode: 0,
    stdout: 'stage output',
    stderr: '',
    timedOut: false,
  };
}

function makeValidArtifact(path: string) {
  return {
    path,
    type: 'spec' as const,
    sizeBytes: 2048,
    exists: true,
    valid: true,
    errors: [],
  };
}

function makeDeps(overrides: Partial<DemoDependencies> = {}): DemoDependencies {
  return {
    processExecutor: {
      execute: vi.fn(),
      run: vi.fn().mockResolvedValue(makeSuccessResult()),
      isCommandAvailable: vi.fn().mockResolvedValue(true),
    },
    artifactValidator: {
      validate: vi.fn().mockImplementation(async (artifactPath: string) =>
        makeValidArtifact(artifactPath),
      ),
      validateAll: vi.fn().mockResolvedValue([]),
    },
    cleanupHandler: {
      cleanup: vi.fn().mockImplementation(async (_config: DemoConfiguration, report: ExecutionReport) => ({
        ...report,
        cleanupPerformed: true,
      })),
      isSafeToDelete: vi.fn().mockResolvedValue(true),
    },
    ...overrides,
  };
}

function makeReport(overrides: Partial<ExecutionReport> = {}): ExecutionReport {
  return {
    totalTimeMs: 5000,
    stagesCompleted: 5,
    stagesFailed: 0,
    artifacts: [
      { name: 'spec.md', path: 'specs/demo-20250101-120000/spec.md', sizeKB: '2.0 KB' },
      { name: 'plan.md', path: 'specs/demo-20250101-120000/plan.md', sizeKB: '1.5 KB' },
    ],
    cleanupPerformed: false,
    kept: false,
    artifactPaths: [],
    ...overrides,
  };
}

function makeExtendedReport(overrides: Partial<ExtendedExecutionReport> = {}): ExtendedExecutionReport {
  const stages: PipelineStage[] = [
    { name: 'specify', displayName: 'Generating specification', command: ['speckit', 'specify'], artifact: 'spec.md', status: StageStatus.Success, elapsedMs: 1000 },
    { name: 'plan', displayName: 'Creating implementation plan', command: ['speckit', 'plan'], artifact: 'plan.md', status: StageStatus.Success, elapsedMs: 800 },
  ];
  return {
    ...makeReport(),
    stages,
    demoDir: 'specs/demo-20250101-120000',
    flags: { dryRun: false, keep: false, verbose: false },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// T023: --keep flag parsing and pipeline pass-through
// ─────────────────────────────────────────────────────────────

describe('T023: --keep flag option', () => {
  it('config.flags.keep defaults to false', () => {
    const config = makeConfig();
    expect(config.flags.keep).toBe(false);
  });

  it('config.flags.keep can be set to true', () => {
    const config = makeKeepConfig();
    expect(config.flags.keep).toBe(true);
  });

  it('keep flag is passed through to orchestrator', async () => {
    const deps = makeDeps();
    const config = makeKeepConfig();

    const report = await runDemo(config, deps);
    // When keep=true, cleanup should not be called
    expect(deps.cleanupHandler.cleanup).not.toHaveBeenCalled();
    expect(report.kept).toBe(true);
  });

  it('keep flag false allows cleanup to proceed', async () => {
    const deps = makeDeps();
    const config = makeConfig();

    await runDemo(config, deps);
    expect(deps.cleanupHandler.cleanup).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────
// T024: Cleanup logic respects --keep
// ─────────────────────────────────────────────────────────────

describe('T024: cleanup logic for --keep flag', () => {
  it('skips cleanup entirely when --keep is active', async () => {
    const deps = makeDeps();
    const config = makeKeepConfig();

    const report = await runDemo(config, deps);

    expect(report.cleanupPerformed).toBe(false);
    expect(report.kept).toBe(true);
    expect(deps.cleanupHandler.cleanup).not.toHaveBeenCalled();
  });

  it('performs cleanup when --keep is not active and all stages succeed', async () => {
    const deps = makeDeps();
    const config = makeConfig();

    const report = await runDemo(config, deps);

    expect(deps.cleanupHandler.cleanup).toHaveBeenCalledOnce();
    expect(report.cleanupPerformed).toBe(true);
  });

  it('skips cleanup on failure even without --keep (for debugging)', async () => {
    const deps = makeDeps({
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn().mockResolvedValue({
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: 'command failed',
          timedOut: false,
        }),
        isCommandAvailable: vi.fn().mockResolvedValue(true),
      },
    });
    const config = makeConfig();

    const report = await runDemo(config, deps);

    expect(report.cleanupPerformed).toBe(false);
    expect(report.kept).toBe(false);
    expect(deps.cleanupHandler.cleanup).not.toHaveBeenCalled();
  });

  it('cleanup handler respects keep flag internally', async () => {
    const handler = new FileSystemCleanupHandler();
    const config = makeKeepConfig();
    const report = makeReport();

    const result = await handler.cleanup(config, report);

    expect(result.cleanupPerformed).toBe(false);
    expect(result.kept).toBe(true);
    expect(result.artifactPaths).toContain(config.demoDir);
  });

  it('cleanup handler includes artifact paths when keep is true', async () => {
    const handler = new FileSystemCleanupHandler();
    const config = makeKeepConfig();
    const report = makeReport({
      artifacts: [
        { name: 'spec.md', path: 'specs/demo-20250101-120000/spec.md', sizeKB: '2.0 KB' },
        { name: 'plan.md', path: 'specs/demo-20250101-120000/plan.md', sizeKB: '1.5 KB' },
      ],
    });

    const result = await handler.cleanup(config, report);

    expect(result.artifactPaths).toContain('specs/demo-20250101-120000');
    expect(result.artifactPaths).toContain('specs/demo-20250101-120000/spec.md');
    expect(result.artifactPaths).toContain('specs/demo-20250101-120000/plan.md');
  });
});

// ─────────────────────────────────────────────────────────────
// T025: Artifact preservation message
// ─────────────────────────────────────────────────────────────

describe('T025: artifact preservation message', () => {
  it('shows preservation message with location when --keep is active', () => {
    const report = makeReport({
      kept: true,
      artifactPaths: [
        'specs/demo-20250101-120000',
        'specs/demo-20250101-120000/spec.md',
        'specs/demo-20250101-120000/plan.md',
      ],
    });

    const output = formatHumanOutput(report);

    expect(output).toContain('Artifacts preserved (--keep)');
    expect(output).toContain('specs/demo-20250101-120000');
  });

  it('lists individual artifact paths in preservation message', () => {
    const report = makeReport({
      kept: true,
      artifactPaths: [
        'specs/demo-20250101-120000',
        'specs/demo-20250101-120000/spec.md',
        'specs/demo-20250101-120000/plan.md',
      ],
    });

    const output = formatHumanOutput(report);

    expect(output).toContain('spec.md');
    expect(output).toContain('plan.md');
  });

  it('shows standard cleanup message when not kept', () => {
    const report = makeReport({ cleanupPerformed: true });

    const output = formatHumanOutput(report);

    expect(output).toContain('Demo directory cleaned up');
    expect(output).not.toContain('Artifacts preserved (--keep)');
  });

  it('shows generic preserved message when cleanup skipped without --keep', () => {
    const report = makeReport({ cleanupPerformed: false, kept: false });

    const output = formatHumanOutput(report);

    expect(output).toContain('Demo artifacts preserved');
    expect(output).not.toContain('--keep');
  });
});

// ─────────────────────────────────────────────────────────────
// T026: JSON output includes kept and artifactPaths
// ─────────────────────────────────────────────────────────────

describe('T026: JSON output with kept and artifactPaths', () => {
  it('includes kept: true in JSON when --keep is active', () => {
    const report = makeExtendedReport({
      kept: true,
      artifactPaths: ['specs/demo-20250101-120000'],
      flags: { dryRun: false, keep: true, verbose: false },
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.kept).toBe(true);
  });

  it('includes kept: false in JSON when --keep is not active', () => {
    const report = makeExtendedReport({
      cleanupPerformed: true,
      kept: false,
      artifactPaths: [],
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.kept).toBe(false);
  });

  it('includes artifactPaths array in JSON output', () => {
    const paths = [
      'specs/demo-20250101-120000',
      'specs/demo-20250101-120000/spec.md',
      'specs/demo-20250101-120000/plan.md',
    ];
    const report = makeExtendedReport({
      kept: true,
      artifactPaths: paths,
      flags: { dryRun: false, keep: true, verbose: false },
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.artifactPaths).toEqual(paths);
  });

  it('artifactPaths is empty array when not kept', () => {
    const report = makeExtendedReport({
      cleanupPerformed: true,
      kept: false,
      artifactPaths: [],
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.artifactPaths).toEqual([]);
  });

  it('JSON output includes both kept and cleanupPerformed', () => {
    const report = makeExtendedReport({
      kept: true,
      cleanupPerformed: false,
      artifactPaths: ['specs/demo-20250101-120000'],
      flags: { dryRun: false, keep: true, verbose: false },
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.kept).toBe(true);
    expect(json.cleanupPerformed).toBe(false);
  });

  it('JSON output preserves flags.keep field', () => {
    const report = makeExtendedReport({
      kept: true,
      artifactPaths: ['specs/demo-20250101-120000'],
      flags: { dryRun: false, keep: true, verbose: false },
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.flags.keep).toBe(true);
  });

  it('JSON failure output includes kept and artifactPaths', () => {
    const failedStage: PipelineStage = {
      name: 'specify',
      displayName: 'Generating specification',
      command: ['speckit', 'specify'],
      artifact: 'spec.md',
      status: StageStatus.Failed,
      elapsedMs: 500,
      error: 'Command failed',
    };
    const report = makeExtendedReport({
      stagesFailed: 1,
      stagesCompleted: 0,
      stages: [failedStage],
      kept: false,
      artifactPaths: [],
      errorSummary: 'Stage specify failed',
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.success).toBe(false);
    expect(json.kept).toBe(false);
    expect(json.artifactPaths).toEqual([]);
    expect(json.failedStage).toBe('specify');
  });
});

// ─────────────────────────────────────────────────────────────
// Integration: Orchestrator end-to-end with --keep
// ─────────────────────────────────────────────────────────────

describe('Orchestrator --keep integration', () => {
  it('produces complete report with artifact paths when --keep is active', async () => {
    const deps = makeDeps();
    const config = makeKeepConfig();

    const report = await runDemo(config, deps);

    expect(report.kept).toBe(true);
    expect(report.cleanupPerformed).toBe(false);
    expect(report.artifactPaths.length).toBeGreaterThan(0);
    expect(report.artifactPaths[0]).toBe(config.demoDir);
  });

  it('produces complete report without artifact paths when not kept', async () => {
    const deps = makeDeps();
    const config = makeConfig();

    const report = await runDemo(config, deps);

    expect(report.kept).toBe(false);
    expect(report.cleanupPerformed).toBe(true);
    expect(report.artifactPaths).toEqual([]);
  });

  it('createDemoDirectory generates unique paths under specs/', () => {
    const dir = createDemoDirectory();
    expect(dir).toMatch(/^specs\/demo-\d{8}-\d{6}$/);
  });

  it('createPipelineStages includes --dry-run for issues when dryRun=true', () => {
    const config = makeKeepConfig({ flags: { dryRun: true, keep: true, verbose: false } });
    const stages = createPipelineStages(config);
    const issuesStage = stages.find(s => s.name === 'issues');
    expect(issuesStage?.command).toContain('--dry-run');
  });
});
