/**
 * T028: PrepareReview Use Case
 *
 * Cross-references Spec Kit tasks against Squad decisions and learnings
 * to detect conflicts, risks, and ordering issues.
 * Produces a DesignReviewRecord with categorized ReviewFinding[].
 *
 * Clean Architecture: imports ONLY from types.ts and ports.ts — no I/O.
 */

import type {
  DesignReviewRecord,
  ReviewFinding,
  TaskEntry,
  DecisionEntry,
  LearningEntry,
  ApprovalStatus,
} from '../types.js';
import type { SquadStateReader, TasksReader } from '../bridge/ports.js';

export interface PrepareReviewOptions {
  tasksFilePath: string;
  participants?: string[];
}

export interface PrepareReviewResult {
  record: DesignReviewRecord;
}

/**
 * Detect conflicts between tasks and existing team decisions.
 * Looks for keyword overlap between task descriptions and decision titles/summaries.
 */
function detectDecisionConflicts(
  tasks: TaskEntry[],
  decisions: DecisionEntry[],
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  for (const task of tasks) {
    const taskWords = extractKeywords(task.description + ' ' + task.title);

    for (const decision of decisions) {
      const decisionWords = new Set(extractKeywords(
        decision.title + ' ' + decision.summary,
      ));
      const overlap = taskWords.filter((w) => decisionWords.has(w));

      if (overlap.length >= 2) {
        findings.push({
          type: 'decision_conflict',
          severity: 'medium',
          description: `Task "${task.id}" may conflict with decision "${decision.title}"`,
          reference: `Decision: "${decision.title}" (${decision.status})`,
          recommendation: `Review task "${task.id}" against this decision before implementation.`,
        });
      }
    }
  }

  return findings;
}

/**
 * Detect risks by cross-referencing tasks against agent learnings.
 * If an agent previously documented issues in an area a task touches,
 * flag it as a risk.
 */
function detectRisks(
  tasks: TaskEntry[],
  learnings: LearningEntry[],
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  for (const task of tasks) {
    const taskWords = extractKeywords(task.description + ' ' + task.title);

    for (const learning of learnings) {
      for (const entry of learning.entries) {
        const learningWords = new Set(extractKeywords(
          entry.title + ' ' + entry.summary,
        ));
        const overlap = taskWords.filter((w) => learningWords.has(w));

        if (overlap.length >= 2) {
          findings.push({
            type: 'risk',
            severity: 'low',
            description: `Task "${task.id}" touches an area where ${learning.agentName} documented learnings: "${entry.title}"`,
            reference: `Learning by ${learning.agentName} (${learning.agentRole}): "${entry.title}"`,
            recommendation: `Consult ${learning.agentName}'s experience before proceeding with "${task.id}".`,
          });
          break; // One finding per learning entry per task
        }
      }
    }
  }

  return findings;
}

/**
 * Detect ordering issues — tasks that depend on other tasks not yet listed.
 */
function detectOrderingIssues(tasks: TaskEntry[]): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const taskIds = new Set(tasks.map((t) => t.id));

  for (const task of tasks) {
    for (const dep of task.dependencies) {
      if (!taskIds.has(dep)) {
        findings.push({
          type: 'ordering',
          severity: 'high',
          description: `Task "${task.id}" depends on "${dep}" which is not present in the task list`,
          reference: `Task ${task.id} dependencies: [${task.dependencies.join(', ')}]`,
          recommendation: `Add "${dep}" to the task list or remove the dependency.`,
        });
      }
    }
  }

  return findings;
}

/**
 * Detect scope concerns — tasks with very short descriptions may be underspecified.
 */
function detectScopeIssues(tasks: TaskEntry[]): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  for (const task of tasks) {
    if (task.description.length < 20) {
      findings.push({
        type: 'scope',
        severity: 'low',
        description: `Task "${task.id}" has a very short description and may be underspecified`,
        reference: `Task ${task.id}: "${task.title}"`,
        recommendation: `Expand the description for "${task.id}" to clarify scope and acceptance criteria.`,
      });
    }
  }

  return findings;
}

/**
 * Extract meaningful keywords from text for comparison.
 * Filters out common stop words and short tokens.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'not', 'no', 'as', 'if', 'then', 'than',
    'use', 'using', 'used', 'via', 'into',
  ]);

  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w)),
    ),
  ];
}

/**
 * Determine overall approval status based on findings.
 */
function determineApprovalStatus(findings: ReviewFinding[]): ApprovalStatus {
  const hasHigh = findings.some((f) => f.severity === 'high');
  const hasMedium = findings.some((f) => f.severity === 'medium');

  if (hasHigh) return 'blocked';
  if (hasMedium) return 'changes_requested';
  return 'approved';
}

/**
 * Generate a human-readable summary of the review.
 */
function generateSummary(
  tasks: TaskEntry[],
  findings: ReviewFinding[],
): string {
  const high = findings.filter((f) => f.severity === 'high').length;
  const medium = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;

  const parts: string[] = [
    `Reviewed ${tasks.length} tasks.`,
  ];

  if (findings.length === 0) {
    parts.push('No findings detected — tasks look ready for implementation.');
  } else {
    parts.push(
      `Found ${findings.length} finding(s): ${high} high, ${medium} medium, ${low} low.`,
    );
  }

  return parts.join(' ');
}

/**
 * PrepareReview use case — the core orchestration function.
 *
 * Reads tasks from a file via TasksReader port, reads squad state via
 * SquadStateReader port, cross-references to produce a DesignReviewRecord.
 */
export async function prepareReview(
  tasksReader: TasksReader,
  squadReader: SquadStateReader,
  options: PrepareReviewOptions,
): Promise<PrepareReviewResult> {
  const tasks = await tasksReader.readTasks(options.tasksFilePath);
  const [decisions, learnings] = await Promise.all([
    squadReader.readDecisions(),
    squadReader.readLearnings(),
  ]);

  const findings: ReviewFinding[] = [
    ...detectDecisionConflicts(tasks, decisions),
    ...detectRisks(tasks, learnings),
    ...detectOrderingIssues(tasks),
    ...detectScopeIssues(tasks),
  ];

  // Sort by severity: high → medium → low
  findings.sort((a, b) => {
    const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (order[b.severity] ?? 0) - (order[a.severity] ?? 0);
  });

  const record: DesignReviewRecord = {
    reviewedArtifact: options.tasksFilePath,
    timestamp: new Date().toISOString(),
    participants: options.participants ?? ['bridge-cli'],
    findings,
    approvalStatus: determineApprovalStatus(findings),
    summary: generateSummary(tasks, findings),
  };

  return { record };
}
