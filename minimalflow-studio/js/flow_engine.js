/**
 * MinimalFlow Studio — Shape, Connector & Magnetic Engine
 * Logika bentuk node geometri, kalkulasi pin magnetik, perutean kawat Manhattan, dan rendering SVG.
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  const rotatePoint = exports.Canvas ? exports.Canvas.rotatePoint : function (px, py, cx, cy, angleDeg) {
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
  };

  function getShapePath(type, w, h) {
    switch (type) {
      case "rectangle":
        return `M 0 0 H ${w} V ${h} H 0 Z`;
      case "rounded": {
        const r = Math.min(w, h) / 2;
        return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
      }
      case "circle": {
        const rx = w / 2, ry = h / 2;
        return `M 0 ${ry} A ${rx} ${ry} 0 1 0 ${w} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} Z`;
      }
      case "diamond":
        return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
      case "triangle":
        return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
      case "parallelogram": {
        const skew = Math.min(w * 0.2, 28);
        return `M ${skew} 0 L ${w} 0 L ${w - skew} ${h} L 0 ${h} Z`;
      }
      case "cylinder": {
        const ry = Math.min(h * 0.16, 16);
        const rx = w / 2;
        return `M 0 ${ry} A ${rx} ${ry} 0 0 1 ${w} ${ry} V ${h - ry} A ${rx} ${ry} 0 0 1 0 ${h - ry} Z M 0 ${ry} A ${rx} ${ry} 0 0 0 ${w} ${ry}`;
      }
      case "offpage":
        return `M 0 0 H ${w} V ${h * 0.7} L ${w / 2} ${h} L 0 ${h * 0.7} Z`;
      case "manual_operation": {
        const inset = Math.min(w * 0.18, 26);
        return `M 0 0 H ${w} L ${w - inset} ${h} H ${inset} Z`;
      }
      case "manual_input": {
        const slope = Math.min(h * 0.28, 22);
        return `M 0 ${slope} L ${w} 0 V ${h} H 0 Z`;
      }
      case "preparation": {
        const hexW = Math.min(w * 0.18, 26);
        return `M ${hexW} 0 H ${w - hexW} L ${w} ${h / 2} L ${w - hexW} ${h} H ${hexW} L 0 ${h / 2} Z`;
      }
      case "predefined_process": {
        const inset = Math.min(w * 0.12, 18);
        return `M 0 0 H ${w} V ${h} H 0 Z M ${inset} 0 V ${h} M ${w - inset} 0 V ${h}`;
      }
      case "display": {
        const r = h / 2;
        const rightCurve = Math.min(w * 0.14, 18);
        return `M ${r} 0 H ${w - rightCurve} Q ${w} ${h / 2} ${w - rightCurve} ${h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
      }
      case "disk_storage": {
        const arcX = Math.min(w * 0.16, 22);
        return `M ${arcX} 0 H ${w} Q ${w - arcX * 1.2} ${h / 2} ${w} ${h} H ${arcX} Q 0 ${h / 2} ${arcX} 0 Z`;
      }
      case "magnetic_tape": {
        const r = Math.min(w * 0.42, h * 0.45);
        const cx = w * 0.45, cy = r + 2;
        return `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} M ${cx} ${cy + r} H ${w}`;
      }
      case "punch_card": {
        const cut = Math.min(w * 0.18, h * 0.28, 24);
        return `M ${cut} 0 H ${w} V ${h} H 0 V ${cut} Z`;
      }
      case "document": {
        const wave = Math.min(h * 0.16, 14);
        const b = h - wave;
        return `M 0 0 H ${w} V ${b} Q ${w * 0.75} ${b - wave} ${w * 0.5} ${b} Q ${w * 0.25} ${b + wave} 0 ${b} Z`;
      }
      default:
        return `M 0 0 H ${w} V ${h} H 0 Z`;
    }
  }

  function getNodePinLocal(node, pin) {
    const { width: w, height: h, type } = node;
    switch (pin) {
      case "N": {
        if (type === "manual_input") {
          const slope = Math.min(h * 0.28, 22);
          return { x: w / 2, y: slope / 2 };
        }
        if (type === "magnetic_tape") {
          const r = Math.min(w * 0.42, h * 0.45);
          const cx = w * 0.45, cy = r + 2;
          return { x: cx, y: cy - r };
        }
        return { x: w / 2, y: 0 };
      }
      case "S": {
        if (type === "document") {
          const wave = Math.min(h * 0.16, 14);
          return { x: w / 2, y: h - wave };
        }
        if (type === "magnetic_tape") {
          const r = Math.min(w * 0.42, h * 0.45);
          const cx = w * 0.45, cy = r + 2;
          return { x: cx, y: cy + r };
        }
        return { x: w / 2, y: h };
      }
      case "E": {
        if (type === "triangle") return { x: w * 0.75, y: h / 2 };
        if (type === "parallelogram") return { x: w - Math.min(w * 0.2, 28) / 2, y: h / 2 };
        if (type === "manual_operation") {
          const inset = Math.min(w * 0.18, 26);
          return { x: w - inset / 2, y: h / 2 };
        }
        if (type === "offpage") return { x: w, y: h * 0.35 };
        if (type === "magnetic_tape") {
          const r = Math.min(w * 0.42, h * 0.45);
          const cx = w * 0.45, cy = r + 2;
          return { x: cx + r, y: cy };
        }
        if (type === "document") {
          const wave = Math.min(h * 0.16, 14);
          return { x: w, y: (h - wave) / 2 };
        }
        return { x: w, y: h / 2 };
      }
      case "W": {
        if (type === "triangle") return { x: w * 0.25, y: h / 2 };
        if (type === "parallelogram") return { x: Math.min(w * 0.2, 28) / 2, y: h / 2 };
        if (type === "manual_operation") {
          const inset = Math.min(w * 0.18, 26);
          return { x: inset / 2, y: h / 2 };
        }
        if (type === "manual_input") {
          const slope = Math.min(h * 0.28, 22);
          return { x: 0, y: (slope + h) / 2 };
        }
        if (type === "offpage") return { x: 0, y: h * 0.35 };
        if (type === "magnetic_tape") {
          const r = Math.min(w * 0.42, h * 0.45);
          const cx = w * 0.45, cy = r + 2;
          return { x: cx - r, y: cy };
        }
        if (type === "document") {
          const wave = Math.min(h * 0.16, 14);
          return { x: 0, y: (h - wave) / 2 };
        }
        return { x: 0, y: h / 2 };
      }
      default: return { x: w / 2, y: h / 2 };
    }
  }

  function getNodePinCoordinates(node, pin) {
    const localP = getNodePinLocal(node, pin);
    const rotP = rotatePoint(localP.x, localP.y, node.width / 2, node.height / 2, node.rotation || 0);
    return { x: node.x + rotP.x, y: node.y + rotP.y };
  }

  function getNodePinNormal(pin, rotation = 0) {
    const baseNormals = {
      N: { x: 0, y: -1 },
      E: { x: 1, y: 0 },
      S: { x: 0, y: 1 },
      W: { x: -1, y: 0 }
    };
    const n = baseNormals[pin] || { x: 0, y: 0 };
    return rotatePoint(n.x, n.y, 0, 0, rotation);
  }

  function simplifyOrthogonalPoints(pts) {
    if (pts.length <= 2) return pts;
    const clean = [pts[0]];

    for (let i = 1; i < pts.length; i++) {
      const prev = clean[clean.length - 1];
      const curr = pts[i];
      if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) continue;

      if (clean.length >= 2) {
        const pprev = clean[clean.length - 2];
        if (Math.abs(pprev.y - prev.y) < 0.5 && Math.abs(prev.y - curr.y) < 0.5) {
          clean[clean.length - 1] = curr;
          continue;
        }
        if (Math.abs(pprev.x - prev.x) < 0.5 && Math.abs(prev.x - curr.x) < 0.5) {
          clean[clean.length - 1] = curr;
          continue;
        }
      }
      clean.push(curr);
    }
    return clean;
  }

  function calculateEdgePath(edge, nodes) {
    const sourceNode = nodes[edge.source.nodeId];
    const targetNode = nodes[edge.target.nodeId];
    if (!sourceNode || !targetNode) return { pathD: "", handlePos: { x: 0, y: 0 } };

    const P1 = getNodePinCoordinates(sourceNode, edge.source.pin);
    const P2 = getNodePinCoordinates(targetNode, edge.target.pin);
    const n1 = getNodePinNormal(edge.source.pin, sourceNode.rotation || 0);
    const n2 = getNodePinNormal(edge.target.pin, targetNode.rotation || 0);
    const offset = edge.handleOffset || { dx: 0, dy: 0 };

    // 1. STRAIGHT CONNECTOR
    if (edge.type === "straight") {
      const midX = (P1.x + P2.x) / 2;
      const midY = (P1.y + P2.y) / 2;
      const H = { x: midX + offset.dx, y: midY + offset.dy };
      const distToLine = Math.hypot(offset.dx, offset.dy);
      if (distToLine > 4) {
        return {
          pathD: `M ${P1.x} ${P1.y} L ${H.x} ${H.y} L ${P2.x} ${P2.y}`,
          handlePos: H
        };
      }
      let targetX = P2.x;
      let targetY = P2.y;
      if (Math.abs(P1.x - P2.x) < 5) targetX = P1.x;
      if (Math.abs(P1.y - P2.y) < 5) targetY = P1.y;
      return {
        pathD: `M ${P1.x} ${P1.y} L ${targetX} ${targetY}`,
        handlePos: { x: (P1.x + targetX) / 2, y: (P1.y + targetY) / 2 }
      };
    }

    // 2. BEZIER CONNECTOR
    if (edge.type === "bezier") {
      const dist = Math.max(Math.hypot(P2.x - P1.x, P2.y - P1.y) * 0.45, 40);
      const C1base = { x: P1.x + n1.x * dist, y: P1.y + n1.y * dist };
      const C2base = { x: P2.x + n2.x * dist, y: P2.y + n2.y * dist };

      const midBase = {
        x: 0.125 * (P1.x + P2.x) + 0.375 * (C1base.x + C2base.x),
        y: 0.125 * (P1.y + P2.y) + 0.375 * (C1base.y + C2base.y)
      };

      const handlePos = { x: midBase.x + offset.dx, y: midBase.y + offset.dy };
      const C1 = { x: C1base.x + (4 / 3) * offset.dx, y: C1base.y + (4 / 3) * offset.dy };
      const C2 = { x: C2base.x + (4 / 3) * offset.dx, y: C2base.y + (4 / 3) * offset.dy };

      return {
        pathD: `M ${P1.x} ${P1.y} C ${C1.x} ${C1.y}, ${C2.x} ${C2.y}, ${P2.x} ${P2.y}`,
        handlePos
      };
    }

    // 3. STEP / ORTHOGONAL (MANHATTAN) CONNECTOR
    const stub = 20;
    const S1 = { x: P1.x + n1.x * stub, y: P1.y + n1.y * stub };
    const S2 = { x: P2.x + n2.x * stub, y: P2.y + n2.y * stub };

    const isSourceH = Math.abs(n1.x) > Math.abs(n1.y);
    const isTargetH = Math.abs(n2.x) > Math.abs(n2.y);

    let rawPoints = [];
    let handlePos = { x: 0, y: 0 };

    if (isSourceH && isTargetH) {
      // Auto-snap horizontal alignment: if vertical distance < 10px, snap to perfectly straight horizontal
      if (Math.abs(P1.y - P2.y) < 10) {
        const midX = (P1.x + P2.x) / 2;
        handlePos = { x: midX + (offset.dx || 0), y: P1.y };
        rawPoints = [
          P1,
          { x: P2.x, y: P1.y }
        ];
      } else {
        let defaultXm = (S1.x + S2.x) / 2;
        if (n1.x > 0 && n2.x > 0) defaultXm = Math.max(S1.x, S2.x) + 24;
        if (n1.x < 0 && n2.x < 0) defaultXm = Math.min(S1.x, S2.x) - 24;

        const xm = defaultXm + offset.dx;
        // Handle pos SELALU terkunci tepat pada garis siku vertikal (tidak lepas ke bawah/atas)
        handlePos = { x: xm, y: (P1.y + P2.y) / 2 };

        rawPoints = [
          P1,
          S1,
          { x: xm, y: S1.y },
          { x: xm, y: S2.y },
          S2,
          P2
        ];
      }
    } else if (!isSourceH && !isTargetH) {
      // Auto-snap vertical alignment: if horizontal distance < 10px, snap to perfectly straight vertical
      if (Math.abs(P1.x - P2.x) < 10) {
        const midY = (P1.y + P2.y) / 2;
        handlePos = { x: P1.x, y: midY + (offset.dy || 0) };
        rawPoints = [
          P1,
          { x: P1.x, y: P2.y }
        ];
      } else {
        let defaultYm = (S1.y + S2.y) / 2;
        if (n1.y > 0 && n2.y > 0) defaultYm = Math.max(S1.y, S2.y) + 24;
        if (n1.y < 0 && n2.y < 0) defaultYm = Math.min(S1.y, S2.y) - 24;

        const ym = defaultYm + offset.dy;
        // Handle pos SELALU terkunci tepat pada garis siku horizontal (tidak lepas ke kiri/kanan)
        handlePos = { x: (P1.x + P2.x) / 2, y: ym };

        rawPoints = [
          P1,
          S1,
          { x: S1.x, y: ym },
          { x: S2.x, y: ym },
          S2,
          P2
        ];
      }
    } else if (isSourceH && !isTargetH) {
      const xm = S2.x + offset.dx;
      const ym = S1.y + offset.dy;
      handlePos = { x: xm, y: ym };

      rawPoints = [
        P1,
        S1,
        { x: xm, y: S1.y },
        { x: xm, y: ym },
        { x: S2.x, y: ym },
        S2,
        P2
      ];
    } else {
      const xm = S1.x + offset.dx;
      const ym = S2.y + offset.dy;
      handlePos = { x: xm, y: ym };

      rawPoints = [
        P1,
        S1,
        { x: S1.x, y: ym },
        { x: xm, y: ym },
        { x: xm, y: S2.y },
        S2,
        P2
      ];
    }

    const simplified = simplifyOrthogonalPoints(rawPoints);
    const pathD = simplified.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ");

    return { pathD, handlePos };
  }

  function isDarkColor(hexColor) {
    if (!hexColor || hexColor === "transparent") return false;
    if (hexColor === "#18181b" || hexColor === "#09090b") return true;
    if (hexColor.startsWith("#") && hexColor.length === 7) {
      const r = parseInt(hexColor.substr(1, 2), 16);
      const g = parseInt(hexColor.substr(3, 2), 16);
      const b = parseInt(hexColor.substr(5, 2), 16);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      return lum < 128;
    }
    return false;
  }

  /**
   * Mengembalikan warna stroke kabel yang adaptif terhadap Dark/Light Mode
   * Menyelesaikan bug kabel hitam menghilang pada kanvas gelap
   */
  function getEdgeStrokeColor(edge, isDark) {
    const s = edge.style && edge.style.stroke;
    // Jika stroke bawaan hitam/putih/currentColor/kosong, sesuaikan secara dinamis
    if (!s || s === "#18181b" || s === "#f4f4f5" || s === "#09090b" || s === "#fafafa" || 
        s === "currentColor" || s === "#000000" || s === "#000" || s === "black" || 
        s === "#121214" || s === "#27272a" || s === "#3f3f46") {
      return isDark ? "#f4f4f5" : "#18181b";
    }
    return s;
  }

  function createNodeData(type, worldX, worldY, isDark = false, extra = {}) {
    const id = "node_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    let width = 160, height = 80;
    if (type === "circle") { width = 110; height = 110; }
    else if (type === "diamond") { width = 140; height = 110; }
    else if (type === "triangle") { width = 140; height = 96; }
    else if (type === "image") { width = 180; height = 130; }
    else if (type === "offpage") { width = 110; height = 110; }
    else if (type === "magnetic_tape") { width = 120; height = 100; }
    else if (type === "document") { width = 160; height = 85; }

    return {
      id,
      type,
      x: Math.round(worldX - width / 2),
      y: Math.round(worldY - height / 2),
      width,
      height,
      baseWidth: width,
      baseHeight: height,
      rotation: 0,
      locked: false,
      groupId: null,
      src: extra.src || null,
      style: {
        fill: isDark ? "#27272a" : "#ffffff",
        stroke: isDark ? "#f4f4f5" : "#18181b",
        strokeWidth: 1.5,
        dashed: "solid"
      },
      text: type === "image" ? null : {
        content: "",
        fontFamily: "Poppins, sans-serif",
        fontSize: 14,
        bold: false,
        italic: false,
        underline: false,
        color: isDark ? "#f4f4f5" : "#18181b",
        align: "center",
        paddingX: 14,
        paddingY: 10,
        isPlaceholder: false
      }
    };
  }

  function createEdgeData(sourceNodeId, sourcePin, targetNodeId, targetPin, isDark = false, defaults = {}) {
    const edgeId = "edge_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    return {
      id: edgeId,
      type: defaults.type || "step",
      source: { nodeId: sourceNodeId, pin: sourcePin },
      target: { nodeId: targetNodeId, pin: targetPin },
      handleOffset: { dx: 0, dy: 0 },
      style: {
        stroke: defaults.stroke || (isDark ? "#f4f4f5" : "#18181b"),
        strokeWidth: defaults.strokeWidth !== undefined ? defaults.strokeWidth : 1.5,
        dashed: defaults.dashed || "solid",
        markerStart: defaults.markerStart || "none",
        markerEnd: defaults.markerEnd !== undefined ? defaults.markerEnd : "arrow"
      }
    };
  }

  function createNodeElement(id, node, doc, uiState, onDblClick) {
    const isDark = doc.theme === "dark";
    const textEditorModule = exports.TextEditor;
    const isSelected = (uiState.selectedNodeIds && uiState.selectedNodeIds.has(id)) || uiState.selectedId === id;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "node-group" + (isSelected ? " selected" : "") + (node.locked ? " locked" : "") + (node.isContainer ? " is-container" : ""));
    g.setAttribute("data-id", id);
    if (node.groupId) {
      g.setAttribute("data-group-id", node.groupId);
    }

    // Explicit dblclick event listener on each node element
    if (typeof onDblClick === "function" && !node.isContainer) {
      g.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        e.preventDefault();
        onDblClick(id);
      });
    }

    const rot = node.rotation || 0;
    g.setAttribute("transform", `translate(${node.x}, ${node.y}) rotate(${rot}, ${node.width / 2}, ${node.height / 2})`);

    if (node.type === "image" && node.src) {
      const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
      img.setAttribute("href", node.src);
      img.setAttribute("x", 0);
      img.setAttribute("y", 0);
      img.setAttribute("width", node.width);
      img.setAttribute("height", node.height);
      img.setAttribute("preserveAspectRatio", "contain");
      img.style.pointerEvents = "none";
      g.appendChild(img);

      const borderRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      borderRect.setAttribute("class", "node-shape");
      borderRect.setAttribute("x", 0);
      borderRect.setAttribute("y", 0);
      borderRect.setAttribute("width", node.width);
      borderRect.setAttribute("height", node.height);
      borderRect.setAttribute("rx", 4);
      borderRect.setAttribute("fill", "transparent");
      borderRect.setAttribute("stroke", isDark ? "#3f3f46" : "#e4e4e7");
      borderRect.setAttribute("stroke-width", 1);
      g.appendChild(borderRect);
    } else {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "node-shape");
      path.setAttribute("d", getShapePath(node.type, node.width, node.height));
      path.setAttribute("fill", node.style.fill);
      path.setAttribute("stroke", node.style.stroke || (isDark ? "#f4f4f5" : "#18181b"));
      const strokeW = (node.style && node.style.strokeWidth !== undefined) ? node.style.strokeWidth : 1.5;
      path.setAttribute("stroke-width", strokeW);
      const dashStyle = (node.style && node.style.dashed) || "solid";
      if (dashStyle === "dashed") {
        path.setAttribute("stroke-dasharray", "6, 4");
      } else if (dashStyle === "dotted") {
        path.setAttribute("stroke-dasharray", "2, 3");
      } else {
        path.removeAttribute("stroke-dasharray");
      }
      g.appendChild(path);

      if (node.text && textEditorModule) {
        const rawContent = (node.text.content || "").trim();
        const isPh = !rawContent || rawContent.toLowerCase() === "insert text" || !!node.text.isPlaceholder;

        // Hanya render teks jika ada isi nyata, hindari mencetak watermark/placeholder "Insert text"
        if (!isPh && rawContent.length > 0) {
          // Clip-Path agar teks tidak menembus kotak pembatas atas dan bawah chart
          const clipId = `clip-node-text-${id}`;
          const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
          const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
          clipPath.setAttribute("id", clipId);
          const clipShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
          clipShape.setAttribute("d", getShapePath(node.type, node.width, node.height));
          clipPath.appendChild(clipShape);
          defs.appendChild(clipPath);
          g.appendChild(defs);

          const layout = textEditorModule.layoutNodeText(node);
          const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          textEl.setAttribute("id", `node-text-${id}`);
          textEl.setAttribute("clip-path", `url(#${clipId})`);
          textEl.setAttribute("x", layout.xPos);
          textEl.setAttribute("y", layout.startY);
          textEl.setAttribute("text-anchor", layout.anchor);
          textEl.setAttribute("font-family", node.text.fontFamily);
          textEl.setAttribute("font-size", node.text.fontSize);
          textEl.setAttribute("font-weight", node.text.bold ? "700" : "500");
          textEl.setAttribute("font-style", node.text.italic ? "italic" : "normal");
          textEl.setAttribute("text-decoration", node.text.underline ? "underline" : "none");
          const activeTextColor = node.text.color || (isDarkColor(node.style.fill) ? "#ffffff" : (isDark ? "#fafafa" : "#18181b"));
          textEl.setAttribute("fill", activeTextColor);
          textEl.style.pointerEvents = "none";
          textEl.style.userSelect = "none";
          textEl.style.webkitUserSelect = "none";

          layout.lines.forEach((lineSpans, index) => {
            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspan.setAttribute("x", layout.xPos);
            if (index > 0) tspan.setAttribute("dy", layout.lineHeight);

            if (Array.isArray(lineSpans)) {
              if (lineSpans.length === 0 || (lineSpans.length === 1 && !lineSpans[0].text)) {
                tspan.textContent = " ";
              } else {
                lineSpans.forEach(span => {
                  const subSpan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                  if (span.bold) {
                    subSpan.setAttribute("font-weight", "700");
                  } else {
                    subSpan.setAttribute("font-weight", node.text.bold ? "700" : "500");
                  }

                  if (span.italic) {
                    subSpan.setAttribute("font-style", "italic");
                  } else {
                    subSpan.setAttribute("font-style", node.text.italic ? "italic" : "normal");
                  }

                  subSpan.textContent = span.text;
                  tspan.appendChild(subSpan);
                });
              }
            } else {
              tspan.textContent = lineSpans || " ";
            }

            textEl.appendChild(tspan);
          });
          g.appendChild(textEl);
        }
      }
    }

    if (node.locked && !node.isContainer) {
      const lockG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      lockG.setAttribute("class", "node-lock-indicator");
      lockG.setAttribute("data-lock-indicator", "true");
      lockG.style.pointerEvents = "none";
      lockG.setAttribute("transform", `translate(${node.width - 20}, 6) scale(0.65)`);
      lockG.innerHTML = `
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="${isDark ? '#f4f4f5' : '#18181b'}" stroke-width="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="${isDark ? '#f4f4f5' : '#18181b'}" stroke-width="2"/>
      `;
      g.appendChild(lockG);
    }

    if (!node.isContainer) {
      ["N", "E", "S", "W"].forEach(pin => {
        const localP = getNodePinLocal(node, pin);
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", "pin-circle");
        circle.setAttribute("cx", localP.x);
        circle.setAttribute("cy", localP.y);
        circle.setAttribute("r", 5);
        circle.setAttribute("data-node-id", id);
        circle.setAttribute("data-pin", pin);

        if (uiState.pendingPinSource && 
            uiState.pendingPinSource.nodeId === id && 
            uiState.pendingPinSource.pin === pin) {
          circle.classList.add("active-source");
        }
        g.appendChild(circle);
      });
    }

    return g;
  }

  function getOrCreateArrowMarker(svgDefs, type, color) {
    if (!svgDefs || !color) return type === "start" ? "url(#arrow-start)" : "url(#arrow-end)";
    const safeColor = String(color).toLowerCase().replace(/[^a-z0-9]/g, "_");
    const markerId = `arrow-${type}-${safeColor}`;
    let marker = svgDefs.querySelector(`#${markerId}`);
    if (!marker) {
      marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", markerId);
      marker.setAttribute("viewBox", "0 0 10 10");
      marker.setAttribute("markerWidth", "6");
      marker.setAttribute("markerHeight", "6");
      marker.setAttribute("orient", "auto");
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      if (type === "start") {
        marker.setAttribute("refX", "1");
        marker.setAttribute("refY", "5");
        p.setAttribute("d", "M 10 1.5 L 0 5 L 10 8.5 z");
      } else {
        marker.setAttribute("refX", "9");
        marker.setAttribute("refY", "5");
        p.setAttribute("d", "M 0 1.5 L 10 5 L 0 8.5 z");
      }
      p.setAttribute("fill", color);
      marker.appendChild(p);
      svgDefs.appendChild(marker);
    }
    return `url(#${markerId})`;
  }

  function createEdgeElement(id, edge, doc, uiState, svgDefs) {
    const isDark = doc.theme === "dark";
    const sourceNode = doc.nodes[edge.source?.nodeId];
    const targetNode = doc.nodes[edge.target?.nodeId];
    if (!sourceNode || !targetNode) return null;

    const { pathD, handlePos } = calculateEdgePath(edge, doc.nodes);
    if (!pathD) return null;

    const isSelected = uiState.selectedId === id;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "edge-group" + (isSelected ? " selected" : ""));
    g.setAttribute("data-id", id);

    const strokeW = edge.style && edge.style.strokeWidth !== undefined ? edge.style.strokeWidth : 1.5;
    const strokeColor = getEdgeStrokeColor(edge, isDark);
    g.style.color = strokeColor;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "edge-path");
    path.setAttribute("d", pathD);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", strokeColor);
    path.style.stroke = strokeColor;
    path.setAttribute("stroke-width", strokeW);
    path.style.strokeWidth = `${strokeW}px`;

    if (edge.style && edge.style.dashed === "dashed") path.setAttribute("stroke-dasharray", "6, 4");
    if (edge.style && edge.style.dashed === "dotted") path.setAttribute("stroke-dasharray", "2, 3");

    if (edge.style && edge.style.markerEnd === "arrow") {
      path.setAttribute("marker-end", getOrCreateArrowMarker(svgDefs, "end", strokeColor));
    }
    if (edge.style && edge.style.markerStart === "arrow") {
      path.setAttribute("marker-start", getOrCreateArrowMarker(svgDefs, "start", strokeColor));
    }

    g.appendChild(path);

    // Invisible wide hit-area stroke (exactly 8px) for effortless arrow selection
    const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hitPath.setAttribute("class", "edge-hit-area");
    hitPath.setAttribute("d", pathD);
    hitPath.setAttribute("fill", "none");
    hitPath.setAttribute("stroke", "transparent");
    hitPath.setAttribute("stroke-width", "8");
    hitPath.setAttribute("stroke-linecap", "round");
    hitPath.setAttribute("stroke-linejoin", "round");
    hitPath.style.cursor = "pointer";
    hitPath.style.pointerEvents = "stroke";
    g.appendChild(hitPath);

    // Render edge label badge if label is provided
    if (edge.label && String(edge.label).trim()) {
      const textG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      textG.setAttribute("class", "edge-label-group");
      textG.style.pointerEvents = "none";

      const textStr = String(edge.label).trim();
      const badgeW = Math.max(26, textStr.length * 7.2 + 14);
      const badgeH = 20;

      const badgeRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      badgeRect.setAttribute("class", "edge-label-bg");
      badgeRect.setAttribute("x", handlePos.x - badgeW / 2);
      badgeRect.setAttribute("y", handlePos.y - badgeH / 2);
      badgeRect.setAttribute("width", badgeW);
      badgeRect.setAttribute("height", badgeH);
      badgeRect.setAttribute("rx", "4");
      badgeRect.setAttribute("fill", isDark ? "#18181b" : "#ffffff");
      badgeRect.setAttribute("stroke", isDark ? "#3f3f46" : "#d4d4d8");
      badgeRect.setAttribute("stroke-width", "1");

      const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textEl.setAttribute("class", "edge-label-text");
      textEl.setAttribute("x", handlePos.x);
      textEl.setAttribute("y", handlePos.y);
      textEl.setAttribute("text-anchor", "middle");
      textEl.setAttribute("dominant-baseline", "central");
      textEl.setAttribute("fill", isDark ? "#d4d4d8" : "#27272a");
      textEl.setAttribute("font-family", "Inter, -apple-system, BlinkMacSystemFont, sans-serif");
      textEl.setAttribute("font-size", "11px");
      textEl.setAttribute("font-weight", "500");
      textEl.textContent = textStr;

      textG.appendChild(badgeRect);
      textG.appendChild(textEl);
      g.appendChild(textG);
    }

    const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handle.setAttribute("class", "edge-handle");
    handle.setAttribute("cx", handlePos.x);
    handle.setAttribute("cy", handlePos.y);
    handle.setAttribute("r", 4.5);
    handle.setAttribute("data-edge-id", id);
    handle.setAttribute("title", "Tarik untuk membelokkan jalur garis / Double-click untuk reset");
    if (edge.type === "step") {
      const n1 = getNodePinNormal(edge.source.pin, sourceNode.rotation || 0);
      const n2 = getNodePinNormal(edge.target.pin, targetNode.rotation || 0);
      const isSourceH = Math.abs(n1.x) > Math.abs(n1.y);
      const isTargetH = Math.abs(n2.x) > Math.abs(n2.y);
      if (isSourceH && isTargetH) handle.style.cursor = "ew-resize";
      else if (!isSourceH && !isTargetH) handle.style.cursor = "ns-resize";
      else handle.style.cursor = "move";
    } else {
      handle.style.cursor = "move";
    }
    g.appendChild(handle);

    return g;
  }

  /**
   * Unified diagram renderer: interleave nodes and edges strictly by ascending zIndex
   * so DOM order directly reflects the visual layer hierarchy.
   */
  function renderDiagram(containerEl, doc, uiState, onDblClick) {
    if (!containerEl) return;
    containerEl.innerHTML = "";
    const svgDefs = containerEl.ownerSVGElement ? containerEl.ownerSVGElement.querySelector("defs") : null;
    const nodes = doc.nodes || {};
    const edges = doc.edges || {};

    const containers = [];
    const regularItems = [];

    // Separate container nodes (swimlanes/kelompok) — always render at the very bottom
    Object.entries(nodes).forEach(([id, node]) => {
      if (node.isContainer) {
        containers.push({ type: "node", id, node, zIndex: node.zIndex ?? 0 });
      } else {
        regularItems.push({ type: "node", id, node, zIndex: node.zIndex ?? 0 });
      }
    });

    Object.entries(edges).forEach(([id, edge]) => {
      let z = edge.zIndex;
      if (z === undefined) {
        const srcZ = nodes[edge.source?.nodeId]?.zIndex ?? 0;
        const tgtZ = nodes[edge.target?.nodeId]?.zIndex ?? 0;
        z = Math.min(srcZ, tgtZ) - 0.1;
      }
      regularItems.push({ type: "edge", id, edge, zIndex: z });
    });

    // Containers sorted ascending (lowest first)
    containers.sort((a, b) => a.zIndex - b.zIndex);

    // Regular items sorted ascending (lowest first, highest topmost)
    regularItems.sort((a, b) => {
      if (a.zIndex !== b.zIndex) {
        return a.zIndex - b.zIndex;
      }
      // If tied: edges render below nodes by default
      if (a.type !== b.type) {
        return a.type === "edge" ? -1 : 1;
      }
      return 0;
    });

    // Render containers first (bottom-most)
    containers.forEach(item => {
      const el = createNodeElement(item.id, item.node, doc, uiState, onDblClick);
      if (el) containerEl.appendChild(el);
    });

    // Render interleaved regular items
    regularItems.forEach(item => {
      if (item.type === "node") {
        const el = createNodeElement(item.id, item.node, doc, uiState, onDblClick);
        if (el) containerEl.appendChild(el);
      } else if (item.type === "edge") {
        const el = createEdgeElement(item.id, item.edge, doc, uiState, svgDefs);
        if (el) containerEl.appendChild(el);
      }
    });
  }

  function renderNodes(layerNodesEl, doc, uiState, onDblClick) {
    if (!layerNodesEl) return;
    const hasEdges = !!layerNodesEl.querySelector(".edge-group");
    if (hasEdges) {
      renderDiagram(layerNodesEl, doc, uiState, onDblClick);
      return;
    }
    layerNodesEl.innerHTML = "";
    const sortedEntries = Object.entries(doc.nodes || {}).sort((a, b) => {
      const aCont = a[1].isContainer ? 1 : 0;
      const bCont = b[1].isContainer ? 1 : 0;
      if (aCont !== bCont) return bCont - aCont;
      if (a[1].zIndex !== undefined && b[1].zIndex !== undefined) {
        return a[1].zIndex - b[1].zIndex;
      }
      return 0;
    });

    for (const [id, node] of sortedEntries) {
      const g = createNodeElement(id, node, doc, uiState, onDblClick);
      if (g) layerNodesEl.appendChild(g);
    }
  }

  function renderEdges(layerEdgesEl, doc, uiState) {
    if (!layerEdgesEl) return;
    const svgDefs = layerEdgesEl.ownerSVGElement ? layerEdgesEl.ownerSVGElement.querySelector("defs") : null;
    const isDark = doc.theme === "dark";

    // If layerEdgesEl is the unified element container containing .node-group,
    // update edge geometry in-place so we DO NOT unmount or recreate active text editor nodes!
    const hasNodes = !!layerEdgesEl.querySelector(".node-group");
    if (hasNodes) {
      const edges = doc.edges || {};
      const edgeIds = new Set(Object.keys(edges));

      // Remove deleted edges
      layerEdgesEl.querySelectorAll(".edge-group").forEach(el => {
        const id = el.dataset.id;
        if (!edgeIds.has(id)) {
          el.remove();
        }
      });

      // Update or create each edge
      Object.entries(edges).forEach(([id, edge]) => {
        const sourceNode = doc.nodes[edge.source?.nodeId];
        const targetNode = doc.nodes[edge.target?.nodeId];
        if (!sourceNode || !targetNode) return;

        const { pathD, handlePos } = calculateEdgePath(edge, doc.nodes);
        if (!pathD) return;

        const existingG = layerEdgesEl.querySelector(`.edge-group[data-id="${id}"]`);
        if (existingG) {
          const path = existingG.querySelector(".edge-path");
          if (path) {
            path.setAttribute("d", pathD);
            const strokeColor = getEdgeStrokeColor(edge, isDark);
            path.setAttribute("stroke", strokeColor);
            path.style.stroke = strokeColor;
            const strokeW = edge.style && edge.style.strokeWidth !== undefined ? edge.style.strokeWidth : 1.5;
            path.setAttribute("stroke-width", strokeW);
            path.style.strokeWidth = `${strokeW}px`;

            if (edge.style && edge.style.dashed === "dashed") path.setAttribute("stroke-dasharray", "6, 4");
            else if (edge.style && edge.style.dashed === "dotted") path.setAttribute("stroke-dasharray", "2, 3");
            else path.removeAttribute("stroke-dasharray");

            if (edge.style && edge.style.markerEnd === "arrow") {
              path.setAttribute("marker-end", getOrCreateArrowMarker(svgDefs, "end", strokeColor));
            } else {
              path.removeAttribute("marker-end");
            }
            if (edge.style && edge.style.markerStart === "arrow") {
              path.setAttribute("marker-start", getOrCreateArrowMarker(svgDefs, "start", strokeColor));
            } else {
              path.removeAttribute("marker-start");
            }
          }

          const hitPath = existingG.querySelector(".edge-hit-area");
          if (hitPath) hitPath.setAttribute("d", pathD);

          const handle = existingG.querySelector(".edge-handle");
          if (handle) {
            handle.setAttribute("cx", handlePos.x);
            handle.setAttribute("cy", handlePos.y);
          }

          const labelBg = existingG.querySelector(".edge-label-bg");
          const labelText = existingG.querySelector(".edge-label-text");
          if (labelBg && labelText) {
            const badgeW = parseFloat(labelBg.getAttribute("width")) || 26;
            const badgeH = parseFloat(labelBg.getAttribute("height")) || 20;
            labelBg.setAttribute("x", handlePos.x - badgeW / 2);
            labelBg.setAttribute("y", handlePos.y - badgeH / 2);
            labelText.setAttribute("x", handlePos.x);
            labelText.setAttribute("y", handlePos.y);
          }
        } else {
          const g = createEdgeElement(id, edge, doc, uiState, svgDefs);
          if (g) layerEdgesEl.appendChild(g);
        }
      });
      return;
    }

    // Standalone container
    layerEdgesEl.innerHTML = "";
    const sortedEdges = Object.entries(doc.edges || {}).sort((a, b) => {
      const zA = a[1].zIndex ?? 0;
      const zB = b[1].zIndex ?? 0;
      return zA - zB;
    });

    for (const [id, edge] of sortedEdges) {
      const g = createEdgeElement(id, edge, doc, uiState, svgDefs);
      if (g) layerEdgesEl.appendChild(g);
    }
  }

  function renderOverlays(overlaySelectionEl, doc, uiState) {
    overlaySelectionEl.innerHTML = "";
    const selectedIds = uiState.selectedNodeIds && uiState.selectedNodeIds.size > 0 
      ? Array.from(uiState.selectedNodeIds) 
      : (uiState.selectedType === "node" && uiState.selectedId ? [uiState.selectedId] : []);

    if (selectedIds.length === 0) return;

    selectedIds.forEach(nodeId => {
      const node = doc.nodes[nodeId];
      if (!node || node.locked) return;

      const rot = node.rotation || 0;
      const handles = [
        { id: "nw", x: 0, y: 0 },
        { id: "ne", x: node.width, y: 0 },
        { id: "sw", x: 0, y: node.height },
        { id: "se", x: node.width, y: node.height },
        { id: "n",  x: node.width / 2, y: 0 },
        { id: "s",  x: node.width / 2, y: node.height },
        { id: "w",  x: 0, y: node.height / 2 },
        { id: "e",  x: node.width, y: node.height / 2 }
      ];

      const titleMap = {
        nw: "Tarik untuk mengubah ukuran (Tahan Alt untuk simetris dari tengah)",
        ne: "Tarik untuk mengubah ukuran (Tahan Alt untuk simetris dari tengah)",
        se: "Tarik untuk mengubah ukuran (Tahan Alt untuk simetris dari tengah)",
        sw: "Tarik untuk mengubah ukuran (Tahan Alt untuk simetris dari tengah)",
        n:  "Tarik untuk memanjangkan ke atas (Tahan Alt untuk atas & bawah simetris)",
        s:  "Tarik untuk memanjangkan ke bawah (Tahan Alt untuk bawah & atas simetris)",
        w:  "Tarik untuk melebarkan ke kiri (Tahan Alt untuk kiri & kanan simetris)",
        e:  "Tarik untuk melebarkan ke kanan (Tahan Alt untuk kanan & kiri simetris)"
      };

      // Garis bounding box seleksi tipis 1px putus-putus mengelilingi chart tanpa menutupi outline asli
      const selBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      selBox.setAttribute("class", "selection-bounding-box");
      selBox.setAttribute("x", node.x - 2);
      selBox.setAttribute("y", node.y - 2);
      selBox.setAttribute("width", node.width + 4);
      selBox.setAttribute("height", node.height + 4);
      selBox.setAttribute("rx", (node.type === "circle" ? (node.width + 4) / 2 : 4));
      selBox.setAttribute("fill", "none");
      selBox.setAttribute("stroke", "#3b82f6");
      selBox.setAttribute("stroke-width", "1");
      selBox.setAttribute("stroke-dasharray", "3,3");
      selBox.setAttribute("opacity", "0.85");
      selBox.setAttribute("pointer-events", "none");
      if (rot) {
        selBox.setAttribute("transform", `rotate(${rot} ${node.x + node.width / 2} ${node.y + node.height / 2})`);
      }
      overlaySelectionEl.appendChild(selBox);

      handles.forEach(h => {
        const rotP = rotatePoint(h.x, h.y, node.width / 2, node.height / 2, rot);
        const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        handle.setAttribute("class", `resize-handle ${h.id}`);
        handle.setAttribute("x", node.x + rotP.x - 3.5);
        handle.setAttribute("y", node.y + rotP.y - 3.5);
        handle.setAttribute("width", 7);
        handle.setAttribute("height", 7);
        handle.setAttribute("rx", 1.5);
        handle.setAttribute("data-node-id", node.id);
        handle.setAttribute("data-corner", h.id);
        handle.setAttribute("title", titleMap[h.id] || "Tarik pin pojok untuk mengubah ukuran chart");
        overlaySelectionEl.appendChild(handle);
      });
    });

    // Indikator visual grup jika ada beberapa node dalam satu group
    const groupsMap = {};
    selectedIds.forEach(id => {
      const node = doc.nodes[id];
      if (node && node.groupId) {
        if (!groupsMap[node.groupId]) groupsMap[node.groupId] = [];
        groupsMap[node.groupId].push(node);
      }
    });

    for (const [gId, gNodes] of Object.entries(groupsMap)) {
      if (gNodes.length > 1) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        gNodes.forEach(n => {
          minX = Math.min(minX, n.x);
          minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x + n.width);
          maxY = Math.max(maxY, n.y + n.height);
        });

        const pad = 10;
        const gRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        gRect.setAttribute("class", "group-bounding-rect");
        gRect.setAttribute("x", minX - pad);
        gRect.setAttribute("y", minY - pad);
        gRect.setAttribute("width", (maxX - minX) + pad * 2);
        gRect.setAttribute("height", (maxY - minY) + pad * 2);
        gRect.setAttribute("rx", 6);
        gRect.setAttribute("fill", "none");
        gRect.setAttribute("stroke", doc.theme === "dark" ? "#52525b" : "#a1a1aa");
        gRect.setAttribute("stroke-width", "1");
        gRect.setAttribute("stroke-dasharray", "4, 4");
        gRect.setAttribute("pointer-events", "none");
        overlaySelectionEl.appendChild(gRect);
      }
    }
  }

  exports.FlowEngine = {
    getShapePath,
    getNodePinLocal,
    getNodePinCoordinates,
    getNodePinNormal,
    simplifyOrthogonalPoints,
    calculateEdgePath,
    isDarkColor,
    getEdgeStrokeColor,
    createNodeData,
    createEdgeData,
    renderDiagram,
    renderNodes,
    renderEdges,
    renderOverlays
  };

})(window.MinimalFlow);
