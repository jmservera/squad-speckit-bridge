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
  LearningEntry,
  SkillEntry,
  TaskEntry,
} from '../types.js';

// Input port: reads Squad memory artifacts
export interface SquadStateReader {
  readSkills(): Promise<SkillEntry[]>;
  readDecisions(): Promise<DecisionEntry[]>;
  readLearnings(): Promise<LearningEntry[]>;
}

// Output port: writes generated context summary
export interface ContextWriter {
  write(summary: ContextSummary): Promise<void>;
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
  listDeployed(): Promise<string[]>;
}

// Input port: loads bridge configuration
export interface ConfigLoader {
  load(): Promise<BridgeConfig>;
}
