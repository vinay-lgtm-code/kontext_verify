// ============================================================================
// Kontext SDK - Task Confirmation
// ============================================================================

import type {
  Task,
  CreateTaskInput,
  ConfirmTaskInput,
  TaskStatus,
  KontextConfig,
} from './types.js';
import { KontextError, KontextErrorCode } from './types.js';
import { KontextStore } from './store.js';
import { generateId, now } from './utils.js';

/** Default task expiration: 24 hours */
const DEFAULT_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * TaskManager handles creation, confirmation, and lifecycle tracking of
 * agent tasks that require evidence to be marked complete.
 *
 * Tasks follow this lifecycle:
 * 1. **pending** -- Created, awaiting agent action.
 * 2. **in_progress** -- Agent has started work (optional).
 * 3. **confirmed** -- Evidence provided and validated.
 * 4. **failed** -- Confirmation failed or was rejected.
 * 5. **expired** -- Task exceeded its expiration window.
 *
 * Evidence-based confirmation ensures that agent claims are backed by
 * verifiable on-chain data (transaction hashes, receipts, proofs).
 */
export class TaskManager {
  private readonly config: KontextConfig;
  private readonly store: KontextStore;

  constructor(config: KontextConfig, store: KontextStore) {
    this.config = config;
    this.store = store;
  }

  /**
   * Create a new tracked task.
   *
   * @param input - Task details including description, agentId, and required evidence types
   * @returns The created Task
   *
   * @example
   * ```typescript
   * const task = await taskManager.createTask({
   *   description: 'Transfer 100 USDC to vendor wallet',
   *   agentId: 'payment-agent-1',
   *   requiredEvidence: ['txHash', 'receipt'],
   * });
   * ```
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    this.validateCreateInput(input);

    const id = generateId();
    const timestamp = now();
    const expiresInMs = input.expiresInMs ?? DEFAULT_EXPIRATION_MS;

    const task: Task = {
      id,
      projectId: this.config.projectId,
      description: input.description,
      agentId: input.agentId,
      status: 'pending',
      requiredEvidence: input.requiredEvidence,
      providedEvidence: null,
      correlationId: input.correlationId ?? generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      confirmedAt: null,
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      metadata: input.metadata ?? {},
    };

    this.store.addTask(task);

    if (this.config.debug) {
      console.debug(`[Kontext] Task created: ${id} - ${input.description}`);
    }

    return task;
  }

  /**
   * Confirm a task by providing evidence.
   * Validates that all required evidence types are present.
   *
   * @param input - Task ID and evidence data
   * @returns The updated Task
   *
   * @example
   * ```typescript
   * const confirmed = await taskManager.confirmTask({
   *   taskId: 'task-123',
   *   evidence: {
   *     txHash: '0xabc123...',
   *     receipt: { status: 'confirmed', blockNumber: 12345 },
   *   },
   * });
   * ```
   */
  async confirmTask(input: ConfirmTaskInput): Promise<Task> {
    const task = this.store.getTask(input.taskId);

    if (!task) {
      throw new KontextError(
        KontextErrorCode.TASK_NOT_FOUND,
        `Task not found: ${input.taskId}`,
        { taskId: input.taskId },
      );
    }

    // Check task hasn't already been confirmed
    if (task.status === 'confirmed') {
      throw new KontextError(
        KontextErrorCode.TASK_ALREADY_CONFIRMED,
        `Task already confirmed: ${input.taskId}`,
        { taskId: input.taskId, confirmedAt: task.confirmedAt },
      );
    }

    // Check task hasn't expired
    if (task.expiresAt && new Date(task.expiresAt) < new Date()) {
      this.store.updateTask(input.taskId, {
        status: 'expired',
        updatedAt: now(),
      });
      throw new KontextError(
        KontextErrorCode.TASK_EXPIRED,
        `Task has expired: ${input.taskId}`,
        { taskId: input.taskId, expiresAt: task.expiresAt },
      );
    }

    // Validate that all required evidence is present
    const missingEvidence = this.findMissingEvidence(task.requiredEvidence, input.evidence);
    if (missingEvidence.length > 0) {
      throw new KontextError(
        KontextErrorCode.INSUFFICIENT_EVIDENCE,
        `Missing required evidence: ${missingEvidence.join(', ')}`,
        { taskId: input.taskId, missingEvidence },
      );
    }

    const timestamp = now();
    const updated = this.store.updateTask(input.taskId, {
      status: 'confirmed',
      providedEvidence: input.evidence,
      confirmedAt: timestamp,
      updatedAt: timestamp,
    });

    if (!updated) {
      throw new KontextError(
        KontextErrorCode.TASK_NOT_FOUND,
        `Failed to update task: ${input.taskId}`,
        { taskId: input.taskId },
      );
    }

    if (this.config.debug) {
      console.debug(`[Kontext] Task confirmed: ${input.taskId}`);
    }

    return updated;
  }

  /**
   * Get the current status and details of a task.
   *
   * @param taskId - The task identifier
   * @returns The task, or undefined if not found
   */
  async getTaskStatus(taskId: string): Promise<Task | undefined> {
    const task = this.store.getTask(taskId);

    if (!task) return undefined;

    // Auto-expire tasks that have passed their expiration
    if (task.expiresAt && task.status === 'pending' && new Date(task.expiresAt) < new Date()) {
      const updated = this.store.updateTask(taskId, {
        status: 'expired',
        updatedAt: now(),
      });
      return updated;
    }

    return task;
  }

  /**
   * Mark a task as in-progress.
   *
   * @param taskId - The task identifier
   * @returns The updated Task
   */
  async startTask(taskId: string): Promise<Task> {
    const task = this.store.getTask(taskId);

    if (!task) {
      throw new KontextError(
        KontextErrorCode.TASK_NOT_FOUND,
        `Task not found: ${taskId}`,
        { taskId },
      );
    }

    if (task.status !== 'pending') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `Task cannot be started from status: ${task.status}`,
        { taskId, currentStatus: task.status },
      );
    }

    const updated = this.store.updateTask(taskId, {
      status: 'in_progress',
      updatedAt: now(),
    });

    if (!updated) {
      throw new KontextError(
        KontextErrorCode.TASK_NOT_FOUND,
        `Failed to update task: ${taskId}`,
        { taskId },
      );
    }

    return updated;
  }

  /**
   * Mark a task as failed.
   *
   * @param taskId - The task identifier
   * @param reason - Reason for failure
   * @returns The updated Task
   */
  async failTask(taskId: string, reason: string): Promise<Task> {
    const task = this.store.getTask(taskId);

    if (!task) {
      throw new KontextError(
        KontextErrorCode.TASK_NOT_FOUND,
        `Task not found: ${taskId}`,
        { taskId },
      );
    }

    const updated = this.store.updateTask(taskId, {
      status: 'failed',
      updatedAt: now(),
      metadata: { ...task.metadata, failureReason: reason },
    });

    if (!updated) {
      throw new KontextError(
        KontextErrorCode.TASK_NOT_FOUND,
        `Failed to update task: ${taskId}`,
        { taskId },
      );
    }

    return updated;
  }

  /**
   * Get all tasks, optionally filtered by status.
   *
   * @param status - Optional status filter
   * @returns Array of matching tasks
   */
  getTasks(status?: TaskStatus): Task[] {
    if (status) {
      return this.store.queryTasks((t) => t.status === status);
    }
    return this.store.getTasks();
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private validateCreateInput(input: CreateTaskInput): void {
    if (!input.description || input.description.trim() === '') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'Task description is required',
        { field: 'description' },
      );
    }

    if (!input.agentId || input.agentId.trim() === '') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'Agent ID is required',
        { field: 'agentId' },
      );
    }

    if (!input.requiredEvidence || input.requiredEvidence.length === 0) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'At least one required evidence type must be specified',
        { field: 'requiredEvidence' },
      );
    }
  }

  private findMissingEvidence(
    required: string[],
    provided: Record<string, unknown>,
  ): string[] {
    return required.filter((key) => {
      const value = provided[key];
      return value === undefined || value === null;
    });
  }
}
