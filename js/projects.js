/**
 * MinimalFlow Studio — Multi-Project Manager & Safe Filename Engine
 * Persistensi multi-proyek di LocalStorage dengan safe filename export standard (Zero random timestamp).
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  const STORAGE_KEY_PROJECTS = "minimalflow_projects_v2";

  function getSafeFilename(name, extension = "") {
    const raw = (name || "").trim();
    // Bersihkan karakter terlarang sistem operasi Windows/Linux/Mac: \ / : * ? " < > |
    let safe = raw.replace(/[\\/:*?"<>|]/g, "").trim();
    if (!safe) safe = "flowchart-project";

    if (extension) {
      const ext = extension.startsWith(".") ? extension : `.${extension}`;
      if (!safe.toLowerCase().endsWith(ext.toLowerCase())) {
        safe += ext;
      }
    }
    return safe;
  }

  function getDefaultDocument() {
    return {
      version: "1.5.0",
      canvas: {
        pan: { x: 50, y: 50 },
        zoom: 1.0,
        gridSize: 24,
        workspace: {
          preset: "16:9_landscape",
          orientation: "landscape",
          x: 40,
          y: 40,
          width: 1600,
          height: 900
        }
      },
      theme: "light",
      nodes: {
        "node_start": {
          id: "node_start",
          type: "rounded",
          x: 100,
          y: 160,
          width: 140,
          height: 60,
          rotation: 0,
          locked: false,
          style: { fill: "#ffffff", stroke: "#18181b", strokeWidth: 1.5 },
          text: { content: "Mulai Alur", fontFamily: "Poppins, sans-serif", fontSize: 13, bold: false, italic: false, underline: false, color: "#18181b", align: "center", paddingX: 12, paddingY: 10 }
        },
        "node_process": {
          id: "node_process",
          type: "rectangle",
          x: 320,
          y: 150,
          width: 180,
          height: 80,
          rotation: 0,
          locked: false,
          style: { fill: "#ffffff", stroke: "#18181b", strokeWidth: 1.5 },
          text: { content: "Proses Transaksi & Validasi Data", fontFamily: "Poppins, sans-serif", fontSize: 13, bold: false, italic: false, underline: false, color: "#18181b", align: "center", paddingX: 14, paddingY: 12 }
        },
        "node_decision": {
          id: "node_decision",
          type: "diamond",
          x: 580,
          y: 130,
          width: 140,
          height: 120,
          rotation: 0,
          locked: false,
          style: { fill: "#ffffff", stroke: "#18181b", strokeWidth: 1.5 },
          text: { content: "Validasi Lolos?", fontFamily: "Poppins, sans-serif", fontSize: 13, bold: false, italic: false, underline: false, color: "#18181b", align: "center", paddingX: 16, paddingY: 12 }
        },
        "node_db": {
          id: "node_db",
          type: "cylinder",
          x: 575,
          y: 340,
          width: 150,
          height: 84,
          rotation: 0,
          locked: false,
          style: { fill: "#f4f4f5", stroke: "#18181b", strokeWidth: 1.5 },
          text: { content: "Database Utama", fontFamily: "Poppins, sans-serif", fontSize: 13, bold: false, italic: false, underline: false, color: "#18181b", align: "center", paddingX: 12, paddingY: 10 }
        },
        "node_end": {
          id: "node_end",
          type: "rounded",
          x: 820,
          y: 160,
          width: 140,
          height: 60,
          rotation: 0,
          locked: false,
          style: { fill: "#18181b", stroke: "#18181b", strokeWidth: 1.5 },
          text: { content: "Selesai (Success)", fontFamily: "Poppins, sans-serif", fontSize: 13, bold: false, italic: false, underline: false, color: "#ffffff", align: "center", paddingX: 12, paddingY: 10 }
        }
      },
      edges: {
        "edge_1": {
          id: "edge_1",
          type: "step",
          source: { nodeId: "node_start", pin: "E" },
          target: { nodeId: "node_process", pin: "W" },
          handleOffset: { dx: 0, dy: 0 },
          style: { stroke: "#18181b", strokeWidth: 1.5, dashed: "solid", markerStart: "none", markerEnd: "arrow" }
        },
        "edge_2": {
          id: "edge_2",
          type: "step",
          source: { nodeId: "node_process", pin: "E" },
          target: { nodeId: "node_decision", pin: "W" },
          handleOffset: { dx: 0, dy: 0 },
          style: { stroke: "#18181b", strokeWidth: 1.5, dashed: "solid", markerStart: "none", markerEnd: "arrow" }
        },
        "edge_3": {
          id: "edge_3",
          type: "step",
          source: { nodeId: "node_decision", pin: "E" },
          target: { nodeId: "node_end", pin: "W" },
          handleOffset: { dx: 0, dy: 0 },
          style: { stroke: "#18181b", strokeWidth: 1.5, dashed: "solid", markerStart: "none", markerEnd: "arrow" }
        },
        "edge_4": {
          id: "edge_4",
          type: "step",
          source: { nodeId: "node_decision", pin: "S" },
          target: { nodeId: "node_db", pin: "N" },
          handleOffset: { dx: 0, dy: 0 },
          style: { stroke: "#18181b", strokeWidth: 1.5, dashed: "dashed", markerStart: "none", markerEnd: "arrow" }
        }
      }
    };
  }

  class ProjectManager {
    constructor() {
      this.data = {
        activeId: "proj_default",
        projects: {}
      };
      this.init();
    }

    init() {
      if (typeof localStorage === "undefined") return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
        if (raw) {
          this.data = JSON.parse(raw);
        }
      } catch (e) {
        console.error("Gagal membaca storage projects:", e);
      }

      if (!this.data.projects || Object.keys(this.data.projects).length === 0) {
        const defaultDoc = getDefaultDocument();
        this.data = {
          activeId: "proj_default",
          projects: {
            "proj_default": {
              id: "proj_default",
              name: "Workflow Utama (Default)",
              updatedAt: Date.now(),
              document: defaultDoc
            }
          }
        };
        this.saveToStorage();
      }

      if (!this.data.projects[this.data.activeId]) {
        this.data.activeId = Object.keys(this.data.projects)[0];
      }
    }

    saveToStorage() {
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(this.data));
      } catch (e) {
        console.error("Gagal menulis storage projects:", e);
      }
    }

    getActiveProject() {
      return this.data.projects[this.data.activeId] || Object.values(this.data.projects)[0];
    }

    getActiveProjectName() {
      const active = this.getActiveProject();
      return active ? active.name : "Workflow";
    }

    getAllProjects() {
      return Object.values(this.data.projects).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    autoSaveCurrent(doc) {
      const active = this.data.projects[this.data.activeId];
      if (active && doc) {
        active.document = JSON.parse(JSON.stringify(doc));
        active.updatedAt = Date.now();
        this.saveToStorage();
      }
    }

    setActiveProject(id) {
      if (this.data.projects[id]) {
        this.data.activeId = id;
        this.saveToStorage();
        return this.data.projects[id];
      }
      return null;
    }

    createProject(name, baseDoc) {
      const id = "proj_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      const projName = (name || "").trim() || `Workflow Baru #${Object.keys(this.data.projects).length + 1}`;
      const doc = baseDoc ? JSON.parse(JSON.stringify(baseDoc)) : {
        version: "1.5.0",
        canvas: {
          pan: { x: 50, y: 50 },
          zoom: 1.0,
          gridSize: 24,
          workspace: {
            preset: "16:9_landscape",
            orientation: "landscape",
            x: 40,
            y: 40,
            width: 1600,
            height: 900
          }
        },
        theme: (typeof localStorage !== "undefined" && localStorage.getItem("minimalflow_theme")) || "light",
        nodes: {},
        edges: {}
      };

      const newItem = {
        id,
        name: projName,
        updatedAt: Date.now(),
        document: doc
      };

      this.data.projects[id] = newItem;
      this.data.activeId = id;
      this.saveToStorage();
      return newItem;
    }

    renameProject(id, newName) {
      const proj = this.data.projects[id];
      if (proj && newName && newName.trim()) {
        proj.name = newName.trim();
        proj.updatedAt = Date.now();
        this.saveToStorage();
        return true;
      }
      return false;
    }

    duplicateProject(id) {
      const source = this.data.projects[id];
      if (!source) return null;
      const newId = "proj_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      const clone = {
        id: newId,
        name: `${source.name} (Salinan)`,
        updatedAt: Date.now(),
        document: JSON.parse(JSON.stringify(source.document))
      };
      this.data.projects[newId] = clone;
      this.data.activeId = newId;
      this.saveToStorage();
      return clone;
    }

    deleteProject(id) {
      if (Object.keys(this.data.projects).length <= 1) {
        return false;
      }
      delete this.data.projects[id];
      if (this.data.activeId === id) {
        this.data.activeId = Object.keys(this.data.projects)[0];
      }
      this.saveToStorage();
      return true;
    }
  }

  exports.Projects = {
    STORAGE_KEY_PROJECTS,
    getSafeFilename,
    getDefaultDocument,
    ProjectManager,
    create: () => new ProjectManager()
  };

})(window.MinimalFlow);
