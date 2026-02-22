/**
 * JsonFileQueue — file-backed ITaskQueue implementation.
 * Provides real persistence across process restarts.
 * Drop-in replacement for MemoryQueue; swap for ConvexQueue when deployment is ready.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { TaskRecord, TaskState } from "./types";
import type { ITaskQueue } from "./queue";
import { assertTransition } from "./state-guard";

const DB_PATH = resolve(process.cwd(), ".ara-tasks.json");

export class JsonFileQueue implements ITaskQueue {
  private read(): Record<string, TaskRecord> {
    if (!existsSync(DB_PATH)) return {};
    try {
      return JSON.parse(readFileSync(DB_PATH, "utf-8")) as Record<string, TaskRecord>;
    } catch {
      return {};
    }
  }

  private write(store: Record<string, TaskRecord>): void {
    writeFileSync(DB_PATH, JSON.stringify(store, null, 2), "utf-8");
  }

  async enqueue(task: TaskRecord): Promise<void> {
    const store = this.read();
    if (store[task.id]) throw new Error(`Task ${task.id} already exists in queue`);
    store[task.id] = { ...task };
    this.write(store);
  }

  async get(id: string): Promise<TaskRecord | null> {
    return this.read()[id] ?? null;
  }

  async update(id: string, patch: Partial<TaskRecord>): Promise<TaskRecord> {
    const store = this.read();
    const existing = store[id];
    if (!existing) throw new Error(`Task ${id} not found`);

    if (patch.state && patch.state !== existing.state) {
      assertTransition(existing.state, patch.state, {
        retryable: patch.failure?.retryable ?? existing.failure?.retryable,
      });
    }

    const updated: TaskRecord = { ...existing, ...patch, updatedAtMs: Date.now() };
    store[id] = updated;
    this.write(store);
    return updated;
  }

  async list(filter?: { state?: TaskState }): Promise<TaskRecord[]> {
    const all = Object.values(this.read());
    return filter?.state ? all.filter((t) => t.state === filter.state) : all;
  }
}

export const jsonFileQueue = new JsonFileQueue();
