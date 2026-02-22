/**
 * ConvexQueue — ITaskQueue backed by Convex cloud database.
 * Drop-in replacement for JsonFileQueue / MemoryQueue.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { TaskRecord, TaskState } from "./types";
import type { ITaskQueue } from "./queue";
import { assertTransition } from "./state-guard";

function makeClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

export class ConvexQueue implements ITaskQueue {
  private _client: ConvexHttpClient | null = null;

  private get client(): ConvexHttpClient {
    if (!this._client) this._client = makeClient();
    return this._client;
  }

  async enqueue(task: TaskRecord): Promise<void> {
    await this.client.mutation(api.research.createTask, {
      taskId: task.id,
      idempotencyKey: task.idempotencyKey,
      taskType: task.taskType,
      state: task.state,
      title: task.title,
      prompt: task.prompt,
      domain: task.domain,
      requestedBy: task.requestedBy,
      adapterSequence: task.adapterSequence,
      attempt: task.attempt,
      maxAttempts: task.maxAttempts,
      retryPolicy: task.retryPolicy,
      createdAtMs: task.createdAtMs,
      queuedAtMs: task.queuedAtMs,
      updatedAtMs: task.updatedAtMs,
    });
  }

  async get(id: string): Promise<TaskRecord | null> {
    const doc = await this.client.query(api.research.getByTaskId, { taskId: id });
    if (!doc) return null;
    return this.docToRecord(doc);
  }

  async update(id: string, patch: Partial<TaskRecord>): Promise<TaskRecord> {
    // guard transition before hitting the DB
    const existing = await this.get(id);
    if (!existing) throw new Error(`Task ${id} not found in Convex`);

    if (patch.state && patch.state !== existing.state) {
      assertTransition(existing.state, patch.state, {
        retryable: patch.failure?.retryable ?? existing.failure?.retryable,
      });
    }

    await this.client.mutation(api.research.updateTask, {
      taskId: id,
      state: patch.state,
      currentAdapterId: patch.currentAdapterId,
      assignedWorkerId: patch.assignedWorkerId,
      attempt: patch.attempt,
      updatedAtMs: Date.now(),
      startedAtMs: patch.startedAtMs,
      completedAtMs: patch.completedAtMs,
      failedAtMs: patch.failedAtMs,
      nextRetryAtMs: patch.nextRetryAtMs,
      result: patch.result,
      failure: patch.failure,
    });

    // re-fetch to return the current state
    const updated = await this.get(id);
    if (!updated) throw new Error(`Task ${id} vanished after update`);
    return updated;
  }

  async list(filter?: { state?: TaskState }): Promise<TaskRecord[]> {
    if (filter?.state) {
      const docs = await this.client.query(api.research.listByState, { state: filter.state });
      return docs.map((d) => this.docToRecord(d));
    }
    const docs = await this.client.query(api.research.listRecent, { limit: 100 });
    return docs.map((d) => this.docToRecord(d));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private docToRecord(doc: Record<string, any>): TaskRecord {
    return {
      id: doc.taskId,
      taskType: doc.taskType,
      state: doc.state,
      title: doc.title,
      prompt: doc.prompt,
      domain: doc.domain,
      requestedBy: doc.requestedBy,
      idempotencyKey: doc.idempotencyKey,
      adapterSequence: doc.adapterSequence,
      currentAdapterId: doc.currentAdapterId,
      assignedWorkerId: doc.assignedWorkerId,
      retryPolicy: doc.retryPolicy,
      attempt: doc.attempt,
      maxAttempts: doc.maxAttempts,
      createdAtMs: doc.createdAtMs,
      queuedAtMs: doc.queuedAtMs,
      startedAtMs: doc.startedAtMs,
      updatedAtMs: doc.updatedAtMs,
      completedAtMs: doc.completedAtMs,
      failedAtMs: doc.failedAtMs,
      nextRetryAtMs: doc.nextRetryAtMs,
      result: doc.result,
      failure: doc.failure,
      history: doc.history,
    };
  }
}

export const convexQueue = new ConvexQueue();
