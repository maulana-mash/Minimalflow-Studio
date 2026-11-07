import type { FlowDocument } from '../types';

export class HistoryManager {
  private past: string[] = [];
  private future: string[] = [];
  private maxDepth: number = 40;

  constructor(maxDepth: number = 40) {
    this.maxDepth = maxDepth;
  }

  saveSnapshot(doc: FlowDocument): void {
    const snapshot = JSON.stringify(doc);
    if (this.past.length > 0 && this.past[this.past.length - 1] === snapshot) {
      return;
    }
    this.past.push(snapshot);
    if (this.past.length > this.maxDepth) {
      this.past.shift();
    }
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(currentDoc: FlowDocument): FlowDocument | null {
    if (this.past.length === 0) return null;
    const currentSnapshot = JSON.stringify(currentDoc);
    this.future.push(currentSnapshot);
    const previous = this.past.pop();
    if (!previous) return null;
    return JSON.parse(previous);
  }

  redo(currentDoc: FlowDocument): FlowDocument | null {
    if (this.future.length === 0) return null;
    const currentSnapshot = JSON.stringify(currentDoc);
    this.past.push(currentSnapshot);
    const next = this.future.pop();
    if (!next) return null;
    return JSON.parse(next);
  }

  reset(): void {
    this.past = [];
    this.future = [];
  }
}
