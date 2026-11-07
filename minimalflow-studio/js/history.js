/**
 * MinimalFlow Studio — Undo & Redo History System
 * Snapshot stack manager dengan deduplikasi snapshot dan batasan kedalaman riwayat.
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  class HistoryManager {
    constructor(maxStack = 40) {
      this.past = [];
      this.future = [];
      this.maxStack = maxStack;
    }

    saveSnapshot(doc, onSaved) {
      if (!doc) return;
      const snapshot = JSON.stringify(doc);
      if (this.past.length > 0 && this.past[this.past.length - 1] === snapshot) {
        return;
      }
      this.past.push(snapshot);
      if (this.past.length > this.maxStack) {
        this.past.shift();
      }
      this.future = [];
      if (typeof onSaved === "function") onSaved();
    }

    undo(currentDoc) {
      if (this.past.length === 0) return null;
      const current = JSON.stringify(currentDoc);
      this.future.push(current);
      const previous = this.past.pop();
      try {
        return JSON.parse(previous);
      } catch (e) {
        console.error("Gagal parse undo snapshot:", e);
        return null;
      }
    }

    redo(currentDoc) {
      if (this.future.length === 0) return null;
      const current = JSON.stringify(currentDoc);
      this.past.push(current);
      const next = this.future.pop();
      try {
        return JSON.parse(next);
      } catch (e) {
        console.error("Gagal parse redo snapshot:", e);
        return null;
      }
    }

    canUndo() {
      return this.past.length > 0;
    }

    canRedo() {
      return this.future.length > 0;
    }

    clear() {
      this.past = [];
      this.future = [];
    }
  }

  exports.History = {
    HistoryManager,
    create: (maxStack) => new HistoryManager(maxStack)
  };

})(window.MinimalFlow);
