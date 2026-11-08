/**
 * MinimalFlow Studio — Master Application Orchestrator
 * Menghubungkan seluruh modul (Canvas, FlowEngine, TextEditor, History, Projects, Exporter),
 * event listener DOM, 2-tier contextual toolbar, menu konteks, dan manajemen proyek.
 */

window.MinimalFlow = window.MinimalFlow || {};

(function () {
  'use strict';

  const { Canvas, FlowEngine, TextEditor, History, Projects, Exporter } = window.MinimalFlow;

  // DOM Elements Cache
  const dom = {
    container: document.getElementById("canvas-container"),
    svg: document.getElementById("canvas-svg"),
    viewport: document.getElementById("viewport"),
    gridPattern: document.getElementById("dot-grid"),
    layerEdges: document.getElementById("layer-edges"),
    layerNodes: document.getElementById("layer-nodes"),
    layerDraft: document.getElementById("layer-draft"),
    overlayPins: document.getElementById("overlay-pins"),
    overlayHandles: document.getElementById("overlay-handles"),
    overlaySelection: document.getElementById("overlay-selection"),
    nodeBar: document.getElementById("node-context-bar"),
    edgeBar: document.getElementById("edge-context-bar"),
    inlineEditor: document.getElementById("inline-text-editor"),
    contextMenu: document.getElementById("app-context-menu"),
    zoomText: document.getElementById("zoom-text"),
    btnZoomFit: document.getElementById("btn-zoom-fit"),
    toast: document.getElementById("toast"),
    btnUndo: document.getElementById("btn-undo"),
    btnRedo: document.getElementById("btn-redo"),
    fileInput: document.getElementById("file-input-json"),
    fileInputImage: document.getElementById("file-input-image"),
    cardUploadImage: document.getElementById("card-upload-image"),
    themeToggle: document.getElementById("btn-theme-toggle"),
    iconMoon: document.getElementById("icon-moon"),
    iconSun: document.getElementById("icon-sun"),
    tapBanner: document.getElementById("tap-connect-banner"),
    btnCancelTap: document.getElementById("btn-cancel-tap-connect"),
    arrowEndPath: document.getElementById("arrow-end-path"),
    arrowStartPath: document.getElementById("arrow-start-path"),
    propNodeW: document.getElementById("prop-node-w"),
    propNodeH: document.getElementById("prop-node-h"),
    propFontSize: document.getElementById("prop-font-size"),
    propFontSizeNum: document.getElementById("prop-font-size-num"),
    propPaddingX: document.getElementById("prop-padding-x"),
    propPaddingXNum: document.getElementById("prop-padding-x-num"),
    propCustomColor: document.getElementById("prop-custom-color"),
    btnTextAlignLeft: document.getElementById("btn-text-align-left"),
    btnTextAlignCenter: document.getElementById("btn-text-align-center"),
    btnTextAlignRight: document.getElementById("btn-text-align-right"),
    btnTextValignTop: document.getElementById("btn-text-valign-top"),
    btnTextValignMiddle: document.getElementById("btn-text-valign-middle"),
    btnTextValignBottom: document.getElementById("btn-text-valign-bottom"),
    btnPinToolbar: document.getElementById("btn-pin-toolbar"),
    btnFormatPainter: document.getElementById("btn-format-painter"),
    btnTextColorPicker: document.getElementById("btn-text-color-picker"),
    textColorBar: document.getElementById("text-color-bar"),
    btnScaleDownAll: document.getElementById("btn-scale-down-all"),
    btnScaleUpAll: document.getElementById("btn-scale-up-all"),
    btnEqualizeSize: document.getElementById("btn-equalize-size"),
    btnFillColorPicker: document.getElementById("btn-fill-color-picker"),
    fillColorBar: document.getElementById("fill-color-bar"),
    btnStrokeColorPicker: document.getElementById("btn-stroke-color-picker"),
    strokeColorBar: document.getElementById("stroke-color-bar"),
    propNodeStrokeWidth: document.getElementById("prop-node-stroke-width"),
    propNodeStrokeDash: document.getElementById("prop-node-stroke-dash"),
    btnAlignMenu: document.getElementById("btn-align-menu"),
    menuAlignDropdown: document.getElementById("menu-align-dropdown"),
    wordColorPickerPopover: document.getElementById("word-color-picker-popover"),
    wordThemeColorsGrid: document.getElementById("word-theme-colors-grid"),
    wordStandardColorsRow: document.getElementById("word-standard-colors-row"),
    btnWordColorAuto: document.getElementById("btn-word-color-auto"),
    btnWordColorNone: document.getElementById("btn-word-color-none"),
    wordColorAutoBox: document.getElementById("word-color-auto-box"),
    wordColorAutoText: document.getElementById("word-color-auto-text"),
    btnWordMoreColors: document.getElementById("btn-word-more-colors"),
    wordHiddenNativeColor: document.getElementById("word-hidden-native-color"),
    selectWorkspace: document.getElementById("select-workspace-preset"),
    btnToggleOrientation: document.getElementById("btn-toggle-orientation"),
    wsBoundaryRect: document.getElementById("workspace-boundary-rect"),
    wsBoundaryLabel: document.getElementById("workspace-boundary-label"),
    btnNodeEditText: document.getElementById("btn-node-edit-text"),
    btnNodeRotate: document.getElementById("btn-node-rotate"),
    btnNodeLock: document.getElementById("btn-node-lock"),
    iconLock: document.getElementById("icon-lock"),
    iconUnlock: document.getElementById("icon-unlock"),
    btnLayerDown: document.getElementById("btn-layer-down"),
    btnLayerUp: document.getElementById("btn-layer-up"),
    btnLayerBackmost: document.getElementById("btn-layer-backmost"),
    btnLayerTopmost: document.getElementById("btn-layer-topmost"),
    btnToggleLayersPanel: document.getElementById("btn-toggle-layers-panel"),
    btnAlignCenter: document.getElementById("btn-align-center"),
    btnAlignMiddle: document.getElementById("btn-align-middle"),
    btnToggleLayersBar: document.getElementById("btn-toggle-layers-bar"),
    layersPanel: document.getElementById("layers-panel"),
    btnLayersClose: document.getElementById("btn-layers-close"),
    layersListContainer: document.getElementById("layers-list-container"),
    btnSideLayerDown: document.getElementById("btn-side-layer-down"),
    btnSideLayerUp: document.getElementById("btn-side-layer-up"),
    btnSideLayerBackmost: document.getElementById("btn-side-layer-backmost"),
    btnSideLayerTopmost: document.getElementById("btn-side-layer-topmost"),
    nodeBarTitle: document.getElementById("node-bar-title"),
    btnTextBold: document.getElementById("btn-text-bold"),
    btnTextItalic: document.getElementById("btn-text-italic"),
    btnTextUnderline: document.getElementById("btn-text-underline"),
    btnProjectsMenu: document.getElementById("btn-projects-menu"),
    btnOpenGuide: document.getElementById("btn-open-guide-modal"),
    guideModalBackdrop: document.getElementById("guide-modal-backdrop"),
    guideModal: document.getElementById("guide-modal"),
    btnCloseGuideModal: document.getElementById("btn-close-guide-modal"),
    btnCloseGuideFooter: document.getElementById("btn-close-guide-footer"),
    projectsModalBackdrop: document.getElementById("projects-modal-backdrop"),
    projectsModal: document.getElementById("projects-modal"),
    btnCloseProjectsModal: document.getElementById("btn-close-projects-modal"),
    btnCreateNewProject: document.getElementById("btn-create-new-project"),
    inputNewProjectName: document.getElementById("input-new-project-name"),
    btnResetDemoWorkflow: document.getElementById("btn-reset-demo-workflow"),
    projectsCountLabel: document.getElementById("projects-count-label"),
    projectsListContainer: document.getElementById("projects-list-container"),
    btnOpenJson: document.getElementById("btn-open-json"),
    jsonModalBackdrop: document.getElementById("json-import-modal-backdrop"),
    jsonModal: document.getElementById("json-import-modal"),
    btnCloseJsonModal: document.getElementById("btn-close-json-modal"),
    btnCancelJsonModal: document.getElementById("btn-cancel-json-modal"),
    inputJsonRaw: document.getElementById("input-json-raw"),
    jsonEditorBox: document.getElementById("json-editor-container"),
    jsonDropOverlay: document.getElementById("json-dropzone-overlay"),
    fileInputJsonModal: document.getElementById("file-input-json-modal"),
    btnBrowseJsonFile: document.getElementById("btn-browse-json-file"),
    btnFormatJson: document.getElementById("btn-format-json"),
    btnClearJson: document.getElementById("btn-clear-json"),
    btnApplyJsonReplace: document.getElementById("btn-apply-json-replace"),
    btnApplyJsonMerge: document.getElementById("btn-apply-json-merge"),
    jsonImportStatus: document.getElementById("json-import-status"),
    tabBtnCode: document.getElementById("tab-btn-code"),
    tabBtnVision: document.getElementById("tab-btn-vision"),
    viewTabCode: document.getElementById("view-tab-code"),
    viewTabVision: document.getElementById("view-tab-vision"),
    inputGeminiApiKey: document.getElementById("input-gemini-api-key"),
    btnSaveGeminiKey: document.getElementById("btn-save-gemini-key"),
    btnToggleKeyVisibility: document.getElementById("btn-toggle-key-visibility"),
    geminiKeyStatus: document.getElementById("gemini-key-status"),
    fileInputVision: document.getElementById("file-input-vision"),
    visionDropzoneBox: document.getElementById("vision-dropzone-box"),
    visionDropzoneEmpty: document.getElementById("vision-dropzone-empty"),
    visionDropzonePreview: document.getElementById("vision-dropzone-preview"),
    visionPreviewImg: document.getElementById("vision-preview-img"),
    visionFileInfo: document.getElementById("vision-file-info"),
    btnBrowseVisionImg: document.getElementById("btn-browse-vision-img"),
    btnChangeVisionImg: document.getElementById("btn-change-vision-img"),
    visionStatusBanner: document.getElementById("vision-status-banner"),
    btnRunVisionScan: document.getElementById("btn-run-vision-scan"),
    detailsGeminiConfig: document.getElementById("details-gemini-config"),
    visionStatusDot: document.getElementById("vision-status-dot"),
    visionStatusSummary: document.getElementById("vision-status-summary"),
    // Export Image Modal Elements
    exportModalBackdrop: document.getElementById("export-image-modal-backdrop"),
    exportModal: document.getElementById("export-image-modal"),
    btnCloseExportModal: document.getElementById("btn-close-export-modal"),
    btnCancelExportModal: document.getElementById("btn-cancel-export-modal"),
    btnDoDownloadImage: document.getElementById("btn-do-download-image"),
    exportDimPreview: document.getElementById("export-dim-preview"),
    exportAspectPreview: document.getElementById("export-aspect-preview"),
    exportSizeEstimate: document.getElementById("export-size-estimate"),
    exportScaleBadge: document.getElementById("export-scale-badge")
  };

  // Managers
  const projectManager = Projects.create();
  const historyManager = History.create(40);

  // Application State
  const activeProj = projectManager.getActiveProject();
  const AppState = {
    document: activeProj ? JSON.parse(JSON.stringify(activeProj.document)) : Projects.getDefaultDocument(),
    ui: {
      mode: "IDLE",
      selectedType: null,
      selectedId: null,
      selectedNodeIds: new Set(),
      activePin: null,
      draftWire: null,
      pendingPinSource: null,
      dragStartPos: { x: 0, y: 0 },
      nodeInitialPos: { x: 0, y: 0 },
      nodesInitialPos: {},
      boxSelectStart: { x: 0, y: 0 },
      boxInitialSelected: null,
      handleInitialOffset: { dx: 0, dy: 0 },
      resizeStart: { x: 0, y: 0, w: 0, h: 0, nx: 0, ny: 0, corner: 'se', nodeId: null },
      clipboardNode: null,
      contextMenuPos: { x: 0, y: 0, targetType: null, targetId: null },
      lastClickTime: 0,
      lastClickNodeId: null,
      hasMovedNode: false,
      isSpacePressed: false,
      isToolbarPinned: false,
      formatPainter: {
        active: false,
        mode: "single",
        style: null
      }
    }
  };

  function showToast(msg) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.classList.add("show");
    clearTimeout(dom.toast._timer);
    dom.toast._timer = setTimeout(() => dom.toast.classList.remove("show"), 2200);
  }

  function saveSnapshot() {
    historyManager.saveSnapshot(AppState.document, () => {
      projectManager.autoSaveCurrent(AppState.document);
    });
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    if (dom.btnUndo) dom.btnUndo.disabled = !historyManager.canUndo();
    if (dom.btnRedo) dom.btnRedo.disabled = !historyManager.canRedo();
  }

  function handleUndo() {
    const previous = historyManager.undo(AppState.document);
    if (previous) {
      // Pertahankan posisi kamera (zoom & pan) aktif user saat ini agar viewport tidak melompat
      const currentPan = { ...AppState.document.canvas.pan };
      const currentZoom = AppState.document.canvas.zoom;
      AppState.document = previous;
      AppState.document.canvas.pan = currentPan;
      AppState.document.canvas.zoom = currentZoom;

      cancelTapConnect();
      deselectAll();
      applyTheme(AppState.document.theme || "light");
      updateWorkspaceUI();
      updateViewportUI();
      updateHistoryButtons();
      projectManager.autoSaveCurrent(AppState.document);
      renderAll();
      showToast("Undo");
    }
  }

  function handleRedo() {
    const next = historyManager.redo(AppState.document);
    if (next) {
      // Pertahankan posisi kamera (zoom & pan) aktif user saat ini agar viewport tidak melompat
      const currentPan = { ...AppState.document.canvas.pan };
      const currentZoom = AppState.document.canvas.zoom;
      AppState.document = next;
      AppState.document.canvas.pan = currentPan;
      AppState.document.canvas.zoom = currentZoom;

      cancelTapConnect();
      deselectAll();
      applyTheme(AppState.document.theme || "light");
      updateWorkspaceUI();
      updateViewportUI();
      updateHistoryButtons();
      projectManager.autoSaveCurrent(AppState.document);
      renderAll();
      showToast("Redo");
    }
  }

  function applyTheme(theme) {
    AppState.document.theme = theme;
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
      if (dom.iconMoon) dom.iconMoon.style.display = "none";
      if (dom.iconSun) dom.iconSun.style.display = "block";
      if (dom.arrowEndPath) dom.arrowEndPath.setAttribute("fill", "#f4f4f5");
      if (dom.arrowStartPath) dom.arrowStartPath.setAttribute("fill", "#f4f4f5");
    } else {
      document.body.classList.remove("dark-mode");
      if (dom.iconMoon) dom.iconMoon.style.display = "block";
      if (dom.iconSun) dom.iconSun.style.display = "none";
      if (dom.arrowEndPath) dom.arrowEndPath.setAttribute("fill", "#18181b");
      if (dom.arrowStartPath) dom.arrowStartPath.setAttribute("fill", "#18181b");
    }
    localStorage.setItem("minimalflow_theme", theme);
    renderAll();
  }

  function updateWorkspaceUI() {
    const ws = AppState.document.canvas.workspace;
    Canvas.updateWorkspaceBoundary(dom.wsBoundaryRect, dom.wsBoundaryLabel, ws);
    if (dom.selectWorkspace) {
      dom.selectWorkspace.value = ws.preset || "16:9_landscape";
    }
    const btnLabel = document.getElementById("label-orientation-text");
    if (btnLabel) {
      btnLabel.textContent = ws.width >= ws.height ? "Landscape" : "Portrait";
    }
  }

  function updateViewportUI() {
    Canvas.updateViewportTransform(dom.viewport, dom.gridPattern, dom.zoomText, AppState.document.canvas);
  }

  function renderAll() {
    if (AppState.document && AppState.document.nodes) {
      const TextEditor = window.MinimalFlow && window.MinimalFlow.TextEditor;
      if (TextEditor && typeof TextEditor.sanitizeHtmlFormatting === "function") {
        Object.values(AppState.document.nodes).forEach(n => {
          if (n && n.text && n.text.content && (n.text.content.includes("<span") || n.text.content.includes("&amp;"))) {
            n.text.content = TextEditor.sanitizeHtmlFormatting(n.text.content.replace(/&amp;/g, "&"));
          }
        });
      }
    }
    FlowEngine.renderNodes(dom.layerNodes, AppState.document, AppState.ui, (nodeId) => {
      selectSingleNode(nodeId, false);
      openInlineEditor(nodeId);
    });
    FlowEngine.renderEdges(dom.layerEdges, AppState.document, AppState.ui);
    FlowEngine.renderOverlays(dom.overlaySelection, AppState.document, AppState.ui);
    updatePropertiesBar();
    updateLayerPanel();
  }

  function updateSelectionVisuals() {
    const selectedIds = AppState.ui.selectedNodeIds;
    const isNodeSelected = AppState.ui.selectedType === "node";
    
    // Update .selected class on nodes without recreating SVG DOM elements
    if (dom.layerNodes) {
      dom.layerNodes.querySelectorAll(".node-group").forEach(el => {
        const id = el.dataset.id;
        el.classList.toggle("selected", isNodeSelected && selectedIds.has(id));
      });
    }

    // Update .selected class on edges
    if (dom.layerEdges) {
      dom.layerEdges.querySelectorAll(".edge-group").forEach(el => {
        const id = el.dataset.id;
        el.classList.toggle("selected", AppState.ui.selectedType === "edge" && AppState.ui.selectedId === id);
      });
    }

    // Render resize handles and group indicators
    FlowEngine.renderOverlays(dom.overlaySelection, AppState.document, AppState.ui);
    updatePropertiesBar();
    updateLayerPanel();
  }

  function selectSingleNode(id, andGroup = true) {
    AppState.ui.selectedType = "node";
    AppState.ui.selectedId = id;
    AppState.ui.selectedNodeIds.clear();

    const node = AppState.document.nodes[id];
    if (node && node.groupId && andGroup) {
      Object.values(AppState.document.nodes).forEach(n => {
        if (n.groupId === node.groupId) {
          AppState.ui.selectedNodeIds.add(n.id);
        }
      });
    } else {
      AppState.ui.selectedNodeIds.add(id);
    }
    updateSelectionVisuals();
  }

  function toggleNodeSelection(id) {
    if (AppState.ui.selectedType !== "node") {
      AppState.ui.selectedType = "node";
      AppState.ui.selectedNodeIds.clear();
    }

    const node = AppState.document.nodes[id];
    const targetIds = (node && node.groupId)
      ? Object.values(AppState.document.nodes).filter(n => n.groupId === node.groupId).map(n => n.id)
      : [id];

    const allIn = targetIds.every(tid => AppState.ui.selectedNodeIds.has(tid));
    if (allIn) {
      targetIds.forEach(tid => AppState.ui.selectedNodeIds.delete(tid));
    } else {
      targetIds.forEach(tid => AppState.ui.selectedNodeIds.add(tid));
    }

    if (AppState.ui.selectedNodeIds.size === 0) {
      deselectAll();
    } else {
      AppState.ui.selectedType = "node";
      AppState.ui.selectedId = Array.from(AppState.ui.selectedNodeIds)[0];
      updateSelectionVisuals();
    }
  }

  function selectAllNodes() {
    const nodeIds = Object.keys(AppState.document.nodes);
    if (nodeIds.length === 0) return;
    AppState.ui.selectedType = "node";
    AppState.ui.selectedId = nodeIds[0];
    AppState.ui.selectedNodeIds.clear();
    nodeIds.forEach(id => AppState.ui.selectedNodeIds.add(id));
    updateSelectionVisuals();
    showToast(`Semua chart dipilih (${nodeIds.length})`);
  }

  function groupSelectedNodes() {
    const ids = Array.from(AppState.ui.selectedNodeIds);
    if (ids.length < 2) {
      showToast("Pilih minimal 2 chart untuk digabung (Shift + klik / drag)");
      return;
    }
    saveSnapshot();
    const newGroupId = "group_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    ids.forEach(id => {
      const node = AppState.document.nodes[id];
      if (node) node.groupId = newGroupId;
    });
    updateSelectionVisuals();
    showToast(`${ids.length} chart berhasil digabung (Ctrl + G)`);
  }

  function ungroupSelectedNodes() {
    const ids = Array.from(AppState.ui.selectedNodeIds);
    if (ids.length === 0) return;
    saveSnapshot();
    let count = 0;
    ids.forEach(id => {
      const node = AppState.document.nodes[id];
      if (node && node.groupId) {
        node.groupId = null;
        count++;
      }
    });
    updateSelectionVisuals();
    if (count > 0) {
      showToast("Grup chart berhasil dipisah (Ctrl + Shift + G)");
    } else {
      showToast("Chart yang dipilih bukan bagian dari grup");
    }
  }

  function selectItem(type, id) {
    if (type === "node") {
      selectSingleNode(id, true);
    } else if (type === "edge") {
      AppState.ui.selectedType = "edge";
      AppState.ui.selectedId = id;
      AppState.ui.selectedNodeIds.clear();
      updateSelectionVisuals();
    } else {
      deselectAll();
    }
  }

  function deselectAll() {
    AppState.ui.selectedType = null;
    AppState.ui.selectedId = null;
    AppState.ui.selectedNodeIds.clear();
    closeContextMenu();
    updateSelectionVisuals();
  }

  function updatePropertiesBar() {
    if (AppState.ui.selectedType === "node" && (AppState.ui.selectedId || (AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0))) {
      const primaryId = AppState.ui.selectedId || Array.from(AppState.ui.selectedNodeIds)[0];
      const node = AppState.document.nodes[primaryId];
      if (node) {
        dom.nodeBar.classList.add("show");
        dom.edgeBar.classList.remove("show");

        const selectedCount = AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 1 ? AppState.ui.selectedNodeIds.size : 1;
        const allLocked = selectedCount > 1
          ? Array.from(AppState.ui.selectedNodeIds).every(id => AppState.document.nodes[id]?.locked)
          : !!node.locked;
        dom.nodeBarTitle.textContent = selectedCount > 1 
          ? (allLocked ? `${selectedCount} Chart (Terkunci)` : `${selectedCount} Chart`)
          : (node.locked ? "Node (Terkunci)" : "Node");

        if (node.text) {
          document.getElementById("prop-font-family").value = node.text.fontFamily;
          if (dom.propFontSizeNum) dom.propFontSizeNum.value = node.text.fontSize;
          if (dom.propFontSize) {
            dom.propFontSize.value = String(node.text.fontSize);
            if (!dom.propFontSize.value) {
              const opt = document.createElement("option");
              opt.value = String(node.text.fontSize);
              opt.textContent = `${node.text.fontSize} px`;
              dom.propFontSize.appendChild(opt);
              dom.propFontSize.value = String(node.text.fontSize);
            }
          }

          const align = node.text.align || "center";
          if (dom.btnTextAlignLeft) dom.btnTextAlignLeft.classList.toggle("active", align === "left");
          if (dom.btnTextAlignCenter) dom.btnTextAlignCenter.classList.toggle("active", align === "center");
          if (dom.btnTextAlignRight) dom.btnTextAlignRight.classList.toggle("active", align === "right");

          const valign = node.text.verticalAlign || "middle";
          if (dom.btnTextValignTop) dom.btnTextValignTop.classList.toggle("active", valign === "top");
          if (dom.btnTextValignMiddle) dom.btnTextValignMiddle.classList.toggle("active", valign === "middle");
          if (dom.btnTextValignBottom) dom.btnTextValignBottom.classList.toggle("active", valign === "bottom");

          if (dom.textColorBar) {
            dom.textColorBar.style.background = node.text.color || (AppState.document.theme === "dark" ? "#fafafa" : "#18181b");
          }

          const padXVal = node.text.paddingX !== undefined ? node.text.paddingX : 14;
          if (dom.propPaddingXNum) dom.propPaddingXNum.value = padXVal;
          if (dom.propPaddingX) {
            dom.propPaddingX.value = String(padXVal);
            if (!dom.propPaddingX.value) {
              const opt = document.createElement("option");
              opt.value = String(padXVal);
              opt.textContent = `${padXVal} px`;
              dom.propPaddingX.appendChild(opt);
              dom.propPaddingX.value = String(padXVal);
            }
          }

          dom.btnTextBold.classList.toggle("active", !!node.text.bold);
          dom.btnTextItalic.classList.toggle("active", !!node.text.italic);
          dom.btnTextUnderline.classList.toggle("active", !!node.text.underline);
        }

        dom.propNodeW.value = node.width;
        dom.propNodeH.value = node.height;

        if (dom.fillColorBar) {
          dom.fillColorBar.style.background = node.style.fill || "#ffffff";
        }
        if (dom.strokeColorBar) {
          dom.strokeColorBar.style.background = node.style.stroke || (AppState.document.theme === "dark" ? "#f4f4f5" : "#18181b");
        }

        if (dom.propNodeStrokeWidth) {
          const sw = (node.style && node.style.strokeWidth !== undefined) ? String(node.style.strokeWidth) : "1.5";
          dom.propNodeStrokeWidth.value = sw;
          if (!dom.propNodeStrokeWidth.value) {
            const opt = document.createElement("option");
            opt.value = sw;
            opt.textContent = `${sw} px`;
            dom.propNodeStrokeWidth.appendChild(opt);
            dom.propNodeStrokeWidth.value = sw;
          }
        }

        if (dom.propNodeStrokeDash) {
          dom.propNodeStrokeDash.value = (node.style && node.style.dashed) || "solid";
        }

        if (dom.btnPinToolbar) {
          dom.btnPinToolbar.classList.toggle("pinned", !!AppState.ui.isToolbarPinned);
          dom.btnPinToolbar.classList.toggle("active", !!AppState.ui.isToolbarPinned);
        }

        if (dom.btnFormatPainter) {
          dom.btnFormatPainter.classList.toggle("active", !!AppState.ui.formatPainter?.active);
          dom.btnFormatPainter.classList.toggle("persistent", AppState.ui.formatPainter?.mode === "persistent");
        }

        if (dom.btnAlignMenu) {
          const isMulti = AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size >= 2;
          dom.btnAlignMenu.style.opacity = isMulti ? "1" : "0.75";
        }

        if (allLocked) {
          dom.iconLock.style.display = "block";
          dom.iconUnlock.style.display = "none";
          dom.btnNodeLock.setAttribute("title", selectedCount > 1 ? "Buka Kunci Seluruh Chart (Ctrl + L)" : "Buka Kunci Posisi (Ctrl + L)");
        } else {
          dom.iconLock.style.display = "none";
          dom.iconUnlock.style.display = "block";
          dom.btnNodeLock.setAttribute("title", selectedCount > 1 ? "Kunci Seluruh Chart (Ctrl + L)" : "Kunci Posisi Chart (Ctrl + L)");
        }

        let matched = false;
        document.querySelectorAll(".color-swatch").forEach(swatch => {
          const isMatch = swatch.dataset.color === node.style.fill;
          swatch.classList.toggle("active", isMatch);
          if (isMatch) matched = true;
        });

        if (!matched && node.style.fill && node.style.fill.startsWith("#") && dom.propCustomColor) {
          dom.propCustomColor.value = node.style.fill;
        }
        return;
      }
    }

    if (AppState.ui.selectedType === "edge" && AppState.ui.selectedId) {
      const edge = AppState.document.edges[AppState.ui.selectedId];
      if (edge) {
        dom.edgeBar.classList.add("show");
        dom.nodeBar.classList.remove("show");

        document.getElementById("prop-edge-type").value = edge.type;
        const markerVal = edge.style.markerStart === "arrow" && edge.style.markerEnd === "arrow" ? "both" :
                          edge.style.markerEnd === "arrow" ? "end" : "none";
        document.getElementById("prop-edge-marker").value = markerVal;
        
        const wVal = String(edge.style.strokeWidth !== undefined ? edge.style.strokeWidth : 1.5);
        document.getElementById("prop-edge-width").value = wVal;
        document.getElementById("prop-edge-dash").value = edge.style.dashed || "solid";
        return;
      }
    }

    if (AppState.ui.isToolbarPinned) {
      dom.nodeBar.classList.add("show");
    } else {
      dom.nodeBar.classList.remove("show");
    }
    dom.edgeBar.classList.remove("show");
  }

  // Tap-to-Connect Workflow
  function startTapConnect(nodeId, pin) {
    const node = AppState.document.nodes[nodeId];
    const coord = FlowEngine.getNodePinCoordinates(node, pin);
    AppState.ui.pendingPinSource = { nodeId, pin, x: coord.x, y: coord.y };
    document.body.classList.add("is-tap-connecting");
    dom.tapBanner.classList.add("show");
    renderAll();
    showToast("Pilih pin tujuan untuk menyambungkan");
  }

  function finishTapConnect(targetNodeId, targetPin) {
    const src = AppState.ui.pendingPinSource;
    if (!src) return;

    if (src.nodeId === targetNodeId && src.pin === targetPin) {
      cancelTapConnect();
      return;
    }

    saveSnapshot();
    const isDark = AppState.document.theme === "dark";
    const newEdge = FlowEngine.createEdgeData(src.nodeId, src.pin, targetNodeId, targetPin, isDark);
    AppState.document.edges[newEdge.id] = newEdge;

    cancelTapConnect();
    selectItem("edge", newEdge.id);
    showToast("Koneksi berhasil disambungkan!");
  }

  function cancelTapConnect() {
    AppState.ui.pendingPinSource = null;
    document.body.classList.remove("is-tap-connecting");
    dom.tapBanner.classList.remove("show");
    renderAll();
  }

  dom.btnCancelTap.addEventListener("click", cancelTapConnect);

  // Live Inline Text Editor
  function openInlineEditor(nodeId) {
    closeContextMenu();
    TextEditor.open(nodeId, AppState.document, AppState.ui, dom, () => {
      saveSnapshot();
      renderAll();
    }, () => {
      // Re-render edges and overlays when node expands dynamically while typing.
      // Strictly avoid calling renderNodes because that wipes out the active editor!
      FlowEngine.renderEdges(dom.layerEdges, AppState.document, AppState.ui);
      FlowEngine.renderOverlays(dom.overlaySelection, AppState.document, AppState.ui);
    });
  }

  // Node Actions
  function addNode(type, worldX, worldY, extra = {}) {
    saveSnapshot();
    const isDark = AppState.document.theme === "dark";
    const newNode = FlowEngine.createNodeData(type, worldX, worldY, isDark, extra);
    newNode.zIndex = Object.keys(AppState.document.nodes).length;
    AppState.document.nodes[newNode.id] = newNode;
    selectSingleNode(newNode.id, true);
    renderAll();
    showToast(type === "image" ? "Gambar berhasil ditambahkan" : "Chart berhasil ditambahkan");
  }

  function handleImageFile(file, worldX, worldY) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      addNode("image", worldX, worldY, { src: e.target.result });
    };
    reader.readAsDataURL(file);
  }

  function duplicateNode(nodeId) {
    const original = AppState.document.nodes[nodeId];
    if (!original) return;
    saveSnapshot();
    const newId = "node_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = newId;
    copy.x += 30;
    copy.y += 30;
    copy.locked = false;
    AppState.document.nodes[newId] = copy;
    selectSingleNode(newId, false);
    renderAll();
    showToast("Chart diduplikat");
  }

  function duplicateSelectedNodes() {
    const ids = AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0
      ? Array.from(AppState.ui.selectedNodeIds)
      : (AppState.ui.selectedId ? [AppState.ui.selectedId] : []);
    if (ids.length === 0) return;
    saveSnapshot();
    const newSelectedIds = new Set();
    ids.forEach(id => {
      const original = AppState.document.nodes[id];
      if (original) {
        const newId = "node_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        const copy = JSON.parse(JSON.stringify(original));
        copy.id = newId;
        copy.x += 30;
        copy.y += 30;
        copy.locked = false;
        AppState.document.nodes[newId] = copy;
        newSelectedIds.add(newId);
      }
    });
    AppState.ui.selectedType = "node";
    AppState.ui.selectedId = Array.from(newSelectedIds)[0];
    AppState.ui.selectedNodeIds = newSelectedIds;
    renderAll();
    showToast(`${ids.length} chart diduplikat`);
  }

  // Salin node terpilih (mendukung single & multiple nodes)
  function copySelectedNodes(explicitId = null) {
    let ids = [];
    if (explicitId) {
      ids = [explicitId];
    } else if (AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0) {
      ids = Array.from(AppState.ui.selectedNodeIds);
    } else if (AppState.ui.selectedType === "node" && AppState.ui.selectedId) {
      ids = [AppState.ui.selectedId];
    }

    if (ids.length === 0) {
      showToast("Pilih chart terlebih dahulu untuk disalin");
      return;
    }

    const copiedNodes = [];
    const copiedIdsSet = new Set(ids);
    ids.forEach(id => {
      const node = AppState.document.nodes[id];
      if (node) {
        copiedNodes.push(JSON.parse(JSON.stringify(node)));
      }
    });

    // Salin juga kabel penghubung internal jika kedua node kabel ada di dalam seleksi
    const copiedEdges = [];
    Object.values(AppState.document.edges).forEach(edge => {
      if (copiedIdsSet.has(edge.source?.nodeId) && copiedIdsSet.has(edge.target?.nodeId)) {
        copiedEdges.push(JSON.parse(JSON.stringify(edge)));
      }
    });

    AppState.ui.clipboardData = {
      nodes: copiedNodes,
      edges: copiedEdges
    };
    AppState.ui.clipboardNode = copiedNodes[0] || null;
    AppState.ui.pasteStaggerIndex = 0;

    showToast(copiedNodes.length > 1 ? `${copiedNodes.length} chart disalin (Ctrl+C)` : "Chart disalin (Ctrl+C)");
  }

  function pasteClipboardNode() {
    const clip = AppState.ui.clipboardData;
    const single = AppState.ui.clipboardNode;
    const nodesToPaste = (clip && clip.nodes && clip.nodes.length > 0)
      ? clip.nodes
      : (single ? [single] : []);

    if (nodesToPaste.length === 0) {
      showToast("Tidak ada chart yang disalin");
      return;
    }

    saveSnapshot();

    // 1. Dapatkan koordinat tengah kanvas visual yang SEDANG DILIHAT oleh user
    const svgRect = dom.svg.getBoundingClientRect();
    const visualCenterScreenX = svgRect.left + (svgRect.width / 2);
    const visualCenterScreenY = svgRect.top + (svgRect.height / 2);
    const visualCenterWorld = Canvas.screenToWorld(
      visualCenterScreenX,
      visualCenterScreenY,
      dom.svg,
      AppState.document.canvas
    );

    // 2. Hitung titik tengah bounding box dari kumpulan node yang disalin
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodesToPaste.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const bboxCenterWorldX = (minX + maxX) / 2;
    const bboxCenterWorldY = (minY + maxY) / 2;

    // 3. Stagger offset progresif (+20px) jika paste ditekan berulang kali
    const stagger = (AppState.ui.pasteStaggerIndex || 0) * 20;
    AppState.ui.pasteStaggerIndex = ((AppState.ui.pasteStaggerIndex || 0) + 1) % 10;

    const deltaX = Math.round((visualCenterWorld.x - bboxCenterWorldX) + stagger);
    const deltaY = Math.round((visualCenterWorld.y - bboxCenterWorldY) + stagger);

    // 4. Buat node baru dengan ID unik dan posisikan di tengah kanvas visual
    const idMap = {};
    const newSelectedIds = new Set();
    let firstNewId = null;

    nodesToPaste.forEach(n => {
      const newId = "node_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      idMap[n.id] = newId;
      const copy = JSON.parse(JSON.stringify(n));
      copy.id = newId;
      copy.x = Math.round(n.x + deltaX);
      copy.y = Math.round(n.y + deltaY);
      copy.locked = false;
      if (copy.groupId) {
        copy.groupId = "group_copy_" + Date.now().toString(36);
      }
      AppState.document.nodes[newId] = copy;
      newSelectedIds.add(newId);
      if (!firstNewId) firstNewId = newId;
    });

    // 5. Duplikasi koneksi internal antar node yang disalin
    if (clip && clip.edges && clip.edges.length > 0) {
      clip.edges.forEach(e => {
        const newSrcId = idMap[e.source?.nodeId];
        const newTgtId = idMap[e.target?.nodeId];
        if (newSrcId && newTgtId) {
          const newEdgeId = "edge_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
          const copyEdge = JSON.parse(JSON.stringify(e));
          copyEdge.id = newEdgeId;
          copyEdge.source.nodeId = newSrcId;
          copyEdge.target.nodeId = newTgtId;
          AppState.document.edges[newEdgeId] = copyEdge;
        }
      });
    }

    AppState.ui.selectedType = "node";
    AppState.ui.selectedId = firstNewId;
    AppState.ui.selectedNodeIds = newSelectedIds;
    renderAll();
    showToast(nodesToPaste.length > 1 ? `${nodesToPaste.length} chart ditempel di tengah kanvas` : "Chart ditempel di tengah kanvas (Ctrl+V)");
  }

  // ========================================================================
  // FORMAT PAINTER (SALIN & TEMPEL GAYA ALA CANVA & WORD)
  // ========================================================================
  function copyNodeStyle(explicitId = null) {
    let id = explicitId;
    if (!id && AppState.ui.selectedType === "node" && AppState.ui.selectedId) {
      id = AppState.ui.selectedId;
    } else if (!id && AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0) {
      id = Array.from(AppState.ui.selectedNodeIds)[0];
    }

    if (!id) return null;
    const node = AppState.document.nodes[id];
    if (!node) return null;

    const styleData = {
      style: {
        fill: node.style ? node.style.fill : "#ffffff",
        stroke: node.style ? node.style.stroke : "#18181b",
        strokeWidth: node.style ? (node.style.strokeWidth || 1.5) : 1.5,
        dashed: node.style ? (node.style.dashed || "solid") : "solid"
      },
      text: node.text ? {
        fontFamily: node.text.fontFamily || "Poppins, sans-serif",
        fontSize: node.text.fontSize || 14,
        bold: !!node.text.bold,
        italic: !!node.text.italic,
        underline: !!node.text.underline,
        color: node.text.color || (AppState.document.theme === "dark" ? "#f4f4f5" : "#18181b"),
        align: node.text.align || "center",
        verticalAlign: node.text.verticalAlign || "middle",
        paddingX: node.text.paddingX !== undefined ? node.text.paddingX : 14,
        paddingY: node.text.paddingY !== undefined ? node.text.paddingY : 10
      } : null
    };

    AppState.ui.formatPainter.style = styleData;
    return styleData;
  }

  function applyNodeStyle(targetNodeId, styleData) {
    if (!styleData || !targetNodeId) return false;
    const targetNode = AppState.document.nodes[targetNodeId];
    if (!targetNode || targetNode.locked) return false;

    // Terapkan gaya visual wadah (fill, stroke, strokeWidth, dashed)
    if (styleData.style) {
      targetNode.style = targetNode.style || {};
      if (styleData.style.fill !== undefined) targetNode.style.fill = styleData.style.fill;
      if (styleData.style.stroke !== undefined) targetNode.style.stroke = styleData.style.stroke;
      if (styleData.style.strokeWidth !== undefined) targetNode.style.strokeWidth = styleData.style.strokeWidth;
      if (styleData.style.dashed !== undefined) targetNode.style.dashed = styleData.style.dashed;
    }

    // Terapkan tipografi & tata letak teks tanpa merusak teks konten aslinya
    if (styleData.text && targetNode.text) {
      targetNode.text.fontFamily = styleData.text.fontFamily;
      targetNode.text.fontSize = styleData.text.fontSize;
      targetNode.text.bold = styleData.text.bold;
      targetNode.text.italic = styleData.text.italic;
      targetNode.text.underline = styleData.text.underline;
      targetNode.text.color = styleData.text.color;
      targetNode.text.align = styleData.text.align;
      targetNode.text.verticalAlign = styleData.text.verticalAlign;
      targetNode.text.paddingX = styleData.text.paddingX;
      targetNode.text.paddingY = styleData.text.paddingY;
    }

    return true;
  }

  function activateFormatPainter(mode = "single") {
    AppState.ui.formatPainter.active = true;
    AppState.ui.formatPainter.mode = mode;

    if (dom.btnFormatPainter) {
      dom.btnFormatPainter.classList.add("active");
      dom.btnFormatPainter.classList.toggle("persistent", mode === "persistent");
    }
    if (dom.container) {
      dom.container.classList.add("format-painter-active");
    }
  }

  function deactivateFormatPainter() {
    AppState.ui.formatPainter.active = false;
    AppState.ui.formatPainter.mode = "single";

    if (dom.btnFormatPainter) {
      dom.btnFormatPainter.classList.remove("active", "persistent");
    }
    if (dom.container) {
      dom.container.classList.remove("format-painter-active");
    }
  }

  function pasteStyleToSelectedNodes() {
    if (!AppState.ui.formatPainter.style) {
      showToast("Salin gaya chart terlebih dahulu (Ctrl+Alt+C atau klik ikon kuas)");
      return;
    }
    let targetIds = [];
    if (AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0) {
      targetIds = Array.from(AppState.ui.selectedNodeIds);
    } else if (AppState.ui.selectedType === "node" && AppState.ui.selectedId) {
      targetIds = [AppState.ui.selectedId];
    }

    if (targetIds.length === 0) {
      showToast("Pilih chart tujuan untuk menerapkan gaya");
      return;
    }

    saveSnapshot();
    let appliedCount = 0;
    targetIds.forEach(id => {
      if (applyNodeStyle(id, AppState.ui.formatPainter.style)) {
        appliedCount++;
      }
    });

    if (appliedCount > 0) {
      renderAll();
      updatePropertiesBar();
      showToast(appliedCount > 1 ? `Gaya diterapkan ke ${appliedCount} chart` : "Gaya diterapkan ke chart");
    }
  }

  function toggleNodeLock(nodeId) {
    const node = AppState.document.nodes[nodeId];
    if (node) {
      saveSnapshot();
      node.locked = !node.locked;
      renderAll();
      showToast(node.locked ? "Posisi chart dikunci (Ctrl + L)" : "Kunci posisi dibuka (Ctrl + L)");
    }
  }

  function lockSelectedNodes(isLock = null) {
    let ids = [];
    if (AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0) {
      ids = Array.from(AppState.ui.selectedNodeIds);
    } else if (AppState.ui.selectedType === "node" && AppState.ui.selectedId) {
      ids = [AppState.ui.selectedId];
    }
    if (ids.length === 0) return;

    // Jika isLock tidak dispesifikasi (null), lakukan toggle cerdas:
    // Jika ada yang belum terkunci -> kunci semua.
    // Jika semua sudah terkunci -> buka kunci semua.
    const targetState = (isLock === null)
      ? ids.some(id => !AppState.document.nodes[id]?.locked)
      : !!isLock;

    saveSnapshot();
    ids.forEach(id => {
      const node = AppState.document.nodes[id];
      if (node) {
        node.locked = targetState;
      }
    });

    renderAll();
    if (targetState) {
      showToast(ids.length > 1 ? `${ids.length} chart dikunci (Ctrl + L)` : "Chart dikunci (Ctrl + L)");
    } else {
      showToast(ids.length > 1 ? `Kunci ${ids.length} chart dibuka (Ctrl + L)` : "Kunci chart dibuka (Ctrl + L)");
    }
  }

  function reorderSelectedNodes(direction) {
    let ids = [];
    if (AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0) {
      ids = Array.from(AppState.ui.selectedNodeIds);
    } else if (AppState.ui.selectedType === "node" && AppState.ui.selectedId) {
      ids = [AppState.ui.selectedId];
    }
    if (ids.length === 0) {
      showToast("Pilih chart terlebih dahulu untuk mengubah urutan layer");
      return;
    }

    const selectedSet = new Set(ids);
    const nodeIds = Object.keys(AppState.document.nodes);
    let newOrder = [...nodeIds];

    if (direction === "topmost") {
      // Paling Atas (Ctrl + Shift + ]): pindahkan node terpilih ke paling akhir
      const unselected = nodeIds.filter(id => !selectedSet.has(id));
      const selected = nodeIds.filter(id => selectedSet.has(id));
      newOrder = [...unselected, ...selected];
    } else if (direction === "backmost") {
      // Paling Bawah (Ctrl + Shift + [): pindahkan node terpilih ke paling awal
      const unselected = nodeIds.filter(id => !selectedSet.has(id));
      const selected = nodeIds.filter(id => selectedSet.has(id));
      newOrder = [...selected, ...unselected];
    } else if (direction === "forward") {
      // Ke Atas (Ctrl + ]): geser 1 tingkat ke atas (indeks lebih tinggi)
      for (let i = newOrder.length - 2; i >= 0; i--) {
        if (selectedSet.has(newOrder[i]) && !selectedSet.has(newOrder[i + 1])) {
          const temp = newOrder[i];
          newOrder[i] = newOrder[i + 1];
          newOrder[i + 1] = temp;
        }
      }
    } else if (direction === "backward") {
      // Ke Bawah (Ctrl + [): geser 1 tingkat ke bawah (indeks lebih rendah)
      for (let i = 1; i < newOrder.length; i++) {
        if (selectedSet.has(newOrder[i]) && !selectedSet.has(newOrder[i - 1])) {
          const temp = newOrder[i];
          newOrder[i] = newOrder[i - 1];
          newOrder[i - 1] = temp;
        }
      }
    }

    const isSame = nodeIds.every((id, idx) => id === newOrder[idx]);
    if (isSame) {
      if (direction === "forward" || direction === "topmost") {
        showToast("Chart sudah berada di posisi paling atas");
      } else {
        showToast("Chart sudah berada di posisi paling bawah");
      }
      return;
    }

    saveSnapshot();
    const newNodes = {};
    newOrder.forEach((id, idx) => {
      const n = AppState.document.nodes[id];
      if (n) {
        n.zIndex = idx;
        newNodes[id] = n;
      }
    });
    AppState.document.nodes = newNodes;

    renderAll();

    const labelMap = {
      forward: "Layer naik 1 tingkat (Ctrl + ])",
      backward: "Layer turun 1 tingkat (Ctrl + [)",
      topmost: "Layer dipindah ke paling atas (Ctrl + Shift + ])",
      backmost: "Layer dipindah ke paling bawah (Ctrl + Shift + [)"
    };
    showToast(labelMap[direction] || "Urutan layer diperbarui");
  }

  function alignSelectedNodesCenter() {
    let ids = [];
    if (AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0) {
      ids = Array.from(AppState.ui.selectedNodeIds);
    } else if (AppState.ui.selectedType === "node" && AppState.ui.selectedId) {
      ids = [AppState.ui.selectedId];
    }

    if (ids.length < 2) {
      showToast("Pilih minimal 2 chart untuk diratakan ke tengah (Shift + klik / drag seleksi)");
      return;
    }

    const unlocked = ids.filter(id => !AppState.document.nodes[id]?.locked);
    if (unlocked.length === 0) {
      showToast("Semua chart yang dipilih dalam keadaan terkunci");
      return;
    }

    saveSnapshot();

    let minX = Infinity;
    let maxX = -Infinity;
    ids.forEach(id => {
      const node = AppState.document.nodes[id];
      if (node) {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x + node.width);
      }
    });

    const commonCenterX = (minX + maxX) / 2;

    ids.forEach(id => {
      const node = AppState.document.nodes[id];
      if (node && !node.locked) {
        node.x = Math.round(commonCenterX - node.width / 2);
      }
    });

    renderAll();
    showToast(`${ids.length} chart diratakan ke tengah (Alt + C)`);
  }

  function alignSelectedNodesMiddle() {
    let ids = [];
    if (AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0) {
      ids = Array.from(AppState.ui.selectedNodeIds);
    } else if (AppState.ui.selectedType === "node" && AppState.ui.selectedId) {
      ids = [AppState.ui.selectedId];
    }

    if (ids.length < 2) {
      showToast("Pilih minimal 2 chart untuk diratakan horizontal");
      return;
    }

    const unlocked = ids.filter(id => !AppState.document.nodes[id]?.locked);
    if (unlocked.length === 0) {
      showToast("Semua chart yang dipilih dalam keadaan terkunci");
      return;
    }

    saveSnapshot();

    let minY = Infinity;
    let maxY = -Infinity;
    ids.forEach(id => {
      const node = AppState.document.nodes[id];
      if (node) {
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y + node.height);
      }
    });

    const commonCenterY = (minY + maxY) / 2;

    ids.forEach(id => {
      const node = AppState.document.nodes[id];
      if (node && !node.locked) {
        node.y = Math.round(commonCenterY - node.height / 2);
      }
    });

    renderAll();
    showToast(`${ids.length} chart diratakan horizontal (Alt + M)`);
  }

  function getShapeDefaultLabel(type) {
    const map = {
      rectangle: "Proses",
      rounded: "Terminator",
      diamond: "Keputusan",
      circle: "Lingkaran",
      parallelogram: "Data I/O",
      cylinder: "Database",
      triangle: "Segitiga",
      image: "Gambar"
    };
    return map[type] || "Chart";
  }

  function getShapeIconSvg(type) {
    switch (type) {
      case "rectangle":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>';
      case "rounded":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="6"/></svg>';
      case "diamond":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 L22 12 L12 22 L2 12 Z"/></svg>';
      case "circle":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>';
      case "cylinder":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6 A8 3 0 0 1 20 6 V18 A8 3 0 0 1 4 18 Z M4 6 A8 3 0 0 0 20 6"/></svg>';
      case "triangle":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 L22 20 L2 20 Z"/></svg>';
      case "image":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      default:
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8 L24 8 L20 20 L0 20 Z"/></svg>';
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function updateLayerPanel() {
    if (!dom.layersListContainer) return;

    const nodes = AppState.document.nodes;
    const nodeIds = Object.keys(nodes);

    if (nodeIds.length === 0) {
      dom.layersListContainer.innerHTML = '<div style="padding:24px 12px; text-align:center; color:var(--text-muted); font-size:11px;">Belum ada chart di kanvas</div>';
      return;
    }

    // Urutkan dari layer paling atas (indeks tertinggi) ke layer paling bawah
    const sortedIds = [...nodeIds].sort((a, b) => {
      const zA = nodes[a]?.zIndex ?? 0;
      const zB = nodes[b]?.zIndex ?? 0;
      if (zA !== zB) return zB - zA;
      return nodeIds.indexOf(b) - nodeIds.indexOf(a);
    });

    dom.layersListContainer.innerHTML = "";
    sortedIds.forEach(id => {
      const node = nodes[id];
      if (!node) return;

      const isSelected = AppState.ui.selectedNodeIds.has(id) || (AppState.ui.selectedType === "node" && AppState.ui.selectedId === id);
      const item = document.createElement("div");
      item.className = `layer-item${isSelected ? " selected" : ""}${node.locked ? " locked" : ""}`;
      item.dataset.id = id;

      const shapeIconSvg = getShapeIconSvg(node.type);
      const rawText = (node.text?.content || "").trim();
      const cleanRaw = rawText ? rawText.replace(/<[^>]*>/g, "").trim() : "";
      const labelText = cleanRaw ? cleanRaw.split("\n")[0] : getShapeDefaultLabel(node.type);

      item.innerHTML = `
        <div class="layer-icon" title="${getShapeDefaultLabel(node.type)}">
          ${shapeIconSvg}
        </div>
        <div class="layer-name" title="${escapeHtml(labelText)}">${escapeHtml(labelText)}</div>
        <button class="layer-lock-btn" title="${node.locked ? 'Buka Kunci (Ctrl + L)' : 'Kunci Posisi (Ctrl + L)'}">
          ${node.locked ? 
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : 
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'}
        </button>
      `;

      item.addEventListener("click", (e) => {
        if (e.target.closest(".layer-lock-btn")) {
          toggleNodeLock(id);
          return;
        }
        if (e.shiftKey) {
          toggleNodeSelection(id);
        } else {
          selectSingleNode(id, true);
        }
      });

      dom.layersListContainer.appendChild(item);
    });
  }

  function toggleLayersPanel() {
    if (!dom.layersPanel) return;
    const isShown = dom.layersPanel.classList.toggle("show");
    if (dom.btnToggleLayersBar) {
      dom.btnToggleLayersBar.classList.toggle("active", isShown);
    }
    if (dom.btnToggleLayersPanel) {
      dom.btnToggleLayersPanel.classList.toggle("active", isShown);
    }
    if (isShown) {
      updateLayerPanel();
    }
  }

  function rotateNode(nodeId) {
    const nodes = getSelectedNodesList();
    if (nodes.length > 1) {
      saveSnapshot();
      nodes.forEach(n => {
        n.rotation = ((n.rotation || 0) + 90) % 360;
      });
      renderAll();
      showToast(`${nodes.length} chart diputar 90°`);
      return;
    }
    const node = AppState.document.nodes[nodeId];
    if (node) {
      saveSnapshot();
      node.rotation = ((node.rotation || 0) + 90) % 360;
      renderAll();
      showToast(`Diputar: ${node.rotation}°`);
    }
  }

  function deleteSelected() {
    if (AppState.ui.selectedType === "node") {
      const ids = AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0
        ? Array.from(AppState.ui.selectedNodeIds)
        : (AppState.ui.selectedId ? [AppState.ui.selectedId] : []);
      if (ids.length === 0) return;
      saveSnapshot();
      ids.forEach(nId => {
        delete AppState.document.nodes[nId];
        for (const [eId, edge] of Object.entries(AppState.document.edges)) {
          if (edge.source.nodeId === nId || edge.target.nodeId === nId) {
            delete AppState.document.edges[eId];
          }
        }
      });
      deselectAll();
      renderAll();
      showToast(`${ids.length} chart dihapus`);
    } else if (AppState.ui.selectedType === "edge" && AppState.ui.selectedId) {
      saveSnapshot();
      delete AppState.document.edges[AppState.ui.selectedId];
      deselectAll();
      renderAll();
      showToast("Garis dihapus");
    }
  }

  function applyNodeFill(node, color) {
    const nodes = getSelectedNodesList();
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => {
        n.style.fill = color;
        if (n.text) {
          if (FlowEngine.isDarkColor(color)) {
            n.text.color = "#ffffff";
          } else {
            n.text.color = AppState.document.theme === "dark" && color === "transparent" ? "#f4f4f5" : "#18181b";
          }
        }
      });
      renderAll();
      return;
    }
    if (node) {
      saveSnapshot();
      node.style.fill = color;
      if (node.text) {
        if (FlowEngine.isDarkColor(color)) {
          node.text.color = "#ffffff";
        } else {
          node.text.color = AppState.document.theme === "dark" && color === "transparent" ? "#f4f4f5" : "#18181b";
        }
      }
      renderAll();
    }
  }

  // Context Menu
  function openContextMenu(clientX, clientY, targetType, targetId) {
    AppState.ui.contextMenuPos = { x: clientX, y: clientY, targetType, targetId };
    const menu = dom.contextMenu;

    if (targetType === "node") {
      const node = AppState.document.nodes[targetId];
      if (node) {
        const lockTextEl = document.getElementById("menu-lock-text");
        if (lockTextEl) lockTextEl.textContent = node.locked ? "Buka Kunci Posisi" : "Kunci Posisi";
      }
    }

    // Tampilkan terlebih dahulu agar browser dapat mengukur ukuran riil elemen menu
    menu.classList.add("show");
    const mw = menu.offsetWidth || 180;
    const mh = menu.offsetHeight || 240;

    let left = clientX;
    let top = clientY;

    // Batasi agar tidak terpotong di tepi kanan
    if (left + mw > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - mw - 12);
    }
    // Batasi agar tidak terpotong di tepi bawah (jika kursor di bawah, posisikan ke atas kursor)
    if (top + mh > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - mh - 12);
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function closeContextMenu() {
    dom.contextMenu.classList.remove("show");
  }

  dom.contextMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    const item = e.target.closest(".context-menu-item");
    if (!item) return;
    const action = item.dataset.action;
    const { targetType, targetId } = AppState.ui.contextMenuPos;

    if (action === "edit-text" && targetType === "node") {
      openInlineEditor(targetId);
    } else if (action === "copy" && targetType === "node") {
      copySelectedNodes(targetId);
    } else if (action === "paste") {
      pasteClipboardNode();
    } else if (action === "duplicate" && targetType === "node") {
      duplicateNode(targetId);
    } else if (action === "group") {
      groupSelectedNodes();
    } else if (action === "ungroup") {
      ungroupSelectedNodes();
    } else if (action === "toggle-lock" && targetType === "node") {
      lockSelectedNodes(null);
    } else if (action === "rotate" && targetType === "node") {
      rotateNode(targetId);
    } else if (action === "align-center") {
      alignSelectedNodesCenter();
    } else if (action === "align-middle") {
      alignSelectedNodesMiddle();
    } else if (action === "layer-topmost") {
      reorderSelectedNodes("topmost");
    } else if (action === "layer-up") {
      reorderSelectedNodes("forward");
    } else if (action === "layer-down") {
      reorderSelectedNodes("backward");
    } else if (action === "layer-backmost") {
      reorderSelectedNodes("backmost");
    } else if (action === "delete") {
      deleteSelected();
    }

    closeContextMenu();
  });

  // Sidebar Drag & Click Node Creation
  document.querySelectorAll(".shape-card").forEach(card => {
    if (card.id === "card-upload-image") return;
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("shape-type", card.dataset.shape);
    });
    card.addEventListener("click", () => {
      const rect = dom.svg.getBoundingClientRect();
      const center = Canvas.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, dom.svg, AppState.document.canvas);
      const cascade = (Object.keys(AppState.document.nodes).length % 6) * 16;
      addNode(card.dataset.shape, center.x + cascade, center.y + cascade);
    });
  });

  dom.cardUploadImage.addEventListener("click", () => dom.fileInputImage.click());
  dom.fileInputImage.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const rect = dom.svg.getBoundingClientRect();
      const center = Canvas.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, dom.svg, AppState.document.canvas);
      handleImageFile(file, center.x, center.y);
      dom.fileInputImage.value = "";
    }
  });

  dom.container.addEventListener("dragover", (e) => e.preventDefault());
  dom.container.addEventListener("drop", (e) => {
    e.preventDefault();
    const world = Canvas.screenToWorld(e.clientX, e.clientY, dom.svg, AppState.document.canvas);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/") || file.name.endsWith(".svg")) {
        handleImageFile(file, world.x, world.y);
        return;
      }
    }

    const shapeType = e.dataTransfer.getData("shape-type");
    if (shapeType) {
      addNode(shapeType, world.x, world.y);
    }
  });

  // Right Click Trigger
  window.addEventListener("contextmenu", (e) => {
    if (AppState.ui.mode === "EDITING_TEXT") return;
    if (e.target.closest("header") || e.target.closest("aside") || e.target.closest(".context-bar") || e.target.closest(".view-controls")) {
      return;
    }

    e.preventDefault();
    const nodeGroup = e.target.closest(".node-group");
    if (nodeGroup) {
      selectItem("node", nodeGroup.dataset.id);
      openContextMenu(e.clientX, e.clientY, "node", nodeGroup.dataset.id);
      return;
    }

    const edgeGroup = e.target.closest(".edge-group");
    if (edgeGroup) {
      selectItem("edge", edgeGroup.dataset.id);
      openContextMenu(e.clientX, e.clientY, "edge", edgeGroup.dataset.id);
      return;
    }

    openContextMenu(e.clientX, e.clientY, "canvas", null);
  });

  // Pointer Interaction Events (Mousedown, Mousemove, Mouseup)
  window.addEventListener("mousedown", (e) => {
    // If clicking inside the inline text editor, do NOT interfere with textarea selection/editing!
    if (e.target.closest(".node-inline-foreign") || e.target.closest(".node-seamless-editor") || e.target === dom.inlineEditor || e.target.closest("#inline-text-editor")) {
      return;
    }

    if (AppState.ui.mode === "EDITING_TEXT") {
      // User clicked outside the editor; close inline editor and commit changes
      TextEditor.close();
      return;
    }

    if (e.button === 2) return;

    if (e.target.closest("#app-context-menu")) return;
    closeContextMenu();

    if (e.target.closest("header") || e.target.closest("aside") || e.target.closest(".context-bar") || e.target.closest(".view-controls") || e.target.closest("#tap-connect-banner") || e.target.closest("#word-color-picker-popover") || e.target.closest(".word-color-btn") || e.target.closest(".context-dropdown-menu") || e.target.closest(".modal-backdrop") || e.target.closest(".modal-dialog")) {
      return;
    }

    // Click-Scroll (Scroll Wheel / Middle Mouse Button e.button === 1) or Space + Drag:
    // DEDICATED EXCLUSIVELY TO CANVAS PANNING.
    // Strictly forbid moving, selecting, resizing, or dragging charts/wires/pins under any circumstance!
    if (e.button === 1 || (e.button === 0 && AppState.ui.isSpacePressed)) {
      e.preventDefault();
      closeContextMenu();
      AppState.ui.mode = "PANNING";
      AppState.ui.dragStartPos = { x: e.clientX, y: e.clientY };
      dom.container.classList.add("panning");
      return;
    }

    const world = Canvas.screenToWorld(e.clientX, e.clientY, dom.svg, AppState.document.canvas);

    // 1. Resize Handle
    const resizeHandle = e.target.closest(".resize-handle");
    if (resizeHandle) {
      const nodeId = resizeHandle.dataset.nodeId;
      const corner = resizeHandle.dataset.corner;
      const node = AppState.document.nodes[nodeId];
      if (node && !node.locked) {
        saveSnapshot();
        AppState.ui.mode = "RESIZING_NODE";
        AppState.ui.resizeStart = {
          x: world.x,
          y: world.y,
          w: node.width,
          h: node.height,
          nx: node.x,
          ny: node.y,
          cx: node.x + node.width / 2,
          cy: node.y + node.height / 2,
          rot: node.rotation || 0,
          corner,
          nodeId,
          multiNodes: {}
        };
        if (AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 1) {
          AppState.ui.selectedNodeIds.forEach(id => {
            const n = AppState.document.nodes[id];
            if (n && !n.locked) {
              AppState.ui.resizeStart.multiNodes[id] = { w: n.width, h: n.height, x: n.x, y: n.y };
            }
          });
        }
        return;
      }
    }

    // 2. Magnetic Pin
    const pinEl = e.target.closest(".pin-circle");
    if (pinEl) {
      const nodeId = pinEl.dataset.nodeId;
      const pin = pinEl.dataset.pin;

      if (AppState.ui.pendingPinSource) {
        finishTapConnect(nodeId, pin);
        return;
      }

      const node = AppState.document.nodes[nodeId];
      const pinCoord = FlowEngine.getNodePinCoordinates(node, pin);

      AppState.ui.dragStartPos = { x: e.clientX, y: e.clientY };
      AppState.ui.draftWire = {
        sourceNodeId: nodeId,
        sourcePin: pin,
        startX: pinCoord.x,
        startY: pinCoord.y,
        currX: pinCoord.x,
        currY: pinCoord.y
      };
      AppState.ui.mode = "PIN_DOWN";
      return;
    }

    if (AppState.ui.pendingPinSource) {
      cancelTapConnect();
    }

    // 3. Edge Handle
    const handleEl = e.target.closest(".edge-handle");
    if (handleEl) {
      const edgeId = handleEl.dataset.edgeId;
      const edge = AppState.document.edges[edgeId];
      if (edge) {
        saveSnapshot();
        AppState.ui.mode = "DRAGGING_HANDLE";
        AppState.ui.selectedId = edgeId;
        AppState.ui.selectedType = "edge";
        AppState.ui.dragStartPos = { x: world.x, y: world.y };
        AppState.ui.handleInitialOffset = { ...(edge.handleOffset || { dx: 0, dy: 0 }) };
        renderAll();
        return;
      }
    }

    // 4. Edge Path
    const edgeGroup = e.target.closest(".edge-group");
    if (edgeGroup) {
      selectItem("edge", edgeGroup.dataset.id);
      return;
    }

    // 5. Node Group
    const nodeGroup = e.target.closest(".node-group");
    if (nodeGroup) {
      const nodeId = nodeGroup.dataset.id;

      // Format Painter: Jika kuas cat aktif, terapkan gaya ke node ini
      if (AppState.ui.formatPainter && AppState.ui.formatPainter.active) {
        if (nodeId && AppState.ui.formatPainter.style) {
          saveSnapshot();
          applyNodeStyle(nodeId, AppState.ui.formatPainter.style);
          selectSingleNode(nodeId, true);
          renderAll();
          updatePropertiesBar();

          if (AppState.ui.formatPainter.mode === "single") {
            deactivateFormatPainter();
            showToast("Gaya chart diterapkan");
          } else {
            showToast("Gaya chart diterapkan (Kuas Cat aktif, tekan Esc untuk selesai)");
          }
        }
        return;
      }

      const now = Date.now();

      // Check double click explicitly
      if (now - AppState.ui.lastClickTime < 450 && AppState.ui.lastClickNodeId === nodeId) {
        AppState.ui.lastClickTime = 0;
        AppState.ui.lastClickNodeId = null;
        AppState.ui.mode = "IDLE";
        AppState.ui.selectedType = "node";
        AppState.ui.selectedId = nodeId;
        AppState.ui.selectedNodeIds.clear();
        AppState.ui.selectedNodeIds.add(nodeId);
        openInlineEditor(nodeId);
        return;
      }
      AppState.ui.lastClickTime = now;
      AppState.ui.lastClickNodeId = nodeId;

      const node = AppState.document.nodes[nodeId];

      if (e.shiftKey) {
        // Shift + click on chart: toggle selection
        toggleNodeSelection(nodeId);
      } else {
        // Normal click: if not already selected, select it (and its group members)
        if (!AppState.ui.selectedNodeIds.has(nodeId)) {
          selectSingleNode(nodeId, true);
        }
      }

      if (!node.locked) {
        AppState.ui.mode = "DRAGGING_NODE";
        AppState.ui.dragStartPos = { x: world.x, y: world.y };
        AppState.ui.hasMovedNode = false;

        // Record initial positions for ALL currently selected nodes
        AppState.ui.nodesInitialPos = {};
        AppState.ui.selectedNodeIds.forEach(id => {
          const n = AppState.document.nodes[id];
          if (n && !n.locked) {
            AppState.ui.nodesInitialPos[id] = { x: n.x, y: n.y };
          }
        });
      }
      return;
    }

    // 6. Canvas Pan OR Shift + Drag Box Selection
    if (e.shiftKey) {
      // SHIFT holds canvas still (no panning) and produces marquee box selection for multiple charts
      AppState.ui.mode = "BOX_SELECTING";
      AppState.ui.boxSelectStart = { x: world.x, y: world.y, clientX: e.clientX, clientY: e.clientY };
      AppState.ui.boxInitialSelected = new Set(AppState.ui.selectedNodeIds);
      return;
    }

    // Normal empty canvas click: deselect and pan canvas
    deselectAll();
    AppState.ui.mode = "PANNING";
    AppState.ui.dragStartPos = { x: e.clientX, y: e.clientY };
    dom.container.classList.add("panning");
  });

  window.addEventListener("mousemove", (e) => {
    if (AppState.ui.mode === "EDITING_TEXT") return;
    const world = Canvas.screenToWorld(e.clientX, e.clientY, dom.svg, AppState.document.canvas);

    if (AppState.ui.mode === "PANNING") {
      const dx = e.clientX - AppState.ui.dragStartPos.x;
      const dy = e.clientY - AppState.ui.dragStartPos.y;
      AppState.document.canvas.pan.x += dx;
      AppState.document.canvas.pan.y += dy;
      AppState.ui.dragStartPos = { x: e.clientX, y: e.clientY };
      updateViewportUI();
      return;
    }

    if (AppState.ui.mode === "BOX_SELECTING") {
      const start = AppState.ui.boxSelectStart;
      const left = Math.min(start.x, world.x);
      const top = Math.min(start.y, world.y);
      const width = Math.abs(world.x - start.x);
      const height = Math.abs(world.y - start.y);

      dom.layerDraft.innerHTML = `
        <rect class="marquee-selection-box" x="${left}" y="${top}" width="${width}" height="${height}" rx="2" />
      `;

      // Select all intersecting or enclosed charts
      const currentSelection = new Set(AppState.ui.boxInitialSelected || []);
      Object.values(AppState.document.nodes).forEach(n => {
        const intersects = (n.x + n.width >= left) && 
                           (n.x <= left + width) && 
                           (n.y + n.height >= top) && 
                           (n.y <= top + height);
        if (intersects) {
          currentSelection.add(n.id);
        }
      });

      AppState.ui.selectedNodeIds = currentSelection;
      if (currentSelection.size > 0) {
        AppState.ui.selectedType = "node";
        AppState.ui.selectedId = Array.from(currentSelection)[0];
      }
      updateSelectionVisuals();
      return;
    }

    if (AppState.ui.mode === "DRAGGING_NODE") {
      let dx = world.x - AppState.ui.dragStartPos.x;
      let dy = world.y - AppState.ui.dragStartPos.y;
      if (Math.hypot(dx, dy) > 2) {
        if (!AppState.ui.hasMovedNode) {
          saveSnapshot();
          AppState.ui.hasMovedNode = true;
        }

        const nodeIds = AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0
          ? Array.from(AppState.ui.selectedNodeIds)
          : [AppState.ui.selectedId];

        const primaryId = nodeIds[0];
        const primaryInit = AppState.ui.nodesInitialPos && AppState.ui.nodesInitialPos[primaryId];
        const primaryNode = AppState.document.nodes[primaryId];

        let guideLinesSvg = "";

        // Smart Alignment Snapping (Efek Kaku saat sejajar, nonaktifkan jika Shift ditahan)
        if (primaryNode && primaryInit && !e.shiftKey) {
          const SNAP_THRESHOLD = 7;
          const curX = primaryInit.x + dx;
          const curY = primaryInit.y + dy;
          const w = primaryNode.width;
          const h = primaryNode.height;

          const top = curY;
          const centerY = curY + h / 2;
          const bottom = curY + h;

          const left = curX;
          const centerX = curX + w / 2;
          const right = curX + w;

          let bestSnapY = null;
          let bestDistY = SNAP_THRESHOLD + 1;
          let guideY = null;

          let bestSnapX = null;
          let bestDistX = SNAP_THRESHOLD + 1;
          let guideX = null;

          const selectedSet = new Set(nodeIds);

          Object.values(AppState.document.nodes).forEach(other => {
            if (selectedSet.has(other.id) || other.isContainer) return;

            const oTop = other.y;
            const oCenterY = other.y + other.height / 2;
            const oBottom = other.y + other.height;

            const oLeft = other.x;
            const oCenterX = other.x + other.width / 2;
            const oRight = other.x + other.width;

            // Snap sumbu Y (Efek kaku saat tinggi sejajar / berdampingan)
            const yCandidates = [
              { val: top, target: oTop, offset: 0 },
              { val: centerY, target: oCenterY, offset: h / 2 },
              { val: bottom, target: oBottom, offset: h },
              { val: top, target: oBottom, offset: 0 },
              { val: bottom, target: oTop, offset: h }
            ];

            yCandidates.forEach(cand => {
              const diff = Math.abs(cand.val - cand.target);
              if (diff < bestDistY) {
                bestDistY = diff;
                bestSnapY = (cand.target - cand.offset) - primaryInit.y;
                const minLineX = Math.min(left, oLeft) - 40;
                const maxLineX = Math.max(right, oRight) + 40;
                guideY = `<line x1="${minLineX}" y1="${cand.target}" x2="${maxLineX}" y2="${cand.target}" class="alignment-guide-line" />`;
              }
            });

            // Snap sumbu X (Sejajar kiri, tengah, atau kanan)
            const xCandidates = [
              { val: left, target: oLeft, offset: 0 },
              { val: centerX, target: oCenterX, offset: w / 2 },
              { val: right, target: oRight, offset: w },
              { val: left, target: oRight, offset: 0 },
              { val: right, target: oLeft, offset: w }
            ];

            xCandidates.forEach(cand => {
              const diff = Math.abs(cand.val - cand.target);
              if (diff < bestDistX) {
                bestDistX = diff;
                bestSnapX = (cand.target - cand.offset) - primaryInit.x;
                const minLineY = Math.min(top, oTop) - 40;
                const maxLineY = Math.max(bottom, oBottom) + 40;
                guideX = `<line x1="${cand.target}" y1="${minLineY}" x2="${cand.target}" y2="${maxLineY}" class="alignment-guide-line" />`;
              }
            });
          });

          if (bestSnapY !== null) {
            dy = bestSnapY;
            if (guideY) guideLinesSvg += guideY;
          }
          if (bestSnapX !== null) {
            dx = bestSnapX;
            if (guideX) guideLinesSvg += guideX;
          }
        }

        if (dom.layerDraft) {
          dom.layerDraft.innerHTML = guideLinesSvg;
        }

        nodeIds.forEach(id => {
          const n = AppState.document.nodes[id];
          const init = AppState.ui.nodesInitialPos && AppState.ui.nodesInitialPos[id];
          if (n && !n.locked && init) {
            n.x = Math.round(init.x + dx);
            n.y = Math.round(init.y + dy);
          }
        });
        renderAll();
      }
      return;
    }

    if (AppState.ui.mode === "RESIZING_NODE") {
      const rs = AppState.ui.resizeStart;
      const node = AppState.document.nodes[rs.nodeId];
      if (node && !node.locked) {
        const isAlt = !!e.altKey;
        const MIN_W = 10;
        const MIN_H = 10;

        let dw = world.x - rs.x;
        let dh = world.y - rs.y;

        // Transformasikan delta pointer jika node memiliki rotasi
        if (rs.rot) {
          const rad = -rs.rot * Math.PI / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const rdw = dw * cos - dh * sin;
          const rdh = dw * sin + dh * cos;
          dw = rdw;
          dh = rdh;
        }

        const corner = rs.corner;

        if (isAlt) {
          // ==========================================
          // ALT RESIZE: Perbesar Simetris dari Titik Pusat (cx, cy)
          // ==========================================
          let newW = rs.w;
          let newH = rs.h;

          // Hitung lebar baru jika handle mempengaruhi sumbu X
          if (["se", "ne", "e"].includes(corner)) {
            newW = Math.max(MIN_W, Math.round(rs.w + 2 * dw));
          } else if (["sw", "nw", "w"].includes(corner)) {
            newW = Math.max(MIN_W, Math.round(rs.w - 2 * dw));
          }

          // Hitung tinggi baru jika handle mempengaruhi sumbu Y
          if (["se", "sw", "s"].includes(corner)) {
            newH = Math.max(MIN_H, Math.round(rs.h + 2 * dh));
          } else if (["ne", "nw", "n"].includes(corner)) {
            newH = Math.max(MIN_H, Math.round(rs.h - 2 * dh));
          }

          node.width = newW;
          node.height = newH;
          node.x = Math.round(rs.cx - newW / 2);
          node.y = Math.round(rs.cy - newH / 2);
        } else {
          // ==========================================
          // NORMAL RESIZE (Sumbu berlawanan bertindak sebagai jangkar)
          // ==========================================
          if (corner === "se") {
            node.width = Math.max(MIN_W, Math.round(rs.w + dw));
            node.height = Math.max(MIN_H, Math.round(rs.h + dh));
          } else if (corner === "sw") {
            const newW = Math.max(MIN_W, Math.round(rs.w - dw));
            node.x = Math.round(rs.nx + (rs.w - newW));
            node.width = newW;
            node.height = Math.max(MIN_H, Math.round(rs.h + dh));
          } else if (corner === "ne") {
            const newH = Math.max(MIN_H, Math.round(rs.h - dh));
            node.y = Math.round(rs.ny + (rs.h - newH));
            node.width = Math.max(MIN_W, Math.round(rs.w + dw));
            node.height = newH;
          } else if (corner === "nw") {
            const newW = Math.max(MIN_W, Math.round(rs.w - dw));
            const newH = Math.max(MIN_H, Math.round(rs.h - dh));
            node.x = Math.round(rs.nx + (rs.w - newW));
            node.y = Math.round(rs.ny + (rs.h - newH));
            node.width = newW;
            node.height = newH;
          } else if (corner === "e") {
            // Memanjang ke kanan saja
            node.width = Math.max(MIN_W, Math.round(rs.w + dw));
          } else if (corner === "w") {
            // Memanjang ke kiri saja
            const newW = Math.max(MIN_W, Math.round(rs.w - dw));
            node.x = Math.round(rs.nx + (rs.w - newW));
            node.width = newW;
          } else if (corner === "s") {
            // Memanjang ke bawah saja
            node.height = Math.max(MIN_H, Math.round(rs.h + dh));
          } else if (corner === "n") {
            // Memanjang ke atas saja
            const newH = Math.max(MIN_H, Math.round(rs.h - dh));
            node.y = Math.round(rs.ny + (rs.h - newH));
            node.height = newH;
          }
        }

        // Multi-Selection Scale: Perbesar semua chart yang dipilih secara bersamaan
        if (rs.multiNodes && Object.keys(rs.multiNodes).length > 1) {
          const ratioW = node.width / rs.w;
          const ratioH = node.height / rs.h;
          Object.entries(rs.multiNodes).forEach(([id, init]) => {
            if (id === rs.nodeId) return;
            const otherNode = AppState.document.nodes[id];
            if (otherNode && !otherNode.locked) {
              const targetW = Math.max(MIN_W, Math.round(init.w * ratioW));
              const targetH = Math.max(MIN_H, Math.round(init.h * ratioH));
              const deltaW = targetW - otherNode.width;
              const deltaH = targetH - otherNode.height;
              otherNode.width = targetW;
              otherNode.height = targetH;
              otherNode.x = Math.round(otherNode.x - deltaW / 2);
              otherNode.y = Math.round(otherNode.y - deltaH / 2);
            }
          });
        }

        renderAll();
      }
      return;
    }

    if (AppState.ui.mode === "DRAGGING_HANDLE") {
      const edge = AppState.document.edges[AppState.ui.selectedId];
      if (edge) {
        const dx = world.x - AppState.ui.dragStartPos.x;
        const dy = world.y - AppState.ui.dragStartPos.y;
        edge.handleOffset = {
          dx: Math.round(AppState.ui.handleInitialOffset.dx + dx),
          dy: Math.round(AppState.ui.handleInitialOffset.dy + dy)
        };
        renderAll();
      }
      return;
    }

    if (AppState.ui.mode === "PIN_DOWN") {
      const dist = Math.hypot(e.clientX - AppState.ui.dragStartPos.x, e.clientY - AppState.ui.dragStartPos.y);
      if (dist > 4) {
        AppState.ui.mode = "DRAWING_WIRE";
        document.body.classList.add("is-drawing-wire");
      }
    }

    if (AppState.ui.mode === "DRAWING_WIRE") {
      const draft = AppState.ui.draftWire;
      draft.currX = world.x;
      draft.currY = world.y;

      let targetPin = null;
      let minDist = 22 / AppState.document.canvas.zoom;

      document.querySelectorAll(".pin-circle").forEach(pinEl => {
        pinEl.classList.remove("snap-target");
        const nId = pinEl.dataset.nodeId;
        const pName = pinEl.dataset.pin;
        if (nId !== draft.sourceNodeId) {
          const node = AppState.document.nodes[nId];
          const p = FlowEngine.getNodePinCoordinates(node, pName);
          const d = Math.hypot(world.x - p.x, world.y - p.y);
          if (d < minDist) {
            minDist = d;
            targetPin = { nodeId: nId, pin: pName, x: p.x, y: p.y, el: pinEl };
          }
        }
      });

      if (targetPin) {
        targetPin.el.classList.add("snap-target");
        draft.currX = targetPin.x;
        draft.currY = targetPin.y;
        AppState.ui.activePin = targetPin;
      } else {
        AppState.ui.activePin = null;
      }

      const isDark = AppState.document.theme === "dark";
      dom.layerDraft.innerHTML = `
        <path d="M ${draft.startX} ${draft.startY} L ${draft.currX} ${draft.currY}"
              fill="none" stroke="${isDark ? '#f4f4f5' : '#18181b'}" stroke-width="2" stroke-dasharray="4,4" />
      `;
      return;
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (AppState.ui.mode === "PANNING" || e.button === 1) {
      AppState.ui.mode = "IDLE";
      if (!AppState.ui.isSpacePressed) {
        dom.container.classList.remove("panning");
      }
      return;
    }

    dom.container.classList.remove("panning");
    document.body.classList.remove("is-drawing-wire");

    if (AppState.ui.mode === "BOX_SELECTING") {
      dom.layerDraft.innerHTML = "";
      AppState.ui.mode = "IDLE";
      if (AppState.ui.selectedNodeIds.size === 0) {
        deselectAll();
      } else {
        AppState.ui.selectedType = "node";
        AppState.ui.selectedId = Array.from(AppState.ui.selectedNodeIds)[0];
        updateSelectionVisuals();
      }
      return;
    }

    if (AppState.ui.mode === "PIN_DOWN") {
      const draft = AppState.ui.draftWire;
      AppState.ui.mode = "IDLE";
      startTapConnect(draft.sourceNodeId, draft.sourcePin);
      return;
    }

    if (AppState.ui.mode === "DRAWING_WIRE") {
      dom.layerDraft.innerHTML = "";
      if (AppState.ui.activePin) {
        const draft = AppState.ui.draftWire;
        saveSnapshot();
        const isDark = AppState.document.theme === "dark";
        const newEdge = FlowEngine.createEdgeData(
          draft.sourceNodeId, draft.sourcePin,
          AppState.ui.activePin.nodeId, AppState.ui.activePin.pin,
          isDark
        );
        AppState.document.edges[newEdge.id] = newEdge;
        selectItem("edge", newEdge.id);
        showToast("Koneksi berhasil disambungkan!");
      }
      AppState.ui.mode = "IDLE";
      AppState.ui.draftWire = null;
      AppState.ui.activePin = null;
      renderAll();
      return;
    }

    if (AppState.ui.mode === "DRAGGING_NODE") {
      if (dom.layerDraft) dom.layerDraft.innerHTML = "";
      AppState.ui.mode = "IDLE";
      // If user merely clicked without dragging, and without Shift, isolate selection to clicked node
      if (!AppState.ui.hasMovedNode && AppState.ui.lastClickNodeId && !e.shiftKey) {
        selectSingleNode(AppState.ui.lastClickNodeId, true);
      }
      return;
    }

    if (AppState.ui.mode === "RESIZING_NODE") {
      const rs = AppState.ui.resizeStart;
      if (rs && rs.nodeId && AppState.document.nodes[rs.nodeId]) {
        AppState.document.nodes[rs.nodeId].baseWidth = AppState.document.nodes[rs.nodeId].width;
        AppState.document.nodes[rs.nodeId].baseHeight = AppState.document.nodes[rs.nodeId].height;
      }
      if (rs && rs.multiNodes) {
        Object.keys(rs.multiNodes).forEach(mId => {
          if (AppState.document.nodes[mId]) {
            AppState.document.nodes[mId].baseWidth = AppState.document.nodes[mId].width;
            AppState.document.nodes[mId].baseHeight = AppState.document.nodes[mId].height;
          }
        });
      }
    }

    if (AppState.ui.mode !== "EDITING_TEXT") {
      AppState.ui.mode = "IDLE";
    }
  });

  // Double Click Resets & Text Edits
  window.addEventListener("dblclick", (e) => {
    if (e.target.closest(".node-inline-foreign") || e.target.closest(".node-seamless-editor") || e.target === dom.inlineEditor || e.target.closest("#inline-text-editor")) {
      return;
    }

    const handleEl = e.target.closest(".edge-handle");
    if (handleEl) {
      const edgeId = handleEl.dataset.edgeId;
      const edge = AppState.document.edges[edgeId];
      if (edge) {
        saveSnapshot();
        edge.handleOffset = { dx: 0, dy: 0 };
        renderAll();
        showToast("Jalur di-reset ke tengah");
      }
      return;
    }

    const nodeEl = e.target.closest(".node-group");
    if (nodeEl) {
      const nodeId = nodeEl.dataset.id;
      if (nodeId && AppState.ui.mode !== "EDITING_TEXT") {
        AppState.ui.selectedType = "node";
        AppState.ui.selectedId = nodeId;
        AppState.ui.selectedNodeIds.clear();
        AppState.ui.selectedNodeIds.add(nodeId);
        openInlineEditor(nodeId);
      }
      return;
    }
  });

  // Suppress browser middle-click autoscroll behavior
  window.addEventListener("auxclick", (e) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  });

  // Zoom via Mouse Wheel
  dom.container.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    Canvas.zoomAt(e.clientX, e.clientY, zoomFactor, dom.svg, AppState.document.canvas, () => {
      updateViewportUI();
    });
  }, { passive: false });

  // Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    if (AppState.ui.mode === "EDITING_TEXT") return;

    // Check if user is typing or interacting with an input/textarea/select element
    const isInputActive = document.activeElement && (
      document.activeElement.tagName === "INPUT" ||
      document.activeElement.tagName === "TEXTAREA" ||
      document.activeElement.tagName === "SELECT" ||
      document.activeElement.isContentEditable
    );

    if (isInputActive) {
      if (e.key === "Escape") {
        document.activeElement.blur();
      }
      return; // Biarkan browser menangani native text copy/paste/cut/selection di dalam input tanpa mencegat!
    }

    // Spacebar Panning Shortcut (Hold Space to Pan Canvas)
    if (e.code === "Space") {
      e.preventDefault();
      AppState.ui.isSpacePressed = true;
      dom.container.classList.add("space-pan");
    }

    if (e.key === "Escape") {
      if (AppState.ui.formatPainter && AppState.ui.formatPainter.active) {
        deactivateFormatPainter();
        showToast("Kuas Cat dibatalkan");
        return;
      }
      if (dom.exportModalBackdrop && dom.exportModalBackdrop.classList.contains("show")) {
        closeExportModal();
        return;
      }
      if (dom.guideModalBackdrop && dom.guideModalBackdrop.classList.contains("show")) {
        dom.guideModalBackdrop.classList.remove("show");
        return;
      }
      if (dom.projectsModalBackdrop && dom.projectsModalBackdrop.classList.contains("show")) {
        dom.projectsModalBackdrop.classList.remove("show");
        return;
      }
      if (dom.jsonModalBackdrop && dom.jsonModalBackdrop.classList.contains("show")) {
        dom.jsonModalBackdrop.classList.remove("show");
        return;
      }
      if (AppState.ui.pendingPinSource) {
        cancelTapConnect();
      } else {
        deselectAll();
      }
      return;
    }

    // Ctrl + A: Select All Charts
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "a" || e.key === "A")) {
      e.preventDefault();
      selectAllNodes();
      return;
    }

    // Ctrl + Shift + G: Ungroup Selected Charts
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "g" || e.key === "G")) {
      e.preventDefault();
      ungroupSelectedNodes();
      return;
    }

    // Ctrl + G: Group Selected Charts
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "g" || e.key === "G")) {
      e.preventDefault();
      groupSelectedNodes();
      return;
    }

    // Undo: Ctrl + Z
    if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }

    // Redo: Ctrl + Y or Ctrl + Shift + Z
    if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Format Painter: Ctrl + Alt + C (Salin Gaya)
    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === "c" || e.key === "C" || e.code === "KeyC")) {
      e.preventDefault();
      const style = copyNodeStyle();
      if (style) {
        activateFormatPainter("single");
        showToast("Gaya disalin (Ctrl+Alt+C). Klik chart lain atau tekan Ctrl+Alt+V.");
      } else {
        showToast("Pilih chart terlebih dahulu untuk menyalin gaya");
      }
      return;
    }

    // Format Painter: Ctrl + Alt + V (Tempel Gaya)
    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === "v" || e.key === "V" || e.code === "KeyV")) {
      e.preventDefault();
      pasteStyleToSelectedNodes();
      return;
    }

    // Copy Chart: Ctrl + C
    if (e.key === "c" && (e.ctrlKey || e.metaKey) && !e.altKey) {
      copySelectedNodes();
      return;
    }

    // Paste Chart: Ctrl + V
    if (e.key === "v" && (e.ctrlKey || e.metaKey) && !e.altKey) {
      pasteClipboardNode();
      return;
    }

    // Duplicate: Ctrl + D
    if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (AppState.ui.selectedType === "node") {
        duplicateSelectedNodes();
      }
      return;
    }

    // Ctrl + L: Toggle Kunci / Buka Kunci Chart
    if ((e.ctrlKey || e.metaKey) && (e.key === "l" || e.key === "L" || e.code === "KeyL")) {
      e.preventDefault();
      lockSelectedNodes(null);
      return;
    }

    // Ctrl + [: Layer Ke Bawah (Backward)
    // Ctrl + Shift + [: Layer Paling Bawah (Backmost)
    const isBracketLeft = e.code === "BracketLeft" || e.key === "[" || e.key === "{";
    if ((e.ctrlKey || e.metaKey) && isBracketLeft) {
      e.preventDefault();
      if (e.shiftKey) {
        reorderSelectedNodes("backmost");
      } else {
        reorderSelectedNodes("backward");
      }
      return;
    }

    // Ctrl + ]: Layer Ke Atas (Forward)
    // Ctrl + Shift + ]: Layer Paling Atas (Topmost)
    const isBracketRight = e.code === "BracketRight" || e.key === "]" || e.key === "}";
    if ((e.ctrlKey || e.metaKey) && isBracketRight) {
      e.preventDefault();
      if (e.shiftKey) {
        reorderSelectedNodes("topmost");
      } else {
        reorderSelectedNodes("forward");
      }
      return;
    }

    // Alt + C: Ratakan Tengah Vertikal (Align Center - X Axis)
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "c" || e.key === "C" || e.code === "KeyC")) {
      e.preventDefault();
      alignSelectedNodesCenter();
      return;
    }

    // Alt + M: Ratakan Tengah Horizontal (Align Middle - Y Axis)
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "m" || e.key === "M" || e.code === "KeyM")) {
      e.preventDefault();
      alignSelectedNodesMiddle();
      return;
    }

    // Nudge / Drag Chart Menggunakan Tombol Panah Keyboard (Up, Down, Left, Right)
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      if (document.activeElement && (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA" ||
        document.activeElement.tagName === "SELECT" ||
        document.activeElement.isContentEditable
      )) {
        return;
      }

      let ids = [];
      if (AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0) {
        ids = Array.from(AppState.ui.selectedNodeIds);
      } else if (AppState.ui.selectedType === "node" && AppState.ui.selectedId) {
        ids = [AppState.ui.selectedId];
      }

      if (ids.length > 0) {
        e.preventDefault();
        if (!e.repeat) {
          saveSnapshot();
        }

        const step = e.shiftKey ? 20 : 5;
        let dx = 0, dy = 0;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;

        let movedCount = 0;
        ids.forEach(id => {
          const node = AppState.document.nodes[id];
          if (node && !node.locked) {
            node.x += dx;
            node.y += dy;
            movedCount++;
          }
        });

        if (movedCount > 0) {
          renderAll();
        } else if (!e.repeat) {
          showToast("Chart dalam posisi terkunci (Ctrl + L untuk membuka)");
        }
        return;
      }
    }

    // Delete / Backspace
    if (e.key === "Delete" || e.key === "Backspace") {
      deleteSelected();
      return;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      AppState.ui.isSpacePressed = false;
      dom.container.classList.remove("space-pan");
      if (AppState.ui.mode === "PANNING") {
        AppState.ui.mode = "IDLE";
        dom.container.classList.remove("panning");
      }
    }
  });

  // Toolbar Buttons Wiring
  dom.btnUndo.addEventListener("click", handleUndo);
  dom.btnRedo.addEventListener("click", handleRedo);
  document.getElementById("btn-delete").addEventListener("click", deleteSelected);
  document.getElementById("btn-clear-all").addEventListener("click", () => {
    if (confirm("Kosongkan seluruh kanvas? Tindakan ini dapat di-undo.")) {
      saveSnapshot();
      AppState.document.nodes = {};
      AppState.document.edges = {};
      cancelTapConnect();
      deselectAll();
      showToast("Kanvas dikosongkan");
    }
  });

  // Zoom In / Out Buttons Pivoting on Working Coordinates
  function getZoomPivot() {
    const containerRect = dom.container.getBoundingClientRect();
    const selectedIds = AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0
      ? Array.from(AppState.ui.selectedNodeIds)
      : (AppState.ui.selectedType === "node" && AppState.ui.selectedId ? [AppState.ui.selectedId] : []);

    if (selectedIds.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedIds.forEach(id => {
        const n = AppState.document.nodes[id];
        if (n) {
          minX = Math.min(minX, n.x);
          minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x + n.width);
          maxY = Math.max(maxY, n.y + n.height);
        }
      });
      if (minX !== Infinity) {
        const worldCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        const screenCenter = Canvas.worldToScreen(worldCenter.x, worldCenter.y, dom.svg, AppState.document.canvas);
        return { clientX: screenCenter.x, clientY: screenCenter.y };
      }
    }

    return {
      clientX: containerRect.left + containerRect.width / 2,
      clientY: containerRect.top + containerRect.height / 2
    };
  }

  document.getElementById("btn-zoom-in").addEventListener("click", () => {
    const pivot = getZoomPivot();
    Canvas.zoomTowards(pivot.clientX, pivot.clientY, 1.2, dom.svg, AppState.document.canvas, () => {
      updateViewportUI();
    });
  });

  document.getElementById("btn-zoom-out").addEventListener("click", () => {
    const pivot = getZoomPivot();
    Canvas.zoomTowards(pivot.clientX, pivot.clientY, 0.833, dom.svg, AppState.document.canvas, () => {
      updateViewportUI();
    });
  });

  document.getElementById("btn-zoom-reset").addEventListener("click", () => {
    const pivot = getZoomPivot();
    Canvas.zoomAt(pivot.clientX, pivot.clientY, 1.0 / AppState.document.canvas.zoom, dom.svg, AppState.document.canvas, () => {
      updateViewportUI();
    });
  });

  // Pusatkan Tampilan Kanvas ke Diagram atau Batas Area Print (Fit to Screen)
  function fitToContentOrBoundary() {
    const containerRect = dom.container.getBoundingClientRect();
    const viewW = containerRect.width;
    const viewH = containerRect.height;
    if (viewW <= 0 || viewH <= 0) return;

    const nodes = Object.values(AppState.document.nodes);
    const ws = AppState.document.canvas.workspace;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (nodes.length > 0) {
      nodes.forEach(n => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.width);
        maxY = Math.max(maxY, n.y + n.height);
      });
    }

    // Sertakan batas workspace/area print jika ada
    if (ws) {
      if (minX === Infinity) {
        minX = ws.x;
        minY = ws.y;
        maxX = ws.x + ws.width;
        maxY = ws.y + ws.height;
      } else {
        minX = Math.min(minX, ws.x);
        minY = Math.min(minY, ws.y);
        maxX = Math.max(maxX, ws.x + ws.width);
        maxY = Math.max(maxY, ws.y + ws.height);
      }
    }

    if (minX === Infinity || maxX === -Infinity) {
      minX = 0;
      minY = 0;
      maxX = 1600;
      maxY = 900;
    }

    const padding = 60;
    const boxW = Math.max(100, maxX - minX);
    const boxH = Math.max(100, maxY - minY);

    const scaleX = (viewW - padding * 2) / boxW;
    const scaleY = (viewH - padding * 2) / boxH;
    let fitZoom = Math.min(scaleX, scaleY);
    fitZoom = Math.min(Math.max(fitZoom, 0.2), 2.5);

    const boxCenterX = minX + boxW / 2;
    const boxCenterY = minY + boxH / 2;

    const screenCenterX = viewW / 2;
    const screenCenterY = viewH / 2;

    AppState.document.canvas.zoom = fitZoom;
    AppState.document.canvas.pan.x = Math.round(screenCenterX - boxCenterX * fitZoom);
    AppState.document.canvas.pan.y = Math.round(screenCenterY - boxCenterY * fitZoom);

    updateViewportUI();
    renderAll();
    showToast(`Tampilan dipusatkan (${Math.round(fitZoom * 100)}%)`);
  }

  if (dom.btnZoomFit) {
    dom.btnZoomFit.addEventListener("click", fitToContentOrBoundary);
  }

  dom.selectWorkspace.addEventListener("change", (e) => {
    saveSnapshot();
    Canvas.setWorkspacePreset(e.target.value, AppState.document, (ws, name) => {
      updateWorkspaceUI();
      showToast(`Workspace diubah: ${name}`);
    });
  });

  dom.btnToggleOrientation.addEventListener("click", () => {
    saveSnapshot();
    Canvas.toggleWorkspaceOrientation(AppState.document, (ws, ori) => {
      updateWorkspaceUI();
      showToast(`Orientasi Kanvas: ${ori.toUpperCase()}`);
    });
  });

  dom.themeToggle.addEventListener("click", () => {
    const nextTheme = AppState.document.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    showToast(`Beralih ke Mode ${nextTheme === 'dark' ? 'Gelap' : 'Terang'}`);
  });

  // Helper: Dapatkan seluruh node yang sedang dipilih (mendukung single & multiple selection)
  function getSelectedNodesList() {
    const nodeIds = AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0
      ? Array.from(AppState.ui.selectedNodeIds)
      : (AppState.ui.selectedId ? [AppState.ui.selectedId] : []);
    return nodeIds.map(id => AppState.document.nodes[id]).filter(n => n && !n.locked);
  }

  // Node Property Bar Controls (Tersinkronisasi ke seluruh chart yang dipilih)
  document.getElementById("prop-font-family").addEventListener("change", (e) => {
    const nodes = getSelectedNodesList().filter(n => n.text);
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => { n.text.fontFamily = e.target.value; });
      renderAll();
    }
  });

  function updateBatchFontSize(val) {
    const nodes = getSelectedNodesList().filter(n => n.text);
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => { n.text.fontSize = val; });
      if (dom.propFontSizeNum) dom.propFontSizeNum.value = val;
      if (dom.propFontSize) dom.propFontSize.value = String(val);
      renderAll();
    }
  }

  dom.propFontSize.addEventListener("change", (e) => {
    const val = parseInt(e.target.value) || 14;
    updateBatchFontSize(val);
  });

  if (dom.propFontSizeNum) {
    dom.propFontSizeNum.addEventListener("change", (e) => {
      const val = Math.max(8, Math.min(96, parseInt(e.target.value) || 14));
      updateBatchFontSize(val);
    });
    dom.propFontSizeNum.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = Math.max(8, Math.min(96, parseInt(e.target.value) || 14));
        updateBatchFontSize(val);
        dom.propFontSizeNum.blur();
      }
    });
  }

  function setTextAlign(align) {
    const nodes = getSelectedNodesList().filter(n => n.text);
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => { n.text.align = align; });
      if (dom.btnTextAlignLeft) dom.btnTextAlignLeft.classList.toggle("active", align === "left");
      if (dom.btnTextAlignCenter) dom.btnTextAlignCenter.classList.toggle("active", align === "center");
      if (dom.btnTextAlignRight) dom.btnTextAlignRight.classList.toggle("active", align === "right");
      renderAll();
    }
  }

  if (dom.btnTextAlignLeft) dom.btnTextAlignLeft.addEventListener("click", () => setTextAlign("left"));
  if (dom.btnTextAlignCenter) dom.btnTextAlignCenter.addEventListener("click", () => setTextAlign("center"));
  if (dom.btnTextAlignRight) dom.btnTextAlignRight.addEventListener("click", () => setTextAlign("right"));

  if (dom.btnTextBold) {
    dom.btnTextBold.addEventListener("mousedown", (e) => {
      const activeEditor = document.querySelector(".node-seamless-editor");
      if (activeEditor) e.preventDefault();
    });
    dom.btnTextBold.addEventListener("click", () => {
      const activeEditor = document.querySelector(".node-seamless-editor");
      if (activeEditor) {
        if (window.MinimalFlow && window.MinimalFlow.TextEditor) {
          window.MinimalFlow.TextEditor.toggleSelectionFormatting(activeEditor, "bold");
        } else {
          document.execCommand("bold", false, null);
          activeEditor.dispatchEvent(new Event("input"));
        }
        return;
      }
      const nodes = getSelectedNodesList().filter(n => n.text);
      if (nodes.length > 0) {
        saveSnapshot();
        const nextBold = !nodes[0].text.bold;
        nodes.forEach(n => { n.text.bold = nextBold; });
        dom.btnTextBold.classList.toggle("active", nextBold);
        renderAll();
      }
    });
  }

  if (dom.btnTextItalic) {
    dom.btnTextItalic.addEventListener("mousedown", (e) => {
      const activeEditor = document.querySelector(".node-seamless-editor");
      if (activeEditor) e.preventDefault();
    });
    dom.btnTextItalic.addEventListener("click", () => {
      const activeEditor = document.querySelector(".node-seamless-editor");
      if (activeEditor) {
        if (window.MinimalFlow && window.MinimalFlow.TextEditor) {
          window.MinimalFlow.TextEditor.toggleSelectionFormatting(activeEditor, "italic");
        } else {
          document.execCommand("italic", false, null);
          activeEditor.dispatchEvent(new Event("input"));
        }
        return;
      }
      const nodes = getSelectedNodesList().filter(n => n.text);
      if (nodes.length > 0) {
        saveSnapshot();
        const nextItalic = !nodes[0].text.italic;
        nodes.forEach(n => { n.text.italic = nextItalic; });
        dom.btnTextItalic.classList.toggle("active", nextItalic);
        renderAll();
      }
    });
  }

  if (dom.btnTextUnderline) {
    dom.btnTextUnderline.addEventListener("mousedown", (e) => {
      const activeEditor = document.querySelector(".node-seamless-editor");
      if (activeEditor) e.preventDefault();
    });
    dom.btnTextUnderline.addEventListener("click", () => {
      const activeEditor = document.querySelector(".node-seamless-editor");
      if (activeEditor) {
        if (window.MinimalFlow && window.MinimalFlow.TextEditor && window.MinimalFlow.TextEditor.toggleSelectionFormatting) {
          window.MinimalFlow.TextEditor.toggleSelectionFormatting(activeEditor, "underline");
        } else {
          document.execCommand("underline", false, null);
          activeEditor.dispatchEvent(new Event("input"));
        }
        return;
      }
      const nodes = getSelectedNodesList().filter(n => n.text);
      if (nodes.length > 0) {
        saveSnapshot();
        const nextUnderline = !nodes[0].text.underline;
        nodes.forEach(n => { n.text.underline = nextUnderline; });
        dom.btnTextUnderline.classList.toggle("active", nextUnderline);
        renderAll();
      }
    });
  }

  function updateBatchPaddingX(val) {
    const nodes = getSelectedNodesList().filter(n => n.text);
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => { n.text.paddingX = val; });
      if (dom.propPaddingXNum) dom.propPaddingXNum.value = val;
      if (dom.propPaddingX) dom.propPaddingX.value = String(val);
      renderAll();
    }
  }

  if (dom.propPaddingX) {
    dom.propPaddingX.addEventListener("change", (e) => {
      const val = parseInt(e.target.value) || 0;
      updateBatchPaddingX(val);
    });
  }

  if (dom.propPaddingXNum) {
    dom.propPaddingXNum.addEventListener("change", (e) => {
      const val = Math.max(0, Math.min(120, parseInt(e.target.value) || 0));
      updateBatchPaddingX(val);
    });
    dom.propPaddingXNum.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = Math.max(0, Math.min(120, parseInt(e.target.value) || 0));
        updateBatchPaddingX(val);
        dom.propPaddingXNum.blur();
      }
    });
  }

  // Batch Scaling Helpers
  function scaleSelectedNodes(factor) {
    const nodes = getSelectedNodesList();
    if (nodes.length === 0) return;
    saveSnapshot();

    nodes.forEach(n => {
      const newW = Math.max(20, Math.round(n.width * factor));
      const newH = Math.max(20, Math.round(n.height * factor));
      const dw = newW - n.width;
      const dh = newH - n.height;
      n.x = Math.round(n.x - dw / 2);
      n.y = Math.round(n.y - dh / 2);
      n.width = newW;
      n.height = newH;
      n.baseWidth = newW;
      n.baseHeight = newH;
    });

    if (nodes.length === 1 && dom.propNodeW && dom.propNodeH) {
      dom.propNodeW.value = nodes[0].width;
      dom.propNodeH.value = nodes[0].height;
    }
    renderAll();
    showToast(factor > 1 ? "Perbesar seluruh chart terpilih (+15%)" : "Perkecil seluruh chart terpilih (-15%)");
  }

  function equalizeSelectedNodesSize() {
    const nodes = getSelectedNodesList();
    if (nodes.length < 2) {
      showToast("Pilih minimal 2 chart untuk menyamakan ukuran");
      return;
    }
    saveSnapshot();
    const targetW = nodes[0].width;
    const targetH = nodes[0].height;
    nodes.slice(1).forEach(n => {
      n.width = targetW;
      n.height = targetH;
      n.baseWidth = targetW;
      n.baseHeight = targetH;
    });
    renderAll();
    showToast(`Ukuran seluruh chart disamakan (${targetW} x ${targetH} px)`);
  }

  // Word-Style Object Alignment (Gambar 1)
  function alignSelectedNodes(type) {
    const nodes = getSelectedNodesList();
    if (nodes.length < 2) {
      showToast("Pilih minimal 2 chart untuk perataan");
      return;
    }

    saveSnapshot();

    if (type === "left") {
      const minX = Math.min(...nodes.map(n => n.x));
      nodes.forEach(n => { n.x = minX; });
      showToast("Rata Kiri (Align Left)");
    } else if (type === "center") {
      const minX = Math.min(...nodes.map(n => n.x));
      const maxX = Math.max(...nodes.map(n => n.x + n.width));
      const midX = (minX + maxX) / 2;
      nodes.forEach(n => { n.x = Math.round(midX - n.width / 2); });
      showToast("Rata Tengah Horizontal (Align Center)");
    } else if (type === "right") {
      const maxX = Math.max(...nodes.map(n => n.x + n.width));
      nodes.forEach(n => { n.x = maxX - n.width; });
      showToast("Rata Kanan (Align Right)");
    } else if (type === "top") {
      const minY = Math.min(...nodes.map(n => n.y));
      nodes.forEach(n => { n.y = minY; });
      showToast("Rata Atas (Align Top)");
    } else if (type === "middle") {
      const minY = Math.min(...nodes.map(n => n.y));
      const maxY = Math.max(...nodes.map(n => n.y + n.height));
      const midY = (minY + maxY) / 2;
      nodes.forEach(n => { n.y = Math.round(midY - n.height / 2); });
      showToast("Rata Tengah Vertikal (Align Middle)");
    } else if (type === "bottom") {
      const maxY = Math.max(...nodes.map(n => n.y + n.height));
      nodes.forEach(n => { n.y = maxY - n.height; });
      showToast("Rata Bawah (Align Bottom)");
    } else if (type === "distribute-h") {
      if (nodes.length < 3) {
        showToast("Pilih minimal 3 chart untuk bagi jarak");
        return;
      }
      const sorted = [...nodes].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalInnerW = sorted.slice(1, -1).reduce((sum, n) => sum + n.width, 0);
      const availableSpan = last.x - (first.x + first.width);
      const gap = (availableSpan - totalInnerW) / (sorted.length - 1);
      let curX = first.x + first.width + gap;
      for (let i = 1; i < sorted.length - 1; i++) {
        sorted[i].x = Math.round(curX);
        curX += sorted[i].width + gap;
      }
      showToast("Bagi Rata Jarak Horizontal");
    } else if (type === "distribute-v") {
      if (nodes.length < 3) {
        showToast("Pilih minimal 3 chart untuk bagi tinggi");
        return;
      }
      const sorted = [...nodes].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalInnerH = sorted.slice(1, -1).reduce((sum, n) => sum + n.height, 0);
      const availableSpan = last.y - (first.y + first.height);
      const gap = (availableSpan - totalInnerH) / (sorted.length - 1);
      let curY = first.y + first.height + gap;
      for (let i = 1; i < sorted.length - 1; i++) {
        sorted[i].y = Math.round(curY);
        curY += sorted[i].height + gap;
      }
      showToast("Bagi Rata Jarak Vertikal");
    }

    renderAll();
  }

  // Word-Style Color Palette (Gambar 3)
  const WORD_THEME_COLORS = [
    ["#ffffff", "#000000", "#e7e6e6", "#44546a", "#4472c4", "#ed7d31", "#a5a5a5", "#ffc000", "#5b9bd5", "#70ad47"],
    ["#f2f2f2", "#7f7f7f", "#f2f2f2", "#d6dce4", "#d9e1f2", "#fbe5d6", "#ededed", "#fff2cc", "#deebf7", "#e2efda"],
    ["#d9d9d9", "#595959", "#d9d9d9", "#acb9ca", "#b4c6e7", "#f8cbad", "#dbdbdb", "#ffe699", "#bdd7ee", "#c6e0b4"],
    ["#bfbfbf", "#3f3f3f", "#aeaaaa", "#8497b0", "#8ea9db", "#f4b084", "#c9c9c9", "#ffd966", "#9dc3e6", "#a9d08e"],
    ["#a6a6a6", "#262626", "#757171", "#333f48", "#305496", "#c65911", "#7b7b7b", "#bf8f00", "#2e75b6", "#548235"],
    ["#7f7f7f", "#0c0c0c", "#3a3838", "#222a35", "#203764", "#833c0c", "#525252", "#806000", "#1f4e78", "#375623"]
  ];

  const WORD_STANDARD_COLORS = [
    "#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050", "#00b050", "#00b0f0", "#0070c0", "#002060", "#7030a0"
  ];

  let activeWordColorTarget = null; // "fill" | "stroke" | "textColor"
  let previewOriginalColors = {}; // { [nodeId]: { fill, stroke, textColor } }

  function previewWordColor(color) {
    if (!activeWordColorTarget) return;
    const nodeIds = AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0
      ? Array.from(AppState.ui.selectedNodeIds)
      : (AppState.ui.selectedId ? [AppState.ui.selectedId] : []);
    const nodes = nodeIds.map(id => AppState.document.nodes[id]).filter(n => n);
    if (nodes.length === 0) return;

    if (activeWordColorTarget === "fill") {
      nodes.forEach(n => { n.style.fill = color; });
      if (dom.fillColorBar) dom.fillColorBar.style.background = color === "transparent" ? "none" : color;
    } else if (activeWordColorTarget === "stroke") {
      nodes.forEach(n => { n.style.stroke = color; });
      if (dom.strokeColorBar) dom.strokeColorBar.style.background = color === "transparent" ? "none" : color;
    } else if (activeWordColorTarget === "textColor") {
      nodes.forEach(n => { if (n.text) n.text.color = color; });
      if (dom.textColorBar) dom.textColorBar.style.background = color === "transparent" ? "#000000" : color;
    }
    renderAll();
  }

  function revertWordColorPreview() {
    if (!activeWordColorTarget || Object.keys(previewOriginalColors).length === 0) return;
    Object.entries(previewOriginalColors).forEach(([id, orig]) => {
      const n = AppState.document.nodes[id];
      if (n) {
        if (orig.fill !== undefined && n.style) n.style.fill = orig.fill;
        if (orig.stroke !== undefined && n.style) n.style.stroke = orig.stroke;
        if (orig.textColor !== undefined && n.text) n.text.color = orig.textColor;
      }
    });

    if (AppState.ui.selectedId) {
      const n = AppState.document.nodes[AppState.ui.selectedId];
      if (n) {
        if (dom.fillColorBar && n.style) dom.fillColorBar.style.background = n.style.fill || "#ffffff";
        if (dom.strokeColorBar && n.style) dom.strokeColorBar.style.background = n.style.stroke || "#18181b";
        if (dom.textColorBar && n.text) dom.textColorBar.style.background = n.text.color || "#000000";
      }
    }
    renderAll();
  }

  function initWordColorPalette() {
    if (!dom.wordThemeColorsGrid || !dom.wordStandardColorsRow) return;

    dom.wordThemeColorsGrid.innerHTML = "";
    WORD_THEME_COLORS.forEach(row => {
      row.forEach(color => {
        const cell = document.createElement("div");
        cell.className = "word-color-cell";
        cell.dataset.color = color;
        cell.style.background = color;
        cell.title = color;
        cell.addEventListener("click", () => applyWordChosenColor(color));
        cell.addEventListener("mouseenter", () => previewWordColor(color));
        dom.wordThemeColorsGrid.appendChild(cell);
      });
    });

    dom.wordStandardColorsRow.innerHTML = "";
    WORD_STANDARD_COLORS.forEach(color => {
      const cell = document.createElement("div");
      cell.className = "word-color-cell";
      cell.dataset.color = color;
      cell.style.background = color;
      cell.title = color;
      cell.addEventListener("click", () => applyWordChosenColor(color));
      cell.addEventListener("mouseenter", () => previewWordColor(color));
      dom.wordStandardColorsRow.appendChild(cell);
    });

    // Tambahkan opsi transparan pada baris standard
    const transCell = document.createElement("div");
    transCell.className = "word-color-cell transparent-cell";
    transCell.dataset.color = "transparent";
    transCell.title = "Transparan (Tanpa Warna)";
    transCell.addEventListener("click", () => applyWordChosenColor("transparent"));
    transCell.addEventListener("mouseenter", () => previewWordColor("transparent"));
    dom.wordStandardColorsRow.appendChild(transCell);
  }

  function openWordColorPicker(target, triggerEl) {
    activeWordColorTarget = target;
    previewOriginalColors = {};

    const nodeIds = AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0
      ? Array.from(AppState.ui.selectedNodeIds)
      : (AppState.ui.selectedId ? [AppState.ui.selectedId] : []);
    nodeIds.forEach(id => {
      const n = AppState.document.nodes[id];
      if (n) {
        previewOriginalColors[id] = {
          fill: n.style ? n.style.fill : null,
          stroke: n.style ? n.style.stroke : null,
          textColor: n.text ? n.text.color : null
        };
      }
    });

    const isDark = AppState.document.theme === "dark";

    if (target === "textColor") {
      dom.wordColorAutoBox.style.background = isDark ? "#fafafa" : "#18181b";
      dom.wordColorAutoText.textContent = "Automatic (Warna Font Teks)";
    } else if (target === "fill") {
      dom.wordColorAutoBox.style.background = isDark ? "#18181b" : "#ffffff";
      dom.wordColorAutoText.textContent = "Automatic (Warna Latar Putih/Hitam)";
    } else {
      dom.wordColorAutoBox.style.background = isDark ? "#f4f4f5" : "#18181b";
      dom.wordColorAutoText.textContent = "Automatic (Warna Garis Tepi)";
    }

    const rect = triggerEl.getBoundingClientRect();
    dom.wordColorPickerPopover.style.position = "fixed";
    dom.wordColorPickerPopover.style.top = `${rect.bottom + 6}px`;
    dom.wordColorPickerPopover.style.left = `${Math.max(10, Math.min(window.innerWidth - 260, rect.left - 20))}px`;
    dom.wordColorPickerPopover.classList.add("show");
  }

  function closeWordColorPicker() {
    revertWordColorPreview();
    previewOriginalColors = {};
    if (dom.wordColorPickerPopover) {
      dom.wordColorPickerPopover.classList.remove("show");
    }
    activeWordColorTarget = null;
  }

  function applyWordChosenColor(color) {
    if (!activeWordColorTarget) return;
    previewOriginalColors = {}; // Kosongkan agar tidak di-revert saat popover ditutup
    const nodeIds = AppState.ui.selectedNodeIds && AppState.ui.selectedNodeIds.size > 0
      ? Array.from(AppState.ui.selectedNodeIds)
      : (AppState.ui.selectedId ? [AppState.ui.selectedId] : []);
    const nodes = nodeIds.map(id => AppState.document.nodes[id]).filter(n => n);
    if (nodes.length === 0) {
      closeWordColorPicker();
      return;
    }

    saveSnapshot();

    if (activeWordColorTarget === "fill") {
      nodes.forEach(n => { n.style.fill = color; });
      if (dom.fillColorBar) dom.fillColorBar.style.background = color === "transparent" ? "none" : color;
      showToast(`Warna latar diubah`);
    } else if (activeWordColorTarget === "stroke") {
      nodes.forEach(n => { n.style.stroke = color; });
      if (dom.strokeColorBar) dom.strokeColorBar.style.background = color === "transparent" ? "none" : color;
      showToast(`Warna garis tepi diubah`);
    } else if (activeWordColorTarget === "textColor") {
      nodes.forEach(n => { if (n.text) n.text.color = color; });
      if (dom.textColorBar) dom.textColorBar.style.background = color === "transparent" ? "#000000" : color;
      showToast(`Warna teks diubah`);
    }

    renderAll();
    closeWordColorPicker();
  }

  initWordColorPalette();

  if (dom.wordColorPickerPopover) {
    dom.wordColorPickerPopover.addEventListener("mouseleave", () => {
      revertWordColorPreview();
    });
  }

  if (dom.btnFillColorPicker) {
    dom.btnFillColorPicker.addEventListener("click", (e) => {
      e.stopPropagation();
      openWordColorPicker("fill", dom.btnFillColorPicker);
    });
  }

  if (dom.btnStrokeColorPicker) {
    dom.btnStrokeColorPicker.addEventListener("click", (e) => {
      e.stopPropagation();
      openWordColorPicker("stroke", dom.btnStrokeColorPicker);
    });
  }

  if (dom.btnTextColorPicker) {
    dom.btnTextColorPicker.addEventListener("click", (e) => {
      e.stopPropagation();
      openWordColorPicker("textColor", dom.btnTextColorPicker);
    });
  }

  if (dom.btnWordColorAuto) {
    dom.btnWordColorAuto.addEventListener("mouseenter", () => {
      const isDark = AppState.document.theme === "dark";
      const autoCol = activeWordColorTarget === "fill"
        ? (isDark ? "#18181b" : "#ffffff")
        : (activeWordColorTarget === "textColor" ? (isDark ? "#fafafa" : "#18181b") : (isDark ? "#f4f4f5" : "#18181b"));
      previewWordColor(autoCol);
    });
    dom.btnWordColorAuto.addEventListener("click", () => {
      const isDark = AppState.document.theme === "dark";
      if (activeWordColorTarget === "fill") {
        applyWordChosenColor(isDark ? "#18181b" : "#ffffff");
      } else if (activeWordColorTarget === "textColor") {
        applyWordChosenColor(isDark ? "#fafafa" : "#18181b");
      } else {
        applyWordChosenColor(isDark ? "#f4f4f5" : "#18181b");
      }
    });
  }

  if (dom.btnWordColorNone) {
    dom.btnWordColorNone.addEventListener("mouseenter", () => {
      previewWordColor("transparent");
    });
    dom.btnWordColorNone.addEventListener("click", () => {
      applyWordChosenColor("transparent");
    });
  }

  if (dom.btnWordMoreColors && dom.wordHiddenNativeColor) {
    dom.btnWordMoreColors.addEventListener("click", () => {
      dom.wordHiddenNativeColor.click();
    });
    dom.wordHiddenNativeColor.addEventListener("input", (e) => {
      applyWordChosenColor(e.target.value);
    });
  }

  // Close menus when clicking outside
  window.addEventListener("click", (e) => {
    if (dom.wordColorPickerPopover && !dom.wordColorPickerPopover.contains(e.target) && !e.target.closest(".word-color-btn")) {
      closeWordColorPicker();
    }
    if (dom.menuAlignDropdown && !dom.menuAlignDropdown.contains(e.target) && !e.target.closest("#btn-align-menu")) {
      dom.menuAlignDropdown.classList.remove("show");
    }
  });

  // Format Painter (Salin Gaya ala Canva & Word: 1x Klik = 1x Pakai, Klik Ganda = Berkelanjutan)
  if (dom.btnFormatPainter) {
    dom.btnFormatPainter.addEventListener("click", (e) => {
      // Jika mode berkelanjutan sedang aktif, klik lagi untuk menonaktifkan
      if (AppState.ui.formatPainter && AppState.ui.formatPainter.active && AppState.ui.formatPainter.mode === "persistent") {
        deactivateFormatPainter();
        showToast("Kuas Cat dinonaktifkan");
        return;
      }
      const style = copyNodeStyle();
      if (!style) {
        showToast("Pilih chart terlebih dahulu untuk menyalin gaya");
        return;
      }
      activateFormatPainter("single");
      showToast("Kuas Cat aktif (1x). Klik chart tujuan untuk menerapkan gaya.");
    });

    dom.btnFormatPainter.addEventListener("dblclick", (e) => {
      e.preventDefault();
      const style = copyNodeStyle();
      if (!style) {
        showToast("Pilih chart terlebih dahulu untuk menyalin gaya");
        return;
      }
      activateFormatPainter("persistent");
      showToast("Kuas Cat aktif berkelanjutan. Klik chart mana saja (Esc untuk selesai).");
    });
  }

  // Multi-Node Batch Resize Inputs
  function updateBatchWidth(val) {
    const nodes = getSelectedNodesList();
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => { n.width = val; n.baseWidth = val; });
      renderAll();
    }
  }

  function updateBatchHeight(val) {
    const nodes = getSelectedNodesList();
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => { n.height = val; n.baseHeight = val; });
      renderAll();
    }
  }

  function updateBatchStrokeWidth(val) {
    const nodes = getSelectedNodesList();
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => {
        if (!n.locked) {
          n.style = n.style || {};
          n.style.strokeWidth = val;
        }
      });
      renderAll();
    }
  }

  function updateBatchStrokeDash(val) {
    const nodes = getSelectedNodesList();
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => {
        if (!n.locked) {
          n.style = n.style || {};
          n.style.dashed = val;
        }
      });
      renderAll();
    }
  }

  if (dom.propNodeStrokeWidth) {
    dom.propNodeStrokeWidth.addEventListener("change", (e) => {
      const val = parseFloat(e.target.value) || 1.5;
      updateBatchStrokeWidth(val);
    });
  }

  if (dom.propNodeStrokeDash) {
    dom.propNodeStrokeDash.addEventListener("change", (e) => {
      const val = e.target.value;
      updateBatchStrokeDash(val);
    });
  }

  dom.propNodeW.addEventListener("change", (e) => {
    const val = Math.max(10, parseInt(e.target.value) || 10);
    updateBatchWidth(val);
  });
  dom.propNodeW.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = Math.max(10, parseInt(e.target.value) || 10);
      updateBatchWidth(val);
      dom.propNodeW.blur();
    }
  });

  dom.propNodeH.addEventListener("change", (e) => {
    const val = Math.max(10, parseInt(e.target.value) || 10);
    updateBatchHeight(val);
  });
  dom.propNodeH.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = Math.max(10, parseInt(e.target.value) || 10);
      updateBatchHeight(val);
      dom.propNodeH.blur();
    }
  });
  dom.propNodeH.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = Math.max(10, parseInt(e.target.value) || 10);
      updateBatchHeight(val);
      dom.propNodeH.blur();
    }
  });

  // Batch Scale Buttons
  if (dom.btnScaleDownAll) dom.btnScaleDownAll.addEventListener("click", () => scaleSelectedNodes(0.85));
  if (dom.btnScaleUpAll) dom.btnScaleUpAll.addEventListener("click", () => scaleSelectedNodes(1.15));
  if (dom.btnEqualizeSize) dom.btnEqualizeSize.addEventListener("click", () => equalizeSelectedNodesSize());

  // Text Vertical Alignment Buttons (Top, Middle, Bottom)
  function setTextValign(valign) {
    const nodes = getSelectedNodesList().filter(n => n.text);
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => { n.text.verticalAlign = valign; });
      if (dom.btnTextValignTop) dom.btnTextValignTop.classList.toggle("active", valign === "top");
      if (dom.btnTextValignMiddle) dom.btnTextValignMiddle.classList.toggle("active", valign === "middle");
      if (dom.btnTextValignBottom) dom.btnTextValignBottom.classList.toggle("active", valign === "bottom");
      renderAll();
    }
  }

  if (dom.btnTextValignTop) dom.btnTextValignTop.addEventListener("click", () => setTextValign("top"));
  if (dom.btnTextValignMiddle) dom.btnTextValignMiddle.addEventListener("click", () => setTextValign("middle"));
  if (dom.btnTextValignBottom) dom.btnTextValignBottom.addEventListener("click", () => setTextValign("bottom"));

  // Toolbar Pin / Lock Toggle Handler
  if (dom.btnPinToolbar) {
    dom.btnPinToolbar.addEventListener("click", () => {
      AppState.ui.isToolbarPinned = !AppState.ui.isToolbarPinned;
      dom.btnPinToolbar.classList.toggle("pinned", AppState.ui.isToolbarPinned);
      dom.btnPinToolbar.classList.toggle("active", AppState.ui.isToolbarPinned);
      dom.btnPinToolbar.setAttribute(
        "title",
        AppState.ui.isToolbarPinned ? "Lepas Kunci Toolbar (Otomatis Sembunyi)" : "Kunci Toolbar (Tetap Terbuka saat Klik Kanvas)"
      );
      if (AppState.ui.isToolbarPinned) {
        dom.nodeBar.classList.add("show");
        showToast("Toolbar dikunci (tetap terbuka)");
      } else {
        showToast("Kunci toolbar dilepas");
        updatePropertiesBar();
      }
    });
  }

  // Alignment Menu
  if (dom.btnAlignMenu && dom.menuAlignDropdown) {
    dom.btnAlignMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      dom.menuAlignDropdown.classList.toggle("show");
    });
    dom.menuAlignDropdown.querySelectorAll(".dropdown-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        alignSelectedNodes(btn.dataset.align);
        dom.menuAlignDropdown.classList.remove("show");
      });
    });
  }

  dom.btnNodeEditText.addEventListener("click", () => {
    if (AppState.ui.selectedId) openInlineEditor(AppState.ui.selectedId);
  });
  dom.btnNodeRotate.addEventListener("click", () => {
    const nodes = getSelectedNodesList();
    if (nodes.length > 0) {
      saveSnapshot();
      nodes.forEach(n => { n.rotation = ((n.rotation || 0) + 90) % 360; });
      renderAll();
      showToast(nodes.length > 1 ? `${nodes.length} chart diputar 90°` : "Chart diputar 90°");
    } else if (AppState.ui.selectedId) {
      rotateNode(AppState.ui.selectedId);
    }
  });
  dom.btnNodeLock.addEventListener("click", () => {
    lockSelectedNodes(null);
  });

  // Layer Z-Order Controls Wiring (Floating Toolbar & Sidebar)
  if (dom.btnLayerDown) dom.btnLayerDown.addEventListener("click", () => reorderSelectedNodes("backward"));
  if (dom.btnLayerUp) dom.btnLayerUp.addEventListener("click", () => reorderSelectedNodes("forward"));
  if (dom.btnLayerBackmost) dom.btnLayerBackmost.addEventListener("click", () => reorderSelectedNodes("backmost"));
  if (dom.btnLayerTopmost) dom.btnLayerTopmost.addEventListener("click", () => reorderSelectedNodes("topmost"));
  if (dom.btnToggleLayersPanel) dom.btnToggleLayersPanel.addEventListener("click", toggleLayersPanel);
  if (dom.btnAlignCenter) dom.btnAlignCenter.addEventListener("click", alignSelectedNodesCenter);
  if (dom.btnAlignMiddle) dom.btnAlignMiddle.addEventListener("click", alignSelectedNodesMiddle);

  if (dom.btnToggleLayersBar) dom.btnToggleLayersBar.addEventListener("click", toggleLayersPanel);
  if (dom.btnLayersClose) dom.btnLayersClose.addEventListener("click", () => {
    if (dom.layersPanel) dom.layersPanel.classList.remove("show");
    if (dom.btnToggleLayersBar) dom.btnToggleLayersBar.classList.remove("active");
    if (dom.btnToggleLayersPanel) dom.btnToggleLayersPanel.classList.remove("active");
  });

  if (dom.btnSideLayerDown) dom.btnSideLayerDown.addEventListener("click", () => reorderSelectedNodes("backward"));
  if (dom.btnSideLayerUp) dom.btnSideLayerUp.addEventListener("click", () => reorderSelectedNodes("forward"));
  if (dom.btnSideLayerBackmost) dom.btnSideLayerBackmost.addEventListener("click", () => reorderSelectedNodes("backmost"));
  if (dom.btnSideLayerTopmost) dom.btnSideLayerTopmost.addEventListener("click", () => reorderSelectedNodes("topmost"));

  document.querySelectorAll(".color-swatch").forEach(swatch => {
    swatch.addEventListener("click", () => {
      const node = AppState.document.nodes[AppState.ui.selectedId];
      if (node) applyNodeFill(node, swatch.dataset.color);
    });
  });

  if (dom.propCustomColor) {
    dom.propCustomColor.addEventListener("input", (e) => {
      const node = AppState.document.nodes[AppState.ui.selectedId];
      if (node) applyNodeFill(node, e.target.value);
    });
  }

  // Edge Property Bar Controls
  document.getElementById("prop-edge-type").addEventListener("change", (e) => {
    const edge = AppState.document.edges[AppState.ui.selectedId];
    if (edge) { saveSnapshot(); edge.type = e.target.value; renderAll(); }
  });
  document.getElementById("prop-edge-marker").addEventListener("change", (e) => {
    const edge = AppState.document.edges[AppState.ui.selectedId];
    if (edge) {
      saveSnapshot();
      const val = e.target.value;
      edge.style.markerStart = val === "both" ? "arrow" : "none";
      edge.style.markerEnd = val === "none" ? "none" : "arrow";
      renderAll();
    }
  });
  document.getElementById("prop-edge-width").addEventListener("change", (e) => {
    const edge = AppState.document.edges[AppState.ui.selectedId];
    if (edge) {
      saveSnapshot();
      edge.style.strokeWidth = parseFloat(e.target.value) || 1.5;
      renderAll();
    }
  });
  document.getElementById("prop-edge-dash").addEventListener("change", (e) => {
    const edge = AppState.document.edges[AppState.ui.selectedId];
    if (edge) { saveSnapshot(); edge.style.dashed = e.target.value; renderAll(); }
  });
  document.getElementById("btn-reset-handle").addEventListener("click", () => {
    const edge = AppState.document.edges[AppState.ui.selectedId];
    if (edge) { saveSnapshot(); edge.handleOffset = { dx: 0, dy: 0 }; renderAll(); showToast("Jalur di-reset"); }
  });

  // Export Menu Controller
  const exportBtn = document.getElementById("btn-export-dropdown");
  const exportMenu = document.getElementById("export-menu");
  exportBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle("show");
  });
  window.addEventListener("click", () => exportMenu.classList.remove("show"));

  // --------------------------------------------------------------------------
  // EXPORT IMAGE QUALITY MODAL CONTROLLER
  // --------------------------------------------------------------------------
  let currentExportFormat = "png-trans"; // "png-trans" | "png-white" | "jpg"
  let currentExportScale = 2; // 1 | 2 | 3 | 4

  const SCALE_LABELS = {
    1: "1x (Standar Web)",
    2: "2x (Retina HD)",
    3: "3x (Ultra HD)",
    4: "4x (Print-Ready)"
  };

  const FORMAT_SIZE_ESTIMATES = {
    "png-trans": { 1: "~150 KB – 350 KB", 2: "~450 KB – 1.2 MB", 3: "~1.2 MB – 2.5 MB", 4: "~2.5 MB – 5.0 MB" },
    "png-white": { 1: "~180 KB – 400 KB", 2: "~500 KB – 1.4 MB", 3: "~1.5 MB – 3.0 MB", 4: "~3.0 MB – 6.0 MB" },
    "jpg":       { 1: "~80 KB – 200 KB",  2: "~220 KB – 550 KB", 3: "~500 KB – 1.1 MB", 4: "~1.0 MB – 2.2 MB" }
  };

  function updateExportModalPreview() {
    if (!dom.exportDimPreview) return;
    const bbox = Exporter.getExportBoundingBox(AppState.document);
    const outW = Math.round(bbox.width * currentExportScale);
    const outH = Math.round(bbox.height * currentExportScale);

    dom.exportDimPreview.textContent = `${outW} × ${outH} px`;

    if (dom.exportAspectPreview) {
      const preset = AppState.document.canvas.boundaryPreset || "16:9_landscape";
      let presetLabel = "16:9 Landscape";
      if (preset.includes("9:16")) presetLabel = "9:16 Portrait";
      else if (preset.includes("a4_portrait")) presetLabel = "A4 Portrait";
      else if (preset.includes("a4_landscape")) presetLabel = "A4 Landscape";
      else if (preset.includes("square")) presetLabel = "1:1 Persegi";
      dom.exportAspectPreview.textContent = `Batas: ${presetLabel}`;
    }

    if (dom.exportSizeEstimate) {
      const estTable = FORMAT_SIZE_ESTIMATES[currentExportFormat] || FORMAT_SIZE_ESTIMATES["png-trans"];
      dom.exportSizeEstimate.textContent = estTable[currentExportScale] || "~500 KB";
    }

    if (dom.exportScaleBadge) {
      dom.exportScaleBadge.textContent = SCALE_LABELS[currentExportScale] || `${currentExportScale}x`;
    }
  }

  function openExportModal(defaultFormat) {
    if (!dom.exportModalBackdrop) return;
    if (defaultFormat) {
      currentExportFormat = defaultFormat;
      document.querySelectorAll(".export-format-card").forEach(card => {
        card.classList.toggle("active", card.dataset.format === defaultFormat);
      });
    }
    updateExportModalPreview();
    dom.exportModalBackdrop.classList.add("show");
  }

  function closeExportModal() {
    if (!dom.exportModalBackdrop) return;
    dom.exportModalBackdrop.classList.remove("show");
  }

  if (dom.btnCloseExportModal) dom.btnCloseExportModal.addEventListener("click", closeExportModal);
  if (dom.btnCancelExportModal) dom.btnCancelExportModal.addEventListener("click", closeExportModal);
  if (dom.exportModalBackdrop) {
    dom.exportModalBackdrop.addEventListener("click", (e) => {
      if (e.target === dom.exportModalBackdrop) closeExportModal();
    });
  }

  document.querySelectorAll(".export-format-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".export-format-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      currentExportFormat = card.dataset.format || "png-trans";
      updateExportModalPreview();
    });
  });

  document.querySelectorAll(".export-scale-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".export-scale-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentExportScale = parseInt(btn.dataset.scale) || 2;
      updateExportModalPreview();
    });
  });

  if (dom.btnDoDownloadImage) {
    dom.btnDoDownloadImage.addEventListener("click", () => {
      const projName = projectManager.getActiveProjectName();
      closeExportModal();

      if (currentExportFormat === "png-trans") {
        const filename = Projects.getSafeFilename(projName + `-trans-${currentExportScale}x`, "png");
        Exporter.exportPng(AppState.document, dom.svg, true, currentExportScale, filename, () => {
          showToast(`PNG Transparan (${currentExportScale}x) berhasil diunduh!`);
        });
      } else if (currentExportFormat === "png-white") {
        const filename = Projects.getSafeFilename(projName + `-${currentExportScale}x`, "png");
        Exporter.exportPng(AppState.document, dom.svg, false, currentExportScale, filename, () => {
          showToast(`PNG Solid (${currentExportScale}x) berhasil diunduh!`);
        });
      } else if (currentExportFormat === "jpg") {
        const filename = Projects.getSafeFilename(projName + `-${currentExportScale}x`, "jpg");
        Exporter.exportJpg(AppState.document, dom.svg, currentExportScale, 0.95, filename, () => {
          showToast(`JPG Kualitas Tinggi (${currentExportScale}x) berhasil diunduh!`);
        });
      }
    });
  }

  exportMenu.addEventListener("click", (e) => {
    const item = e.target.closest(".dropdown-item");
    if (!item) return;
    const action = item.dataset.action;
    const projName = projectManager.getActiveProjectName();

    if (action === "open-export-modal") {
      openExportModal();
    } else if (action === "export-png-trans") {
      openExportModal("png-trans");
    } else if (action === "export-png-white") {
      openExportModal("png-white");
    } else if (action === "export-jpg") {
      openExportModal("jpg");
    } else if (action === "export-svg") {
      const filename = Projects.getSafeFilename(projName, "svg");
      Exporter.exportSvg(AppState.document, dom.svg, filename);
      showToast("SVG Batas Workspace diunduh!");
    } else if (action === "copy-clipboard") {
      Exporter.copyCanvasToClipboard(AppState.document, dom.svg, () => {
        showToast("Gambar disalin ke Clipboard!");
      }, () => {
        showToast("Gagal menyalin: izin clipboard ditolak");
      });
    } else if (action === "export-pdf") {
      const filename = Projects.getSafeFilename(projName, "pdf");
      Exporter.exportPdf(AppState.document, dom.svg, filename, () => {
        showToast("PDF berhasil diunduh!");
      });
    } else if (action === "save-json") {
      const filename = Projects.getSafeFilename(projName, "flow.json");
      Exporter.exportJson(AppState.document, filename);
      showToast("Project JSON tersimpan!");
    }
  });

  // --------------------------------------------------------------------------
  // DUAL-MODE JSON IMPORT & LIVE COMPILER CONTROLLER
  // --------------------------------------------------------------------------
  function updateJsonImportStatus() {
    if (!dom.inputJsonRaw || !dom.jsonImportStatus) return null;
    const raw = dom.inputJsonRaw.value.trim();
    if (!raw) {
      dom.jsonImportStatus.className = "status-badge status-idle";
      dom.jsonImportStatus.textContent = "Menunggu kode JSON / MMD atau lepaskan berkas...";
      return null;
    }

    const adapter = window.MinimalFlow && window.MinimalFlow.Adapter;
    const isDark = AppState.document.theme === "dark";

    if (adapter && typeof adapter.parseUniversal === "function") {
      const res = adapter.parseUniversal(raw, isDark);
      if (res.success) {
        dom.jsonImportStatus.className = "status-badge status-success";
        dom.jsonImportStatus.textContent = `${res.formatTitle}: ${res.nodeCount} node, ${res.edgeCount} kabel`;
        return res.document;
      } else {
        dom.jsonImportStatus.className = "status-badge status-error";
        dom.jsonImportStatus.textContent = res.error || "Format tidak valid atau tidak dikenali";
        return null;
      }
    }

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("JSON harus berupa objek valid.");
      }
      const nodeCount = parsed.nodes ? Object.keys(parsed.nodes).length : 0;
      const edgeCount = parsed.edges ? Object.keys(parsed.edges).length : 0;
      dom.jsonImportStatus.className = "status-badge status-success";
      dom.jsonImportStatus.textContent = `Format JSON Valid (${nodeCount} node, ${edgeCount} kabel)`;
      return parsed;
    } catch (e) {
      dom.jsonImportStatus.className = "status-badge status-error";
      dom.jsonImportStatus.textContent = `Sintaks Error: ${e.message}`;
      return null;
    }
  }

  function updateGeminiApiKeyStatusUI() {
    const scanner = window.MinimalFlow && window.MinimalFlow.VisionScanner;
    const hasKey = scanner ? scanner.hasApiKey() : false;
    if (dom.geminiKeyStatus) {
      if (hasKey) {
        dom.geminiKeyStatus.className = "status-badge status-success";
        dom.geminiKeyStatus.textContent = "Kunci Tersimpan";
      } else {
        dom.geminiKeyStatus.className = "status-badge status-idle";
        dom.geminiKeyStatus.textContent = "Kunci Belum Diatur";
      }
    }
    if (dom.visionStatusDot && dom.visionStatusSummary) {
      if (hasKey) {
        dom.visionStatusDot.style.background = "#22c55e";
        dom.visionStatusSummary.textContent = "Engine AI Siap Digunakan";
        dom.visionStatusSummary.style.color = "var(--text-main)";
      } else {
        dom.visionStatusDot.style.background = "var(--text-muted)";
        dom.visionStatusSummary.textContent = "Memerlukan Kunci API (Klik Pengaturan di bawah)";
        dom.visionStatusSummary.style.color = "var(--text-muted)";
      }
    }
    if (dom.inputGeminiApiKey && hasKey && !dom.inputGeminiApiKey.value) {
      dom.inputGeminiApiKey.value = scanner.getApiKey();
    }
  }

  function switchImportTab(tab) {
    if (tab === "vision") {
      if (dom.tabBtnCode) {
        dom.tabBtnCode.classList.remove("active");
        dom.tabBtnCode.style.borderBottom = "2px solid transparent";
        dom.tabBtnCode.style.color = "var(--text-muted)";
        dom.tabBtnCode.style.fontWeight = "500";
      }
      if (dom.tabBtnVision) {
        dom.tabBtnVision.classList.add("active");
        dom.tabBtnVision.style.borderBottom = "2px solid var(--text-main)";
        dom.tabBtnVision.style.color = "var(--text-main)";
        dom.tabBtnVision.style.fontWeight = "600";
      }
      if (dom.viewTabCode) dom.viewTabCode.style.display = "none";
      if (dom.viewTabVision) dom.viewTabVision.style.display = "flex";
      updateGeminiApiKeyStatusUI();
    } else {
      if (dom.tabBtnVision) {
        dom.tabBtnVision.classList.remove("active");
        dom.tabBtnVision.style.borderBottom = "2px solid transparent";
        dom.tabBtnVision.style.color = "var(--text-muted)";
        dom.tabBtnVision.style.fontWeight = "500";
      }
      if (dom.tabBtnCode) {
        dom.tabBtnCode.classList.add("active");
        dom.tabBtnCode.style.borderBottom = "2px solid var(--text-main)";
        dom.tabBtnCode.style.color = "var(--text-main)";
        dom.tabBtnCode.style.fontWeight = "600";
      }
      if (dom.viewTabCode) dom.viewTabCode.style.display = "flex";
      if (dom.viewTabVision) dom.viewTabVision.style.display = "none";
    }
  }

  function openJsonModal() {
    if (!dom.jsonModalBackdrop) return;
    closeContextMenu();
    // Default buka Tab 1 (Kode & Berkas)
    switchImportTab("code");
    updateGeminiApiKeyStatusUI();

    // Pre-fill dengan alur aktif saat ini jika editor masih kosong
    if (dom.inputJsonRaw && !dom.inputJsonRaw.value.trim()) {
      try {
        dom.inputJsonRaw.value = JSON.stringify(AppState.document, null, 2);
      } catch (e) {
        dom.inputJsonRaw.value = "";
      }
    }
    updateJsonImportStatus();
    dom.jsonModalBackdrop.classList.add("show");
  }

  function closeJsonModal() {
    if (!dom.jsonModalBackdrop) return;
    dom.jsonModalBackdrop.classList.remove("show");
    if (dom.jsonEditorBox) {
      dom.jsonEditorBox.classList.remove("is-dragging-file");
    }
  }

  function loadJsonContentIntoEditor(content, filename = "") {
    if (!dom.inputJsonRaw) return;
    dom.inputJsonRaw.value = content;
    const parsed = updateJsonImportStatus();
    if (parsed) {
      showToast(filename ? `Berkas "${filename}" berhasil diterjemahkan!` : "Diagram berhasil diterjemahkan!");
    } else {
      showToast("Peringatan: Berkas tidak dapat dikenali atau memiliki kesalahan sintaks");
    }
  }

  function handleReadJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      loadJsonContentIntoEditor(e.target.result, file.name);
    };
    reader.readAsText(file);
  }

  // Kompilasi dan ganti seluruh alur kanvas aktif
  function compileAndApplyJsonReplace() {
    const parsed = updateJsonImportStatus();
    if (!parsed) {
      showToast("Gagal: Format diagram tidak valid atau belum dikenali!");
      return;
    }
    if (!parsed.nodes || typeof parsed.nodes !== "object" || Object.keys(parsed.nodes).length === 0) {
      showToast("Gagal: Tidak ada komponen alur yang dapat diekstrak!");
      return;
    }

    saveSnapshot();
    AppState.document.nodes = parsed.nodes;
    AppState.document.edges = (parsed.edges && typeof parsed.edges === "object") ? parsed.edges : {};
    if (parsed.canvas && typeof parsed.canvas === "object") {
      AppState.document.canvas.workspace = parsed.canvas.workspace || AppState.document.canvas.workspace;
    }
    if (parsed.theme) {
      // Pertahankan tema studio global
      const studioTheme = localStorage.getItem("minimalflow_theme") || parsed.theme;
      AppState.document.theme = studioTheme;
      applyTheme(studioTheme);
    }

    // Auto-fit tampilan viewport agar diagram besar/panjang langsung terlihat penuh
    if (parsed.canvas && parsed.canvas.workspace && dom.canvasSvg) {
      const ws = parsed.canvas.workspace;
      const svgRect = dom.canvasSvg.getBoundingClientRect();
      const svgW = svgRect.width > 100 ? svgRect.width : window.innerWidth;
      const svgH = svgRect.height > 100 ? svgRect.height : window.innerHeight;
      const margin = 80;
      const fitZoom = Math.min((svgW - margin) / ws.width, (svgH - margin) / ws.height);
      if (fitZoom < 0.95) {
        const clampedZoom = Math.min(Math.max(fitZoom, 0.25), 1.0);
        AppState.document.canvas.zoom = clampedZoom;
        AppState.document.canvas.pan = {
          x: (svgW - ws.width * clampedZoom) / 2 - (ws.x || 0) * clampedZoom,
          y: Math.max(30, (svgH - ws.height * clampedZoom) / 2 - (ws.y || 0) * clampedZoom)
        };
      }
    }

    cancelTapConnect();
    deselectAll();
    updateWorkspaceUI();
    updateViewportUI();
    renderAll();
    closeJsonModal();
    showToast(`Berhasil kompilasi: ${Object.keys(AppState.document.nodes).length} chart dimuat!`);
  }

  // Gabungkan (Merge) alur baru ke alur yang sudah ada
  function compileAndApplyJsonMerge() {
    const parsed = updateJsonImportStatus();
    if (!parsed || !parsed.nodes) {
      showToast("Gagal: Format JSON tidak valid!");
      return;
    }

    saveSnapshot();
    const existingNodeIds = new Set(Object.keys(AppState.document.nodes));
    const idMap = {};
    let addedCount = 0;

    // Geser sedikit posisi agar tidak bertumpuk jika menempel diagram identik
    const offsetX = existingNodeIds.size > 0 ? 60 : 0;
    const offsetY = existingNodeIds.size > 0 ? 60 : 0;

    for (const [oldId, nodeData] of Object.entries(parsed.nodes)) {
      let finalId = oldId;
      if (existingNodeIds.has(finalId)) {
        finalId = "node_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      }
      idMap[oldId] = finalId;
      const copy = JSON.parse(JSON.stringify(nodeData));
      copy.id = finalId;
      copy.x = (copy.x || 0) + offsetX;
      copy.y = (copy.y || 0) + offsetY;
      AppState.document.nodes[finalId] = copy;
      addedCount++;
    }

    if (parsed.edges) {
      for (const [oldEdgeId, edgeData] of Object.entries(parsed.edges)) {
        const srcId = idMap[edgeData.source?.nodeId] || edgeData.source?.nodeId;
        const tgtId = idMap[edgeData.target?.nodeId] || edgeData.target?.nodeId;
        if (AppState.document.nodes[srcId] && AppState.document.nodes[tgtId]) {
          const newEdgeId = "edge_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
          const copyEdge = JSON.parse(JSON.stringify(edgeData));
          copyEdge.id = newEdgeId;
          copyEdge.source.nodeId = srcId;
          copyEdge.target.nodeId = tgtId;
          AppState.document.edges[newEdgeId] = copyEdge;
        }
      }
    }

    renderAll();
    closeJsonModal();
    showToast(`${addedCount} chart baru berhasil digabungkan ke kanvas!`);
  }

  // Wire JSON Modal Listeners
  if (dom.btnOpenJson) {
    dom.btnOpenJson.addEventListener("click", openJsonModal);
  }
  if (dom.btnCloseJsonModal) {
    dom.btnCloseJsonModal.addEventListener("click", closeJsonModal);
  }
  if (dom.btnCancelJsonModal) {
    dom.btnCancelJsonModal.addEventListener("click", closeJsonModal);
  }
  if (dom.jsonModalBackdrop) {
    dom.jsonModalBackdrop.addEventListener("click", (e) => {
      if (e.target === dom.jsonModalBackdrop) closeJsonModal();
    });
  }
  if (dom.btnBrowseJsonFile && dom.fileInputJsonModal) {
    dom.btnBrowseJsonFile.addEventListener("click", () => dom.fileInputJsonModal.click());
    dom.fileInputJsonModal.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleReadJsonFile(e.target.files[0]);
        dom.fileInputJsonModal.value = "";
      }
    });
  }
  if (dom.btnFormatJson) {
    dom.btnFormatJson.addEventListener("click", () => {
      if (!dom.inputJsonRaw) return;
      const raw = dom.inputJsonRaw.value.trim();
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        dom.inputJsonRaw.value = JSON.stringify(parsed, null, 2);
        updateJsonImportStatus();
        showToast("Format JSON dirapikan!");
      } catch (e) {
        // Jika bukan JSON, rapikan baris diagram Mermaid / teks
        const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          const header = lines[0];
          const body = lines.slice(1).map(l => "    " + l);
          dom.inputJsonRaw.value = [header, ...body].join("\n");
          updateJsonImportStatus();
          showToast("Format skrip Mermaid dirapikan!");
        }
      }
    });
  }
  if (dom.btnClearJson) {
    dom.btnClearJson.addEventListener("click", () => {
      if (dom.inputJsonRaw) {
        dom.inputJsonRaw.value = "";
        updateJsonImportStatus();
      }
    });
  }
  if (dom.inputJsonRaw) {
    dom.inputJsonRaw.addEventListener("input", updateJsonImportStatus);
  }
  if (dom.btnApplyJsonReplace) {
    dom.btnApplyJsonReplace.addEventListener("click", compileAndApplyJsonReplace);
  }
  if (dom.btnApplyJsonMerge) {
    dom.btnApplyJsonMerge.addEventListener("click", compileAndApplyJsonMerge);
  }

  // Drag & drop reactive dropzone
  if (dom.jsonEditorBox) {
    let dragCounter = 0;
    dom.jsonEditorBox.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      dom.jsonEditorBox.classList.add("is-dragging-file");
    });

    dom.jsonEditorBox.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.jsonEditorBox.classList.add("is-dragging-file");
    });

    dom.jsonEditorBox.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dom.jsonEditorBox.classList.remove("is-dragging-file");
      }
    });

    dom.jsonEditorBox.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      dom.jsonEditorBox.classList.remove("is-dragging-file");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleReadJsonFile(e.dataTransfer.files[0]);
      }
    });
  }

  // TAB & AI VISION SCANNER EVENT LISTENERS
  if (dom.tabBtnCode) {
    dom.tabBtnCode.addEventListener("click", () => switchImportTab("code"));
  }
  if (dom.tabBtnVision) {
    dom.tabBtnVision.addEventListener("click", () => switchImportTab("vision"));
  }

  // Gemini API Key Management
  if (dom.btnSaveGeminiKey) {
    dom.btnSaveGeminiKey.addEventListener("click", () => {
      const keyVal = dom.inputGeminiApiKey ? dom.inputGeminiApiKey.value.trim() : "";
      if (!keyVal) {
        if (confirm("Kosongkan API Key yang tersimpan?")) {
          window.MinimalFlow.VisionScanner.saveApiKey("");
          updateGeminiApiKeyStatusUI();
          showToast("Kunci API Gemini dihapus");
        }
        return;
      }
      window.MinimalFlow.VisionScanner.saveApiKey(keyVal);
      updateGeminiApiKeyStatusUI();
      showToast("Kunci API Gemini berhasil disimpan secara lokal!");
    });
  }

  if (dom.btnToggleKeyVisibility) {
    dom.btnToggleKeyVisibility.addEventListener("click", () => {
      if (!dom.inputGeminiApiKey) return;
      if (dom.inputGeminiApiKey.type === "password") {
        dom.inputGeminiApiKey.type = "text";
        dom.btnToggleKeyVisibility.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      } else {
        dom.inputGeminiApiKey.type = "password";
        dom.btnToggleKeyVisibility.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
    });
  }

  // Vision File Dropzone & Selection Handling
  let currentVisionFile = null;

  function setVisionFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Peringatan: Berkas harus berupa gambar (PNG, JPG, WebP)");
      return;
    }
    currentVisionFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (dom.visionPreviewImg) dom.visionPreviewImg.src = e.target.result;
      if (dom.visionFileInfo) {
        const kb = Math.round(file.size / 1024);
        dom.visionFileInfo.textContent = `${file.name} (${kb} KB)`;
      }
      if (dom.visionDropzoneEmpty) dom.visionDropzoneEmpty.style.display = "none";
      if (dom.visionDropzonePreview) dom.visionDropzonePreview.style.display = "flex";
      if (dom.visionStatusBanner) dom.visionStatusBanner.style.display = "none";
    };
    reader.readAsDataURL(file);
  }

  if (dom.btnBrowseVisionImg) {
    dom.btnBrowseVisionImg.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dom.fileInputVision) dom.fileInputVision.click();
    });
  }
  if (dom.btnChangeVisionImg) {
    dom.btnChangeVisionImg.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dom.fileInputVision) dom.fileInputVision.click();
    });
  }
  if (dom.visionDropzoneBox) {
    dom.visionDropzoneBox.addEventListener("click", () => {
      if (!currentVisionFile && dom.fileInputVision) {
        dom.fileInputVision.click();
      }
    });

    let vDragCounter = 0;
    dom.visionDropzoneBox.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      vDragCounter++;
      dom.visionDropzoneBox.style.borderColor = "var(--text-main)";
      dom.visionDropzoneBox.style.backgroundColor = "var(--bg-subtle)";
    });
    dom.visionDropzoneBox.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.visionDropzoneBox.style.borderColor = "var(--text-main)";
    });
    dom.visionDropzoneBox.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      vDragCounter--;
      if (vDragCounter <= 0) {
        vDragCounter = 0;
        dom.visionDropzoneBox.style.borderColor = "var(--border-color)";
        dom.visionDropzoneBox.style.backgroundColor = "var(--bg-surface)";
      }
    });
    dom.visionDropzoneBox.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      vDragCounter = 0;
      dom.visionDropzoneBox.style.borderColor = "var(--border-color)";
      dom.visionDropzoneBox.style.backgroundColor = "var(--bg-surface)";
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setVisionFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (dom.fileInputVision) {
    dom.fileInputVision.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        setVisionFile(e.target.files[0]);
        dom.fileInputVision.value = "";
      }
    });
  }

  // Eksekusi Pemindaian Gambar dengan AI Vision
  if (dom.btnRunVisionScan) {
    dom.btnRunVisionScan.addEventListener("click", async () => {
      if (!currentVisionFile) {
        showToast("Pilih atau lepaskan berkas gambar diagram terlebih dahulu!");
        return;
      }
      if (!window.MinimalFlow.VisionScanner.hasApiKey()) {
        if (dom.detailsGeminiConfig) dom.detailsGeminiConfig.open = true;
        if (dom.inputGeminiApiKey) dom.inputGeminiApiKey.focus();
        showToast("Masukkan Google Gemini API Key di menu pengaturan bawah untuk memindai");
        return;
      }

      const origBtnHtml = dom.btnRunVisionScan.innerHTML;
      dom.btnRunVisionScan.disabled = true;
      dom.btnRunVisionScan.style.opacity = "0.7";
      dom.btnRunVisionScan.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10"/>
        </svg>
        <span>Memindai Diagram...</span>
      `;

      if (dom.visionStatusBanner) {
        dom.visionStatusBanner.style.display = "flex";
        dom.visionStatusBanner.style.background = "var(--bg-subtle)";
        dom.visionStatusBanner.style.color = "var(--text-main)";
        dom.visionStatusBanner.style.border = "1px solid var(--border-color)";
        dom.visionStatusBanner.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon" style="flex-shrink:0;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg><span>Mengirim gambar ke Google Gemini Vision API...</span>`;
      }

      try {
        const mermaidCode = await window.MinimalFlow.VisionScanner.scanDiagramImage(
          currentVisionFile,
          (msg) => {
            if (dom.visionStatusBanner) {
              dom.visionStatusBanner.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon" style="flex-shrink:0;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg><span>${escapeHtml(msg)}</span>`;
            }
          }
        );

        if (dom.visionStatusBanner) {
          dom.visionStatusBanner.style.display = "none";
        }

        // Muat hasil teks Mermaid ke editor kode Tab 1
        if (dom.inputJsonRaw) {
          dom.inputJsonRaw.value = mermaidCode;
        }

        // Beralih otomatis ke Tab Kode
        switchImportTab("code");
        const parsed = updateJsonImportStatus();

        showToast("Rekonstruksi AI selesai! Diagram siap diterapkan.");
      } catch (err) {
        if (dom.visionStatusBanner) {
          dom.visionStatusBanner.style.display = "flex";
          dom.visionStatusBanner.style.background = "rgba(239, 68, 68, 0.1)";
          dom.visionStatusBanner.style.color = "#ef4444";
          dom.visionStatusBanner.style.border = "1px solid rgba(239, 68, 68, 0.3)";
          dom.visionStatusBanner.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>${escapeHtml(err.message)}</span>`;
        }
        showToast(`Gagal: ${err.message}`);
      } finally {
        dom.btnRunVisionScan.disabled = false;
        dom.btnRunVisionScan.style.opacity = "1";
        dom.btnRunVisionScan.innerHTML = origBtnHtml;
      }
    });
  }

  // Projects Modal UI
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderProjectsModalList() {
    const listEl = dom.projectsListContainer;
    listEl.innerHTML = "";
    const all = projectManager.getAllProjects();
    if (dom.projectsCountLabel) {
      dom.projectsCountLabel.textContent = `${all.length} PROYEK`;
    }

    all.forEach(p => {
      const isActive = p.id === projectManager.data.activeId;
      const dateStr = p.updatedAt ? new Date(p.updatedAt).toLocaleString("id-ID", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      }).replace(/\./g, ":") : "Baru saja";

      const card = document.createElement("div");
      card.className = "project-card" + (isActive ? " active-project" : "");
      card.dataset.id = p.id;
      card.innerHTML = `
        <div class="project-info" data-action="open-project" data-id="${p.id}">
          <div class="project-title-row">
            <span class="project-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
            ${isActive ? `<span class="project-badge-active">Aktif</span>` : ""}
          </div>
          <div class="project-meta">
            <span>Diperbarui: ${dateStr}</span>
          </div>
        </div>
        <div class="project-actions">
          <button class="project-action-btn btn-rename-p" data-id="${p.id}" title="Ganti Nama Alur">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="project-action-btn btn-dup-p" data-id="${p.id}" title="Duplikat Alur">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          ${all.length > 1 ? `
            <button class="project-action-btn danger btn-del-p" data-id="${p.id}" title="Hapus Alur">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          ` : ""}
        </div>
      `;

      listEl.appendChild(card);
    });
  }

  function openProjectsModal() {
    projectManager.autoSaveCurrent(AppState.document);
    renderProjectsModalList();
    dom.projectsModalBackdrop.classList.add("show");
  }

  function closeProjectsModal() {
    dom.projectsModalBackdrop.classList.remove("show");
  }

  dom.btnProjectsMenu.addEventListener("click", openProjectsModal);
  dom.btnCloseProjectsModal.addEventListener("click", closeProjectsModal);
  dom.projectsModalBackdrop.addEventListener("click", (e) => {
    if (e.target === dom.projectsModalBackdrop) closeProjectsModal();
  });

  const handleCreateProject = () => {
    const inputVal = dom.inputNewProjectName ? dom.inputNewProjectName.value.trim() : "";
    const created = projectManager.createProject(inputVal);
    if (dom.inputNewProjectName) dom.inputNewProjectName.value = "";
    loadProject(created.id);
    closeProjectsModal();
    showToast(`Proyek "${created.name}" berhasil dibuat!`);
  };

  dom.btnCreateNewProject.addEventListener("click", handleCreateProject);
  dom.inputNewProjectName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateProject();
    }
  });

  function loadProject(id) {
    const proj = projectManager.setActiveProject(id);
    if (proj && proj.document) {
      AppState.document = JSON.parse(JSON.stringify(proj.document));
      historyManager.clear();
      if (AppState.ui.selectedNodeIds) AppState.ui.selectedNodeIds.clear();
      // Pertahankan tema studio global yang sedang aktif agar tidak tereset ke light saat berganti proyek
      const studioTheme = localStorage.getItem("minimalflow_theme") || AppState.document.theme || "light";
      AppState.document.theme = studioTheme;
      applyTheme(studioTheme);
      updateWorkspaceUI();
      updateViewportUI();
      saveSnapshot();
      renderAll();
      showToast(`Proyek "${proj.name}" dimuat`);
    }
  }

  dom.projectsListContainer.addEventListener("click", (e) => {
    const btnRename = e.target.closest(".btn-rename-p");
    if (btnRename) {
      e.stopPropagation();
      const pId = btnRename.dataset.id;
      const proj = projectManager.data.projects[pId];
      if (proj) {
        const newName = prompt("Masukkan nama baru untuk proyek:", proj.name);
        if (newName && newName.trim() && newName.trim() !== proj.name) {
          projectManager.renameProject(pId, newName);
          renderProjectsModalList();
          showToast(`Nama proyek diubah menjadi "${newName}"`);
        }
      }
      return;
    }

    const btnDup = e.target.closest(".btn-dup-p");
    if (btnDup) {
      e.stopPropagation();
      const dup = projectManager.duplicateProject(btnDup.dataset.id);
      if (dup) {
        renderProjectsModalList();
        showToast(`Proyek diduplikasi: "${dup.name}"`);
      }
      return;
    }

    const btnDel = e.target.closest(".btn-del-p");
    if (btnDel) {
      e.stopPropagation();
      const pId = btnDel.dataset.id;
      const proj = projectManager.data.projects[pId];
      if (proj && confirm(`Hapus proyek "${proj.name}" secara permanen?`)) {
        projectManager.deleteProject(pId);
        loadProject(projectManager.data.activeId);
        renderProjectsModalList();
        showToast("Proyek berhasil dihapus");
      }
      return;
    }

    const card = e.target.closest(".project-card");
    if (card && card.dataset.id) {
      loadProject(card.dataset.id);
      closeProjectsModal();
    }
  });

  dom.btnResetDemoWorkflow.addEventListener("click", () => {
    if (confirm("Muat ulang alur contoh default (5 chart alur lengkap)? Alur saat ini akan digantikan.")) {
      AppState.document = Projects.getDefaultDocument();
      projectManager.autoSaveCurrent(AppState.document);
      historyManager.clear();
      saveSnapshot();
      updateWorkspaceUI();
      updateViewportUI();
      renderAll();
      closeProjectsModal();
      showToast("Alur contoh default berhasil dimuat!");
    }
  });

  // Guide & Shortcut Modal Wiring
  function openGuideModal() {
    if (dom.guideModalBackdrop) {
      dom.guideModalBackdrop.classList.add("show");
    }
  }

  function closeGuideModal() {
    if (dom.guideModalBackdrop) {
      dom.guideModalBackdrop.classList.remove("show");
    }
  }

  if (dom.btnOpenGuide) dom.btnOpenGuide.addEventListener("click", openGuideModal);
  if (dom.btnCloseGuideModal) dom.btnCloseGuideModal.addEventListener("click", closeGuideModal);
  if (dom.btnCloseGuideFooter) dom.btnCloseGuideFooter.addEventListener("click", closeGuideModal);
  if (dom.guideModalBackdrop) {
    dom.guideModalBackdrop.addEventListener("click", (e) => {
      if (e.target === dom.guideModalBackdrop) closeGuideModal();
    });
  }

  // Initialization & Bootstrap
  const savedTheme = localStorage.getItem("minimalflow_theme") || AppState.document.theme || "light";
  applyTheme(savedTheme);
  updateWorkspaceUI();
  updateViewportUI();
  saveSnapshot();
  renderAll();

})();
