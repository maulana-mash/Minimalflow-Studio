<script lang="ts">
  import { onMount } from 'svelte';
  import type { FlowDocument, FlowNode, FlowConnector, NodeType, FlowProjectItem } from './types';
  import { WORKSPACE_PRESETS } from './engine/canvasRenderer';
  import { HistoryManager } from './engine/historyManager';
  import { StorageManager } from './engine/storage';
  import { exportSvg, exportPng, exportJpg, exportPdf, copyCanvasToClipboard, exportJson } from './engine/exporter';

  import ToolbarHeader from './components/ToolbarHeader.svelte';
  import SidebarShapes from './components/SidebarShapes.svelte';
  import CanvasViewport from './components/CanvasViewport.svelte';
  import FloatingProperties from './components/FloatingProperties.svelte';
  import InlineTextEditor from './components/InlineTextEditor.svelte';
  import ContextMenu from './components/ContextMenu.svelte';
  import ProjectModal from './components/ProjectModal.svelte';

  // Managers
  let storage = new StorageManager();
  let history = new HistoryManager();

  // Reactive State
  let currentProject = storage.getActiveProject();
  let doc: FlowDocument = currentProject.document;

  let selectedType: 'node' | 'edge' | null = null;
  let selectedId: string | null = null;
  let editingNodeId: string | null = null;

  let canUndo = false;
  let canRedo = false;

  // Toast
  let toastMessage: string = "";
  let showToastNotice: boolean = false;
  let toastTimer: any = null;

  // Context Menu State
  let contextMenuVisible = false;
  let contextMenuPos = { x: 0, y: 0 };
  let contextMenuTargetType: 'node' | 'edge' | 'canvas' | null = null;
  let contextMenuTargetId: string | null = null;
  let clipboardNode: FlowNode | null = null;

  // Projects Modal State
  let showProjectsModal = false;
  let allProjects: FlowProjectItem[] = [];

  let canvasViewportComp: CanvasViewport;

  onMount(() => {
    applyTheme(doc.theme || 'light');
    saveSnapshot();
    updateHistoryButtons();
    allProjects = storage.getAllProjects();
  });

  function showToast(msg: string) {
    toastMessage = msg;
    showToastNotice = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      showToastNotice = false;
    }, 2400);
  }

  function applyTheme(theme: 'light' | 'dark') {
    doc.theme = theme;
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    saveSnapshot();
  }

  function toggleTheme() {
    const nextTheme = doc.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(`Beralih ke Mode ${nextTheme === 'dark' ? 'Gelap' : 'Terang'}`);
  }

  function saveSnapshot() {
    history.saveSnapshot(doc);
    storage.autoSaveCurrent(doc);
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    canUndo = history.canUndo();
    canRedo = history.canRedo();
  }

  function handleUndo() {
    const previous = history.undo(doc);
    if (previous) {
      doc = previous;
      selectedType = null;
      selectedId = null;
      editingNodeId = null;
      applyTheme(doc.theme || 'light');
      storage.autoSaveCurrent(doc);
      updateHistoryButtons();
      showToast("Undo alur");
    }
  }

  function handleRedo() {
    const next = history.redo(doc);
    if (next) {
      doc = next;
      selectedType = null;
      selectedId = null;
      editingNodeId = null;
      applyTheme(doc.theme || 'light');
      storage.autoSaveCurrent(doc);
      updateHistoryButtons();
      showToast("Redo alur");
    }
  }

  function handleSelect(type: 'node' | 'edge' | null, id: string | null) {
    selectedType = type;
    selectedId = id;
    if (type !== 'node') {
      editingNodeId = null;
    }
  }

  function handleDelete() {
    if (!selectedType || !selectedId) {
      showToast("Pilih chart atau kabel terlebih dahulu");
      return;
    }
    saveSnapshot();

    if (selectedType === 'node') {
      // Hapus node dan kabel yang terhubung
      const nodeId = selectedId;
      delete doc.nodes[nodeId];
      for (const [edgeId, edge] of Object.entries(doc.edges)) {
        if (edge.source.nodeId === nodeId || edge.target.nodeId === nodeId) {
          delete doc.edges[edgeId];
        }
      }
      showToast("Chart dihapus");
    } else if (selectedType === 'edge') {
      delete doc.edges[selectedId];
      showToast("Kabel penghubung dihapus");
    }

    selectedType = null;
    selectedId = null;
    editingNodeId = null;
    storage.autoSaveCurrent(doc);
  }

  function handleClearCanvas() {
    if (Object.keys(doc.nodes).length === 0 && Object.keys(doc.edges).length === 0) {
      return;
    }
    if (confirm("Bersihkan seluruh isi kanvas? Tindakan ini dapat di-undo.")) {
      saveSnapshot();
      doc.nodes = {};
      doc.edges = {};
      selectedType = null;
      selectedId = null;
      editingNodeId = null;
      storage.autoSaveCurrent(doc);
      showToast("Seluruh kanvas dibersihkan");
    }
  }

  // Create new node from sidebar
  function handleCreateNode(type: NodeType, x?: number, y?: number) {
    saveSnapshot();
    const newId = "node_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);

    let posX = x;
    let posY = y;
    if (posX === undefined || posY === undefined) {
      // Posisikan di tengah workspace
      const cascade = (Object.keys(doc.nodes).length % 6) * 16;
      posX = Math.round(doc.canvas.workspace.x + 80 + cascade);
      posY = Math.round(doc.canvas.workspace.y + 80 + cascade);
    }

    let defaultW = 140;
    let defaultH = 60;
    if (type === "diamond") { defaultW = 140; defaultH = 110; }
    if (type === "parallelogram") { defaultW = 160; defaultH = 70; }
    if (type === "cylinder") { defaultW = 150; defaultH = 80; }
    if (type === "circle") { defaultW = 90; defaultH = 90; }

    const newNode: FlowNode = {
      id: newId,
      type,
      x: posX,
      y: posY,
      width: defaultW,
      height: defaultH,
      rotation: 0,
      locked: false,
      style: {
        fill: doc.theme === 'dark' ? '#18181b' : '#ffffff',
        stroke: doc.theme === 'dark' ? '#f4f4f5' : '#18181b',
        strokeWidth: 1.5
      },
      text: {
        content: "Insert text",
        fontFamily: "Poppins, sans-serif",
        fontSize: 13,
        bold: false,
        italic: false,
        underline: false,
        color: doc.theme === 'dark' ? '#f4f4f5' : '#18181b',
        align: "center",
        paddingX: 12,
        paddingY: 10,
        isPlaceholder: true
      }
    };

    doc.nodes[newId] = newNode;
    handleSelect('node', newId);
    storage.autoSaveCurrent(doc);
    showToast(`Bagan baru ditambahkan`);
  }

  // Handle uploaded image file
  function handleImageFile(file: File, worldX: number, worldY: number) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return;

      saveSnapshot();
      const newId = "node_img_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || 200;
        let h = img.naturalHeight || 150;
        const maxDim = 320;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const newNode: FlowNode = {
          id: newId,
          type: "image",
          src,
          x: Math.round(worldX - w / 2),
          y: Math.round(worldY - h / 2),
          width: w,
          height: h,
          rotation: 0,
          locked: false,
          style: { fill: "transparent", stroke: doc.theme === 'dark' ? '#3f3f46' : '#e4e4e7', strokeWidth: 1 },
          text: { content: "", fontFamily: "Inter, sans-serif", fontSize: 12, bold: false, italic: false, underline: false, color: "#18181b", align: "center", paddingX: 0, paddingY: 0 }
        };

        doc.nodes[newId] = newNode;
        handleSelect('node', newId);
        storage.autoSaveCurrent(doc);
        showToast("Gambar berhasil ditambahkan ke kanvas");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  // Preset workspace boundary change
  function handlePresetChange(presetKey: string) {
    saveSnapshot();
    const p = WORKSPACE_PRESETS[presetKey] || WORKSPACE_PRESETS["16:9_landscape"];
    doc.canvas.workspace.preset = presetKey;
    doc.canvas.workspace.width = p.w;
    doc.canvas.workspace.height = p.h;
    doc.canvas.workspace.orientation = p.w >= p.h ? "landscape" : "portrait";
    storage.autoSaveCurrent(doc);
    showToast(`Workspace diubah: ${p.name}`);
  }

  function handleToggleOrientation() {
    saveSnapshot();
    const ws = doc.canvas.workspace;
    const temp = ws.width;
    ws.width = ws.height;
    ws.height = temp;
    ws.orientation = ws.width >= ws.height ? "landscape" : "portrait";

    for (const [key, val] of Object.entries(WORKSPACE_PRESETS)) {
      if (val.w === ws.width && val.h === ws.height) {
        ws.preset = key;
        break;
      }
    }
    storage.autoSaveCurrent(doc);
    showToast(`Orientasi Kanvas: ${ws.orientation.toUpperCase()}`);
  }

  // Node & Edge property updates
  function handleNodeChange(updated: Partial<FlowNode>) {
    if (!selectedId || !doc.nodes[selectedId]) return;
    saveSnapshot();
    doc.nodes[selectedId] = {
      ...doc.nodes[selectedId],
      ...updated
    };
    storage.autoSaveCurrent(doc);
  }

  function handleEdgeChange(updated: Partial<FlowConnector>) {
    if (!selectedId || !doc.edges[selectedId]) return;
    saveSnapshot();
    doc.edges[selectedId] = {
      ...doc.edges[selectedId],
      ...updated
    };
    storage.autoSaveCurrent(doc);
  }

  // Start inline text editor
  function handleStartEditingText(nodeId: string) {
    editingNodeId = nodeId;
    handleSelect('node', nodeId);
  }

  function handleCommitText(newContent: string) {
    if (editingNodeId && doc.nodes[editingNodeId]) {
      saveSnapshot();
      const isPlaceholder = !newContent.trim() || newContent.trim().toLowerCase() === "insert text";
      doc.nodes[editingNodeId].text.content = newContent;
      doc.nodes[editingNodeId].text.isPlaceholder = isPlaceholder;
      storage.autoSaveCurrent(doc);
    }
    editingNodeId = null;
  }

  function handleCancelText() {
    editingNodeId = null;
  }

  function handleResizeNodeHeight(newH: number) {
    if (editingNodeId && doc.nodes[editingNodeId]) {
      doc.nodes[editingNodeId].height = newH;
      storage.autoSaveCurrent(doc);
    }
  }

  // Rotate & Lock
  function handleRotateNode() {
    if (selectedId && doc.nodes[selectedId]) {
      saveSnapshot();
      const node = doc.nodes[selectedId];
      node.rotation = ((node.rotation || 0) + 90) % 360;
      storage.autoSaveCurrent(doc);
      showToast(`Diputar: ${node.rotation}°`);
    }
  }

  function handleToggleLockNode() {
    if (selectedId && doc.nodes[selectedId]) {
      saveSnapshot();
      const node = doc.nodes[selectedId];
      node.locked = !node.locked;
      storage.autoSaveCurrent(doc);
      showToast(node.locked ? "Posisi chart dikunci" : "Kunci posisi dibuka");
    }
  }

  // Context Menu Handlers
  function handleOpenContextMenu(clientX: number, clientY: number, targetType: 'node' | 'edge' | 'canvas' | null, targetId: string | null) {
    contextMenuPos = { x: clientX, y: clientY };
    contextMenuTargetType = targetType;
    contextMenuTargetId = targetId;
    contextMenuVisible = true;
  }

  function handleContextMenuAction(action: string) {
    if (action === "edit-text" && contextMenuTargetId) {
      handleStartEditingText(contextMenuTargetId);
    } else if (action === "copy" && contextMenuTargetId && doc.nodes[contextMenuTargetId]) {
      clipboardNode = JSON.parse(JSON.stringify(doc.nodes[contextMenuTargetId]));
      showToast("Chart disalin (Ctrl+C)");
    } else if (action === "paste") {
      pasteNodeAtPos(contextMenuPos.x, contextMenuPos.y);
    } else if (action === "duplicate" && contextMenuTargetId && doc.nodes[contextMenuTargetId]) {
      duplicateNode(contextMenuTargetId);
    } else if (action === "toggle-lock") {
      handleToggleLockNode();
    } else if (action === "rotate") {
      handleRotateNode();
    } else if (action === "delete") {
      handleDelete();
    }
  }

  function duplicateNode(nodeId: string) {
    const orig = doc.nodes[nodeId];
    if (!orig) return;
    saveSnapshot();
    const newId = "node_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const copy = JSON.parse(JSON.stringify(orig)) as FlowNode;
    copy.id = newId;
    copy.x += 30;
    copy.y += 30;
    copy.locked = false;
    doc.nodes[newId] = copy;
    handleSelect('node', newId);
    storage.autoSaveCurrent(doc);
    showToast("Chart diduplikat");
  }

  function pasteNodeAtPos(clientX: number, clientY: number) {
    if (!clipboardNode) {
      showToast("Tidak ada chart yang disalin");
      return;
    }
    saveSnapshot();
    const svgEl = canvasViewportComp.getSvgElement();
    const rect = svgEl.getBoundingClientRect();
    const pos = {
      x: Math.round((clientX - rect.left - doc.canvas.pan.x) / doc.canvas.zoom),
      y: Math.round((clientY - rect.top - doc.canvas.pan.y) / doc.canvas.zoom)
    };

    const newId = "node_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const copy = JSON.parse(JSON.stringify(clipboardNode)) as FlowNode;
    copy.id = newId;
    copy.x = Math.round(pos.x - copy.width / 2);
    copy.y = Math.round(pos.y - copy.height / 2);
    copy.locked = false;
    doc.nodes[newId] = copy;
    handleSelect('node', newId);
    storage.autoSaveCurrent(doc);
    showToast("Chart ditempel");
  }

  // Export handlers
  function handleExportAction(action: string) {
    const svgEl = canvasViewportComp.getSvgElement();
    if (!svgEl) return;

    if (action === "export-svg") {
      exportSvg(doc, svgEl);
      showToast("SVG Batas Workspace diunduh!");
    } else if (action === "export-png-trans") {
      exportPng(doc, svgEl, true, "flowchart-transparent.png", () => {
        showToast("PNG Transparan (2x) diunduh!");
      });
    } else if (action === "export-png-white") {
      exportPng(doc, svgEl, false, "flowchart-canvas.png", () => {
        showToast("PNG berhasil diunduh!");
      });
    } else if (action === "export-jpg") {
      exportJpg(doc, svgEl, "flowchart.jpg", () => {
        showToast("JPG berhasil diunduh!");
      });
    } else if (action === "export-pdf") {
      exportPdf(doc, svgEl, "flowchart-document.pdf", () => {
        showToast("PDF Dokumen diunduh!");
      });
    } else if (action === "copy-clipboard") {
      copyCanvasToClipboard(doc, svgEl, () => {
        showToast("Gambar disalin ke Clipboard!");
      }, () => {
        showToast("Izin clipboard ditolak oleh browser");
      });
    } else if (action === "save-json") {
      exportJson(doc);
      showToast("File Project JSON tersimpan!");
    }
  }

  // Open JSON file
  function handleOpenJson(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data && data.nodes) {
          saveSnapshot();
          doc = data;
          selectedType = null;
          selectedId = null;
          editingNodeId = null;
          applyTheme(doc.theme || 'light');
          storage.autoSaveCurrent(doc);
          showToast("Project JSON berhasil dimuat!");
        }
      } catch (err) {
        alert("File JSON tidak valid atau rusak.");
      }
    };
    reader.readAsText(file);
  }

  // Multi-Project Handlers
  function handleOpenProjectsModal() {
    allProjects = storage.getAllProjects();
    showProjectsModal = true;
  }

  function handleSelectProject(id: string) {
    const selectedProj = storage.setActiveProject(id);
    if (selectedProj) {
      doc = selectedProj.document;
      currentProject = selectedProj;
      selectedType = null;
      selectedId = null;
      editingNodeId = null;
      history.reset();
      saveSnapshot();
      applyTheme(doc.theme || 'light');
      showProjectsModal = false;
      showToast(`Proyek "${selectedProj.name}" dimuat`);
    }
  }

  function handleCreateProject(name: string) {
    const newProj = storage.createProject(name);
    allProjects = storage.getAllProjects();
    handleSelectProject(newProj.id);
  }

  function handleRenameProject(id: string, newName: string) {
    storage.renameProject(id, newName);
    allProjects = storage.getAllProjects();
    showToast("Nama proyek diperbarui");
  }

  function handleDuplicateProject(id: string) {
    const clone = storage.duplicateProject(id);
    if (clone) {
      allProjects = storage.getAllProjects();
      showToast("Proyek diduplikat");
    }
  }

  function handleDeleteProject(id: string) {
    if (storage.deleteProject(id)) {
      allProjects = storage.getAllProjects();
      showToast("Proyek dihapus");
    } else {
      showToast("Minimal satu proyek harus tersisa");
    }
  }

  // Global Keyboard Shortcuts
  function handleGlobalKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      handleDelete();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedType === 'node' && selectedId) {
      clipboardNode = JSON.parse(JSON.stringify(doc.nodes[selectedId]));
      showToast("Chart disalin (Ctrl+C)");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      pasteNodeAtPos(window.innerWidth / 2, window.innerHeight / 2);
    }
  }
</script>

<svelte:window on:keydown={handleGlobalKeyDown} />

<!-- App Header -->
<ToolbarHeader 
  {doc}
  {canUndo}
  {canRedo}
  onUndo={handleUndo}
  onRedo={handleRedo}
  onDelete={handleDelete}
  onClearCanvas={handleClearCanvas}
  onToggleTheme={toggleTheme}
  onOpenProjectsModal={handleOpenProjectsModal}
  onOpenJson={handleOpenJson}
  onExportAction={handleExportAction}
  onPresetChange={handlePresetChange}
  onToggleOrientation={handleToggleOrientation}
/>

<!-- App Main Body: Sidebar + Canvas Workspace -->
<main class="app-body">
  <SidebarShapes 
    onCreateNode={(type) => handleCreateNode(type)}
    onUploadImageFile={(file) => {
      const ws = doc.canvas.workspace;
      handleImageFile(file, ws.x + ws.width / 2, ws.y + ws.height / 2);
    }}
  />

  <div style="flex: 1; height: 100%; position: relative;">
    <CanvasViewport 
      bind:this={canvasViewportComp}
      {doc}
      {selectedType}
      {selectedId}
      {editingNodeId}
      onSelect={handleSelect}
      onStartEditingText={handleStartEditingText}
      onOpenContextMenu={handleOpenContextMenu}
      onSaveSnapshot={saveSnapshot}
      onImageDrop={handleImageFile}
      on:createNode={(e) => handleCreateNode(e.detail.type, e.detail.x, e.detail.y)}
    />

    <!-- Two-Tier Floating Properties Bar (Bertumpuk 2 Baris Tanpa Scrollbar Horizontal) -->
    <FloatingProperties 
      {selectedType}
      selectedNode={selectedType === 'node' && selectedId ? doc.nodes[selectedId] : null}
      selectedEdge={selectedType === 'edge' && selectedId ? doc.edges[selectedId] : null}
      onNodeChange={handleNodeChange}
      onEdgeChange={handleEdgeChange}
      onStartEditText={() => selectedId && handleStartEditingText(selectedId)}
      onRotateNode={handleRotateNode}
      onToggleLockNode={handleToggleLockNode}
    />

    <!-- Transparent Native In-Chart Text Editor -->
    <InlineTextEditor 
      node={editingNodeId && doc.nodes[editingNodeId] ? doc.nodes[editingNodeId] : null}
      pan={doc.canvas.pan}
      zoom={doc.canvas.zoom}
      active={!!editingNodeId}
      onCommit={handleCommitText}
      onCancel={handleCancelText}
      onResizeHeight={handleResizeNodeHeight}
    />
  </div>
</main>

<!-- Context Menu (Right Click) -->
<ContextMenu 
  visible={contextMenuVisible}
  x={contextMenuPos.x}
  y={contextMenuPos.y}
  targetType={contextMenuTargetType}
  isNodeLocked={contextMenuTargetId && doc.nodes[contextMenuTargetId] ? doc.nodes[contextMenuTargetId].locked : false}
  onAction={handleContextMenuAction}
  onClose={() => contextMenuVisible = false}
/>

<!-- Project Modal Gallery -->
<ProjectModal 
  visible={showProjectsModal}
  projects={allProjects}
  activeId={currentProject.id}
  onClose={() => showProjectsModal = false}
  onSelectProject={handleSelectProject}
  onCreateProject={handleCreateProject}
  onRenameProject={handleRenameProject}
  onDuplicateProject={handleDuplicateProject}
  onDeleteProject={handleDeleteProject}
/>

<!-- Toast Notice -->
<div class="toast-notice" class:show={showToastNotice}>
  {toastMessage}
</div>
