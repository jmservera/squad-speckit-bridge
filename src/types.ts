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
    },
    paths: {
      squadDir: '.squad',
      specifyDir: '.specify',
    },
  };
}
