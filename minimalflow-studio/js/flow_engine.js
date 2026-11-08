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
      default:
        return `M 0 0 H ${w} V ${h} H 0 Z`;
    }
  }

  function getNodePinLocal(node, pin) {
    const { width: w, height: h, type } = node;
    switch (pin) {
      case "N": return { x: w / 2, y: 0 };
      case "S": return { x: w / 2, y: h };
      case "E": {
        if (type === "triangle") return { x: w * 0.75, y: h / 2 };
        if (type === "parallelogram") return { x: w - Math.min(w * 0.2, 28) / 2, y: h / 2 };
        return { x: w, y: h / 2 };
      }
      case "W": {
        if (type === "triangle") return { x: w * 0.25, y: h / 2 };
        if (type === "parallelogram") return { x: Math.min(w * 0.2, 28) / 2, y: h / 2 };
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
      return {
        pathD: `M ${P1.x} ${P1.y} L ${P2.x} ${P2.y}`,
        handlePos: { x: midX, y: midY }
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
      let defaultXm = (S1.x + S2.x) / 2;
      if (n1.x > 0 && n2.x > 0) defaultXm = Math.max(S1.x, S2.x) + 24;
      if (n1.x < 0 && n2.x < 0) defaultXm = Math.min(S1.x, S2.x) - 24;

      const xm = defaultXm + offset.dx;
      const ym = (S1.y + S2.y) / 2 + offset.dy;
      handlePos = { x: xm, y: ym };

      rawPoints = [
        P1,
        S1,
        { x: xm, y: S1.y },
        { x: xm, y: S2.y },
        S2,
        P2
      ];
    } else if (!isSourceH && !isTargetH) {
      let defaultYm = (S1.y + S2.y) / 2;
      if (n1.y > 0 && n2.y > 0) defaultYm = Math.max(S1.y, S2.y) + 24;
      if (n1.y < 0 && n2.y < 0) defaultYm = Math.min(S1.y, S2.y) - 24;

      const ym = defaultYm + offset.dy;
      const xm = (S1.x + S2.x) / 2 + offset.dx;
      handlePos = { x: xm, y: ym };

      rawPoints = [
        P1,
        S1,
        { x: S1.x, y: ym },
        { x: S2.x, y: ym },
        S2,
        P2
      ];
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

    return {
      id,
      type,
      x: Math.round(worldX - width / 2),
      y: Math.round(worldY - height / 2),
      width,
      height,
      rotation: 0,
      locked: false,
      groupId: null,
      src: extra.src || null,
      style: {
        fill: isDark ? "#27272a" : "#ffffff",
        stroke: isDark ? "#f4f4f5" : "#18181b",
        strokeWidth: 1.5
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

  function createEdgeData(sourceNodeId, sourcePin, targetNodeId, targetPin, isDark = false) {
    const edgeId = "edge_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    return {
      id: edgeId,
      type: "step",
      source: { nodeId: sourceNodeId, pin: sourcePin },
      target: { nodeId: targetNodeId, pin: targetPin },
      handleOffset: { dx: 0, dy: 0 },
      style: {
        stroke: isDark ? "#f4f4f5" : "#18181b",
        strokeWidth: 1.5,
        dashed: "solid",
        markerStart: "none",
        markerEnd: "arrow"
      }
    };
  }

  function renderNodes(layerNodesEl, doc, uiState, onDblClick) {
    layerNodesEl.innerHTML = "";
    const isDark = doc.theme === "dark";
    const textEditorModule = exports.TextEditor;

    // Render container/subgraph boundaries first so children sit on top, then sort by zIndex
    const sortedEntries = Object.entries(doc.nodes).sort((a, b) => {
      const aCont = a[1].isContainer ? 1 : 0;
      const bCont = b[1].isContainer ? 1 : 0;
      if (aCont !== bCont) return bCont - aCont;
      if (a[1].zIndex !== undefined && b[1].zIndex !== undefined) {
        return a[1].zIndex - b[1].zIndex;
      }
      return 0;
    });

    for (const [id, node] of sortedEntries) {
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
        path.setAttribute("stroke-width", node.style.strokeWidth || 1.5);
        if (node.style.dashed === "dashed") {
          path.setAttribute("stroke-dasharray", "6, 4");
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
            const activeTextColor = node.text.color || (this.isDarkColor(node.style.fill) ? "#ffffff" : (isDark ? "#fafafa" : "#18181b"));
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

      layerNodesEl.appendChild(g);
    }
  }

  function renderEdges(layerEdgesEl, doc, uiState) {
    layerEdgesEl.innerHTML = "";
    const isDark = doc.theme === "dark";

    for (const [id, edge] of Object.entries(doc.edges)) {
      const { pathD, handlePos } = calculateEdgePath(edge, doc.nodes);
      if (!pathD) continue;

      const isSelected = uiState.selectedId === id;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "edge-group" + (isSelected ? " selected" : ""));
      g.setAttribute("data-id", id);

      const strokeW = edge.style.strokeWidth !== undefined ? edge.style.strokeWidth : 1.5;
      const strokeColor = getEdgeStrokeColor(edge, isDark);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "edge-path");
      path.setAttribute("d", pathD);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", strokeW);

      if (edge.style.dashed === "dashed") path.setAttribute("stroke-dasharray", "6, 4");
      if (edge.style.dashed === "dotted") path.setAttribute("stroke-dasharray", "2, 3");

      if (edge.style.markerEnd === "arrow") path.setAttribute("marker-end", "url(#arrow-end)");
      if (edge.style.markerStart === "arrow") path.setAttribute("marker-start", "url(#arrow-start)");

      g.appendChild(path);

      // Render edge label badge if label is provided
      if (edge.label && String(edge.label).trim()) {
        const textG = document.createElementNS("http://www.w3.org/2000/svg", "g");
        textG.setAttribute("class", "edge-label-group");
        textG.style.pointerEvents = "none";

        const textStr = String(edge.label).trim();
        const badgeW = Math.max(26, textStr.length * 7.2 + 14);
        const badgeH = 20;

        const badgeRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        badgeRect.setAttribute("x", handlePos.x - badgeW / 2);
        badgeRect.setAttribute("y", handlePos.y - badgeH / 2);
        badgeRect.setAttribute("width", badgeW);
        badgeRect.setAttribute("height", badgeH);
        badgeRect.setAttribute("rx", "4");
        badgeRect.setAttribute("fill", isDark ? "#18181b" : "#ffffff");
        badgeRect.setAttribute("stroke", isDark ? "#3f3f46" : "#d4d4d8");
        badgeRect.setAttribute("stroke-width", "1");

        const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
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
      g.appendChild(handle);

      layerEdgesEl.appendChild(g);
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
    renderNodes,
    renderEdges,
    renderOverlays
  };

})(window.MinimalFlow);
