import type { TaskRecord, TaskState } from "./types";
import { assertTransition } from "./state-guard";

// ---------------------------------------------------------------------------
// Queue interface — swap implementation for Convex/Redis/etc. later
// ---------------------------------------------------------------------------

export interface ITaskQueue {
  enqueue(task: TaskRecord): Promise<void>;
  get(id: string): Promise<TaskRecord | null>;
  update(id: string, patch: Partial<TaskRecord>): Promise<TaskRecord>;
  list(filter?: { state?: TaskState }): Promise<TaskRecord[]>;
}

// ---------------------------------------------------------------------------
// In-process memory queue — sufficient for single-worker / dev use
// ---------------------------------------------------------------------------

export class MemoryQueue implements ITaskQueue {
  private store = new Map<string, TaskRecord>();

  async enqueue(task: TaskRecord): Promise<void> {
    if (this.store.has(task.id)) {
      throw new Error(`Task ${task.id} already exists in queue`);
    }
    this.store.set(task.id, { ...task });
  }

  async get(id: string): Promise<TaskRecord | null> {
    return this.store.get(id) ?? null;
  }

  async update(id: string, patch: Partial<TaskRecord>): Promise<TaskRecord> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Task ${id} not found`);

    // guard state transitions
    if (patch.state && patch.state !== existing.state) {
      assertTransition(existing.state, patch.state, {
        retryable: patch.failure?.retryable ?? existing.failure?.retryable,
      });
    }

    const updated: TaskRecord = {
      ...existing,
      ...patch,
      updatedAtMs: Date.now(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async list(filter?: { state?: TaskState }): Promise<TaskRecord[]> {
    const all = Array.from(this.store.values());
    return filter?.state ? all.filter((t) => t.state === filter.state) : all;
  }
}

// Shared singleton for in-process use
export const memoryQueue = new MemoryQueue();
