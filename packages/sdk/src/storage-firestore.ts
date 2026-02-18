// ============================================================================
// Kontext SDK - Firestore Storage Adapter
// ============================================================================
// Provides persistent, hierarchical storage for audit logs using the
// Firestore REST API. No @google-cloud/firestore SDK dependency — uses
// fetch() so the SDK stays zero-dep for users who don't need Firestore.
//
// Data hierarchy:
//   users/{userId}/
//     projects/{projectId}/
//       agents/{agentId}/
//         sessions/{sessionId}/
//           actions/{actionId}       — generic action logs + reasoning entries
//           transactions/{txId}      — transaction records
//       tasks/{taskId}               — tasks (project-scoped, not session-scoped)
//       plan/{key}                   — plan metering state
//       anomalies/{anomalyId}        — anomaly events
//
// The adapter is also compatible with the flat StorageAdapter interface used
// by KontextStore.flush() / restore() — it maps the flat kontext:* keys to
// appropriate Firestore paths.
//
// Usage:
//   import { FirestoreStorageAdapter } from 'kontext-sdk';
//
//   const ctx = Kontext.init({
//     projectId: 'my-agent-project',
//     environment: 'production',
//     storage: new FirestoreStorageAdapter({
//       gcpProjectId: 'Kontext',
//       userId: 'user-123',
//       accessToken: await getAccessToken(), // or use Application Default Credentials
//     }),
//   });

import type { StorageAdapter } from './storage.js';
import type { ActionLog, TransactionRecord, Task, AnomalyEvent } from './types.js';

// ============================================================================
// Configuration
// ============================================================================

export interface FirestoreStorageConfig {
  /** GCP project ID — use "Kontext" for the Kontext production project */
  gcpProjectId: string;
  /**
   * The user/tenant ID that owns these logs. Required for data isolation.
   * Use a stable identifier: Stripe customer ID, your auth system's user ID,
   * or a deterministic hash of the API key.
   */
  userId: string;
  /**
   * OAuth2 access token for the Firestore REST API.
   * On GCP (Cloud Run, GCE, GKE): omit — the adapter will fetch a token
   * from the GCP metadata server automatically.
   * For local dev or other environments: pass a token from Application Default
   * Credentials (`gcloud auth print-access-token`).
   */
  accessToken?: string;
  /**
   * Firestore database ID. Defaults to '(default)'.
   * Change only if you created a named database in the GCP console.
   */
  databaseId?: string;
  /**
   * Whether to write each record as an individual Firestore document
   * in addition to the bulk flush writes. Enables real-time querying
   * per-action, per-session, per-agent.
   * @default true
   */
  writeDocumentsIndividually?: boolean;
  /**
   * Custom Firestore REST base URL. Override for testing or emulator use.
   * @default 'https://firestore.googleapis.com'
   */
  firestoreBaseUrl?: string;
}

// ============================================================================
// Internal Types
// ============================================================================

/** Firestore REST API document representation */
interface FirestoreDocument {
  name?: string;
  fields: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

/** Flat key mapping to Firestore collection + sub-path */
interface KeyMapping {
  collection: string;
  docId: string;
  /** Optional sub-collection for list-type data */
  subcollection?: string;
}

// ============================================================================
// Firestore Storage Adapter
// ============================================================================

/**
 * Persistent, hierarchical Firestore storage adapter for Kontext audit logs.
 *
 * Stores compliance logs by user → project → agent → session, enabling
 * regulatory-grade queries: "show me all transactions agent X made in
 * session Y" or "export all logs for user Z".
 *
 * Works as a drop-in replacement for FileStorage:
 *
 * @example
 * ```typescript
 * import { Kontext, FirestoreStorageAdapter } from 'kontext-sdk';
 *
 * const ctx = Kontext.init({
 *   projectId: 'treasury-agent',
 *   environment: 'production',
 *   storage: new FirestoreStorageAdapter({
 *     gcpProjectId: 'Kontext',
 *     userId: 'user-abc123',
 *   }),
 * });
 *
 * // After this, all verify(), log(), logReasoning() calls are
 * // persisted to Firestore at:
 * // users/user-abc123/projects/treasury-agent/agents/{agentId}/sessions/{sessionId}/...
 * ```
 */
export class FirestoreStorageAdapter implements StorageAdapter {
  private readonly config: Required<
    Pick<FirestoreStorageConfig, 'gcpProjectId' | 'userId' | 'databaseId' | 'firestoreBaseUrl' | 'writeDocumentsIndividually'>
  > & Pick<FirestoreStorageConfig, 'accessToken'>;

  /** In-memory cache for load() — avoids re-fetching on every store.restore() */
  private cache: Map<string, unknown> = new Map();

  /** Token cache: avoid metadata server round-trips on every write */
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: FirestoreStorageConfig) {
    this.config = {
      gcpProjectId: config.gcpProjectId,
      userId: config.userId,
      accessToken: config.accessToken,
      databaseId: config.databaseId ?? '(default)',
      firestoreBaseUrl: config.firestoreBaseUrl ?? 'https://firestore.googleapis.com',
      writeDocumentsIndividually: config.writeDocumentsIndividually ?? true,
    };
  }

  // --------------------------------------------------------------------------
  // StorageAdapter interface
  // --------------------------------------------------------------------------

  /**
   * Save data under a Kontext storage key.
   *
   * The flat key space (kontext:actions, kontext:transactions, etc.) is mapped
   * to structured Firestore paths. List data (actions, transactions) is written
   * as individual documents under sub-collections for queryability.
   */
  async save(key: string, data: unknown): Promise<void> {
    this.cache.set(key, data);

    if (key === 'kontext:actions' && Array.isArray(data)) {
      await this.saveActionList(data as ActionLog[]);
    } else if (key === 'kontext:transactions' && Array.isArray(data)) {
      await this.saveTransactionList(data as TransactionRecord[]);
    } else if (key === 'kontext:tasks' && Array.isArray(data)) {
      await this.saveTaskList(data as [string, Task][]);
    } else if (key === 'kontext:anomalies' && Array.isArray(data)) {
      await this.saveAnomalyList(data as AnomalyEvent[]);
    } else {
      // Generic key (e.g., 'kontext:plan') — store as a single doc
      await this.saveDocument(this.keyToPath(key), data);
    }
  }

  /**
   * Load data for a Kontext storage key.
   * Returns cached data if available (populated by save()).
   * Falls back to Firestore fetch for cold starts.
   */
  async load(key: string): Promise<unknown | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key) ?? null;
    }

    if (key === 'kontext:actions') {
      const actions = await this.loadActionList();
      this.cache.set(key, actions);
      return actions;
    } else if (key === 'kontext:transactions') {
      const txs = await this.loadTransactionList();
      this.cache.set(key, txs);
      return txs;
    } else if (key === 'kontext:tasks') {
      const tasks = await this.loadTaskList();
      this.cache.set(key, tasks);
      return tasks;
    } else if (key === 'kontext:anomalies') {
      const anomalies = await this.loadAnomalyList();
      this.cache.set(key, anomalies);
      return anomalies;
    } else {
      return this.loadDocument(this.keyToPath(key));
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    await this.deleteDocument(this.keyToPath(key));
  }

  async list(prefix?: string): Promise<string[]> {
    const all = Array.from(this.cache.keys());
    if (!prefix) return all;
    return all.filter((k) => k.startsWith(prefix));
  }

  // --------------------------------------------------------------------------
  // Structured write methods (per-record documents)
  // --------------------------------------------------------------------------

  /**
   * Write a single action log to its canonical Firestore path.
   * Called by the SDK when `writeDocumentsIndividually` is true.
   *
   * Path: users/{userId}/projects/{projectId}/agents/{agentId}/sessions/{sessionId}/actions/{actionId}
   */
  async writeAction(action: ActionLog): Promise<void> {
    if (!this.config.writeDocumentsIndividually) return;
    const path = this.actionPath(action);
    await this.saveDocument(path, action);
  }

  /**
   * Write a single transaction record to its canonical Firestore path.
   *
   * Path: users/{userId}/projects/{projectId}/agents/{agentId}/sessions/{sessionId}/transactions/{txId}
   */
  async writeTransaction(tx: TransactionRecord): Promise<void> {
    if (!this.config.writeDocumentsIndividually) return;
    const path = this.transactionPath(tx);
    await this.saveDocument(path, tx);
  }

  /**
   * Write a single task to its canonical Firestore path.
   *
   * Path: users/{userId}/projects/{projectId}/tasks/{taskId}
   */
  async writeTask(task: Task): Promise<void> {
    if (!this.config.writeDocumentsIndividually) return;
    const path = this.taskPath(task.id);
    await this.saveDocument(path, task);
  }

  // --------------------------------------------------------------------------
  // Path builders
  // --------------------------------------------------------------------------

  private get basePath(): string {
    return `users/${this.config.userId}/projects`;
  }

  private actionPath(action: ActionLog): string {
    const sessionId = action.sessionId ?? '_default';
    return `${this.basePath}/${action.projectId}/agents/${sanitize(action.agentId)}/sessions/${sanitize(sessionId)}/actions/${action.id}`;
  }

  private transactionPath(tx: TransactionRecord): string {
    const sessionId = tx.sessionId ?? '_default';
    return `${this.basePath}/${tx.projectId}/agents/${sanitize(tx.agentId)}/sessions/${sanitize(sessionId)}/transactions/${tx.id}`;
  }

  private taskPath(taskId: string): string {
    // Tasks are project-scoped (not per-agent/session) for easy cross-agent lookup
    // The projectId is embedded in the task record
    return `${this.basePath}/_tasks/${taskId}`;
  }

  private anomalyPath(anomalyId: string, agentId: string): string {
    return `${this.basePath}/_anomalies/agents/${sanitize(agentId)}/${anomalyId}`;
  }

  private keyToPath(key: string): string {
    // Replace colons with slashes and sanitize for Firestore document paths
    const safe = key.replace(/:/g, '/').replace(/[^a-zA-Z0-9/_-]/g, '_');
    return `${this.basePath}/_meta/${safe}`;
  }

  // --------------------------------------------------------------------------
  // Bulk save/load (called by KontextStore.flush / restore)
  // --------------------------------------------------------------------------

  private async saveActionList(actions: ActionLog[]): Promise<void> {
    if (!this.config.writeDocumentsIndividually) {
      // Write the entire list as a single document snapshot
      await this.saveDocument(`${this.basePath}/_snapshots/actions`, actions);
      return;
    }
    // Write each action as its own document (queryable by session/agent)
    await Promise.allSettled(actions.map((a) => this.saveDocument(this.actionPath(a), a)));
  }

  private async saveTransactionList(txs: TransactionRecord[]): Promise<void> {
    if (!this.config.writeDocumentsIndividually) {
      await this.saveDocument(`${this.basePath}/_snapshots/transactions`, txs);
      return;
    }
    await Promise.allSettled(txs.map((tx) => this.saveDocument(this.transactionPath(tx), tx)));
  }

  private async saveTaskList(entries: [string, Task][]): Promise<void> {
    await Promise.allSettled(
      entries.map(([_id, task]) => this.saveDocument(this.taskPath(task.id), task)),
    );
  }

  private async saveAnomalyList(anomalies: AnomalyEvent[]): Promise<void> {
    if (!this.config.writeDocumentsIndividually) {
      await this.saveDocument(`${this.basePath}/_snapshots/anomalies`, anomalies);
      return;
    }
    await Promise.allSettled(
      anomalies.map((a) => this.saveDocument(this.anomalyPath(a.id, a.agentId), a)),
    );
  }

  private async loadActionList(): Promise<ActionLog[]> {
    if (!this.config.writeDocumentsIndividually) {
      const snap = await this.loadDocument(`${this.basePath}/_snapshots/actions`);
      return Array.isArray(snap) ? (snap as ActionLog[]) : [];
    }
    // Query all actions across all agents/sessions via collection group query
    return this.queryCollectionGroup<ActionLog>('actions');
  }

  private async loadTransactionList(): Promise<TransactionRecord[]> {
    if (!this.config.writeDocumentsIndividually) {
      const snap = await this.loadDocument(`${this.basePath}/_snapshots/transactions`);
      return Array.isArray(snap) ? (snap as TransactionRecord[]) : [];
    }
    return this.queryCollectionGroup<TransactionRecord>('transactions');
  }

  private async loadTaskList(): Promise<[string, Task][]> {
    const tasks = await this.queryCollection<Task>(`${this.basePath}/_tasks`);
    return tasks.map((t) => [t.id, t] as [string, Task]);
  }

  private async loadAnomalyList(): Promise<AnomalyEvent[]> {
    if (!this.config.writeDocumentsIndividually) {
      const snap = await this.loadDocument(`${this.basePath}/_snapshots/anomalies`);
      return Array.isArray(snap) ? (snap as AnomalyEvent[]) : [];
    }
    return this.queryCollectionGroup<AnomalyEvent>('anomalies');
  }

  // --------------------------------------------------------------------------
  // Firestore REST API helpers
  // --------------------------------------------------------------------------

  private firestoreBase(): string {
    return `${this.config.firestoreBaseUrl}/v1/projects/${this.config.gcpProjectId}/databases/${this.config.databaseId}/documents`;
  }

  /** Save an arbitrary JS object as a Firestore document at the given path. */
  private async saveDocument(fsPath: string, data: unknown): Promise<void> {
    const url = `${this.firestoreBase()}/${fsPath}`;
    const token = await this.getToken();
    const body = JSON.stringify({ fields: toFirestoreFields(data) });

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Firestore write failed [${res.status}] ${fsPath}: ${text}`);
    }
  }

  /** Load a document at the given Firestore path. Returns null if not found. */
  private async loadDocument(fsPath: string): Promise<unknown | null> {
    const url = `${this.firestoreBase()}/${fsPath}`;
    const token = await this.getToken();

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) return null;
    if (!res.ok) return null;

    const doc = (await res.json()) as FirestoreDocument;
    return fromFirestoreFields(doc.fields);
  }

  /** Delete a document at the given Firestore path. */
  private async deleteDocument(fsPath: string): Promise<void> {
    const url = `${this.firestoreBase()}/${fsPath}`;
    const token = await this.getToken();

    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * List all documents in a collection and deserialize them.
   * Used for tasks (simple flat collection).
   */
  private async queryCollection<T>(collectionPath: string): Promise<T[]> {
    const url = `${this.firestoreBase()}/${collectionPath}`;
    const token = await this.getToken();

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return [];

    const body = (await res.json()) as { documents?: FirestoreDocument[] };
    if (!body.documents) return [];

    return body.documents.map((doc) => fromFirestoreFields(doc.fields) as T);
  }

  /**
   * Run a Firestore collection group query to fetch documents across all
   * nested sub-collections with the given name (e.g., 'actions' across all
   * agents and sessions).
   *
   * Scoped to the user's project root to prevent cross-tenant reads.
   */
  private async queryCollectionGroup<T>(collectionId: string): Promise<T[]> {
    const parent = `projects/${this.config.gcpProjectId}/databases/${this.config.databaseId}/documents`;
    const url = `${this.config.firestoreBaseUrl}/v1/${parent}:runQuery`;
    const token = await this.getToken();

    // Scope query to this user's documents only
    const query = {
      structuredQuery: {
        from: [{ collectionId, allDescendants: true }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'projectId' },
            op: 'EQUAL',
            value: { stringValue: '' }, // placeholder — replaced below
          },
        },
        orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'ASCENDING' }],
      },
    };

    // We scope by the Firestore document path prefix (users/{userId}) rather
    // than a field filter, using the parent path in the request URL.
    const scopedUrl = `${this.config.firestoreBaseUrl}/v1/projects/${this.config.gcpProjectId}/databases/${this.config.databaseId}/documents/users/${this.config.userId}:runQuery`;

    const body = {
      structuredQuery: {
        from: [{ collectionId, allDescendants: true }],
        orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'ASCENDING' }],
      },
    };

    const res = await fetch(scopedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return [];

    const results = (await res.json()) as Array<{ document?: FirestoreDocument }>;
    return results
      .filter((r) => r.document?.fields)
      .map((r) => fromFirestoreFields(r.document!.fields) as T);
  }

  // --------------------------------------------------------------------------
  // Auth: GCP metadata server + token caching
  // --------------------------------------------------------------------------

  private async getToken(): Promise<string> {
    // Use provided access token (local dev, explicit config)
    if (this.config.accessToken) {
      return this.config.accessToken;
    }

    // Return cached token if still valid (5 min buffer)
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt - 300_000) {
      return this.cachedToken;
    }

    // Fetch from GCP metadata server (Cloud Run, GCE, GKE)
    const metadataUrl =
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

    const res = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
    });

    if (!res.ok) {
      throw new Error(
        'FirestoreStorageAdapter: Could not fetch GCP access token. ' +
          'On GCP, ensure the service account has Firestore write access. ' +
          'For local dev, pass accessToken in FirestoreStorageConfig.',
      );
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = now + data.expires_in * 1000;
    return this.cachedToken;
  }
}

// ============================================================================
// Firestore value serialization helpers
// ============================================================================

/** Convert a JS value to a Firestore REST API value object. */
function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'string') {
    // Detect ISO timestamps
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return { timestampValue: value };
    }
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue),
      },
    };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(value),
      },
    };
  }
  // Fallback: stringify
  return { stringValue: String(value) };
}

/** Convert a plain JS object to a Firestore fields map. */
function toFirestoreFields(obj: unknown): Record<string, FirestoreValue> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {};
  }
  const result: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = toFirestoreValue(v);
  }
  return result;
}

/** Convert a Firestore value object back to a plain JS value. */
function fromFirestoreValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  }
  if ('mapValue' in value) {
    return fromFirestoreFields(value.mapValue.fields);
  }
  return null;
}

/** Convert a Firestore fields map back to a plain JS object. */
function fromFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = fromFirestoreValue(v);
  }
  return result;
}

/** Sanitize a string for use in a Firestore document path segment. */
function sanitize(id: string): string {
  // Firestore path segments cannot contain / or .
  return id.replace(/[/.]/g, '_').slice(0, 1500);
}
