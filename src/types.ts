/**
 * Squad-SpecKit Bridge — Entity Layer
 *
 * Innermost Clean Architecture layer.
 * ZERO imports from external packages, ZERO I/O, pure data types and business rules.
 */

// T005: Entity Types

export interface BridgeConfig {
  contextMaxBytes: number;
  sources: {
    skills: boolean;
    decisions: boolean;
    histories: boolean;
  };
  summarization: {
    recencyBiasWeight: number;
    maxDecisionAgeDays: number;
  };
  hooks: {
    afterTasks: boolean;
    beforeSpecify: boolean;
    afterImplement: boolean;
    autoCreateIssues: boolean;
  };
  sync: {
    autoSync: boolean;
    targetDir: string;
  };
  issues: {
    defaultLabels: string[];
    repository: string;
  };
  paths: {
    squadDir: string;
    specifyDir: string;
  };
}

export interface ContextSummary {
  metadata: {
    generated: string;
    cycleCount: number;
    sources: {
      skills: number;
      decisions: number;
      histories: number;
      skipped: string[];
    };
    sizeBytes: number;
    maxBytes: number;
  };
  content: {
    skills: SkillEntry[];
    decisions: DecisionEntry[];
    learnings: LearningEntry[];
    warnings: string[];
  };
}

export interface SkillEntry {
  name: string;
  context: string;
  patterns: string[];
  antiPatterns: string[];
  rawSize: number;
}

export interface DecisionEntry {
  title: string;
  date: string;
  status: string;
  summary: string;
  relevanceScore: number;
  fullContent: string;
}

export interface LearningItem {
  date: string;
  title: string;
  summary: string;
}

export interface LearningEntry {
  agentName: string;
  agentRole: string;
  entries: LearningItem[];
  rawSize: number;
}

export type ReviewFindingType =
  | 'missing_task'
  | 'risk'
  | 'ordering'
  | 'decision_conflict'
  | 'scope';

export type ReviewSeverity = 'high' | 'medium' | 'low';

export interface ReviewFinding {
  type: ReviewFindingType;
  severity: ReviewSeverity;
  description: string;
  reference: string;
  recommendation: string;
}

export type ApprovalStatus = 'approved' | 'changes_requested' | 'blocked';

export interface DesignReviewRecord {
  reviewedArtifact: string;
  timestamp: string;
  participants: string[];
  findings: ReviewFinding[];
  approvalStatus: ApprovalStatus;
  summary: string;
}

export interface InstallManifest {
  version: string;
  installedAt: string;
  updatedAt: string;
  components: {
    squadSkill: boolean;
    specKitExtension: boolean;
    ceremonyDef: boolean;
  };
  files: string[];
}

export interface TaskEntry {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
  status: string;
}

export interface DeploymentFile {
  targetPath: string;
  content: string;
}

// T006: BridgeConfig Validation

export function isValidConfig(config: BridgeConfig): boolean {
  if (config.contextMaxBytes <= 0 || config.contextMaxBytes > 32768) {
    return false;
  }
  if (
    config.summarization.recencyBiasWeight < 0.0 ||
    config.summarization.recencyBiasWeight > 1.0
  ) {
    return false;
  }
  if (config.summarization.maxDecisionAgeDays <= 0) {
    return false;
  }
  // Validate hooks are booleans (guards against bad JSON input)
  const hookValues = Object.values(config.hooks);
  if (hookValues.some((v) => typeof v !== 'boolean')) {
    return false;
  }
  return true;
}

// T007: Relevance Scoring

export function computeRelevanceScore(
  decision: DecisionEntry,
  now: Date,
): number {
  const parsed = Date.parse(decision.date);
  if (isNaN(parsed)) {
    return 0.5;
  }
  const decisionDate = new Date(parsed);
  const ageMs = now.getTime() - decisionDate.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Exponential decay with 90-day half-life
  const halfLife = 90;
  const rawRecency = Math.exp((-ageDays * Math.LN2) / halfLife);

  return Math.max(0, Math.min(1, rawRecency));
}

// T008: ReviewFinding Severity Helpers

const SEVERITY_ORDER: Record<ReviewSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Sort comparator: highest severity first. */
export function compareSeverity(a: ReviewFinding, b: ReviewFinding): number {
  return SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
}

/** Predicate: true when severity is high. */
export function isHighSeverity(finding: ReviewFinding): boolean {
  return finding.severity === 'high';
}

/** Group findings by their type. */
export function categorizeFindings(
  findings: ReviewFinding[],
): Record<ReviewFindingType, ReviewFinding[]> {
  const result: Record<ReviewFindingType, ReviewFinding[]> = {
    missing_task: [],
    risk: [],
    ordering: [],
    decision_conflict: [],
    scope: [],
  };
  for (const f of findings) {
    result[f.type].push(f);
  }
  return result;
}

// T041: Error Code Constants (per contracts/cli-interface.md)

export const ErrorCodes = {
  SQUAD_NOT_FOUND: 'SQUAD_NOT_FOUND',
  SPECKIT_NOT_FOUND: 'SPECKIT_NOT_FOUND',
  SPEC_DIR_NOT_FOUND: 'SPEC_DIR_NOT_FOUND',
  TASKS_NOT_FOUND: 'TASKS_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CONFIG_INVALID: 'CONFIG_INVALID',
  PARSE_ERROR: 'PARSE_ERROR',
  GITHUB_AUTH_FAILED: 'GITHUB_AUTH_FAILED',
  ISSUE_CREATE_FAILED: 'ISSUE_CREATE_FAILED',
  SYNC_FAILED: 'SYNC_FAILED',
  HOOK_DEPLOY_FAILED: 'HOOK_DEPLOY_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface StructuredError {
  error: true;
  code: ErrorCode;
  message: string;
  suggestion: string;
}

export const ErrorSuggestions: Record<ErrorCode, string> = {
  SQUAD_NOT_FOUND: 'Initialize Squad first, or use --squad-dir to specify a custom path.',
  SPECKIT_NOT_FOUND: 'Initialize Spec Kit first, or use --specify-dir to specify a custom path.',
  SPEC_DIR_NOT_FOUND: 'Create the spec directory first, e.g. mkdir -p specs/001-feature/',
  TASKS_NOT_FOUND: 'Check the path to your tasks.md file.',
  PERMISSION_DENIED: 'Check file permissions with chmod -R u+w on the target directory.',
  CONFIG_INVALID: 'Validate your bridge.config.json against the config schema.',
  PARSE_ERROR: 'Check the file for valid markdown/YAML syntax.',
  GITHUB_AUTH_FAILED: 'Set GITHUB_TOKEN environment variable or run `gh auth login`.',
  ISSUE_CREATE_FAILED: 'Check repository permissions and GitHub API access.',
  SYNC_FAILED: 'Check file write permissions in the Squad directory.',
  HOOK_DEPLOY_FAILED: 'Check file permissions in the Spec Kit extensions directory.',
};

export function createStructuredError(
  code: ErrorCode,
  message: string,
  suggestion?: string,
): StructuredError {
  return {
    error: true,
    code,
    message,
    suggestion: suggestion ?? ErrorSuggestions[code],
  };
}

// T003: IssueRecord entity
export interface IssueRecord {
  issueNumber: number;
  title: string;
  body: string;
  labels: string[];
  taskId: string;
  url: string;
  createdAt: string;
}

// T005: SyncRecord entity
export interface SyncRecord {
  syncTimestamp: string;
  learningsUpdated: number;
  filesWritten: string[];
  summary: string;
}

// T006: SyncState entity
export interface SyncState {
  lastSyncTimestamp: string;
  syncHistory: SyncRecord[];
  totalSyncs: number;
}

// T007: HookScript entity
export type HookPoint = 'before_specify' | 'after_tasks' | 'after_implement';

export interface HookScript {
  hookPoint: HookPoint;
  scriptPath: string;
  enabled: boolean;
  description: string;
}

// T017: SpecKit extension schema interface
export interface ExtensionHookDef {
  command: string;
  enabled: boolean;
  description: string;
}

export interface ExtensionSchema {
  schema_version: string;
  id: string;
  name: string;
  version: string;
  description: string;
  hooks: Record<string, ExtensionHookDef>;
  config: Record<string, unknown>;
}

// T040: DetectConstitution pure function
export interface ConstitutionStatus {
  exists: boolean;
  isTemplate: boolean;
  warnings: string[];
}

const TEMPLATE_MARKERS = [
  '[PLACEHOLDER]',
  '[PROJECT_NAME]',
  '[YOUR_',
  'TODO:',
  'REPLACE THIS',
];

export function detectConstitution(content: string | null): ConstitutionStatus {
  if (content === null) {
    return {
      exists: false,
      isTemplate: false,
      warnings: ['No constitution.md found — project principles are undefined.'],
    };
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return {
      exists: true,
      isTemplate: true,
      warnings: ['Constitution file is empty — customize it with project principles.'],
    };
  }

  const upperContent = content.toUpperCase();
  const foundMarkers = TEMPLATE_MARKERS.filter(m => upperContent.includes(m.toUpperCase()));

  if (foundMarkers.length > 0) {
    return {
      exists: true,
      isTemplate: true,
      warnings: [
        `Constitution appears to be an uncustomized template (found: ${foundMarkers.join(', ')}). ` +
        'Customize it with actual project principles for better planning context.',
      ],
    };
  }

  return { exists: true, isTemplate: false, warnings: [] };
}

// T001: Distribution Analysis Types

export interface AgentAssignment {
  issueNumber: number;
  agentName: string;
  labels: string[];
}

export interface DistributionWarning {
  agentName: string;
  assignedCount: number;
  percentage: number;
  message: string;
}

export interface RebalanceSuggestion {
  fromAgent: string;
  toAgent: string;
  issueNumbers: number[];
  rationale: string;
}

export interface DistributionAnalysis {
  agentCounts: Record<string, number>;
  totalIssues: number;
  imbalanced: boolean;
  threshold: number;
  warnings: DistributionWarning[];
  suggestions: RebalanceSuggestion[];
}

/**
 * Analyzes issue distribution across agents for imbalance detection.
 * Pure function — no I/O.
 *
 * @param availableAgents - All known agent names. Agents with 0 assignments
 *   are included in the ideal-per-agent calculation so they can be suggested
 *   for rebalancing.
 */
export function analyzeDistribution(
  assignments: AgentAssignment[],
  threshold = 0.5,
  availableAgents?: string[],
): DistributionAnalysis {
  const agentCounts: Record<string, number> = {};

  // Seed counts from availableAgents so 0-assignment agents are included
  const allAgents = availableAgents ?? [];
  for (const name of allAgents) {
    agentCounts[name] = 0;
  }

  for (const a of assignments) {
    agentCounts[a.agentName] = (agentCounts[a.agentName] ?? 0) + 1;
  }

  const totalIssues = assignments.length;
  const agentNames = Object.keys(agentCounts);
  const idealPerAgent = agentNames.length > 0 ? totalIssues / agentNames.length : 0;

  const warnings: DistributionWarning[] = [];
  const overAssigned: string[] = [];
  const underAssigned: string[] = [];

  for (const name of agentNames) {
    const count = agentCounts[name];
    const percentage = totalIssues > 0 ? count / totalIssues : 0;

    if (percentage > threshold) {
      warnings.push({
        agentName: name,
        assignedCount: count,
        percentage,
        message: `Agent '${name}' assigned ${Math.round(percentage * 100)}% of issues (${count}/${totalIssues}) — exceeds ${Math.round(threshold * 100)}% threshold`,
      });
      overAssigned.push(name);
    }

    if (count < idealPerAgent) {
      underAssigned.push(name);
    }
  }

  const suggestions: RebalanceSuggestion[] = [];
  for (const from of overAssigned) {
    // Collect all issues currently assigned to this over-assigned agent
    const fromIssues = assignments
      .filter(a => a.agentName === from)
      .map(a => a.issueNumber);

    // How many issues this agent has above the (floored) ideal load
    const excess = agentCounts[from] - Math.floor(idealPerAgent);
    if (excess <= 0 || fromIssues.length === 0) {
      continue;
    }

    // Only consider up to "excess" issues as transferable
    const transferableIssues = fromIssues.slice(0, excess);
    let issueOffset = 0;

    // Distribute distinct subsets of transferableIssues across under-assigned agents
    const targets = underAssigned.filter(to => to !== from);
    for (let i = 0; i < targets.length && issueOffset < transferableIssues.length; i++) {
      const to = targets[i];
      const remaining = transferableIssues.length - issueOffset;
      const remainingRecipients = targets.length - i;

      // Split remaining issues roughly evenly across remaining recipients
      const countForTo = Math.max(1, Math.floor(remaining / remainingRecipients));
      const end = issueOffset + countForTo;
      const issueNumbers = transferableIssues.slice(issueOffset, end);

      if (issueNumbers.length > 0) {
        suggestions.push({
          fromAgent: from,
          toAgent: to,
          issueNumbers,
          rationale: `Rebalance: '${from}' has ${agentCounts[from]} issues, '${to}' has ${agentCounts[to]}`,
        });
      }

      issueOffset = end;
    }
  }

  return {
    agentCounts,
    totalIssues,
    imbalanced: warnings.length > 0,
    threshold,
    warnings,
    suggestions,
  };
}

// T001: SpecRequirement entity
export interface SpecRequirement {
  id: string;
  text: string;
  category: string;
}

// Agent charter from .squad/agents/*/charter.md
export interface AgentCharter {
  agentName: string;
  skills: string[];
}

// Raw skill file content from .squad/skills/*/SKILL.md
export interface SkillFileContent {
  name: string;
  content: string;
  sizeBytes: number;
}

// Fidelity review types (review module)
export interface FunctionalRequirement {
  id: string;
  text: string;
  category: string;
}

export interface ImplementationEvidence {
  requirementId: string;
  filePath: string;
  line: number;
  snippet: string;
  kind: 'comment' | 'annotation' | 'reference';
}

export type FidelityStatus = 'covered' | 'partial' | 'missing';

export interface FidelityEntry {
  requirement: FunctionalRequirement;
  status: FidelityStatus;
  evidence: ImplementationEvidence[];
}

export interface FidelityReport {
  specPath: string;
  srcDir: string;
  timestamp: string;
  covered: FunctionalRequirement[];
  missing: FunctionalRequirement[];
  partial: FunctionalRequirement[];
  entries: FidelityEntry[];
  coverage: number;
  summary: string;
}

// T001: Skill matching types

export interface SkillMatch {
  skillName: string;
  relevanceScore: number;
  matchedKeywords: string[];
  contentSize: number;
}

export interface SkillInjection {
  taskId: string;
  injectedSkills: SkillMatch[];
  totalContentSize: number;
  truncated: boolean;
  budgetBytes: number;
}

export interface DeadCodeEntry {
  filePath: string;
  exportName: string;
  lineRange: [number, number];
  category: string;
  associatedCommand: string | null;
}

export interface DeadCodeReport {
  entries: DeadCodeEntry[];
  totalLines: number;
  exercisedLines: number;
  removedLines: number;
  baselineCoverage: number;
  finalCoverage: number;
}

export interface RequirementCoverage {
  requirement: SpecRequirement;
  covered: boolean;
  evidence: string[];
  gaps: string[];
}

export interface ImplementationReview {
  specPath: string;
  implementationDir: string;
  requirements: RequirementCoverage[];
  coveragePercent: number;
  timestamp: string;
  summary: string;
}

/**
 * Matches skills against a task by keyword overlap.
 * Returns matching skills sorted by relevance score descending.
 */
export function matchSkillsToTask(task: TaskEntry, skills: SkillEntry[]): SkillMatch[] {
  if (skills.length === 0) return [];

  const taskWords = extractWords(`${task.title} ${task.description}`);
  if (taskWords.length === 0) return [];

  const matches: SkillMatch[] = [];

  for (const skill of skills) {
    const skillWords = extractWords(
      `${skill.name} ${skill.context} ${skill.patterns.join(' ')}`,
    );
    const matchedKeywords = taskWords.filter(
      (tw) => tw.length > 2 && skillWords.some((sw) => sw === tw),
    );

    if (matchedKeywords.length === 0) continue;

    const relevanceScore = Math.min(1, matchedKeywords.length / Math.max(taskWords.length, 1));

    matches.push({
      skillName: skill.name,
      relevanceScore,
      matchedKeywords,
      contentSize: skill.rawSize,
    });
  }

  return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

// T010: Default BridgeConfig Factory

export function createDefaultConfig(): BridgeConfig {
  return {
    contextMaxBytes: 8192,
    sources: {
      skills: true,
      decisions: true,
      histories: true,
    },
    summarization: {
      recencyBiasWeight: 0.7,
      maxDecisionAgeDays: 90,
    },
    hooks: {
      afterTasks: true,
      beforeSpecify: true,
      afterImplement: true,
      autoCreateIssues: true,
    },
    sync: {
      autoSync: false,
      targetDir: '.squad',
    },
    issues: {
      defaultLabels: ['squad', 'speckit'],
      repository: '',
    },
    paths: {
      squadDir: '.squad',
      specifyDir: '.specify',
    },
  };
}
