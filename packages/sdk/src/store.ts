// ============================================================================
// Kontext SDK - In-Memory Data Store
// ============================================================================
// This module provides an in-memory store used by the SDK in local mode.
// In cloud mode, data is sent to the Kontext API instead.
// For production persistence, this would be replaced by a database adapter
// (e.g., PostgreSQL, Cloud Firestore, BigQuery).

import type {
  ActionLog,
  TransactionRecord,
  Task,
  AnomalyEvent,
} from './types.js';

/**
 * In-memory data store for the Kontext SDK.
 * Holds all action logs, transactions, tasks, and anomaly events.
 *
 * NOTE: This store is intentionally simple for the MVP. In production,
 * replace with a persistent store backed by Cloud Firestore, PostgreSQL,
 * or BigQuery for compliance-grade durability.
 */
export class KontextStore {
  private actions: ActionLog[] = [];
  private transactions: TransactionRecord[] = [];
  private tasks: Map<string, Task> = new Map();
  private anomalies: AnomalyEvent[] = [];

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
