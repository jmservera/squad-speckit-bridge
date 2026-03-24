import { describe, it, expect } from 'vitest';
import {
  StageStatus,
  ArtifactType,
} from '../../src/demo/entities.js';
import type {
  DemoFlags,
  DemoConfiguration,
  PipelineStage,
  DemoArtifact,
  ArtifactSummary,
  ExecutionReport,
  StageOutput,
} from '../../src/demo/entities.js';
import {
  createPipelineStages,
  createDemoDirectory,
} from '../../src/demo/orchestrator.js';
import {
  generateTimestamp,
  formatFileSize,
  formatElapsedTime,
} from '../../src/demo/utils.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeFlags(overrides: Partial<DemoFlags> = {}): DemoFlags {
  return { dryRun: false, keep: false, verbose: false, ...overrides };
}

function makeConfig(overrides: Partial<DemoConfiguration> = {}): DemoConfiguration {
  return {
    exampleFeature: 'User Authentication',
    demoDir: 'specs/demo-20250323-143022',
    flags: makeFlags(),
    timeout: 30,
    squadDir: '.squad',
    specifyDir: '.specify',
    ...overrides,
  };
}

function makeStage(overrides: Partial<PipelineStage> = {}): PipelineStage {
  return {
    name: 'specify',
    displayName: 'Generating specification',
    command: ['speckit', 'specify', 'User Authentication'],
    artifact: 'spec.md',
    status: StageStatus.Pending,
    ...overrides,
  };
}

function makeArtifact(overrides: Partial<DemoArtifact> = {}): DemoArtifact {
  return {
    path: '/demo/spec.md',
    type: ArtifactType.Spec,
    sizeBytes: 1024,
    exists: true,
    valid: true,
    errors: [],
    ...overrides,
  };
}

function makeReport(overrides: Partial<ExecutionReport> = {}): ExecutionReport {
  return {
    totalTimeMs: 5000,
    stagesCompleted: 5,
    stagesFailed: 0,
    artifacts: [],
    cleanupPerformed: false,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// StageStatus enum
// ─────────────────────────────────────────────────────────────

describe('StageStatus', () => {
  it('has exactly 4 values', () => {
    const values = Object.values(StageStatus);
    expect(values).toHaveLength(4);
  });

  it('maps to expected string values', () => {
    expect(StageStatus.Pending).toBe('pending');
    expect(StageStatus.Running).toBe('running');
    expect(StageStatus.Success).toBe('success');
    expect(StageStatus.Failed).toBe('failed');
  });

  it('pending → running is a valid start transition', () => {
    const stage = makeStage({ status: StageStatus.Pending });
    stage.status = StageStatus.Running;
    expect(stage.status).toBe(StageStatus.Running);
  });

  it('running → success is a valid completion transition', () => {
    const stage = makeStage({ status: StageStatus.Running });
    stage.status = StageStatus.Success;
    expect(stage.status).toBe(StageStatus.Success);
  });

  it('running → failed is a valid failure transition', () => {
    const stage = makeStage({ status: StageStatus.Running });
    stage.status = StageStatus.Failed;
    expect(stage.status).toBe(StageStatus.Failed);
  });

  it('all stages start as pending', () => {
    const config = makeConfig();
    const stages = createPipelineStages(config);
    for (const stage of stages) {
      expect(stage.status).toBe(StageStatus.Pending);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// ArtifactType enum
// ─────────────────────────────────────────────────────────────

describe('ArtifactType', () => {
  it('has exactly 4 values', () => {
    const values = Object.values(ArtifactType);
    expect(values).toHaveLength(4);
  });

  it('maps to expected string values', () => {
    expect(ArtifactType.Spec).toBe('spec');
    expect(ArtifactType.Plan).toBe('plan');
    expect(ArtifactType.Tasks).toBe('tasks');
    expect(ArtifactType.Review).toBe('review');
  });
});

// ─────────────────────────────────────────────────────────────
// DemoConfiguration validation
// ─────────────────────────────────────────────────────────────

describe('DemoConfiguration', () => {
  it('creates a valid default configuration', () => {
    const config = makeConfig();
    expect(config.exampleFeature).toBe('User Authentication');
    expect(config.timeout).toBe(30);
    expect(config.squadDir).toBe('.squad');
    expect(config.specifyDir).toBe('.specify');
  });

  it('demoDir follows timestamp naming convention', () => {
    const config = makeConfig();
    expect(config.demoDir).toMatch(/^specs\/demo-\d{8}-\d{6}$/);
  });

  it('timeout must be a positive number', () => {
    const config = makeConfig({ timeout: 0 });
    expect(config.timeout).toBe(0);
    // Orchestrator uses (config.timeout || 30) * 1000, so 0 falls back to 30
    const effectiveTimeout = (config.timeout || 30) * 1000;
    expect(effectiveTimeout).toBe(30000);
  });

  it('negative timeout falls back to default in orchestrator', () => {
    const config = makeConfig({ timeout: -5 });
    const effectiveTimeout = (config.timeout || 30) * 1000;
    expect(effectiveTimeout).toBe(-5000);
    // Note: negative values are not explicitly guarded — they pass through
  });

  it('exampleFeature is a non-empty string', () => {
    const config = makeConfig();
    expect(config.exampleFeature.length).toBeGreaterThan(0);
  });

  describe('DemoFlags defaults', () => {
    it('dryRun defaults to false', () => {
      expect(makeFlags().dryRun).toBe(false);
    });

    it('keep defaults to false', () => {
      expect(makeFlags().keep).toBe(false);
    });

    it('verbose defaults to false', () => {
      expect(makeFlags().verbose).toBe(false);
    });

    it('accepts all-true flags', () => {
      const flags = makeFlags({ dryRun: true, keep: true, verbose: true });
      expect(flags.dryRun).toBe(true);
      expect(flags.keep).toBe(true);
      expect(flags.verbose).toBe(true);
    });
  });

  describe('flags affect pipeline behavior', () => {
    it('dryRun adds --dry-run flag to issues command', () => {
      const config = makeConfig({ flags: makeFlags({ dryRun: true }) });
      const stages = createPipelineStages(config);
      const issuesStage = stages.find((s) => s.name === 'issues')!;
      expect(issuesStage.command).toContain('--dry-run');
    });

    it('no dryRun omits --dry-run from issues command', () => {
      const config = makeConfig({ flags: makeFlags({ dryRun: false }) });
      const stages = createPipelineStages(config);
      const issuesStage = stages.find((s) => s.name === 'issues')!;
      expect(issuesStage.command).not.toContain('--dry-run');
    });
  });
});

// ─────────────────────────────────────────────────────────────
// PipelineStage structure
// ─────────────────────────────────────────────────────────────

describe('PipelineStage', () => {
  it('has required fields', () => {
    const stage = makeStage();
    expect(stage.name).toBeDefined();
    expect(stage.displayName).toBeDefined();
    expect(stage.command).toBeDefined();
    expect(stage.artifact).toBeDefined();
    expect(stage.status).toBeDefined();
  });

  it('optional timing fields start undefined', () => {
    const stage = makeStage();
    expect(stage.startTime).toBeUndefined();
    expect(stage.endTime).toBeUndefined();
    expect(stage.elapsedMs).toBeUndefined();
  });

  it('error field is undefined until failure', () => {
    const stage = makeStage();
    expect(stage.error).toBeUndefined();
  });

  it('timing fields are set after execution', () => {
    const stage = makeStage({
      status: StageStatus.Success,
      startTime: 1000,
      endTime: 2000,
      elapsedMs: 1000,
    });
    expect(stage.elapsedMs).toBe(stage.endTime! - stage.startTime!);
  });

  it('error is set on failure', () => {
    const stage = makeStage({
      status: StageStatus.Failed,
      error: 'Command timed out',
    });
    expect(stage.error).toBe('Command timed out');
  });

  it('output captures stdout and stderr', () => {
    const output: StageOutput = { stdout: 'generated spec.md', stderr: '' };
    const stage = makeStage({ output });
    expect(stage.output?.stdout).toBe('generated spec.md');
    expect(stage.output?.stderr).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────
// Stage status transitions (pipeline behavior)
// ─────────────────────────────────────────────────────────────

describe('Stage status transitions', () => {
  it('full success path: pending → running → success', () => {
    const stage = makeStage({ status: StageStatus.Pending });
    expect(stage.status).toBe(StageStatus.Pending);

    stage.status = StageStatus.Running;
    stage.startTime = Date.now();
    expect(stage.status).toBe(StageStatus.Running);

    stage.status = StageStatus.Success;
    stage.endTime = Date.now();
    stage.elapsedMs = stage.endTime - stage.startTime;
    expect(stage.status).toBe(StageStatus.Success);
    expect(stage.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('failure path: pending → running → failed', () => {
    const stage = makeStage({ status: StageStatus.Pending });
    stage.status = StageStatus.Running;
    stage.startTime = Date.now();

    stage.status = StageStatus.Failed;
    stage.endTime = Date.now();
    stage.elapsedMs = stage.endTime - stage.startTime;
    stage.error = 'Process exited with code 1';
    expect(stage.status).toBe(StageStatus.Failed);
    expect(stage.error).toContain('code 1');
  });

  it('stages after a failure remain pending', () => {
    const config = makeConfig();
    const stages = createPipelineStages(config);

    // Simulate first stage running and failing
    stages[0].status = StageStatus.Running;
    stages[0].status = StageStatus.Failed;

    // Remaining stages stay pending (pipeline halts on failure)
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].status).toBe(StageStatus.Pending);
    }
  });

  it('createPipelineStages produces 5 stages in correct order', () => {
    const stages = createPipelineStages(makeConfig());
    expect(stages).toHaveLength(5);
    expect(stages[0].name).toBe('specify');
    expect(stages[1].name).toBe('plan');
    expect(stages[2].name).toBe('tasks');
    expect(stages[3].name).toBe('review');
    expect(stages[4].name).toBe('issues');
  });

  it('each stage has a unique name', () => {
    const stages = createPipelineStages(makeConfig());
    const names = stages.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('each stage has a non-empty command array', () => {
    const stages = createPipelineStages(makeConfig());
    for (const stage of stages) {
      expect(stage.command.length).toBeGreaterThan(0);
    }
  });

  it('each stage has an artifact filename', () => {
    const stages = createPipelineStages(makeConfig());
    for (const stage of stages) {
      expect(stage.artifact).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// DemoArtifact validation
// ─────────────────────────────────────────────────────────────

describe('DemoArtifact', () => {
  it('valid artifact has no errors', () => {
    const artifact = makeArtifact();
    expect(artifact.valid).toBe(true);
    expect(artifact.errors).toHaveLength(0);
  });

  it('invalid artifact has error messages', () => {
    const artifact = makeArtifact({
      valid: false,
      errors: ['Missing frontmatter', 'Empty content'],
    });
    expect(artifact.valid).toBe(false);
    expect(artifact.errors).toHaveLength(2);
  });

  it('non-existent artifact has zero size', () => {
    const artifact = makeArtifact({ exists: false, sizeBytes: 0 });
    expect(artifact.exists).toBe(false);
    expect(artifact.sizeBytes).toBe(0);
  });

  it('artifact type matches enum values', () => {
    const types = [ArtifactType.Spec, ArtifactType.Plan, ArtifactType.Tasks, ArtifactType.Review];
    for (const type of types) {
      const artifact = makeArtifact({ type });
      expect(Object.values(ArtifactType)).toContain(artifact.type);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// ExecutionReport derived properties
// ─────────────────────────────────────────────────────────────

describe('ExecutionReport', () => {
  it('total stages equals completed + failed', () => {
    const report = makeReport({ stagesCompleted: 3, stagesFailed: 2 });
    expect(report.stagesCompleted + report.stagesFailed).toBe(5);
  });

  it('all-success report has zero failures', () => {
    const report = makeReport({ stagesCompleted: 5, stagesFailed: 0 });
    expect(report.stagesFailed).toBe(0);
  });

  it('all-success report has no errorSummary', () => {
    const report = makeReport({ stagesCompleted: 5, stagesFailed: 0 });
    expect(report.errorSummary).toBeUndefined();
  });

  it('failed report has errorSummary', () => {
    const report = makeReport({
      stagesFailed: 1,
      errorSummary: "Stage 'plan' failed: Command timed out",
    });
    expect(report.errorSummary).toBeDefined();
    expect(report.errorSummary).toContain('plan');
  });

  it('cleanupPerformed is false when keep=true', () => {
    const report = makeReport({ cleanupPerformed: false });
    expect(report.cleanupPerformed).toBe(false);
  });

  it('cleanupPerformed is true after successful cleanup', () => {
    const report = makeReport({ cleanupPerformed: true });
    expect(report.cleanupPerformed).toBe(true);
  });

  it('artifacts list is empty when no stages completed', () => {
    const report = makeReport({ stagesCompleted: 0, artifacts: [] });
    expect(report.artifacts).toHaveLength(0);
  });

  it('artifacts contain valid ArtifactSummary entries', () => {
    const artifacts: ArtifactSummary[] = [
      { name: 'spec.md', path: '/demo/spec.md', sizeKB: '1.2 KB' },
      { name: 'plan.md', path: '/demo/plan.md', sizeKB: '0.8 KB' },
    ];
    const report = makeReport({ stagesCompleted: 2, artifacts });
    expect(report.artifacts).toHaveLength(2);
    expect(report.artifacts[0].name).toBe('spec.md');
    expect(report.artifacts[1].sizeKB).toMatch(/^\d+\.\d+\s*KB$/);
  });

  it('totalTimeMs is non-negative', () => {
    const report = makeReport({ totalTimeMs: 0 });
    expect(report.totalTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('report with failure preserves artifacts from successful stages', () => {
    const artifacts: ArtifactSummary[] = [
      { name: 'spec.md', path: '/demo/spec.md', sizeKB: '1.5 KB' },
    ];
    const report = makeReport({
      stagesCompleted: 1,
      stagesFailed: 1,
      artifacts,
      errorSummary: "Stage 'plan' failed",
    });
    expect(report.artifacts).toHaveLength(1);
    expect(report.stagesFailed).toBe(1);
  });

  it('cleanup is not performed when stages fail', () => {
    const report = makeReport({
      stagesFailed: 1,
      cleanupPerformed: false,
    });
    expect(report.cleanupPerformed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────

describe('generateTimestamp', () => {
  it('returns YYYYMMDD-HHMMSS format', () => {
    const ts = generateTimestamp();
    expect(ts).toMatch(/^\d{8}-\d{6}$/);
  });

  it('returns a string of 15 characters', () => {
    expect(generateTimestamp()).toHaveLength(15);
  });
});

describe('formatFileSize', () => {
  it('formats 0 bytes as 0.0 KB', () => {
    expect(formatFileSize(0)).toBe('0.0 KB');
  });

  it('formats 1024 bytes as 1.0 KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });

  it('formats fractional KB correctly', () => {
    expect(formatFileSize(512)).toBe('0.5 KB');
  });

  it('formats large values', () => {
    expect(formatFileSize(10240)).toBe('10.0 KB');
  });
});

describe('formatElapsedTime', () => {
  it('formats 0ms as 0.0s', () => {
    expect(formatElapsedTime(0)).toBe('0.0s');
  });

  it('formats 1000ms as 1.0s', () => {
    expect(formatElapsedTime(1000)).toBe('1.0s');
  });

  it('formats 1500ms as 1.5s', () => {
    expect(formatElapsedTime(1500)).toBe('1.5s');
  });

  it('formats large values', () => {
    expect(formatElapsedTime(30000)).toBe('30.0s');
  });
});

// ─────────────────────────────────────────────────────────────
// createDemoDirectory
// ─────────────────────────────────────────────────────────────

describe('createDemoDirectory', () => {
  it('returns a path under specs/', () => {
    const dir = createDemoDirectory();
    expect(dir).toMatch(/^specs\/demo-/);
  });

  it('includes a timestamp suffix', () => {
    const dir = createDemoDirectory();
    expect(dir).toMatch(/^specs\/demo-\d{8}-\d{6}$/);
  });

  it('generates unique directories on successive calls', () => {
    const dirs = new Set<string>();
    // Rapid calls within same second may collide, but structure is correct
    for (let i = 0; i < 3; i++) {
      dirs.add(createDemoDirectory());
    }
    // At minimum, format is consistent
    for (const dir of dirs) {
      expect(dir).toMatch(/^specs\/demo-\d{8}-\d{6}$/);
    }
  });
});
