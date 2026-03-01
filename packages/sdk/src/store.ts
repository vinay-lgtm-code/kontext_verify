// ============================================================================
// Kontext SDK - In-Memory Data Store with Pluggable Persistence
// ============================================================================
// This module provides the core data store used by the SDK. By default data
// lives in memory (no breaking change). When a StorageAdapter is provided,
// data can be flushed to and restored from persistent storage.

import type {
  ActionLog,
  TransactionRecord,
  Task,
  AnomalyEvent,
  AgentSession,
  ProvenanceCheckpoint,
} from './types.js';
import type { StorageAdapter } from './storage.js';

/** Maximum number of entries per collection before eviction kicks in */
export const DEFAULT_MAX_ENTRIES = 10_000;

/** Percentage of oldest entries to evict when the limit is exceeded */
const EVICTION_RATIO = 0.1;

/** Storage keys used for persisting store data */
const STORAGE_KEYS = {
  actions: 'kontext:actions',
  transactions: 'kontext:transactions',
  tasks: 'kontext:tasks',
  anomalies: 'kontext:anomalies',
  sessions: 'kontext:sessions',
  checkpoints: 'kontext:checkpoints',
} as const;

/**
 * In-memory data store for the Kontext SDK.
 * Holds all action logs, transactions, tasks, and anomaly events.
 *
 * When a StorageAdapter is provided, call `flush()` to persist state
 * and `restore()` to reload from storage.
 */
export class KontextStore {
  private actions: ActionLog[] = [];
  private transactions: TransactionRecord[] = [];
  private tasks: Map<string, Task> = new Map();
  private anomalies: AnomalyEvent[] = [];
  private sessions: Map<string, AgentSession> = new Map();
  private checkpoints: Map<string, ProvenanceCheckpoint> = new Map();
  private storageAdapter: StorageAdapter | null = null;
  private readonly maxEntries: number;

  constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  /**
   * Attach a storage adapter for persistence.
   *
   * @param adapter - The storage backend to use
   */
  setStorageAdapter(adapter: StorageAdapter): void {
    this.storageAdapter = adapter;
  }

  /**
   * Get the currently attached storage adapter (if any).
   */
  getStorageAdapter(): StorageAdapter | null {
    return this.storageAdapter;
  }

  // --------------------------------------------------------------------------
  // Persistence: flush & restore
  // --------------------------------------------------------------------------

  /**
   * Persist all current in-memory state to the attached storage adapter.
   * No-op if no adapter is attached.
   */
  async flush(): Promise<void> {
    if (!this.storageAdapter) return;

    // Snapshot all collections before async save to prevent data inconsistency
    // if addAction/addTransaction/addAnomaly mutates arrays during the flush.
    const actionsSnapshot = [...this.actions];
    const transactionsSnapshot = [...this.transactions];
    const tasksSnapshot = Array.from(this.tasks.entries());
    const anomaliesSnapshot = [...this.anomalies];
    const sessionsSnapshot = Array.from(this.sessions.entries());
    const checkpointsSnapshot = Array.from(this.checkpoints.entries());

    await Promise.all([
      this.storageAdapter.save(STORAGE_KEYS.actions, actionsSnapshot),
      this.storageAdapter.save(STORAGE_KEYS.transactions, transactionsSnapshot),
      this.storageAdapter.save(STORAGE_KEYS.tasks, tasksSnapshot),
      this.storageAdapter.save(STORAGE_KEYS.anomalies, anomaliesSnapshot),
      this.storageAdapter.save(STORAGE_KEYS.sessions, sessionsSnapshot),
      this.storageAdapter.save(STORAGE_KEYS.checkpoints, checkpointsSnapshot),
    ]);
  }

  /**
   * Restore in-memory state from the attached storage adapter.
   * Merges loaded data with any existing in-memory data.
   * No-op if no adapter is attached.
   */
  async restore(): Promise<void> {
    if (!this.storageAdapter) return;

    const [actions, transactions, tasksEntries, anomalies, sessionsEntries, checkpointsEntries] = await Promise.all([
      this.storageAdapter.load(STORAGE_KEYS.actions),
      this.storageAdapter.load(STORAGE_KEYS.transactions),
      this.storageAdapter.load(STORAGE_KEYS.tasks),
      this.storageAdapter.load(STORAGE_KEYS.anomalies),
      this.storageAdapter.load(STORAGE_KEYS.sessions),
      this.storageAdapter.load(STORAGE_KEYS.checkpoints),
    ]);

    if (Array.isArray(actions)) {
      this.actions = actions;
    }
    if (Array.isArray(transactions)) {
      this.transactions = transactions;
    }
    if (Array.isArray(tasksEntries)) {
      this.tasks = new Map(tasksEntries as [string, Task][]);
    }
    if (Array.isArray(anomalies)) {
      this.anomalies = anomalies;
    }
    if (Array.isArray(sessionsEntries)) {
      this.sessions = new Map(sessionsEntries as [string, AgentSession][]);
    }
    if (Array.isArray(checkpointsEntries)) {
      this.checkpoints = new Map(checkpointsEntries as [string, ProvenanceCheckpoint][]);
    }
  }

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  /** Append an action log entry. Evicts oldest 10% when maxEntries is exceeded. */
  addAction(action: ActionLog): void {
    this.actions.push(action);
    if (this.actions.length > this.maxEntries) {
      this.actions.splice(0, Math.ceil(this.maxEntries * EVICTION_RATIO));
    }
  }

  /** Retrieve all action log entries. */
  getActions(): ActionLog[] {
    return [...this.actions];
  }

  /** Retrieve actions filtered by a predicate. */
  queryActions(predicate: (action: ActionLog) => boolean): ActionLog[] {
    return this.actions.filter(predicate);
  }

  /** Get actions for a specific agent. */
  getActionsByAgent(agentId: string): ActionLog[] {
    return this.actions.filter((a) => a.agentId === agentId);
  }

  /** Get actions for a specific session (across all agents). */
  getActionsBySession(sessionId: string): ActionLog[] {
    return this.actions.filter((a) => a.sessionId === sessionId);
  }

  // --------------------------------------------------------------------------
  // Transactions
  // --------------------------------------------------------------------------

  /** Append a transaction record. Evicts oldest 10% when maxEntries is exceeded. */
  addTransaction(tx: TransactionRecord): void {
    this.transactions.push(tx);
    if (this.transactions.length > this.maxEntries) {
      this.transactions.splice(0, Math.ceil(this.maxEntries * EVICTION_RATIO));
    }
  }

  /** Retrieve all transaction records. */
  getTransactions(): TransactionRecord[] {
    return [...this.transactions];
  }

  /** Retrieve transactions filtered by a predicate. */
  queryTransactions(predicate: (tx: TransactionRecord) => boolean): TransactionRecord[] {
    return this.transactions.filter(predicate);
  }

  /** Get transactions for a specific agent. */
  getTransactionsByAgent(agentId: string): TransactionRecord[] {
    return this.transactions.filter((t) => t.agentId === agentId);
  }

  /** Get the most recent N transactions for an agent. */
  getRecentTransactions(agentId: string, limit: number): TransactionRecord[] {
    return this.transactions
      .filter((t) => t.agentId === agentId)
      .slice(-limit);
  }

  // --------------------------------------------------------------------------
  // Tasks
  // --------------------------------------------------------------------------

  /** Store a task. */
  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  /** Retrieve a task by ID. */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /** Update a task. */
  updateTask(taskId: string, updates: Partial<Task>): Task | undefined {
    const existing = this.tasks.get(taskId);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...updates };
    this.tasks.set(taskId, updated);
    return updated;
  }

  /** Retrieve all tasks. */
  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /** Retrieve tasks filtered by a predicate. */
  queryTasks(predicate: (task: Task) => boolean): Task[] {
    return Array.from(this.tasks.values()).filter(predicate);
  }

  // --------------------------------------------------------------------------
  // Anomalies
  // --------------------------------------------------------------------------

  /** Append an anomaly event. Evicts oldest 10% when maxEntries is exceeded. */
  addAnomaly(anomaly: AnomalyEvent): void {
    this.anomalies.push(anomaly);
    if (this.anomalies.length > this.maxEntries) {
      this.anomalies.splice(0, Math.ceil(this.maxEntries * EVICTION_RATIO));
    }
  }

  /** Retrieve all anomaly events. */
  getAnomalies(): AnomalyEvent[] {
    return [...this.anomalies];
  }

  /** Retrieve anomalies filtered by a predicate. */
  queryAnomalies(predicate: (anomaly: AnomalyEvent) => boolean): AnomalyEvent[] {
    return this.anomalies.filter(predicate);
  }

  // --------------------------------------------------------------------------
  // Sessions (Provenance Layer 1)
  // --------------------------------------------------------------------------

  /** Store a session. */
  addSession(session: AgentSession): void {
    this.sessions.set(session.sessionId, session);
  }

  /** Retrieve a session by ID. */
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  /** Update a session. */
  updateSession(sessionId: string, updates: Partial<AgentSession>): AgentSession | undefined {
    const existing = this.sessions.get(sessionId);
    if (!existing) return undefined;
    const updated: AgentSession = { ...existing, ...updates };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  /** Retrieve all sessions. */
  getSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  /** Retrieve sessions filtered by a predicate. */
  querySessions(predicate: (session: AgentSession) => boolean): AgentSession[] {
    return Array.from(this.sessions.values()).filter(predicate);
  }

  // --------------------------------------------------------------------------
  // Checkpoints (Provenance Layer 3)
  // --------------------------------------------------------------------------

  /** Store a checkpoint. */
  addCheckpoint(checkpoint: ProvenanceCheckpoint): void {
    this.checkpoints.set(checkpoint.id, checkpoint);
  }

  /** Retrieve a checkpoint by ID. */
  getCheckpoint(checkpointId: string): ProvenanceCheckpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  /** Update a checkpoint. */
  updateCheckpoint(checkpointId: string, updates: Partial<ProvenanceCheckpoint>): ProvenanceCheckpoint | undefined {
    const existing = this.checkpoints.get(checkpointId);
    if (!existing) return undefined;
    const updated: ProvenanceCheckpoint = { ...existing, ...updates };
    this.checkpoints.set(checkpointId, updated);
    return updated;
  }

  /** Retrieve all checkpoints. */
  getCheckpoints(): ProvenanceCheckpoint[] {
    return Array.from(this.checkpoints.values());
  }

  /** Retrieve checkpoints filtered by a predicate. */
  queryCheckpoints(predicate: (cp: ProvenanceCheckpoint) => boolean): ProvenanceCheckpoint[] {
    return Array.from(this.checkpoints.values()).filter(predicate);
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /** Get total record counts across all stores. */
  getCounts(): { actions: number; transactions: number; tasks: number; anomalies: number; sessions: number; checkpoints: number } {
    return {
      actions: this.actions.length,
      transactions: this.transactions.length,
      tasks: this.tasks.size,
      anomalies: this.anomalies.length,
      sessions: this.sessions.size,
      checkpoints: this.checkpoints.size,
    };
  }

  /** Clear all stored data. Useful for testing. */
  clear(): void {
    this.actions = [];
    this.transactions = [];
    this.tasks.clear();
    this.anomalies = [];
    this.sessions.clear();
    this.checkpoints.clear();
  }
}
