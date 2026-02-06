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
} from './types.js';
import type { StorageAdapter } from './storage.js';

/** Storage keys used for persisting store data */
const STORAGE_KEYS = {
  actions: 'kontext:actions',
  transactions: 'kontext:transactions',
  tasks: 'kontext:tasks',
  anomalies: 'kontext:anomalies',
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
  private storageAdapter: StorageAdapter | null = null;

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

    await Promise.all([
      this.storageAdapter.save(STORAGE_KEYS.actions, this.actions),
      this.storageAdapter.save(STORAGE_KEYS.transactions, this.transactions),
      this.storageAdapter.save(
        STORAGE_KEYS.tasks,
        Array.from(this.tasks.entries()),
      ),
      this.storageAdapter.save(STORAGE_KEYS.anomalies, this.anomalies),
    ]);
  }

  /**
   * Restore in-memory state from the attached storage adapter.
   * Merges loaded data with any existing in-memory data.
   * No-op if no adapter is attached.
   */
  async restore(): Promise<void> {
    if (!this.storageAdapter) return;

    const [actions, transactions, tasksEntries, anomalies] = await Promise.all([
      this.storageAdapter.load(STORAGE_KEYS.actions),
      this.storageAdapter.load(STORAGE_KEYS.transactions),
      this.storageAdapter.load(STORAGE_KEYS.tasks),
      this.storageAdapter.load(STORAGE_KEYS.anomalies),
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
  }

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  /** Append an action log entry. */
  addAction(action: ActionLog): void {
    this.actions.push(action);
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

  // --------------------------------------------------------------------------
  // Transactions
  // --------------------------------------------------------------------------

  /** Append a transaction record. */
  addTransaction(tx: TransactionRecord): void {
    this.transactions.push(tx);
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

  /** Append an anomaly event. */
  addAnomaly(anomaly: AnomalyEvent): void {
    this.anomalies.push(anomaly);
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
  // Utilities
  // --------------------------------------------------------------------------

  /** Get total record counts across all stores. */
  getCounts(): { actions: number; transactions: number; tasks: number; anomalies: number } {
    return {
      actions: this.actions.length,
      transactions: this.transactions.length,
      tasks: this.tasks.size,
      anomalies: this.anomalies.length,
    };
  }

  /** Clear all stored data. Useful for testing. */
  clear(): void {
    this.actions = [];
    this.transactions = [];
    this.tasks.clear();
    this.anomalies = [];
  }
}
