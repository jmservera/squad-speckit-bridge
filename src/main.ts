/**
 * Composition Root
 *
 * Wires real adapters into use cases via constructor injection.
 * The ONLY file that knows about all layers. No business logic here.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveVersion } from './version.js';
import { FileSystemFrameworkDetector } from './install/adapters/framework-detector.js';
import { FileSystemDeployer } from './install/adapters/file-deployer.js';
import { ConfigFileLoader } from './install/adapters/config-loader.js';
import { installBridge } from './install/installer.js';
import { checkStatus } from './install/status.js';
import { prepareReview } from './review/ceremony.js';
import { TasksParser } from './review/adapters/tasks-parser.js';
import { ReviewWriter } from './review/adapters/review-writer.js';
import { SquadFileReader } from './bridge/adapters/squad-file-reader.js';
import { SpecKitContextWriter } from './bridge/adapters/speckit-writer.js';
import { buildSquadContext } from './bridge/context.js';
import { createIssuesFromTasks } from './issues/create-issues.js';
import { TasksMarkdownParser } from './issues/task-parser.js';
import { GitHubIssueAdapter } from './issues/adapters/github-issue-adapter.js';
import { syncLearnings, computeLearningFingerprint } from './sync/sync-learnings.js';
import { SyncStateAdapter } from './sync/adapters/sync-state-adapter.js';
import { AgentHistoryReaderAdapter } from './sync/adapters/agent-history-reader.js';
import { ConstitutionAdapter } from './sync/adapters/constitution-adapter.js';
import { syncReverse } from './sync/sync-reverse.js';
import { LearningExtractorAdapter } from './sync/adapters/learning-extractor.js';
import { ReverseSyncStateAdapter } from './sync/adapters/reverse-sync-state-adapter.js';
import { SpecLearningsWriterAdapter } from './sync/adapters/spec-learnings-writer.js';
import { ReverseConstitutionAdapter } from './sync/adapters/reverse-constitution-adapter.js';
import type { StatusReport } from './install/status.js';
import type { InstallManifest, ContextSummary, DesignReviewRecord, IssueRecord, SyncRecord, ReverseSyncResult, ReverseSyncOptions } from './types.js';

// Resolve template directory relative to this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = resolve(__dirname, 'install', 'templates');

async function loadTemplate(name: string): Promise<string> {
  const templatePath = resolve(TEMPLATES_DIR, name);
  return readFile(templatePath, 'utf-8');
}

export interface InstallerOptions {
  configPath?: string;
  squadDir?: string;
  specifyDir?: string;
  baseDir?: string;
}

export interface InstallOutput {
  humanOutput: string;
  jsonOutput: {
    dryRun: boolean;
    version: string;
    frameworks: {
      squad: { detected: boolean; path: string };
      specKit: { detected: boolean; path: string };
    };
    installed: string[];
    warnings: string[];
  };
}

export interface StatusOutput {
  humanOutput: string;
  jsonOutput: StatusReport & { dryRun: boolean };
}

export interface ReviewerOptions {
  configPath?: string;
  squadDir?: string;
  baseDir?: string;
}

export interface ReviewOutput {
  humanOutput: string;
  jsonOutput: {
    dryRun: boolean;
    reviewedArtifact: string;
    timestamp: string;
    approvalStatus: string;
    findingCounts: { high: number; medium: number; low: number };
    findings: DesignReviewRecord['findings'];
    outputPath: string;
  };
}

export function createInstaller(options: InstallerOptions = {}) {
  const baseDir = options.baseDir ?? process.cwd();
  const version = resolveVersion();
  const detector = new FileSystemFrameworkDetector(baseDir);
  const deployer = new FileSystemDeployer(baseDir, version);
  const configLoader = new ConfigFileLoader({
    configPath: options.configPath,
    baseDir,
  });

  return {
    async install(opts: { force?: boolean; dryRun?: boolean } = {}): Promise<InstallOutput> {
      const config = await configLoader.load();
      const dryRun = opts.dryRun ?? false;

      // Apply CLI overrides
      if (options.squadDir) config.paths.squadDir = options.squadDir;
      if (options.specifyDir) config.paths.specifyDir = options.specifyDir;

      if (dryRun) {
        // Dry-run: detect frameworks but skip file deployment
        const hasSquad = await detector.detectSquad(config.paths.squadDir);
        const hasSpecKit = await detector.detectSpecKit(config.paths.specifyDir);

        const wouldInstall: string[] = [];
        if (hasSquad) wouldInstall.push(`${config.paths.squadDir}/skills/bridge-integration.md`);
        if (hasSpecKit) {
          wouldInstall.push(`${config.paths.specifyDir}/extensions/squad-bridge.yml`);
          wouldInstall.push(`${config.paths.specifyDir}/ceremonies/design-review.md`);
        }

        const humanOutput = formatInstallHuman(
          {
            version,
            installedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            components: { squadSkill: hasSquad, specKitExtension: hasSpecKit, ceremonyDef: hasSpecKit },
            files: wouldInstall,
          },
          [],
          config,
          true,
        );
        const jsonOutput = formatInstallJson(
          {
            version,
            installedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            components: { squadSkill: hasSquad, specKitExtension: hasSpecKit, ceremonyDef: hasSpecKit },
            files: wouldInstall,
          },
          [],
          config,
          true,
        );

        return { humanOutput, jsonOutput };
      }

      // Load templates (including hooks)
      const [skillTemplate, ceremonyTemplate, extensionTemplate, afterTasksHook, beforeSpecifyHook, afterImplementHook] =
        await Promise.all([
          loadTemplate('skill.md'),
          loadTemplate('ceremony.md'),
          loadTemplate('extension.yml'),
          loadTemplate('hooks/after-tasks.sh'),
          loadTemplate('hooks/before-specify.sh'),
          loadTemplate('hooks/after-implement.sh'),
        ]);

      const result = await installBridge(
        detector,
        deployer,
        {
          skillTemplate,
          ceremonyTemplate,
          extensionTemplate,
          hookTemplates: {
            afterTasks: afterTasksHook,
            beforeSpecify: beforeSpecifyHook,
            afterImplement: afterImplementHook,
          },
        },
        { config, force: opts.force },
        version,
      );

      const humanOutput = formatInstallHuman(result.manifest, result.warnings, config, false);
      const jsonOutput = formatInstallJson(result.manifest, result.warnings, config, false);

      return { humanOutput, jsonOutput };
    },
  };
}

export function createStatusChecker(
  options: { configPath?: string; baseDir?: string } = {},
) {
  const baseDir = options.baseDir ?? process.cwd();
  const version = resolveVersion();
  const detector = new FileSystemFrameworkDetector(baseDir);
  const deployer = new FileSystemDeployer(baseDir, version);
  const configLoader = new ConfigFileLoader({
    configPath: options.configPath,
    baseDir,
  });

  return {
    async check(opts: { dryRun?: boolean } = {}): Promise<StatusOutput> {
      const dryRun = opts.dryRun ?? false;
      const config = await configLoader.load();
      const squadDirPath = resolve(baseDir, config.paths.squadDir);
      const squadReader = new SquadFileReader(squadDirPath);
      const report = await checkStatus(detector, deployer, configLoader, squadReader, version);
      return {
        humanOutput: formatStatusHuman(report, dryRun),
        jsonOutput: { ...report, dryRun },
      };
    },
  };
}

export function createReviewer(options: ReviewerOptions = {}) {
  const baseDir = options.baseDir ?? process.cwd();
  const configLoader = new ConfigFileLoader({
    configPath: options.configPath,
    baseDir,
  });
  const tasksParser = new TasksParser();
  const reviewWriter = new ReviewWriter();

  return {
    async review(
      tasksFile: string,
      outputPath?: string,
      opts: { dryRun?: boolean } = {},
    ): Promise<ReviewOutput> {
      const config = await configLoader.load();
      const dryRun = opts.dryRun ?? false;

      // Apply CLI override
      const squadDir = options.squadDir ?? config.paths.squadDir;
      const squadReader = new SquadFileReader(resolve(baseDir, squadDir));

      const resolvedOutputPath =
        outputPath ?? join(dirname(tasksFile), 'review.md');

      const { record } = await prepareReview(tasksParser, squadReader, {
        tasksFilePath: tasksFile,
      });

      if (!dryRun) {
        await reviewWriter.write(record, resolvedOutputPath);
      }

      return {
        humanOutput: formatReviewHuman(record, resolvedOutputPath, dryRun),
        jsonOutput: formatReviewJson(record, resolvedOutputPath, dryRun),
      };
    },
  };
}

// --- Issues command composition ---

export interface IssuesOptions {
  configPath?: string;
  baseDir?: string;
}

export interface IssuesOutput {
  humanOutput: string;
  jsonOutput: {
    created: IssueRecord[];
    skippedCount: number;
    duplicateCount: number;
    total: number;
    dryRun: boolean;
  };
}

export function createIssueCreator(options: IssuesOptions = {}) {
  const baseDir = options.baseDir ?? process.cwd();
  const configLoader = new ConfigFileLoader({
    configPath: options.configPath,
    baseDir,
  });
  const tasksParser = new TasksMarkdownParser();
  const issueAdapter = new GitHubIssueAdapter();

  return {
    async createFromTasks(
      tasksFile: string,
      opts: { dryRun?: boolean; labels?: string[]; repository?: string } = {},
    ): Promise<IssuesOutput> {
      const config = await configLoader.load();
      const labels = opts.labels ?? config.issues.defaultLabels;
      const repository = opts.repository ?? config.issues.repository;

      if (!repository && !opts.dryRun) {
        throw new Error('Repository not specified. Use --repo or set issues.repository in config.');
      }

      const result = await createIssuesFromTasks(tasksParser, issueAdapter, {
        tasksFilePath: tasksFile,
        labels,
        repository: repository || 'unknown/unknown',
        dryRun: opts.dryRun ?? false,
      });

      return {
        humanOutput: formatIssuesHuman(
          result.created,
          result.skipped.length,
          result.duplicates.length,
          result.total,
          result.dryRun,
        ),
        jsonOutput: {
          created: result.created,
          skippedCount: result.skipped.length,
          duplicateCount: result.duplicates.length,
          total: result.total,
          dryRun: result.dryRun,
        },
      };
    },
  };
}

// --- Sync command composition ---

export interface SyncOutput {
  humanOutput: string;
  jsonOutput: {
    record: SyncRecord;
    dryRun: boolean;
  };
}

export function createSyncer(options: { configPath?: string; baseDir?: string; agentDir?: string; noConstitution?: boolean } = {}) {
  const baseDir = options.baseDir ?? process.cwd();
  const configLoader = new ConfigFileLoader({
    configPath: options.configPath,
    baseDir,
  });
  const syncAdapter = new SyncStateAdapter();
  const historyReader = new AgentHistoryReaderAdapter();
  const constitutionWriter = options.noConstitution ? undefined : new ConstitutionAdapter();

  return {
    async sync(
      specDir: string,
      opts: { dryRun?: boolean } = {},
    ): Promise<SyncOutput> {
      const config = await configLoader.load();
      const squadDir = resolve(baseDir, config.paths.squadDir);
      const agentDir = options.agentDir ?? resolve(squadDir, 'agents');
      const constitutionPath = constitutionWriter
        ? resolve(baseDir, config.paths.specifyDir, 'memory', 'constitution.md')
        : undefined;

      const result = await syncLearnings(syncAdapter, syncAdapter, {
        specDir: resolve(baseDir, specDir),
        squadDir,
        agentDir,
        constitutionPath,
        dryRun: opts.dryRun ?? false,
      }, historyReader, constitutionWriter);

      return {
        humanOutput: formatSyncHuman(result.record, result.dryRun),
        jsonOutput: {
          record: result.record,
          dryRun: result.dryRun,
        },
      };
    },
  };
}

// --- Output formatters (adapter-level concern) ---

function formatInstallHuman(
  manifest: InstallManifest,
  warnings: string[],
  config: { paths: { squadDir: string; specifyDir: string } },
  dryRun: boolean,
): string {
  const lines: string[] = [];
  const prefix = dryRun ? '[DRY RUN] ' : '';
  lines.push(`${prefix}Squad-SpecKit Bridge v${manifest.version}`);
  lines.push('');
  lines.push('Detecting frameworks...');

  if (manifest.components.squadSkill) {
    lines.push(`  ✓ Squad detected at ${config.paths.squadDir}/`);
  } else {
    lines.push(`  ⚠ Squad not detected (${config.paths.squadDir}/ missing)`);
  }

  if (manifest.components.specKitExtension) {
    lines.push(`  ✓ Spec Kit detected at ${config.paths.specifyDir}/`);
  } else {
    lines.push(`  ⚠ Spec Kit not detected (${config.paths.specifyDir}/ missing)`);
  }

  lines.push('');

  const isPartial =
    !manifest.components.squadSkill || !manifest.components.specKitExtension;
  if (isPartial) {
    lines.push(`${prefix}Installing partial components...`);
  } else {
    lines.push(`${prefix}Installing components...`);
  }

  for (const file of manifest.files) {
    lines.push(`  ${dryRun ? '•' : '✓'} ${file}`);
  }
  if (!dryRun) {
    lines.push(`  ✓ Manifest: .bridge-manifest.json`);
  }

  lines.push('');

  if (dryRun) {
    lines.push(
      `${prefix}Would install ${manifest.files.length} files. No changes were made.`,
    );
  } else if (isPartial) {
    lines.push(
      `Partial installation complete. ${manifest.files.length} files created.`,
    );
    if (!manifest.components.squadSkill) {
      lines.push(
        'To complete: Initialize Squad, then run `squad-speckit-bridge install` again.',
      );
    }
    if (!manifest.components.specKitExtension) {
      lines.push(
        'To complete: Initialize Spec Kit, then run `squad-speckit-bridge install` again.',
      );
    }
  } else {
    lines.push(
      `Installation complete. ${manifest.files.length} files created.`,
    );
  }

  if (warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const w of warnings) {
      lines.push(`  ⚠ ${w}`);
    }
  }

  return lines.join('\n');
}

function formatInstallJson(
  manifest: InstallManifest,
  warnings: string[],
  config: { paths: { squadDir: string; specifyDir: string } },
  dryRun: boolean,
) {
  return {
    dryRun,
    version: manifest.version,
    frameworks: {
      squad: {
        detected: manifest.components.squadSkill,
        path: config.paths.squadDir,
      },
      specKit: {
        detected: manifest.components.specKitExtension,
        path: config.paths.specifyDir,
      },
    },
    installed: manifest.files,
    warnings,
  };
}

function formatStatusHuman(report: StatusReport, dryRun: boolean): string {
  const lines: string[] = [];
  const prefix = dryRun ? '[DRY RUN] ' : '';
  lines.push(`${prefix}Squad-SpecKit Bridge v${report.version}`);
  lines.push('');
  lines.push('Frameworks:');
  lines.push(
    `  Squad:    ${report.frameworks.squad.detected ? '✓' : '✗'} ${report.frameworks.squad.detected ? 'detected' : 'not detected'} at ${report.frameworks.squad.path}/`,
  );
  lines.push(
    `  Spec Kit: ${report.frameworks.specKit.detected ? '✓' : '✗'} ${report.frameworks.specKit.detected ? 'detected' : 'not detected'} at ${report.frameworks.specKit.path}/`,
  );

  lines.push('');
  lines.push('Bridge Components:');

  const comp = report.components;
  lines.push(
    `  Squad skill:      ${comp.squadSkill.installed ? '✓ installed' : '✗ not installed'}${comp.squadSkill.path ? ` (${comp.squadSkill.path})` : ''}`,
  );
  lines.push(
    `  Ceremony def:     ${comp.ceremonyDef.installed ? '✓ installed' : '✗ not installed'}${comp.ceremonyDef.path ? ` (${comp.ceremonyDef.path})` : ''}`,
  );
  lines.push(
    `  Spec Kit ext:     ${comp.specKitExtension.installed ? '✓ installed' : '✗ not installed'}${comp.specKitExtension.path ? ` (${comp.specKitExtension.path})` : ''}`,
  );
  lines.push(
    `  Manifest:         ${comp.manifest.installed ? '✓ present' : '✗ not found'}${comp.manifest.path ? ` (${comp.manifest.path})` : ''}`,
  );

  lines.push('');
  lines.push('Configuration:');
  lines.push(`  Context max size: ${report.config.contextMaxBytes} bytes`);
  lines.push(
    `  After-tasks hook: ${report.config.hooks.afterTasks ? 'enabled' : 'disabled'}`,
  );

  const sources: string[] = [];
  if (report.config.sources.skills) sources.push('skills');
  if (report.config.sources.decisions) sources.push('decisions');
  if (report.config.sources.histories) sources.push('histories');
  lines.push(`  Sources:          ${sources.join(', ')}`);

  if (report.warnings && report.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const w of report.warnings) {
      lines.push(`  ⚠ ${w}`);
    }
  }

  if (report.constitution) {
    lines.push('');
    lines.push('Constitution:');
    if (!report.constitution.exists) {
      lines.push('  ✗ Not found');
    } else if (report.constitution.isTemplate) {
      lines.push('  ⚠ Template (uncustomized)');
    } else {
      lines.push('  ✓ Customized');
    }
  }

  return lines.join('\n');
}

// --- T027: Context Builder Composition ---

export interface ContextBuilderOptions {
  configPath?: string;
  squadDir?: string;
  specDir: string;
  maxSize?: number;
  sources?: {
    skills: boolean;
    decisions: boolean;
    histories: boolean;
  };
  baseDir?: string;
  dryRun?: boolean;
}

export interface ContextOutput {
  humanOutput: string;
  jsonOutput: {
    dryRun: boolean;
    output: string;
    sizeBytes: number;
    maxBytes: number;
    sources: {
      skills: { found: number; included: number; bytes: number };
      decisions: { found: number; included: number; bytes: number };
      histories: { found: number; entriesIncluded: number; bytes: number };
    };
    skipped: { file: string; reason: string }[];
    warnings: string[];
  };
}

export function createContextBuilder(options: ContextBuilderOptions) {
  const baseDir = options.baseDir ?? process.cwd();
  const configLoader = new ConfigFileLoader({
    configPath: options.configPath,
    baseDir,
  });

  return {
    async build(): Promise<ContextOutput> {
      const config = await configLoader.load();
      const dryRun = options.dryRun ?? false;

      // Apply CLI overrides
      if (options.squadDir) config.paths.squadDir = options.squadDir;
      if (options.maxSize) config.contextMaxBytes = options.maxSize;
      if (options.sources) {
        config.sources = { ...config.sources, ...options.sources };
      }

      const squadDirPath = resolve(baseDir, config.paths.squadDir);
      const specDirPath = resolve(baseDir, options.specDir);

      const reader = new SquadFileReader(squadDirPath);
      const realWriter = new SpecKitContextWriter(specDirPath);

      // In dry-run mode, wrap the writer to skip the actual file write
      const writer = dryRun
        ? {
            write: async () => {},
            readPreviousMetadata: () => realWriter.readPreviousMetadata(),
          }
        : realWriter;

      const { summary } = await buildSquadContext(reader, writer, { config });

      const outputPath = `${options.specDir}/squad-context.md`;
      const readerWarnings = reader.getWarnings();

      const humanOutput = formatContextHuman(summary, outputPath, readerWarnings, dryRun);
      const jsonOutput = formatContextJson(summary, outputPath, readerWarnings, dryRun);

      return { humanOutput, jsonOutput };
    },
  };
}

function formatContextHuman(
  summary: ContextSummary,
  outputPath: string,
  parseWarnings: { file: string; reason: string }[],
  dryRun: boolean,
): string {
  const lines: string[] = [];
  const m = summary.metadata;
  const prefix = dryRun ? '[DRY RUN] ' : '';

  lines.push(`${prefix}Generating Squad context...`);
  lines.push('');
  lines.push('Sources processed:');
  lines.push(`  Skills:    ${m.sources.skills} included`);
  lines.push(`  Decisions: ${m.sources.decisions} included`);
  lines.push(`  Histories: ${m.sources.histories} included`);

  if (m.sources.skipped.length > 0) {
    lines.push(`  Skipped:   ${m.sources.skipped.length} entries`);
  }

  if (parseWarnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const w of parseWarnings) {
      lines.push(`  ⚠ ${w.file}: ${w.reason}`);
    }
  }

  lines.push('');
  if (dryRun) {
    lines.push(
      `${prefix}Would write: ${outputPath} (${(m.sizeBytes / 1024).toFixed(1)}KB / ${(m.maxBytes / 1024).toFixed(1)}KB limit). No changes were made.`,
    );
  } else {
    lines.push(
      `Output: ${outputPath} (${(m.sizeBytes / 1024).toFixed(1)}KB / ${(m.maxBytes / 1024).toFixed(1)}KB limit)`,
    );
  }

  return lines.join('\n');
}

function formatReviewHuman(
  record: DesignReviewRecord,
  outputPath: string,
  dryRun: boolean,
): string {
  const lines: string[] = [];
  const prefix = dryRun ? '[DRY RUN] ' : '';
  lines.push(`${prefix}Design Review prepared for ${record.reviewedArtifact}`);
  lines.push('');
  lines.push('Pre-populated findings:');
  const high = record.findings.filter((f) => f.severity === 'high').length;
  const medium = record.findings.filter((f) => f.severity === 'medium').length;
  const low = record.findings.filter((f) => f.severity === 'low').length;
  if (high > 0) lines.push(`  🔴 ${high} high severity issue(s)`);
  if (medium > 0)
    lines.push(`  ⚠ ${medium} potential decision conflict(s) detected`);
  if (low > 0) lines.push(`  ℹ ${low} task(s) may benefit from agent expertise`);
  if (record.findings.length === 0) {
    lines.push('  ✓ No issues detected');
  }
  lines.push('');
  if (dryRun) {
    lines.push(`${prefix}Would write review to: ${outputPath}. No changes were made.`);
  } else {
    lines.push(`Review template written to: ${outputPath}`);
    lines.push('Next: Run the Design Review ceremony with your Squad team.');
  }

  return lines.join('\n');
}

function formatContextJson(
  summary: ContextSummary,
  outputPath: string,
  parseWarnings: { file: string; reason: string }[],
  dryRun: boolean,
) {
  const m = summary.metadata;

  const encoder = new TextEncoder();
  const skillBytes = summary.content.skills.reduce(
    (acc, s) => acc + encoder.encode(s.context).length,
    0,
  );
  const decisionBytes = summary.content.decisions.reduce(
    (acc, d) => acc + encoder.encode(d.summary + d.fullContent).length,
    0,
  );
  const learningBytes = summary.content.learnings.reduce(
    (acc, l) =>
      acc +
      l.entries.reduce(
        (a, e) => a + encoder.encode(e.summary).length,
        0,
      ),
    0,
  );

  const totalEntries = summary.content.learnings.reduce(
    (acc, l) => acc + l.entries.length,
    0,
  );

  return {
    dryRun,
    output: outputPath,
    sizeBytes: m.sizeBytes,
    maxBytes: m.maxBytes,
    sources: {
      skills: {
        found: m.sources.skills,
        included: m.sources.skills,
        bytes: skillBytes,
      },
      decisions: {
        found: m.sources.decisions,
        included: m.sources.decisions,
        bytes: decisionBytes,
      },
      histories: {
        found: m.sources.histories,
        entriesIncluded: totalEntries,
        bytes: learningBytes,
      },
    },
    skipped: parseWarnings.map((w) => ({ file: w.file, reason: w.reason })),
    warnings: summary.content.warnings,
  };
}

function formatReviewJson(record: DesignReviewRecord, outputPath: string, dryRun: boolean) {
  const high = record.findings.filter((f) => f.severity === 'high').length;
  const medium = record.findings.filter((f) => f.severity === 'medium').length;
  const low = record.findings.filter((f) => f.severity === 'low').length;
  return {
    dryRun,
    reviewedArtifact: record.reviewedArtifact,
    timestamp: record.timestamp,
    approvalStatus: record.approvalStatus,
    findingCounts: { high, medium, low },
    findings: record.findings,
    outputPath,
  };
}

function formatIssuesHuman(
  created: IssueRecord[],
  skippedCount: number,
  duplicateCount: number,
  total: number,
  dryRun: boolean,
): string {
  const lines: string[] = [];
  const prefix = dryRun ? '[DRY RUN] ' : '';

  lines.push(`${prefix}Issues from tasks.md`);
  lines.push('');
  lines.push(`Total tasks: ${total}`);
  lines.push(`Eligible: ${created.length}`);
  lines.push(`Skipped (completed): ${skippedCount}`);
  lines.push(`Duplicates (already exist): ${duplicateCount}`);
  lines.push('');

  if (created.length > 0) {
    lines.push(`${prefix}${dryRun ? 'Would create issues:' : 'Created issues:'}`);
    for (const issue of created) {
      if (dryRun) {
        lines.push(`  • ${issue.title} [${issue.labels.join(', ')}]`);
      } else {
        lines.push(`  ✓ #${issue.issueNumber}: ${issue.title}`);
        if (issue.url) lines.push(`    ${issue.url}`);
      }
    }
    if (dryRun) {
      lines.push('');
      lines.push(`${prefix}No changes were made.`);
    }
  } else {
    lines.push('No eligible tasks to create issues for.');
  }

  return lines.join('\n');
}

function formatSyncHuman(record: SyncRecord, dryRun: boolean): string {
  const lines: string[] = [];
  const prefix = dryRun ? '[DRY RUN] ' : '';

  lines.push(`${prefix}Sync Results`);
  lines.push('');
  lines.push(record.summary);

  if (record.filesWritten.length > 0) {
    lines.push('');
    lines.push('Files updated:');
    for (const file of record.filesWritten) {
      lines.push(`  ✓ ${file}`);
    }
  }

  if (dryRun) {
    lines.push('');
    lines.push(`${prefix}No changes were made.`);
  }

  return lines.join('\n');
}

// --- T009: Reverse Sync command composition ---

export interface ReverseSyncOutput {
  humanOutput: string;
  jsonOutput: ReverseSyncResult;
}

/** Wires the reverse sync ports into adapters and returns a syncer object.
 * Factory function for creating a reverse syncer with dependency injection.
 */
export function createReverseSyncer(options: {
  baseDir?: string;
  configPath?: string;
  noConstitution?: boolean;
  squadDir?: string;
} = {}) {
  const baseDir = options.baseDir ?? process.cwd();
  const extractor = new LearningExtractorAdapter();
  const writer = new SpecLearningsWriterAdapter();
  const statePersistence = new ReverseSyncStateAdapter();
  const constitutionWriter = options.noConstitution ? undefined : new ReverseConstitutionAdapter();

  return {
    async sync(syncOptions: ReverseSyncOptions): Promise<ReverseSyncOutput> {
      const resolvedOptions: ReverseSyncOptions = {
        ...syncOptions,
        specDir: resolve(baseDir, syncOptions.specDir),
        squadDir: resolve(baseDir, syncOptions.squadDir),
        constitutionPath: syncOptions.constitutionPath
          ? resolve(baseDir, syncOptions.constitutionPath)
          : undefined,
      };

      const result = await syncReverse(
        resolvedOptions,
        extractor,
        writer,
        statePersistence,
        computeLearningFingerprint,
        constitutionWriter,
      );

      return {
        humanOutput: formatReverseSyncResult(result),
        jsonOutput: result,
      };
    },
  };
}

/** Formats a ReverseSyncResult into human-readable output for terminal display.
 * Includes source counts, filtering summary, and result paths.
 */
export function formatReverseSyncResult(result: ReverseSyncResult): string {
  const lines: string[] = [];
  const prefix = result.dryRun ? '[DRY RUN] ' : '';

  lines.push(`${prefix}Reverse Sync`);
  lines.push('');

  lines.push('Sources processed:');
  for (const source of result.sourcesProcessed) {
    lines.push(`  ✓ ${source.type}: ${source.count} entries`);
  }
  lines.push('');

  if (result.deduplicated > 0 || result.cooledDown > 0 || result.redactionSummary.totalRedactions > 0) {
    lines.push('Filtering:');
    if (result.deduplicated > 0) {
      lines.push(`  • Deduplicated: ${result.deduplicated} (already synced)`);
    }
    if (result.cooledDown > 0) {
      lines.push(`  • Cooldown excluded: ${result.cooledDown}`);
    }
    if (result.redactionSummary.totalRedactions > 0) {
      lines.push(`  • Privacy redacted: ${result.redactionSummary.totalRedactions} items (${result.redactionSummary.types.join(', ')})`);
    }
    lines.push('');
  }

  lines.push('Results:');
  if (result.learningsWritten > 0 && result.outputPath) {
    lines.push(`  → ${result.learningsWritten} learnings written to ${result.outputPath}`);
  } else if (result.dryRun && result.learningsWritten > 0) {
    lines.push(`  → Would write ${result.learningsWritten} learnings`);
  } else {
    lines.push(`  → No new learnings to write`);
  }

  if (result.constitutionEntriesAdded > 0) {
    lines.push(`  → ${result.constitutionEntriesAdded} entries added to constitution`);
  }

  lines.push('');
  lines.push(`Summary: ${result.summary}`);

  if (result.dryRun) {
    lines.push('');
    lines.push(`${prefix}No files were created or modified.`);
  }

  return lines.join('\n');
}