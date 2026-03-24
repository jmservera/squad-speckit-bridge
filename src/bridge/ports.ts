/**
 * Squad-SpecKit Bridge — Port Interfaces
 *
 * Use-case layer port definitions. Adapters implement these interfaces.
 * Imports ONLY from ../types.ts — no external packages.
 */

import type {
  BridgeConfig,
  ContextSummary,
  DecisionEntry,
  DeploymentFile,
  IssueRecord,
  LearningEntry,
  SkillEntry,
  SpecRequirement,
  SyncRecord,
  TaskEntry,
} from '../types.js';

// Input port: reads Squad memory artifacts
export interface SquadStateReader {
  readSkills(): Promise<SkillEntry[]>;
  readDecisions(): Promise<DecisionEntry[]>;
  readLearnings(since?: Date): Promise<LearningEntry[]>;
  readConstitution?(): Promise<string | null>;
}

// Metadata from a previous context generation cycle
export interface PreviousContextMetadata {
  generated: string;
  cycleCount: number;
}

// Output port: writes generated context summary
export interface ContextWriter {
  write(summary: ContextSummary): Promise<void>;
  readPreviousMetadata(): Promise<PreviousContextMetadata | null>;
}

// Input port: reads Spec Kit tasks for review
export interface TasksReader {
  readTasks(path: string): Promise<TaskEntry[]>;
}

// Input port: detects which frameworks are installed
export interface FrameworkDetector {
  detectSquad(dir: string): Promise<boolean>;
  detectSpecKit(dir: string): Promise<boolean>;
}

// Output port: deploys bridge components to the file system
export interface FileDeployer {
  deploy(files: DeploymentFile[]): Promise<string[]>;
  deployExecutable(files: DeploymentFile[]): Promise<string[]>;
  listDeployed(): Promise<string[]>;
}

// Input port: loads bridge configuration
export interface ConfigLoader {
  load(): Promise<BridgeConfig>;
}

// Output port: creates GitHub issues from task entries
export interface IssueCreator {
  create(task: TaskEntry, labels: string[], repo: string): Promise<IssueRecord>;
  createBatch(tasks: TaskEntry[], labels: string[], repo: string): Promise<IssueRecord[]>;
  listExisting(repo: string, labels: string[]): Promise<IssueRecord[]>;
}

// Output port: writes learnings back to Squad state
export interface SquadMemoryWriter {
  writeLearning(agentName: string, title: string, content: string): Promise<string>;
  writeDecision(title: string, content: string): Promise<string>;
}

// Input port: reads spec requirements for fidelity review
export interface SpecReader {
  readRequirements(specPath: string): Promise<SpecRequirement[]>;
}

// Input port: reads tasks markdown for issue creation
export interface TasksMarkdownReader {
  readAndParse(path: string): Promise<TaskEntry[]>;
}
