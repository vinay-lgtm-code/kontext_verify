// ============================================================================
// Kontext Server - In-Memory Store
// ============================================================================
// MVP: All data stored in memory. For production, this would be replaced
// with a persistent store such as:
// - Cloud Firestore (for real-time sync + flexible queries)
// - PostgreSQL on Cloud SQL (for ACID compliance + complex queries)
// - BigQuery (for analytics + audit trail at scale)
//
// The interface is designed so that swapping storage backends requires
// only implementing the same methods against a different backing store.

interface ActionRecord {
  id: string;
  timestamp: string;
  projectId: string;
  agentId: string;
  correlationId: string;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

interface TaskRecord {
  id: string;
  projectId: string;
  description: string;
  agentId: string;
  status: string;
  requiredEvidence: string[];
  providedEvidence: Record<string, unknown> | null;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  expiresAt: string | null;
  metadata: Record<string, unknown>;
}

interface TrustRecord {
  agentId: string;
  projectId: string;
  actionCount: number;
  transactionCount: number;
  anomalyCount: number;
  confirmedTasks: number;
  failedTasks: number;
  lastUpdated: string;
}

interface AnomalyRecord {
  id: string;
  type: string;
  severity: string;
  description: string;
  agentId: string;
  actionId: string;
  projectId: string;
  detectedAt: string;
  data: Record<string, unknown>;
  reviewed: boolean;
}

export class ServerStore {
  private actions: Map<string, ActionRecord[]> = new Map(); // keyed by projectId
  private tasks: Map<string, TaskRecord> = new Map(); // keyed by taskId
  private trustData: Map<string, TrustRecord> = new Map(); // keyed by `${projectId}:${agentId}`
  private anomalies: Map<string, AnomalyRecord[]> = new Map(); // keyed by projectId

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  addActions(projectId: string, actions: ActionRecord[]): void {
    const existing = this.actions.get(projectId) ?? [];
    existing.push(...actions);
    this.actions.set(projectId, existing);

    // Update trust data for each unique agent
    const agentIds = new Set(actions.map((a) => a.agentId));
    for (const agentId of agentIds) {
      this.updateTrustData(projectId, agentId, actions.filter((a) => a.agentId === agentId));
    }
  }

  getActions(projectId: string, filters?: {
    agentId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): ActionRecord[] {
    let records = this.actions.get(projectId) ?? [];

    if (filters?.agentId) {
      records = records.filter((r) => r.agentId === filters.agentId);
    }
    if (filters?.type) {
      records = records.filter((r) => r.type === filters.type);
    }
    if (filters?.startDate) {
      records = records.filter((r) => r.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      records = records.filter((r) => r.timestamp <= filters.endDate!);
    }

    return records;
  }

  // --------------------------------------------------------------------------
  // Tasks
  // --------------------------------------------------------------------------

  addTask(task: TaskRecord): void {
    this.tasks.set(task.id, task);
  }

  getTask(taskId: string): TaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  updateTask(taskId: string, updates: Partial<TaskRecord>): TaskRecord | undefined {
    const existing = this.tasks.get(taskId);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.tasks.set(taskId, updated);
    return updated;
  }

  getTasks(projectId: string, status?: string): TaskRecord[] {
    const all = Array.from(this.tasks.values()).filter(
      (t) => t.projectId === projectId,
    );
    if (status) return all.filter((t) => t.status === status);
    return all;
  }

  // --------------------------------------------------------------------------
  // Trust Data
  // --------------------------------------------------------------------------

  getTrustData(projectId: string, agentId: string): TrustRecord | undefined {
    return this.trustData.get(`${projectId}:${agentId}`);
  }

  private updateTrustData(projectId: string, agentId: string, newActions: ActionRecord[]): void {
    const key = `${projectId}:${agentId}`;
    const existing = this.trustData.get(key) ?? {
      agentId,
      projectId,
      actionCount: 0,
      transactionCount: 0,
      anomalyCount: 0,
      confirmedTasks: 0,
      failedTasks: 0,
      lastUpdated: new Date().toISOString(),
    };

    existing.actionCount += newActions.length;
    existing.transactionCount += newActions.filter((a) => a.type === 'transaction').length;
    existing.lastUpdated = new Date().toISOString();

    this.trustData.set(key, existing);
  }

  // --------------------------------------------------------------------------
  // Anomalies
  // --------------------------------------------------------------------------

  addAnomaly(projectId: string, anomaly: AnomalyRecord): void {
    const existing = this.anomalies.get(projectId) ?? [];
    existing.push(anomaly);
    this.anomalies.set(projectId, existing);

    // Update trust data anomaly count
    const key = `${projectId}:${anomaly.agentId}`;
    const trust = this.trustData.get(key);
    if (trust) {
      trust.anomalyCount += 1;
    }
  }

  getAnomalies(projectId: string): AnomalyRecord[] {
    return this.anomalies.get(projectId) ?? [];
  }

  // --------------------------------------------------------------------------
  // Export
  // --------------------------------------------------------------------------

  getExportData(projectId: string, filters?: {
    startDate?: string;
    endDate?: string;
    agentId?: string;
  }): {
    actions: ActionRecord[];
    tasks: TaskRecord[];
    anomalies: AnomalyRecord[];
  } {
    return {
      actions: this.getActions(projectId, filters),
      tasks: this.getTasks(projectId).filter((t) => {
        if (filters?.agentId && t.agentId !== filters.agentId) return false;
        if (filters?.startDate && t.createdAt < filters.startDate) return false;
        if (filters?.endDate && t.createdAt > filters.endDate) return false;
        return true;
      }),
      anomalies: (this.anomalies.get(projectId) ?? []).filter((a) => {
        if (filters?.agentId && a.agentId !== filters.agentId) return false;
        if (filters?.startDate && a.detectedAt < filters.startDate) return false;
        if (filters?.endDate && a.detectedAt > filters.endDate) return false;
        return true;
      }),
    };
  }
}
