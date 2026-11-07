<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { FlowDocument, FlowNode, FlowConnector, NodeType, PinDirection } from '../types';
  import { screenToWorld, worldToScreen, getShapePath, rotatePoint } from '../engine/canvasRenderer';
  import { getNodePinCoordinates, getNodePinNormal, getAllNodePins } from '../engine/magneticEngine';
  import { calculateEdgePath } from '../engine/lineRouter';
  import { layoutNodeText } from '../engine/textLayout';

  export let doc: FlowDocument;
  export let selectedType: 'node' | 'edge' | null = null;
  export let selectedId: string | null = null;
  export let editingNodeId: string | null = null;

  export let onSelect: (type: 'node' | 'edge' | null, id: string | null) => void;
  export let onStartEditingText: (nodeId: string) => void;
  export let onOpenContextMenu: (clientX: number, clientY: number, targetType: 'node' | 'edge' | 'canvas' | null, targetId: string | null) => void;
  export let onSaveSnapshot: () => void;
  export let onImageDrop: (file: File, worldX: number, worldY: number) => void;

  const dispatch = createEventDispatcher();

  let containerEl: HTMLDivElement;
  let svgEl: SVGSVGElement;

  // UI Interactive State
  let mode: 'IDLE' | 'PANNING' | 'DRAGGING_NODE' | 'RESIZING_NODE' | 'PIN_DOWN' | 'DRAWING_WIRE' | 'DRAGGING_HANDLE' = 'IDLE';
  let hoveredNodeId: string | null = null;
  let activePin: { nodeId: string; pin: PinDirection } | null = null;
  let pendingPinSource: { nodeId: string; pin: PinDirection } | null = null;
  let draftWire: { x1: number; y1: number; x2: number; y2: number } | null = null;

  let dragStartPos = { x: 0, y: 0 };
  let nodeInitialPos = { x: 0, y: 0 };
  let handleInitialOffset = { dx: 0, dy: 0 };
  let resizeStart = { x: 0, y: 0, w: 0, h: 0, corner: 'se', nodeId: '' };

  export function getSvgElement(): SVGSVGElement {
    return svgEl;
  }

  // Helper konversi koordinat
  function getEventWorldPos(e: MouseEvent) {
    if (!svgEl) return { x: 0, y: 0 };
    const rect = svgEl.getBoundingClientRect();
    return screenToWorld(e.clientX, e.clientY, rect, doc.canvas.pan, doc.canvas.zoom);
  }

  // --- MOUSE WHEEL ZOOM & PAN ---
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const rect = svgEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldZoom = doc.canvas.zoom;
      const newZoom = Math.max(0.2, Math.min(3.0, oldZoom * zoomFactor));

      doc.canvas.pan.x = mouseX - (mouseX - doc.canvas.pan.x) * (newZoom / oldZoom);
      doc.canvas.pan.y = mouseY - (mouseY - doc.canvas.pan.y) * (newZoom / oldZoom);
      doc.canvas.zoom = newZoom;
    } else {
      // Pan
      doc.canvas.pan.x -= e.deltaX;
      doc.canvas.pan.y -= e.deltaY;
    }
  }

  // --- DRAG OVER & DROP DARI KOMPUTER ATAU SIDEBAR ---
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const pos = getEventWorldPos(e);

    // Cek jika yang di-drop adalah file gambar dari PC
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith("image/") || file.name.endsWith(".svg"))) {
        onImageDrop(file, pos.x, pos.y);
        return;
      }
    }

    // Cek jika yang di-drop adalah tipe shape dari sidebar
    const shapeType = e.dataTransfer?.getData("shape-type") as NodeType;
    if (shapeType) {
      dispatch('createNode', { type: shapeType, x: pos.x - 70, y: pos.y - 30 });
    }
  }

  // --- MOUSE DOWN ON CANVAS / ELEMENTS ---
  function handleMouseDown(e: MouseEvent) {
    if (e.button === 1 || (e.button === 0 && e.spaceKey)) {
      // Middle click or Space + Click -> Panning
      mode = 'PANNING';
      dragStartPos = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button === 0) {
      const target = e.target as HTMLElement | SVGElement;

      // 1. Cek apakah klik pada Pin Magnetik
      const pinEl = target.closest(".pin-circle") as SVGElement;
      if (pinEl) {
        e.stopPropagation();
        const nodeId = pinEl.dataset.nodeId!;
        const pin = pinEl.dataset.pin! as PinDirection;

        if (pendingPinSource) {
          // Mode Tap-To-Connect: Hubungkan pin sumber dengan pin target
          if (pendingPinSource.nodeId !== nodeId) {
            connectPins(pendingPinSource, { nodeId, pin });
          }
          pendingPinSource = null;
          mode = 'IDLE';
          return;
        }

        // Mulai drag atau siapkan tap
        mode = 'PIN_DOWN';
        activePin = { nodeId, pin };
        dragStartPos = { x: e.clientX, y: e.clientY };
        return;
      }

      // 2. Cek apakah klik pada Resize Handle
      const handleEl = target.closest(".resize-handle") as SVGElement;
      if (handleEl && selectedType === 'node' && selectedId) {
        e.stopPropagation();
        mode = 'RESIZING_NODE';
        const node = doc.nodes[selectedId];
        resizeStart = {
          x: e.clientX,
          y: e.clientY,
          w: node.width,
          h: node.height,
          corner: handleEl.dataset.corner || 'se',
          nodeId: selectedId
        };
        return;
      }

      // 3. Cek apakah klik pada Edge Midpoint Handle
      const edgeHandleEl = target.closest(".edge-handle") as SVGElement;
      if (edgeHandleEl) {
        e.stopPropagation();
        const edgeId = edgeHandleEl.dataset.edgeId!;
        mode = 'DRAGGING_HANDLE';
        onSelect('edge', edgeId);
        dragStartPos = { x: e.clientX, y: e.clientY };
        handleInitialOffset = { ...doc.edges[edgeId].handleOffset };
        return;
      }

      // 4. Cek apakah klik pada Edge Path
      const edgeEl = target.closest(".flow-edge-group") as SVGElement;
      if (edgeEl) {
        e.stopPropagation();
        const edgeId = edgeEl.dataset.edgeId!;
        onSelect('edge', edgeId);
        return;
      }

      // 5. Cek apakah klik pada Node
      const nodeEl = target.closest(".node-group") as SVGElement;
      if (nodeEl) {
        e.stopPropagation();
        const nodeId = nodeEl.dataset.nodeId!;
        onSelect('node', nodeId);

        const node = doc.nodes[nodeId];
        if (!node.locked) {
          mode = 'DRAGGING_NODE';
          dragStartPos = { x: e.clientX, y: e.clientY };
          nodeInitialPos = { x: node.x, y: node.y };
        }
        return;
      }

      // Klik pada canvas kosong
      onSelect(null, null);
      if (pendingPinSource) {
        pendingPinSource = null;
      }
    }
  }

  // --- MOUSE MOVE ---
  function handleMouseMove(e: MouseEvent) {
    if (mode === 'PANNING') {
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      doc.canvas.pan.x += dx;
      doc.canvas.pan.y += dy;
      dragStartPos = { x: e.clientX, y: e.clientY };
      return;
    }

    if (mode === 'DRAGGING_NODE' && selectedId && doc.nodes[selectedId]) {
      const dx = (e.clientX - dragStartPos.x) / doc.canvas.zoom;
      const dy = (e.clientY - dragStartPos.y) / doc.canvas.zoom;
      const node = doc.nodes[selectedId];
      node.x = Math.round(nodeInitialPos.x + dx);
      node.y = Math.round(nodeInitialPos.y + dy);
      return;
    }

    if (mode === 'RESIZING_NODE' && resizeStart.nodeId && doc.nodes[resizeStart.nodeId]) {
      const dx = (e.clientX - resizeStart.x) / doc.canvas.zoom;
      const dy = (e.clientY - resizeStart.y) / doc.canvas.zoom;
      const node = doc.nodes[resizeStart.nodeId];

      if (resizeStart.corner === 'se') {
        node.width = Math.max(50, Math.round(resizeStart.w + dx));
        node.height = Math.max(30, Math.round(resizeStart.h + dy));
      } else if (resizeStart.corner === 'sw') {
        node.width = Math.max(50, Math.round(resizeStart.w - dx));
        node.height = Math.max(30, Math.round(resizeStart.h + dy));
      } else if (resizeStart.corner === 'ne') {
        node.width = Math.max(50, Math.round(resizeStart.w + dx));
        node.height = Math.max(30, Math.round(resizeStart.h - dy));
      } else if (resizeStart.corner === 'nw') {
        node.width = Math.max(50, Math.round(resizeStart.w - dx));
        node.height = Math.max(30, Math.round(resizeStart.h - dy));
      }
      return;
    }

    if (mode === 'DRAGGING_HANDLE' && selectedId && doc.edges[selectedId]) {
      const dx = (e.clientX - dragStartPos.x) / doc.canvas.zoom;
      const dy = (e.clientY - dragStartPos.y) / doc.canvas.zoom;
      doc.edges[selectedId].handleOffset = {
        dx: Math.round(handleInitialOffset.dx + dx),
        dy: Math.round(handleInitialOffset.dy + dy)
      };
      return;
    }

    if (mode === 'PIN_DOWN') {
      const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
      if (dist > 5 && activePin) {
        mode = 'DRAWING_WIRE';
        const sourceNode = doc.nodes[activePin.nodeId];
        const p1 = getNodePinCoordinates(sourceNode, activePin.pin);
        draftWire = { x1: p1.x, y1: p1.y, x2: p1.x, y2: p1.y };
      }
    }

    if (mode === 'DRAWING_WIRE' && draftWire) {
      const pos = getEventWorldPos(e);
      draftWire.x2 = pos.x;
      draftWire.y2 = pos.y;
    }
  }

  // --- MOUSE UP ---
  function handleMouseUp(e: MouseEvent) {
    if (mode === 'PIN_DOWN' && activePin) {
      // User hanya melakukan tap ringan (<5px) pada pin -> Aktifkan Tap-to-Connect Mode
      pendingPinSource = { ...activePin };
      activePin = null;
      mode = 'IDLE';
      return;
    }

    if (mode === 'DRAWING_WIRE' && activePin) {
      // Selesai drag wire: cari apakah dilepas di dekat pin target
      const pos = getEventWorldPos(e);
      let closestPin: { nodeId: string; pin: PinDirection } | null = null;
      let minDist = 22;

      for (const [nId, n] of Object.entries(doc.nodes)) {
        if (nId === activePin.nodeId) continue;
        const pins = getAllNodePins(n);
        for (const p of pins) {
          const d = Math.hypot(p.x - pos.x, p.y - pos.y);
          if (d < minDist) {
            minDist = d;
            closestPin = { nodeId: nId, pin: p.id };
          }
        }
      }

      if (closestPin) {
        connectPins(activePin, closestPin);
      }

      draftWire = null;
      activePin = null;
      mode = 'IDLE';
      return;
    }

    if (mode === 'DRAGGING_NODE' || mode === 'RESIZING_NODE' || mode === 'DRAGGING_HANDLE') {
      onSaveSnapshot();
    }

    mode = 'IDLE';
  }

  // --- HUBUNGKAN PIN (BUAT EDGE BARU) ---
  function connectPins(
    source: { nodeId: string; pin: PinDirection },
    target: { nodeId: string; pin: PinDirection }
  ) {
    onSaveSnapshot();
    const newEdgeId = "edge_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const newEdge: FlowConnector = {
      id: newEdgeId,
      type: "step",
      source: { nodeId: source.nodeId, pin: source.pin },
      target: { nodeId: target.nodeId, pin: target.pin },
      handleOffset: { dx: 0, dy: 0 },
      style: {
        stroke: doc.theme === 'dark' ? '#f4f4f5' : '#18181b',
        strokeWidth: 1.5,
        dashed: 'solid',
        markerStart: 'none',
        markerEnd: 'arrow'
      }
    };
    doc.edges[newEdgeId] = newEdge;
    onSelect('edge', newEdgeId);
  }

  // --- DOUBLE CLICK PADA NODE (DIRECT IN-PLACE TEXT EDITING) ---
  function handleNodeDoubleClick(e: MouseEvent, nodeId: string) {
    e.stopPropagation();
    e.preventDefault();
    onSelect('node', nodeId);
    onStartEditingText(nodeId);
  }

  // --- CONTEXT MENU (RIGHT CLICK) ---
  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement | SVGElement;
    const nodeEl = target.closest(".node-group") as SVGElement;
    if (nodeEl) {
      const nodeId = nodeEl.dataset.nodeId!;
      onSelect('node', nodeId);
      onOpenContextMenu(e.clientX, e.clientY, 'node', nodeId);
      return;
    }

    const edgeEl = target.closest(".flow-edge-group") as SVGElement;
    if (edgeEl) {
      const edgeId = edgeEl.dataset.edgeId!;
      onSelect('edge', edgeId);
      onOpenContextMenu(e.clientX, e.clientY, 'edge', edgeId);
      return;
    }

    onOpenContextMenu(e.clientX, e.clientY, 'canvas', null);
  }

  function cancelTapMode() {
    pendingPinSource = null;
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div 
  class="canvas-viewport-container" 
  bind:this={containerEl}
  tabindex="0"
  role="application"
  aria-label="Interactive Canvas Viewport"
  on:wheel={handleWheel}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:contextmenu={handleContextMenu}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
>
  <!-- Tap-to-Connect Banner Info -->
  {#if pendingPinSource}
    <div class="tap-banner">
      <span>Mode Sambung Pin Aktif: Klik pin target pada chart tujuan</span>
      <button on:click={cancelTapMode}>Batal</button>
    </div>
  {/if}

  <svg class="canvas-svg" bind:this={svgEl}>
    <defs>
      <!-- Grid Dot Pattern -->
      <pattern 
        id="dot-grid" 
        width={doc.canvas.gridSize} 
        height={doc.canvas.gridSize} 
        patternUnits="userSpaceOnUse"
        patternTransform="translate({doc.canvas.pan.x}, {doc.canvas.pan.y}) scale({doc.canvas.zoom})"
      >
        <circle 
          cx={doc.canvas.gridSize / 2} 
          cy={doc.canvas.gridSize / 2} 
          r="1.2" 
          fill={doc.theme === 'dark' ? '#27272a' : '#d4d4d8'} 
        />
      </pattern>

      <!-- Arrow Marker (Start & End) -->
      <marker 
        id="flow-arrow-end" 
        viewBox="0 0 10 10" 
        refX="9" 
        refY="5" 
        markerWidth="6" 
        markerHeight="6" 
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 9 5 L 0 8.5 Z" fill={doc.theme === 'dark' ? '#f4f4f5' : '#18181b'} />
      </marker>

      <marker 
        id="flow-arrow-start" 
        viewBox="0 0 10 10" 
        refX="1" 
        refY="5" 
        markerWidth="6" 
        markerHeight="6" 
        orient="auto-start-reverse"
      >
        <path d="M 9 1.5 L 0 5 L 9 8.5 Z" fill={doc.theme === 'dark' ? '#f4f4f5' : '#18181b'} />
      </marker>
    </defs>

    <!-- Grid Rect Background -->
    <rect id="bg-rect" width="100%" height="100%" fill="transparent" />
    <rect id="grid-rect" width="100%" height="100%" fill="url(#dot-grid)" style="pointer-events: none;" />

    <!-- Main Viewport Transform Group -->
    <g id="viewport" transform="translate({doc.canvas.pan.x}, {doc.canvas.pan.y}) scale({doc.canvas.zoom})">
      
      <!-- LAYER 1: Workspace Boundary Line (Batasan Rasio Ekspor) -->
      <g id="layer-workspace-boundary">
        <rect 
          class="workspace-boundary-rect"
          x={doc.canvas.workspace.x}
          y={doc.canvas.workspace.y}
          width={doc.canvas.workspace.width}
          height={doc.canvas.workspace.height}
        />
        <text 
          class="workspace-boundary-label"
          x={doc.canvas.workspace.x + 10}
          y={doc.canvas.workspace.y - 10}
        >
          BATAS WORKSPACE KANVAS EKSPOR ({doc.canvas.workspace.width} x {doc.canvas.workspace.height} px - {doc.canvas.workspace.orientation.toUpperCase()})
        </text>
      </g>

      <!-- LAYER 2: Edges / Kabel Penghubung -->
      <g id="layer-edges">
        {#each Object.values(doc.edges) as edge (edge.id)}
          {@const sNode = doc.nodes[edge.source.nodeId]}
          {@const tNode = doc.nodes[edge.target.nodeId]}
          {#if sNode && tNode}
            {@const pathResult = calculateEdgePath(edge, sNode, tNode)}
            <g class="flow-edge-group" class:selected={selectedType === 'edge' && selectedId === edge.id} data-edge-id={edge.id}>
              <!-- Invisible hit-area stroke for easy clicking -->
              <path 
                d={pathResult.pathD} 
                fill="none" 
                stroke="transparent" 
                stroke-width="12" 
                style="cursor: pointer;"
              />
              <!-- Visible edge path -->
              <path 
                class="flow-edge-path"
                d={pathResult.pathD}
                fill="none"
                stroke={edge.style.stroke || (doc.theme === 'dark' ? '#f4f4f5' : '#18181b')}
                stroke-width={edge.style.strokeWidth || 1.5}
                stroke-dasharray={edge.style.dashed === 'dashed' ? '5,4' : 'none'}
                marker-end={edge.style.markerEnd === 'arrow' ? 'url(#flow-arrow-end)' : 'none'}
                marker-start={edge.style.markerStart === 'arrow' ? 'url(#flow-arrow-start)' : 'none'}
              />
            </g>
          {/if}
        {/each}
      </g>

      <!-- LAYER 3: Nodes (Chart Shapes & Text) -->
      <g id="layer-nodes">
        {#each Object.values(doc.nodes) as node (node.id)}
          {@const rot = node.rotation || 0}
          <g 
            class="node-group"
            class:selected={selectedType === 'node' && selectedId === node.id}
            class:locked={node.locked}
            role="button"
            tabindex="0"
            aria-label="Chart Node {node.id}"
            data-node-id={node.id}
            transform="translate({node.x}, {node.y}) rotate({rot}, {node.width / 2}, {node.height / 2})"
            on:dblclick={(e) => handleNodeDoubleClick(e, node.id)}
            on:mouseenter={() => hoveredNodeId = node.id}
            on:mouseleave={() => { if (hoveredNodeId === node.id) hoveredNodeId = null; }}
          >
            <!-- Render Image or Vector Shape -->
            {#if node.type === 'image' && node.src}
              <image 
                href={node.src}
                x="0"
                y="0"
                width={node.width}
                height={node.height}
                preserveAspectRatio="contain"
                style="pointer-events: none;"
              />
              <rect 
                class="node-shape"
                x="0"
                y="0"
                width={node.width}
                height={node.height}
                rx="4"
                fill="transparent"
                stroke={doc.theme === 'dark' ? '#3f3f46' : '#e4e4e7'}
                stroke-width="1"
              />
            {:else}
              <path 
                class="node-shape"
                d={getShapePath(node.type, node.width, node.height)}
                fill={node.style.fill}
                stroke={node.style.stroke || (doc.theme === 'dark' ? '#f4f4f5' : '#18181b')}
                stroke-width={node.style.strokeWidth || 1.5}
              />

              <!-- Render Text (Hanya jika tidak sedang diedit via inline editor) -->
              {#if node.text && editingNodeId !== node.id}
                {@const layout = layoutNodeText(node)}
                {@const isPlaceholder = !!node.text.isPlaceholder || (node.text.content || '').trim().toLowerCase() === 'insert text'}
                <text 
                  x={layout.xPos}
                  y={layout.startY}
                  text-anchor={layout.anchor}
                  font-family={node.text.fontFamily}
                  font-size={node.text.fontSize}
                  font-weight={node.text.bold ? '700' : '500'}
                  font-style={node.text.italic ? 'italic' : 'normal'}
                  text-decoration={node.text.underline ? 'underline' : 'none'}
                  fill={node.text.color || (doc.theme === 'dark' ? '#f4f4f5' : '#18181b')}
                  opacity={isPlaceholder ? 0.45 : 1.0}
                  style="pointer-events: none; user-select: none;"
                >
                  {#each layout.lines as line, idx}
                    <tspan x={layout.xPos} dy={idx === 0 ? 0 : layout.lineHeight}>
                      {line || ' '}
                    </tspan>
                  {/each}
                </text>
              {/if}
            {/if}
          </g>
        {/each}
      </g>

      <!-- LAYER 4: Draft Wire saat menarik koneksi -->
      <g id="layer-draft">
        {#if draftWire}
          <line 
            x1={draftWire.x1} 
            y1={draftWire.y1} 
            x2={draftWire.x2} 
            y2={draftWire.y2} 
            stroke={doc.theme === 'dark' ? '#60a5fa' : '#2563eb'} 
            stroke-width="2" 
            stroke-dasharray="4,4" 
          />
        {/if}
      </g>

      <!-- LAYER 5: Overlays (Pins, Handles, Selection) -->
      <g id="layer-overlays">
        <!-- Pin Magnetik pada Node yang di-hover, dipilih, atau saat tap-to-connect aktif -->
        {#each Object.values(doc.nodes) as node (node.id)}
          {#if hoveredNodeId === node.id || selectedId === node.id || pendingPinSource}
            {@const pins = getAllNodePins(node)}
            {#each pins as pin}
              {@const isSource = pendingPinSource?.nodeId === node.id && pendingPinSource?.pin === pin.id}
              <circle 
                class="pin-circle" 
                class:active-source={isSource}
                cx={pin.x} 
                cy={pin.y} 
                r="5" 
                fill={isSource ? '#2563eb' : (doc.theme === 'dark' ? '#f4f4f5' : '#18181b')} 
                stroke={doc.theme === 'dark' ? '#18181b' : '#ffffff'} 
                stroke-width="1.5"
                data-node-id={node.id}
                data-pin={pin.id}
              />
            {/each}
          {/if}
        {/each}

        <!-- Resize Handles pada Node yang Terpilih (jika tidak di-lock) -->
        {#if selectedType === 'node' && selectedId && doc.nodes[selectedId] && !doc.nodes[selectedId].locked}
          {@const n = doc.nodes[selectedId]}
          {@const rot = n.rotation || 0}
          <g transform="translate({n.x}, {n.y}) rotate({rot}, {n.width / 2}, {n.height / 2})">
            <rect class="resize-handle handle-nw" x="-4" y="-4" width="8" height="8" data-corner="nw" />
            <rect class="resize-handle handle-ne" x={n.width - 4} y="-4" width="8" height="8" data-corner="ne" />
            <rect class="resize-handle handle-sw" x="-4" y={n.height - 4} width="8" height="8" data-corner="sw" />
            <rect class="resize-handle handle-se" x={n.width - 4} y={n.height - 4} width="8" height="8" data-corner="se" />
          </g>
        {/if}

        <!-- Midpoint Handle pada Edge yang Terpilih -->
        {#if selectedType === 'edge' && selectedId && doc.edges[selectedId]}
          {@const edge = doc.edges[selectedId]}
          {@const sNode = doc.nodes[edge.source.nodeId]}
          {@const tNode = doc.nodes[edge.target.nodeId]}
          {#if sNode && tNode}
            {@const pathResult = calculateEdgePath(edge, sNode, tNode)}
            <circle 
              class="edge-handle"
              cx={pathResult.handlePos.x} 
              cy={pathResult.handlePos.y} 
              r="6" 
              fill={doc.theme === 'dark' ? '#ffffff' : '#18181b'} 
              stroke={doc.theme === 'dark' ? '#18181b' : '#ffffff'} 
              stroke-width="1.5"
              data-edge-id={edge.id}
            />
          {/if}
        {/if}
      </g>
    </g>
  </svg>
</div>
