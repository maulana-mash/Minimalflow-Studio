/**
 * MinimalFlow Studio — Canvas & Coordinate Engine
 * Mengelola proyeksi koordinat layar-kanvas, zoom, pan, grid dots, dan batas workspace.
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  const WORKSPACE_PRESETS = {
    "16:9_landscape": { w: 1600, h: 900, name: "16:9 Landscape" },
    "9:16_portrait":  { w: 900, h: 1600, name: "9:16 Portrait" },
    "a4_landscape":   { w: 1414, h: 1000, name: "A4 Landscape" },
    "a4_portrait":    { w: 1000, h: 1414, name: "A4 Portrait" },
    "square":         { w: 1200, h: 1200, name: "Persegi (Square)" }
  };

  function screenToWorld(clientX, clientY, svgEl, canvasState) {
    const rect = svgEl.getBoundingClientRect();
    const { pan, zoom } = canvasState;
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  }

  function worldToScreen(worldX, worldY, svgEl, canvasState) {
    const rect = svgEl.getBoundingClientRect();
    const { pan, zoom } = canvasState;
    return {
      x: worldX * zoom + pan.x + rect.left,
      y: worldY * zoom + pan.y + rect.top
    };
  }

  function rotatePoint(px, py, cx, cy, angleDeg) {
    if (!angleDeg) return { x: px, y: py };
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = px - cx;
    const dy = py - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    };
  }

  function updateViewportTransform(viewportEl, gridPatternEl, zoomTextEl, canvasState) {
    const { pan, zoom } = canvasState;
    if (viewportEl) {
      viewportEl.setAttribute("transform", `translate(${pan.x}, ${pan.y}) scale(${zoom})`);
    }
    if (gridPatternEl) {
      gridPatternEl.setAttribute("patternTransform", `translate(${pan.x}, ${pan.y}) scale(${zoom})`);
    }
    if (zoomTextEl) {
      zoomTextEl.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  function updateWorkspaceBoundary(rectEl, labelEl, workspaceState) {
    if (!rectEl || !labelEl || !workspaceState) return;
    rectEl.setAttribute("x", workspaceState.x);
    rectEl.setAttribute("y", workspaceState.y);
    rectEl.setAttribute("width", workspaceState.width);
    rectEl.setAttribute("height", workspaceState.height);

    const isLandscape = workspaceState.width >= workspaceState.height;
    const oriName = isLandscape ? "LANDSCAPE" : "PORTRAIT";
    labelEl.setAttribute("x", workspaceState.x + 10);
    labelEl.setAttribute("y", workspaceState.y - 10);
    labelEl.textContent = `BATAS WORKSPACE KANVAS EKSPOR (${workspaceState.width} x ${workspaceState.height} px - ${oriName})`;
  }

  function setWorkspacePreset(presetKey, doc, onUpdate) {
    const p = WORKSPACE_PRESETS[presetKey] || WORKSPACE_PRESETS["16:9_landscape"];
    const ws = doc.canvas.workspace;
    ws.preset = presetKey;
    ws.width = p.w;
    ws.height = p.h;
    ws.orientation = p.w >= p.h ? "landscape" : "portrait";
    if (typeof onUpdate === "function") onUpdate(ws, p.name);
  }

  function toggleWorkspaceOrientation(doc, onUpdate) {
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
    if (typeof onUpdate === "function") onUpdate(ws, ws.orientation);
  }

  function zoomAt(clientX, clientY, zoomDelta, svgEl, canvasState, onUpdate) {
    const oldZoom = canvasState.zoom;
    const newZoom = Math.min(Math.max(oldZoom * zoomDelta, 0.2), 3.5);
    const rect = svgEl.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const pan = canvasState.pan;
    pan.x = mouseX - (mouseX - pan.x) * (newZoom / oldZoom);
    pan.y = mouseY - (mouseY - pan.y) * (newZoom / oldZoom);
    canvasState.zoom = newZoom;

    if (typeof onUpdate === "function") onUpdate(canvasState);
  }

  function zoomTowards(pivotScreenX, pivotScreenY, factor, svgEl, canvasState, onUpdate) {
    zoomAt(pivotScreenX, pivotScreenY, factor, svgEl, canvasState, onUpdate);
  }

  exports.Canvas = {
    WORKSPACE_PRESETS,
    screenToWorld,
    worldToScreen,
    rotatePoint,
    updateViewportTransform,
    updateWorkspaceBoundary,
    setWorkspacePreset,
    toggleWorkspaceOrientation,
    zoomAt,
    zoomTowards
  };

})(window.MinimalFlow);
