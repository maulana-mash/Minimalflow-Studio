/**
 * MinimalFlow Studio — Universal Diagram & Circuit Schema Adapter
 * Mesin penerjemah otomatis multi-format:
 * 1. Modul Trainer Kelistrikan Mashimurelay (.json — bill_of_materials & wiring_connections)
 * 2. Script Diagram Alir Mermaid (.mmd — flowchart TD/LR, subgraphs, decision diamond, stadium)
 * 3. Generic Diagram JSON (format array nodes & edges dari React Flow / diagram tools lain)
 * 4. MinimalFlow Native Document Schema
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  // Bersihkan kutip, entitas HTML/Mermaid, dan tag <br/>
  function cleanLabelText(t) {
    if (!t) return '';
    let res = String(t).trim();
    if ((res.startsWith('"') && res.endsWith('"')) || (res.startsWith("'") && res.endsWith("'"))) {
      res = res.slice(1, -1);
    }
    res = res
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&quot;|#34;/gi, '"')
      .replace(/&apos;|&#39;|#39;/gi, "'")
      .replace(/&amp;|#38;/gi, '&')
      .replace(/&lt;|#60;/gi, '<')
      .replace(/&gt;|#62;/gi, '>')
      .replace(/#40;/gi, '(')
      .replace(/#41;/gi, ')')
      .replace(/#58;/gi, ':')
      .replace(/#59;/gi, ';')
      .replace(/#91;/gi, '[')
      .replace(/#93;/gi, ']');
    return res.trim();
  }

  // ==========================================================================
  // 1. ENGINE DETEKSI FORMAT UNIVERSAL
  // ==========================================================================
  function detectFormat(rawInput) {
    if (!rawInput || typeof rawInput !== "string") {
      return { type: "empty" };
    }

    const trimmed = rawInput.trim();
    if (!trimmed) return { type: "empty" };

    // Coba periksa apakah format Mermaid Script (.mmd)
    const isMermaidKeyword = /^(?:flowchart|graph)\s+(?:TD|TB|LR|RL|BT)/i.test(trimmed);
    const hasMermaidConnections = /-->|---|-.->|-.-|==>/.test(trimmed);
    const hasMermaidSubgraph = /\bsubgraph\b/i.test(trimmed);

    if (isMermaidKeyword || ((hasMermaidConnections || hasMermaidSubgraph) && !trimmed.startsWith('{') && !trimmed.startsWith('['))) {
      return { type: "mermaid", raw: trimmed };
    }

    // Coba parsing sebagai JSON
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== "object" || parsed === null) {
        return { type: "unknown", error: "Format data bukan objek JSON valid" };
      }

      // Format 0: MinimalFlow AI Vision Direct Spatial Reconstruction JSON
      if (parsed.format === "minimalflow_vision" || (Array.isArray(parsed.nodes) && parsed.nodes.some(n => Array.isArray(n && n.box_2d)))) {
        return { type: "minimalflow_vision", data: parsed };
      }

      // Format 1: Mashimurelay Circuit Trainer JSON
      if (parsed.bill_of_materials || parsed.wiring_connections || (parsed.module_id && parsed.circuit_name)) {
        return { type: "mashimurelay", data: parsed };
      }

      // Format 1b: Mashimurelay Architecture & Runtime Workflow JSON
      if (parsed.runtime_flowchart || parsed.engineering_workflow) {
        return { type: "mashimurelay_workflow", data: parsed };
      }

      // Format 2: MinimalFlow Native Schema
      if (parsed.nodes && typeof parsed.nodes === "object" && !Array.isArray(parsed.nodes)) {
        return { type: "minimalflow", data: parsed };
      }

      // Format 3: Generic JSON (Array of Nodes)
      if (Array.isArray(parsed) || (parsed.nodes && Array.isArray(parsed.nodes))) {
        return { type: "generic_json", data: parsed };
      }

      // Format 4: Cytoscape / D3 graph
      if (parsed.elements && (Array.isArray(parsed.elements.nodes) || Array.isArray(parsed.elements))) {
        return { type: "generic_json", data: parsed };
      }

      return { type: "unknown", error: "Struktur JSON tidak dikenali sebagai alur diagram" };
    } catch (e) {
      // Jika JSON error tapi ada tanda konektor panah, coba fallback ke Mermaid
      if (hasMermaidConnections) {
        return { type: "mermaid", raw: trimmed };
      }
      // Deteksi jika berupa daftar langkah bernomor, bullet points, atau prompt alur teks bebas
      const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const isNumbered = lines.some(l => /^(?:\d+[\.\)\:-]|[-*•]|\b(?:langkah|step)\s+\d+)/i.test(l));
      const hasArrowChain = /->|-->|=>|➔|→/.test(trimmed);
      if (isNumbered || hasArrowChain || lines.length >= 2) {
        return { type: "step_list", raw: trimmed };
      }
      return { type: "syntax_error", error: e.message };
    }
  }

  // ==========================================================================
  // 2. PARSER MERMAID SCRIPT (.mmd)
  // ==========================================================================
  function parseMermaidScript(content) {
    // Gabungkan label berkutip ganda yang melintasi beberapa baris sebelum split per baris
    const logicalLines = [];
    let buffer = "";
    let inDoubleQuote = false;
    for (let i = 0; i < content.length; i++) {
      const ch = content[i];
      if (ch === '"' && content[i - 1] !== '\\') {
        inDoubleQuote = !inDoubleQuote;
        buffer += ch;
      } else if (ch === '\n' && inDoubleQuote) {
        buffer += '<br/>';
      } else if (ch === '\n' && !inDoubleQuote) {
        logicalLines.push(buffer);
        buffer = "";
      } else if (ch !== '\r') {
        buffer += ch;
      }
    }
    if (buffer) logicalLines.push(buffer);

    const lines = logicalLines;
    const nodes = {};
    const edges = {};
    const subgraphs = {};
    let currentSubgraph = null;
    let edgeCounter = 1;

    let orientation = 'TD';
    const headerMatch = content.match(/(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/i);
    if (headerMatch) {
      orientation = headerMatch[1].toUpperCase();
    }

    function registerNode(id, label, shapeType) {
      if (!nodes[id]) {
        nodes[id] = {
          id,
          type: shapeType || 'rectangle',
          rawText: cleanLabelText(label) || id,
          subgraph: currentSubgraph ? currentSubgraph.id : null,
          inDegree: 0,
          outDegree: 0
        };
        if (currentSubgraph) {
          subgraphs[currentSubgraph.id].nodeIds.push(id);
        }
      } else {
        if (label) nodes[id].rawText = cleanLabelText(label);
        if (shapeType) nodes[id].type = shapeType;
        if (currentSubgraph && !nodes[id].subgraph) {
          nodes[id].subgraph = currentSubgraph.id;
          subgraphs[currentSubgraph.id].nodeIds.push(id);
        }
      }
      return id;
    }

    function ensureNode(rawToken) {
      if (!rawToken) return null;
      // Bersihkan trailing semicolon dan :::className
      rawToken = rawToken.trim().replace(/;+$/, '').replace(/:::[a-zA-Z0-9_-]+$/, '').trim();
      if (!rawToken) return null;

      // Bentuk 1: Stadium / Rounded: ID(["Text"])
      let match = rawToken.match(/^([a-zA-Z0-9_-]+)\s*\(\[\s*([\s\S]*?)\s*\]\)$/);
      if (match) return registerNode(match[1], match[2], 'rounded');

      // Bentuk 2: Cylinder: ID[("Text")]
      match = rawToken.match(/^([a-zA-Z0-9_-]+)\s*\[\(\s*([\s\S]*?)\s*\)\]$/);
      if (match) return registerNode(match[1], match[2], 'cylinder');

      // Bentuk 3: Circle: ID(("Text"))
      match = rawToken.match(/^([a-zA-Z0-9_-]+)\s*\(\(\s*([\s\S]*?)\s*\)\)$/);
      if (match) return registerNode(match[1], match[2], 'circle');

      // Bentuk 4: Subroutine: ID[["Text"]]
      match = rawToken.match(/^([a-zA-Z0-9_-]+)\s*\[\[\s*([\s\S]*?)\s*\]\]$/);
      if (match) return registerNode(match[1], match[2], 'predefined_process');

      // Bentuk 5: Hexagon: ID{{"Text"}}
      match = rawToken.match(/^([a-zA-Z0-9_-]+)\s*\{\{\s*([\s\S]*?)\s*\}\}$/);
      if (match) return registerNode(match[1], match[2], 'preparation');

      // Bentuk 6: Diamond / Decision: ID{"Text"}
      match = rawToken.match(/^([a-zA-Z0-9_-]+)\s*\{\s*([\s\S]*?)\s*\}$/);
      if (match) return registerNode(match[1], match[2], 'diamond');

      // Bentuk 7: Parallelogram: ID[/"Text"/] or ID[\"Text"\]
      match = rawToken.match(/^([a-zA-Z0-9_-]+)\s*\[\/\s*([\s\S]*?)\s*\/\]$/);
      if (match) return registerNode(match[1], match[2], 'parallelogram');

      // Bentuk 8: Rectangle: ID["Text"]
      match = rawToken.match(/^([a-zA-Z0-9_-]+)\s*\[\s*([\s\S]*?)\s*\]$/);
      if (match) return registerNode(match[1], match[2], 'rectangle');

      // Bentuk 9: Rounded biasa: ID("Text")
      match = rawToken.match(/^([a-zA-Z0-9_-]+)\s*\(\s*([\s\S]*?)\s*\)$/);
      if (match) return registerNode(match[1], match[2], 'rounded');

      // Bentuk 10: Bare ID
      match = rawToken.match(/^([a-zA-Z0-9_-]+)$/);
      if (match) return registerNode(match[1], null, null);

      return null;
    }

    // Split token dengan '&' di luar tanda kutip (mendukung fan-in/fan-out: A & B & C --> D)
    function splitAmpersandOutsideQuotes(token) {
      const parts = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < token.length; i++) {
        const ch = token[i];
        if (ch === '"' && token[i - 1] !== '\\') {
          inQ = !inQ;
          cur += ch;
        } else if (ch === '&' && !inQ) {
          parts.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      if (cur.trim()) parts.push(cur.trim());
      return parts;
    }

    // Temukan semua konektor panah hanya DI LUAR tanda kutip ganda
    const connRegex = /(-->\s*\|[^|]+\||-\.->\s*\|[^|]+\||--\s*(?:"[^"]*"|'[^']*'|[^-\s>]+)\s*-->|<-->|-->|---|-\.->|-.-|==>)/g;

    function findConnectorsOutsideQuotes(lineStr) {
      const quoteRanges = [];
      let qStart = -1;
      for (let i = 0; i < lineStr.length; i++) {
        if (lineStr[i] === '"' && lineStr[i - 1] !== '\\') {
          if (qStart === -1) qStart = i;
          else {
            quoteRanges.push([qStart, i]);
            qStart = -1;
          }
        }
      }
      function isInsideQuote(pos) {
        for (const [a, b] of quoteRanges) {
          if (pos > a && pos < b) return true;
        }
        return false;
      }
      return [...lineStr.matchAll(connRegex)].filter(m => !isInsideQuote(m.index));
    }

    for (let rawLine of lines) {
      let line = rawLine.trim().replace(/;+$/, '').trim();
      if (!line ||
          line.startsWith('%%') ||
          /^(?:flowchart|graph)\s+/i.test(line) ||
          /^(?:classDef|class|style|linkStyle|click|direction)\s+/i.test(line)) {
        continue;
      }

      // Deteksi awal subgraph
      const subMatch = line.match(/^subgraph\s+([a-zA-Z0-9_-]+)(?:\s*\[\s*(?:"([^"]*)"|'([^']*)'|([^\]]*))\s*\])?/i);
      if (subMatch) {
        const sId = subMatch[1];
        const sTitle = cleanLabelText(subMatch[2] || subMatch[3] || subMatch[4] || sId);
        subgraphs[sId] = { id: sId, title: sTitle, nodeIds: [] };
        currentSubgraph = subgraphs[sId];
        continue;
      }

      // Deteksi akhir subgraph
      if (line.toLowerCase() === 'end') {
        currentSubgraph = null;
        continue;
      }

      const matches = findConnectorsOutsideQuotes(line);
      if (matches.length > 0) {
        let lastIndex = 0;
        const tokens = [];
        const conns = [];

        for (const m of matches) {
          const token = line.substring(lastIndex, m.index).trim();
          tokens.push(token);
          conns.push(m[0]);
          lastIndex = m.index + m[0].length;
        }
        tokens.push(line.substring(lastIndex).trim());

        for (let i = 0; i < conns.length; i++) {
          const srcGroup = splitAmpersandOutsideQuotes(tokens[i]);
          const tgtGroup = splitAmpersandOutsideQuotes(tokens[i + 1]);
          const connStr = conns[i];

          const srcIds = srcGroup.map(ensureNode).filter(Boolean);
          const tgtIds = tgtGroup.map(ensureNode).filter(Boolean);

          let dashed = 'solid';
          let label = '';
          if (connStr.includes('-.->') || connStr.includes('-.-')) {
            dashed = 'dashed';
          }

          const pipeMatch = connStr.match(/\|([^|]+)\|/);
          if (pipeMatch) {
            label = cleanLabelText(pipeMatch[1]);
          } else {
            const quoteMatch = connStr.match(/--\s*("[^"]*"|'[^']*'|[^-\s>]+)\s*-->/);
            if (quoteMatch) {
              label = cleanLabelText(quoteMatch[1]);
            }
          }

          for (const srcId of srcIds) {
            for (const tgtId of tgtIds) {
              const edgeId = `edge_${edgeCounter++}`;
              edges[edgeId] = {
                id: edgeId,
                sourceId: srcId,
                targetId: tgtId,
                dashed,
                label
              };

              if (nodes[srcId]) nodes[srcId].outDegree++;
              if (nodes[tgtId]) nodes[tgtId].inDegree++;
            }
          }
        }
      } else {
        splitAmpersandOutsideQuotes(line).forEach(ensureNode);
      }
    }

    return { nodes, edges, subgraphs, orientation };
  }

  // ==========================================================================
  // 3. SUBGRAPH & SWIMLANE-AWARE HIERARCHICAL LAYOUT ENGINE
  // ==========================================================================
  function layoutGraph(nodes, edges, orientation = 'TD', isDark = false, subgraphs = {}, fontOptions = {}) {
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) return { nodes: {}, edges: {}, totalWidth: 1600, totalHeight: 900 };

    const isTD = orientation === 'TD' || orientation === 'TB';
    const subList = Object.values(subgraphs || {});
    const hasSubgraphs = subList.length > 0;

    const finalNodes = {};
    const finalEdges = {};

    let totalWidth = 1600;
    let totalHeight = 900;

    // JIKA ADA SUBGRAPH (seperti WORKFLOW_PENGGUNAAN_MASHIMURELAY: GURU & SISWA)
    if (hasSubgraphs && isTD) {
      let currentY = 80;
      const canvasCenterX = 800;
      let globalMinX = Infinity, globalMaxX = -Infinity;

      for (const sub of subList) {
        const subNodeIds = sub.nodeIds;
        if (subNodeIds.length === 0) continue;

        // Bangun relasi internal khusus dalam subgraph ini
        const internalAdj = {};
        const internalInDeg = {};
        subNodeIds.forEach(id => {
          internalAdj[id] = [];
          internalInDeg[id] = 0;
        });

        Object.values(edges).forEach(e => {
          if (internalAdj[e.sourceId] && internalAdj[e.targetId] !== undefined) {
            internalAdj[e.sourceId].push(e.targetId);
            internalInDeg[e.targetId]++;
          }
        });

        // Cari titik awal (akar) internal dalam subgraph
        let internalRoots = subNodeIds.filter(id => internalInDeg[id] === 0);
        if (internalRoots.length === 0) internalRoots = [subNodeIds[0]];

        // Jika ada beberapa akar independen (misal G1 alur persiapan, G8 alur penilaian), bagi menjadi kolom terpisah
        const trackCount = internalRoots.length;
        const trackWidth = trackCount > 1 ? 380 : 420;
        const subTotalW = Math.max(760, trackCount * trackWidth);
        const subStartX = canvasCenterX - subTotalW / 2;

        const subLevels = {};
        const subTrack = {};
        const visited = new Set();

        internalRoots.forEach((rootId, trackIdx) => {
          const q = [rootId];
          subLevels[rootId] = 0;
          subTrack[rootId] = trackIdx;
          visited.add(rootId);

          while (q.length > 0) {
            const curr = q.shift();
            const currLvl = subLevels[curr];
            for (const nxt of internalAdj[curr]) {
              subLevels[nxt] = Math.max(subLevels[nxt] || 0, currLvl + 1);
              subTrack[nxt] = trackIdx;
              if (!visited.has(nxt)) {
                visited.add(nxt);
                q.push(nxt);
              }
            }
          }
        });

        subNodeIds.forEach(id => {
          if (!visited.has(id)) {
            subLevels[id] = 0;
            subTrack[id] = 0;
          }
        });

        let subMinX = Infinity, subMinY = Infinity, subMaxX = -Infinity, subMaxY = -Infinity;

        subNodeIds.forEach(id => {
          const n = nodes[id];
          const text = n.rawText || id;
          const lines = text.split('\n');
          const maxLineLen = Math.max(...lines.map(l => l.length));

          let width = Math.max(170, Math.min(270, maxLineLen * 7.5 + 32));
          let height = Math.max(68, lines.length * 18 + 34);

          if (n.type === 'circle') {
            const dim = Math.max(110, Math.max(width, height) * 0.85);
            width = dim; height = dim;
          } else if (n.type === 'diamond') {
            width = Math.max(160, width + 30);
            height = Math.max(110, height + 30);
          }

          const tIdx = subTrack[id] || 0;
          const lvl = subLevels[id] || 0;

          const trackCenterX = subStartX + tIdx * trackWidth + trackWidth / 2;
          const x = Math.round(trackCenterX - width / 2);
          const y = Math.round(currentY + 55 + lvl * 125);

          finalNodes[id] = {
            id,
            type: n.type || 'rectangle',
            x,
            y,
            width: Math.round(width),
            height: Math.round(height),
            rotation: 0,
            locked: false,
            groupId: sub.id,
            style: {
              fill: isDark ? "#18181b" : "#ffffff",
              stroke: isDark ? "#f4f4f5" : "#18181b",
              strokeWidth: 1.5
            },
            text: {
              content: text,
              fontFamily: fontOptions.fontFamily || "Poppins, sans-serif",
              fontSize: fontOptions.fontSize || 12.5,
              bold: false,
              italic: false,
              underline: false,
              color: isDark ? "#f4f4f5" : "#18181b",
              align: "center",
              paddingX: 12,
              paddingY: 10
            }
          };

          subMinX = Math.min(subMinX, x);
          subMinY = Math.min(subMinY, y);
          subMaxX = Math.max(subMaxX, x + width);
          subMaxY = Math.max(subMaxY, y + height);
        });

        // Buat kotak pembatas (subgraph container boundary frame)
        const containerId = `subgraph_${sub.id}`;
        const boxPadX = 35;
        const boxPadY = 45;
        const cX = subMinX - boxPadX;
        const cY = subMinY - boxPadY;
        const cW = (subMaxX - subMinX) + boxPadX * 2;
        const cH = (subMaxY - subMinY) + boxPadY * 2;

        finalNodes[containerId] = {
          id: containerId,
          type: "rectangle",
          x: cX,
          y: cY,
          width: cW,
          height: cH,
          rotation: 0,
          locked: true,
          isContainer: true,
          style: {
            fill: isDark ? "rgba(24, 24, 27, 0.45)" : "rgba(250, 250, 250, 0.65)",
            stroke: isDark ? "#3f3f46" : "#d4d4d8",
            strokeWidth: 1.5,
            dashed: "dashed"
          },
          text: {
            content: `[ ${sub.title.toUpperCase()} ]`,
            fontFamily: fontOptions.fontFamily || "Inter, sans-serif",
            fontSize: fontOptions.fontSize || 12,
            bold: true,
            italic: false,
            underline: false,
            color: isDark ? "#a1a1aa" : "#71717a",
            align: "left",
            paddingX: 18,
            paddingY: 14
          }
        };

        globalMinX = Math.min(globalMinX, cX);
        globalMaxX = Math.max(globalMaxX, cX + cW);
        currentY = subMaxY + boxPadY + 120;
      }

      totalWidth = Math.max(1600, (globalMaxX - globalMinX) + 160);
      totalHeight = Math.max(900, currentY + 100);

    } else {
      // DEFAULT BFS LAYOUT (UNTUK GRAF UMUM TANPA SUBGRAPH)
      const levels = {};
      const inDegree = {};
      const adj = {};

      nodeIds.forEach(id => {
        levels[id] = 0;
        inDegree[id] = 0;
        adj[id] = [];
      });

      Object.values(edges).forEach(e => {
        if (adj[e.sourceId]) adj[e.sourceId].push(e.targetId);
        if (inDegree[e.targetId] !== undefined) inDegree[e.targetId]++;
      });

      let queue = nodeIds.filter(id => inDegree[id] === 0);
      if (queue.length === 0) queue = [nodeIds[0]];

      const visited = new Set();
      queue.forEach(id => {
        levels[id] = 0;
        visited.add(id);
      });

      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++];
        const currLevel = levels[curr];

        for (const neighbor of (adj[curr] || [])) {
          levels[neighbor] = Math.max(levels[neighbor] || 0, currLevel + 1);
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      nodeIds.forEach(id => {
        if (!visited.has(id)) levels[id] = 0;
      });

      const levelGroups = {};
      nodeIds.forEach(id => {
        const lvl = levels[id];
        if (!levelGroups[lvl]) levelGroups[lvl] = [];
        levelGroups[lvl].push(id);
      });

      const maxLvl = Math.max(...Object.keys(levelGroups).map(Number));
      const startX = 80;
      const startY = 80;
      const TE = exports.TextEditor;
      const baseFontFamily = fontOptions.fontFamily || "Poppins, sans-serif";
      const baseFontSize = fontOptions.fontSize || 13;

      let cursorY = startY;
      let cursorX = startX;
      let maxExtentX = 1600;
      let maxExtentY = 900;

      for (let lvl = 0; lvl <= maxLvl; lvl++) {
        const group = levelGroups[lvl] || [];
        const count = group.length;
        if (count === 0) continue;

        // Pass 1: Hitung dimensi aktual (lebar & tinggi anti-clipping) setiap node di level ini
        const measured = group.map(id => {
          const n = nodes[id];
          const text = n.rawText || id;
          const lines = text.split('\n');
          const totalChars = text.length;
          const maxLineLen = Math.max(...lines.map(l => l.length));

          // Jika hanya 1 node di level ini dengan teks panjang, izinkan lebih lebar agar proporsional
          const maxAllowedW = (count === 1 && totalChars > 140) ? 760 : (count <= 2 ? 360 : 250);
          let width = Math.max(160, Math.min(maxAllowedW, maxLineLen * 7.5 + 36));
          let height = Math.max(70, lines.length * 18 + 36);

          const tempNode = {
            type: n.type || 'rectangle',
            width: Math.round(width),
            height: Math.round(height),
            text: {
              content: text,
              fontFamily: baseFontFamily,
              fontSize: baseFontSize,
              bold: false,
              italic: false,
              underline: false,
              align: "center",
              paddingX: 14,
              paddingY: 10
            }
          };

          if (TE && TE.layoutNodeText && TE.computeRequiredNodeHeight) {
            const layout = TE.layoutNodeText(tempNode);
            height = Math.max(height, TE.computeRequiredNodeHeight(tempNode, layout.totalTextHeight) + 6);
          }

          if (n.type === 'circle') {
            const dim = Math.max(110, Math.max(width, height) * 0.9);
            width = dim; height = dim;
          } else if (n.type === 'diamond') {
            width = Math.max(160, width + 36);
            height = Math.max(110, height + 36);
          }

          return { id, n, text, width: Math.round(width), height: Math.round(height) };
        });

        const gapX = 32;
        const gapY = 64;
        const rowMaxH = Math.max(...measured.map(m => m.height));
        const colMaxW = Math.max(...measured.map(m => m.width));
        const totalRowW = measured.reduce((sum, m) => sum + m.width, 0) + Math.max(0, count - 1) * gapX;
        const totalColH = measured.reduce((sum, m) => sum + m.height, 0) + Math.max(0, count - 1) * 36;

        let runX = Math.max(startX, Math.round(800 - totalRowW / 2));
        let runY = Math.max(startY, Math.round(450 - totalColH / 2));

        measured.forEach(item => {
          let x, y;
          if (isTD) {
            x = runX;
            y = cursorY;
            runX += item.width + gapX;
          } else {
            x = cursorX;
            y = runY;
            runY += item.height + 36;
          }

          finalNodes[item.id] = {
            id: item.id,
            type: item.n.type || 'rectangle',
            x: Math.round(x),
            y: Math.round(y),
            width: item.width,
            height: item.height,
            rotation: 0,
            locked: false,
            groupId: null,
            style: {
              fill: isDark ? "#18181b" : "#ffffff",
              stroke: isDark ? "#f4f4f5" : "#18181b",
              strokeWidth: 1.5
            },
            text: {
              content: item.text,
              fontFamily: baseFontFamily,
              fontSize: baseFontSize,
              bold: false,
              italic: false,
              underline: false,
              color: isDark ? "#f4f4f5" : "#18181b",
              align: "center",
              paddingX: 14,
              paddingY: 10
            }
          };

          maxExtentX = Math.max(maxExtentX, x + item.width + 100);
          maxExtentY = Math.max(maxExtentY, y + item.height + 100);
        });

        if (isTD) {
          cursorY += rowMaxH + gapY;
        } else {
          cursorX += colMaxW + 80;
        }
      }

      totalWidth = Math.max(1600, Math.round(maxExtentX));
      totalHeight = Math.max(900, Math.round(maxExtentY));
    }

    // Hubungkan kabel & pin magnetik
    Object.values(edges).forEach(e => {
      const src = finalNodes[e.sourceId];
      const tgt = finalNodes[e.targetId];
      if (!src || !tgt) return;

      let srcPin = 'S', tgtPin = 'N';
      if (isTD) {
        if (tgt.y > src.y + 20) {
          srcPin = 'S'; tgtPin = 'N';
        } else if (tgt.y < src.y - 20) {
          srcPin = 'W'; tgtPin = 'W'; // Loopback ke atas lewat sisi kiri
        } else {
          srcPin = tgt.x > src.x ? 'E' : 'W';
          tgtPin = tgt.x > src.x ? 'W' : 'E';
        }
      } else {
        if (tgt.x > src.x + 20) {
          srcPin = 'E'; tgtPin = 'W';
        } else if (tgt.x < src.x - 20) {
          srcPin = 'S'; tgtPin = 'S'; // Loopback ke kiri lewat bawah
        } else {
          srcPin = tgt.y > src.y ? 'S' : 'N';
          tgtPin = tgt.y > src.y ? 'N' : 'S';
        }
      }

      finalEdges[e.id] = {
        id: e.id,
        type: "step",
        radius: 8,
        source: { nodeId: e.sourceId, pin: srcPin },
        target: { nodeId: e.targetId, pin: tgtPin },
        handleOffset: { dx: 0, dy: 0 },
        label: e.label || '',
        style: {
          stroke: isDark ? "#f4f4f5" : "#18181b",
          strokeWidth: 1.5,
          dashed: e.dashed || "solid",
          markerStart: "none",
          markerEnd: "arrow",
          radius: 8
        }
      };
    });

    return { nodes: finalNodes, edges: finalEdges, totalWidth, totalHeight };
  }

  // ==========================================================================
  // 4. ADAPTER MASHIMURELAY CIRCUIT TRAINER NETLIST
  // ==========================================================================
  function parseMashimurelayJson(data, isDark = false) {
    const bom = data.bill_of_materials || [];
    const connections = data.wiring_connections || [];

    const nodes = {};
    const edges = {};
    let edgeCounter = 1;

    bom.forEach(item => {
      let type = 'rectangle';
      const id = String(item.id || '').trim();
      const name = String(item.name || '').trim();

      if (id.startsWith('BAT') || name.toLowerCase().includes('baterai') || name.toLowerCase().includes('aki')) {
        type = 'cylinder';
      } else if (id.startsWith('FUS') || name.toLowerCase().includes('sekring')) {
        type = 'rounded';
      } else if (id.startsWith('LMP') || id.startsWith('IND') || name.toLowerCase().includes('lampu') || name.toLowerCase().includes('indikator') || name.toLowerCase().includes('klakson')) {
        type = 'circle';
      } else if (name.toLowerCase().includes('protokol') || name.toLowerCase().includes('qr')) {
        type = 'parallelogram';
      } else if (id.startsWith('SW') || id.startsWith('RLY') || id.startsWith('IGN')) {
        type = 'rectangle';
      }

      const label = `${item.name}${item.spec ? '\n[' + item.spec + ']' : ''}`;
      nodes[id] = {
        id,
        type,
        rawText: label,
        inDegree: 0,
        outDegree: 0
      };
    });

    connections.forEach(conn => {
      const fromComp = (conn.from || '').split(':')[0].trim();
      const toComp = (conn.to || '').split(':')[0].trim();

      if (!nodes[fromComp]) {
        nodes[fromComp] = { id: fromComp, type: 'rounded', rawText: fromComp, inDegree: 0, outDegree: 0 };
      }
      if (!nodes[toComp]) {
        nodes[toComp] = { id: toComp, type: 'rounded', rawText: toComp, inDegree: 0, outDegree: 0 };
      }

      const edgeId = `edge_${edgeCounter++}`;
      const isGround = (conn.from || '').includes(':31') || (conn.to || '').includes(':31');
      edges[edgeId] = {
        id: edgeId,
        sourceId: fromComp,
        targetId: toComp,
        dashed: isGround ? 'dashed' : 'solid',
        label: conn.wire || conn.desc || ''
      };

      nodes[fromComp].outDegree++;
      nodes[toComp].inDegree++;
    });

    const layout = layoutGraph(nodes, edges, 'LR', isDark);

    return {
      version: "1.5.0",
      theme: isDark ? "dark" : "light",
      canvas: {
        pan: { x: 50, y: 50 },
        zoom: 0.9,
        gridSize: 24,
        workspace: {
          preset: "16:9_landscape",
          orientation: "landscape",
          x: 40,
          y: 40,
          width: layout.totalWidth,
          height: layout.totalHeight
        }
      },
      nodes: layout.nodes,
      edges: layout.edges
    };
  }

  // ==========================================================================
  // 4b. ADAPTER MASHIMURELAY ARCHITECTURE & RUNTIME WORKFLOW
  // ==========================================================================
  function parseMashimurelayWorkflowJson(data, isDark = false) {
    const fontOptions = {
      fontFamily: "'Book Antiqua', Palatino, serif",
      fontSize: 10
    };

    if (data.runtime_flowchart && Array.isArray(data.runtime_flowchart.nodes)) {
      const rawNodes = data.runtime_flowchart.nodes;
      const rawEdges = Array.isArray(data.runtime_flowchart.edges) ? data.runtime_flowchart.edges : [];

      const intermediateNodes = {};
      const intermediateEdges = {};
      const subgraphs = {
        "GROUP_CORE": { id: "GROUP_CORE", title: "Inisialisasi CAD & Siklus Utama (Workspace Loop)", nodeIds: [] },
        "GROUP_EDIT": { id: "GROUP_EDIT", title: "Manipulasi Elemen & Wiring Kanvas", nodeIds: [] },
        "GROUP_SIM": { id: "GROUP_SIM", title: "Mesin Simulasi Elektromagnetik & Proteksi Korsleting", nodeIds: [] },
        "GROUP_QR": { id: "GROUP_QR", title: "Telemetri QR Code & Pengumpulan Tugas Lab LAN", nodeIds: [] },
        "GROUP_SAVE": { id: "GROUP_SAVE", title: "Generator Dokumen PDF & Dual Storage", nodeIds: [] },
        "GROUP_INST": { id: "GROUP_INST", title: "Ensiklopedia Interaktif & Video Player", nodeIds: [] }
      };

      const groupMapping = {
        "START": "GROUP_CORE", "INIT_CAD": "GROUP_CORE", "LOAD_WORKSPACE": "GROUP_CORE", "WAIT_USER": "GROUP_CORE", "DECIDE_ACTION": "GROUP_CORE",
        "ACT_EDIT": "GROUP_EDIT", "SAVE_STATE": "GROUP_EDIT",
        "ACT_SIM": "GROUP_SIM", "SOLVE_CIRCUIT": "GROUP_SIM", "CHECK_FAULT": "GROUP_SIM", "TRIP_PROTECTION": "GROUP_SIM", "RUN_DYNAMICS": "GROUP_SIM", "STOP_SIM": "GROUP_SIM",
        "ACT_QR": "GROUP_QR", "SHOW_QR_MODAL": "GROUP_QR", "PARSE_QR": "GROUP_QR", "QR_CIRCUIT": "GROUP_QR", "LOAD_DIRECT": "GROUP_QR", "QR_TEACHER": "GROUP_QR", "SHOW_STUDENT_ID": "GROUP_QR", "SUBMIT_TEACHER": "GROUP_QR",
        "ACT_SAVE_EXPORT": "GROUP_SAVE", "SHOW_SAVE_MODAL": "GROUP_SAVE", "CHOOSE_FORMAT": "GROUP_SAVE", "EXPORT_SMRL": "GROUP_SAVE", "EXPORT_TXT": "GROUP_SAVE", "EXPORT_PDF": "GROUP_SAVE", "DUAL_STORAGE_SAVE": "GROUP_SAVE", "OPEN_VIEWER": "GROUP_SAVE",
        "ACT_INSTRUCTIONS": "GROUP_INST", "SHOW_INST_MODAL": "GROUP_INST", "INST_SUBNAV": "GROUP_INST", "VIEW_VIDEO": "GROUP_INST", "VIEW_ENCYCLO": "GROUP_INST", "VIEW_GUIDE": "GROUP_INST"
      };

      rawNodes.forEach(n => {
        const id = String(n.id);
        const text = n.label || id;
        const ntype = n.type === 'decision' ? 'diamond' : (n.type === 'start_end' ? 'rounded' : 'rectangle');
        intermediateNodes[id] = {
          id,
          type: ntype,
          rawText: cleanLabelText(text),
          inDegree: 0,
          outDegree: 0
        };
        const gid = groupMapping[id] || "GROUP_CORE";
        if (subgraphs[gid]) subgraphs[gid].nodeIds.push(id);
      });

      let edgeIdx = 1;
      rawEdges.forEach(e => {
        const srcId = String(e.from || e.source || '');
        const tgtId = String(e.to || e.target || '');
        if (srcId && tgtId) {
          const edgeId = `edge_${edgeIdx++}`;
          intermediateEdges[edgeId] = {
            id: edgeId,
            sourceId: srcId,
            targetId: tgtId,
            dashed: (tgtId === 'WAIT_USER') ? 'dashed' : 'solid',
            label: e.label || ''
          };
          if (intermediateNodes[srcId]) intermediateNodes[srcId].outDegree++;
          if (intermediateNodes[tgtId]) intermediateNodes[tgtId].inDegree++;
        }
      });

      const layout = layoutGraph(intermediateNodes, intermediateEdges, 'TD', isDark, subgraphs, fontOptions);
      return {
        version: "1.5.0",
        theme: isDark ? "dark" : "light",
        canvas: {
          pan: { x: 50, y: 50 },
          zoom: 0.65,
          gridSize: 24,
          workspace: {
            preset: "16:9_landscape",
            orientation: "landscape",
            x: 40,
            y: 40,
            width: layout.totalWidth,
            height: layout.totalHeight
          }
        },
        nodes: layout.nodes,
        edges: layout.edges
      };
    }

    if (data.engineering_workflow && Array.isArray(data.engineering_workflow.phases)) {
      const intermediateNodes = {};
      const intermediateEdges = {};
      const subgraphs = {};
      let edgeIdx = 1;

      data.engineering_workflow.phases.forEach((p, pIdx) => {
        const pId = p.phase_id || `PHASE_${pIdx + 1}`;
        subgraphs[pId] = {
          id: pId,
          title: p.phase_name || pId,
          nodeIds: []
        };

        const tasks = Array.isArray(p.tasks) ? p.tasks : [];
        let prevTaskId = null;
        tasks.forEach((t, tIdx) => {
          const tId = `${pId}_task_${tIdx + 1}`;
          intermediateNodes[tId] = {
            id: tId,
            type: "rectangle",
            rawText: cleanLabelText(t),
            inDegree: 0,
            outDegree: 0
          };
          subgraphs[pId].nodeIds.push(tId);

          if (prevTaskId) {
            const edgeId = `edge_${edgeIdx++}`;
            intermediateEdges[edgeId] = {
              id: edgeId,
              sourceId: prevTaskId,
              targetId: tId,
              dashed: "solid",
              label: ""
            };
            intermediateNodes[prevTaskId].outDegree++;
            intermediateNodes[tId].inDegree++;
          }
          prevTaskId = tId;
        });
      });

      const layout = layoutGraph(intermediateNodes, intermediateEdges, 'TD', isDark, subgraphs, fontOptions);
      return {
        version: "1.5.0",
        theme: isDark ? "dark" : "light",
        canvas: {
          pan: { x: 50, y: 50 },
          zoom: 0.60,
          gridSize: 24,
          workspace: {
            preset: "custom_portrait",
            orientation: "portrait",
            x: 40,
            y: 40,
            width: layout.totalWidth,
            height: layout.totalHeight
          }
        },
        nodes: layout.nodes,
        edges: layout.edges
      };
    }

    return parseGenericJson(data, isDark);
  }

  // ==========================================================================
  // 5. ADAPTER GENERIC DIAGRAM JSON (ARRAY FORMAT)
  // ==========================================================================
  function parseGenericJson(data, isDark = false) {
    let rawNodes = [];
    let rawEdges = [];

    if (Array.isArray(data)) {
      rawNodes = data;
    } else if (data.nodes && Array.isArray(data.nodes)) {
      rawNodes = data.nodes;
      rawEdges = Array.isArray(data.edges) ? data.edges : [];
    } else if (data.elements) {
      if (Array.isArray(data.elements.nodes)) rawNodes = data.elements.nodes;
      if (Array.isArray(data.elements.edges)) rawEdges = data.elements.edges;
      if (Array.isArray(data.elements)) {
        data.elements.forEach(el => {
          if (el.group === "nodes" || el.data?.id) rawNodes.push(el);
          else if (el.group === "edges" || (el.data?.source && el.data?.target)) rawEdges.push(el);
        });
      }
    }

    const intermediateNodes = {};
    const intermediateEdges = {};
    let edgeIdx = 1;

    rawNodes.forEach((n, idx) => {
      const id = String(n.id || n.data?.id || `node_${idx + 1}`);
      const text = n.label || n.data?.label || n.text || n.title || n.name || id;
      const type = n.type || 'rectangle';
      intermediateNodes[id] = {
        id,
        type,
        rawText: cleanLabelText(text),
        inDegree: 0,
        outDegree: 0
      };
    });

    rawEdges.forEach((e, idx) => {
      const srcId = String(e.source || e.data?.source || e.from || '');
      const tgtId = String(e.target || e.data?.target || e.to || '');
      if (srcId && tgtId) {
        const edgeId = `edge_${edgeIdx++}`;
        intermediateEdges[edgeId] = {
          id: edgeId,
          sourceId: srcId,
          targetId: tgtId,
          dashed: e.dashed ? 'dashed' : 'solid',
          label: e.label || e.data?.label || ''
        };
        if (intermediateNodes[srcId]) intermediateNodes[srcId].outDegree++;
        if (intermediateNodes[tgtId]) intermediateNodes[tgtId].inDegree++;
      }
    });

    const layout = layoutGraph(intermediateNodes, intermediateEdges, 'TD', isDark);

    return {
      version: "1.5.0",
      theme: isDark ? "dark" : "light",
      canvas: {
        pan: { x: 50, y: 50 },
        zoom: 1.0,
        gridSize: 24,
        workspace: {
          preset: "16:9_landscape",
          orientation: "landscape",
          x: 40,
          y: 40,
          width: layout.totalWidth,
          height: layout.totalHeight
        }
      },
      nodes: layout.nodes,
      edges: layout.edges
    };
  }

  // ==========================================================================
  // 6. ADAPTER MERMAID KE MINIMALFLOW DOCUMENT
  // ==========================================================================
  function parseMermaidToDocument(rawContent, isDark = false) {
    const parsed = parseMermaidScript(rawContent);
    const layout = layoutGraph(parsed.nodes, parsed.edges, parsed.orientation, isDark, parsed.subgraphs);
    const isTall = layout.totalHeight > layout.totalWidth;

    return {
      version: "1.5.0",
      theme: isDark ? "dark" : "light",
      canvas: {
        pan: { x: 50, y: 50 },
        zoom: isTall ? 0.65 : 0.85,
        gridSize: 24,
        workspace: {
          preset: isTall ? "custom_portrait" : "16:9_landscape",
          orientation: isTall ? "portrait" : "landscape",
          x: 40,
          y: 40,
          width: layout.totalWidth,
          height: layout.totalHeight
        }
      },
      nodes: layout.nodes,
      edges: layout.edges
    };
  }

  // ==========================================================================
  // 6b. ADAPTER NATURAL LANGUAGE PROMPT & STEP LIST
  // ==========================================================================
  function parseStepListToDocument(rawText, isDark = false) {
    if (!rawText) {
      return {
        nodes: {}, edges: {},
        canvas: { pan: { x: 50, y: 50 }, zoom: 1, gridSize: 24, workspace: { preset: "16:9_landscape", orientation: "landscape", x: 40, y: 40, width: 1600, height: 900 } }
      };
    }

    let clean = rawText.trim().replace(/^```[a-zA-Z0-9_-]*\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    let steps = [];

    if (/->|-->|=>|➔|→/.test(clean)) {
      const parts = clean.split(/->|-->|=>|➔|→/);
      steps = parts.map(p => p.trim()).filter(p => p.length > 0).map(s => {
        return { label: s.replace(/^\[?\d+[\]\.\:\-\)]\s*/, "").trim() || s };
      });
    } else {
      const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lines.forEach(l => {
        if (l.startsWith("#") || l.startsWith("//")) return;
        const cleaned = l.replace(/^(?:(?:\d+[\.\)\:-])|[-*•]|\b(?:langkah|step)\s+\d+[:\.\-]?)\s*/i, "").trim();
        if (cleaned.length > 0) steps.push({ label: cleaned });
      });
    }

    if (steps.length === 0) steps.push({ label: clean });

    const nodes = {};
    const edges = {};
    const strokeColor = isDark ? "#f4f4f5" : "#18181b";
    const fillColor = isDark ? "#27272a" : "#ffffff";
    const textColor = isDark ? "#f4f4f5" : "#18181b";

    const width = 1600;
    const height = Math.max(900, steps.length * 150 + 160);
    const centerX = 800;
    let curY = 80;

    steps.forEach((step, idx) => {
      const id = "node_step_" + (idx + 1);
      const lower = step.label.toLowerCase();
      let type = "rectangle";
      if (/\b(mulai|start|begin|selesai|finish|end|berhenti|stop)\b/i.test(lower)) type = "rounded";
      else if (/\?|\bapakah\b|\bjika\b|\bif\b|\bkondisi\b|\bvalid\?|\bcek\b|\bevaluasi\b|\bdecision\b/i.test(lower)) type = "diamond";
      else if (/\b(input|output|masukkan|keluaran|baca|read|print|cetak|tampilkan|display)\b/i.test(lower)) type = "parallelogram";
      else if (/\b(database|db|basis data|tabel|table|simpan ke db|storage|penyimpanan)\b/i.test(lower)) type = "cylinder";

      let nw = 160, nh = 80;
      if (type === "diamond") { nw = 150; nh = 100; }
      else if (type === "parallelogram") { nw = 170; nh = 76; }

      nodes[id] = {
        id,
        type,
        x: Math.round(centerX - nw / 2),
        y: curY,
        width: nw,
        height: nh,
        baseWidth: nw,
        baseHeight: nh,
        rotation: 0,
        locked: false,
        groupId: null,
        src: null,
        zIndex: (idx + 1) * 10,
        style: {
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: 1.5,
          dashed: "solid"
        },
        text: {
          content: step.label,
          fontFamily: "Poppins, sans-serif",
          fontSize: 13,
          bold: false,
          italic: false,
          underline: false,
          align: "center",
          valign: "middle",
          paddingX: 14,
          color: textColor
        }
      };

      if (idx > 0) {
        const prevId = "node_step_" + idx;
        const edgeId = "edge_step_" + idx;
        edges[edgeId] = {
          id: edgeId,
          type: "step",
          radius: 8,
          source: { nodeId: prevId, pin: "S" },
          target: { nodeId: id, pin: "N" },
          handleOffset: { dx: 0, dy: 0 },
          zIndex: (idx + 1) * 10 - 5,
          style: {
            stroke: strokeColor,
            strokeWidth: 1.5,
            dashed: "solid",
            markerStart: "none",
            markerEnd: "arrow",
            radius: 8
          }
        };
      }

      curY += nh + 50;
    });

    return {
      version: "1.5.0",
      theme: isDark ? "dark" : "light",
      canvas: {
        pan: { x: 50, y: 50 },
        zoom: 0.85,
        gridSize: 24,
        workspace: {
          preset: height > 1000 ? "a4_portrait" : "16:9_landscape",
          orientation: height > 1000 ? "portrait" : "landscape",
          x: 40,
          y: 40,
          width: 1600,
          height: Math.max(curY + 60, 900)
        }
      },
      nodes,
      edges
    };
  }

  // ==========================================================================
  // 6b. AI VISION DIRECT SPATIAL RECONSTRUCTION ENGINE (box_2d + Verbatim Rich Text)
  // ==========================================================================
  function normalizeVisionShapeType(rawType) {
    const t = String(rawType || "rectangle").toLowerCase().trim();
    const validShapes = new Set([
      "rectangle", "rounded", "diamond", "circle", "parallelogram",
      "document", "predefined_process", "preparation", "manual_input",
      "manual_operation", "display", "offpage", "cylinder",
      "disk_storage", "magnetic_tape", "punch_card"
    ]);
    if (validShapes.has(t)) return t;
    if (t === "stadium" || t === "terminator" || t === "pill" || t === "oval") return "rounded";
    if (t === "process" || t === "box" || t === "rect" || t === "square") return "rectangle";
    if (t === "decision" || t === "rhombus" || t === "condition") return "diamond";
    if (t === "database" || t === "db" || t === "storage") return "cylinder";
    if (t === "io" || t === "input" || t === "output" || t === "data") return "parallelogram";
    if (t === "subroutine" || t === "sub_process" || t === "predefined") return "predefined_process";
    if (t === "hexagon" || t === "prep") return "preparation";
    if (t === "trapezoid") return "manual_operation";
    if (t === "pentagon" || t === "off_page" || t === "offpage_connector") return "offpage";
    if (t === "connector" || t === "ellipse") return "circle";
    return "rectangle";
  }

  function parseMinimalFlowVisionJson(data, isDark = false) {
    const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
    const rawEdges = Array.isArray(data.edges) ? data.edges : [];
    const TE = exports.TextEditor;

    if (rawNodes.length === 0) {
      return {
        version: "1.5.0",
        theme: isDark ? "dark" : "light",
        canvas: { pan: { x: 40, y: 40 }, zoom: 1, gridSize: 24, workspace: { preset: "16:9_landscape", orientation: "landscape", x: 40, y: 40, width: 1600, height: 900 } },
        nodes: {},
        edges: {}
      };
    }

    const imgW = Number(data.imageWidth) > 100 ? Number(data.imageWidth) : 1600;
    const imgH = Number(data.imageHeight) > 100 ? Number(data.imageHeight) : 900;
    const aspect = imgW / imgH;

    // Tentukan ukuran kanvas target yang mempertahankan rasio aspek asli gambar
    let canvasW = 1440;
    let canvasH = Math.round(canvasW / aspect);
    if (canvasH > 1400) {
      canvasH = 1400;
      canvasW = Math.round(canvasH * aspect);
    }
    if (canvasW < 960) {
      canvasW = 960;
      canvasH = Math.round(canvasW / aspect);
    }

    const marginX = 72;
    const marginY = 72;
    const drawW = canvasW - marginX * 2;
    const drawH = canvasH - marginY * 2;

    // Cari rentang koordinat box_2d agar diagram memenuhi area kerja secara proporsional
    const validBoxes = rawNodes.filter(n => Array.isArray(n.box_2d) && n.box_2d.length === 4);
    let minNormX = 0, maxNormX = 1000, minNormY = 0, maxNormY = 1000;
    if (validBoxes.length > 0) {
      const xs1 = validBoxes.map(n => Number(n.box_2d[1]) || 0);
      const xs2 = validBoxes.map(n => Number(n.box_2d[3]) || 1000);
      const ys1 = validBoxes.map(n => Number(n.box_2d[0]) || 0);
      const ys2 = validBoxes.map(n => Number(n.box_2d[2]) || 1000);
      const spanX = Math.max(100, Math.max(...xs2) - Math.min(...xs1));
      const spanY = Math.max(100, Math.max(...ys2) - Math.min(...ys1));
      minNormX = Math.max(0, Math.min(...xs1) - spanX * 0.03);
      maxNormX = Math.min(1000, Math.max(...xs2) + spanX * 0.03);
      minNormY = Math.max(0, Math.min(...ys1) - spanY * 0.03);
      maxNormY = Math.min(1000, Math.max(...ys2) + spanY * 0.03);
    }

    const normSpanX = Math.max(100, maxNormX - minNormX);
    const normSpanY = Math.max(100, maxNormY - minNormY);
    // Gunakan skala seragam berdasarkan dimensi fisik asli agar kotak tidak gepeng
    const physSpanW = (normSpanX / 1000) * imgW;
    const physSpanH = (normSpanY / 1000) * imgH;
    const uniformScale = Math.min(drawW / physSpanW, drawH / physSpanH);
    const scaleX = (uniformScale * imgW) / 1000;
    const scaleY = (uniformScale * imgH) / 1000;

    const VALID_ALIGNS = new Set(["left", "center", "right", "justify"]);
    const VALID_LISTS = new Set(["1.", "1)", "a.", "a)", "A.", "A)"]);

    const builtNodes = [];
    const nodeMap = {};

    rawNodes.forEach((rn, idx) => {
      const id = String(rn.id || `vnode_${idx + 1}`).trim();
      const shapeType = normalizeVisionShapeType(rn.type);
      const isContainer = !!rn.isContainer;

      let x = marginX + (idx % 4) * 260;
      let y = marginY + Math.floor(idx / 4) * 180;
      let width = 200;
      let height = 100;

      if (Array.isArray(rn.box_2d) && rn.box_2d.length === 4) {
        const [y1, x1, y2, x2] = rn.box_2d.map(Number);
        x = marginX + (x1 - minNormX) * scaleX;
        y = marginY + (y1 - minNormY) * scaleY;
        width = Math.max(84, (x2 - x1) * scaleX);
        height = Math.max(48, (y2 - y1) * scaleY);
      }

      // Bangun konten paragraf kaya (mendukung per-paragraph align, bold/italic/underline, & numbering)
      let contentStr = "";
      let dominantAlign = "center";
      let totalPlainLen = 0;

      if (Array.isArray(rn.paragraphs) && rn.paragraphs.length > 0) {
        const paras = rn.paragraphs.map(p => {
          const rawTxt = String((p && p.text) || "").trim();
          const align = (p && p.align && VALID_ALIGNS.has(String(p.align).toLowerCase()))
            ? String(p.align).toLowerCase()
            : null;
          const list = (p && p.list && VALID_LISTS.has(String(p.list)))
            ? String(p.list)
            : null;
          let html = rawTxt;
          if (TE && TE.cleanMarkdownToHtml) {
            html = TE.cleanMarkdownToHtml(html);
          }
          if (list && TE && TE.stripManualListPrefix) {
            html = TE.stripManualListPrefix(html);
          }
          return { html, align, list };
        });

        // Tentukan alignment dominan
        const alignCounts = {};
        paras.forEach(p => {
          const a = p.align || (p.list ? "left" : "center");
          alignCounts[a] = (alignCounts[a] || 0) + 1;
        });
        const sortedAligns = Object.entries(alignCounts).sort((a, b) => b[1] - a[1]);
        dominantAlign = sortedAligns.length > 0 ? sortedAligns[0][0] : "center";

        if (TE && TE.serializeParagraphs) {
          contentStr = TE.serializeParagraphs(paras);
        } else {
          contentStr = paras.map(p => p.html).join("\n");
        }
        totalPlainLen = TE && TE.getPlainText ? TE.getPlainText(contentStr).length : contentStr.length;
      } else {
        contentStr = cleanLabelText(rn.text || rn.label || "");
        if (TE && TE.cleanMarkdownToHtml) {
          contentStr = TE.cleanMarkdownToHtml(contentStr);
        }
        dominantAlign = (rn.align && VALID_ALIGNS.has(String(rn.align).toLowerCase()))
          ? String(rn.align).toLowerCase()
          : "center";
        totalPlainLen = TE && TE.getPlainText ? TE.getPlainText(contentStr).length : contentStr.length;
      }

      // Pilih fontSize adaptif agar teks padat di kolom sempit tetap terbaca bersih tanpa kepenuhan
      let fontSize = 13;
      if (!isContainer) {
        if (totalPlainLen > 240 && width < 260) fontSize = 11.5;
        else if (totalPlainLen > 120 && width < 260) fontSize = 12;
        else if (totalPlainLen > 320) fontSize = 12.5;
      } else {
        fontSize = 12;
      }

      const isFillDark = rn.fill === "dark";
      const fillCol = isContainer
        ? (isDark ? "rgba(24, 24, 27, 0.45)" : "rgba(250, 250, 250, 0.65)")
        : (isFillDark ? (isDark ? "#f4f4f5" : "#18181b") : (isDark ? "#18181b" : "#ffffff"));
      const textCol = isContainer
        ? (isDark ? "#a1a1aa" : "#71717a")
        : (isFillDark ? (isDark ? "#09090b" : "#ffffff") : (isDark ? "#f4f4f5" : "#18181b"));

      const nodeObj = {
        id,
        type: shapeType,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        rotation: 0,
        locked: isContainer,
        isContainer,
        groupId: null,
        zIndex: isContainer ? 1 : (10 + idx * 10),
        style: {
          fill: fillCol,
          stroke: isContainer ? (isDark ? "#3f3f46" : "#d4d4d8") : (isDark ? "#f4f4f5" : "#18181b"),
          strokeWidth: 1.5,
          dashed: isContainer ? "dashed" : "solid"
        },
        text: {
          content: contentStr,
          fontFamily: "Poppins, sans-serif",
          fontSize,
          bold: isContainer,
          italic: false,
          underline: false,
          color: textCol,
          align: isContainer ? "left" : dominantAlign,
          verticalAlign: isContainer ? "top" : "middle",
          paddingX: isContainer ? 16 : 14,
          paddingY: isContainer ? 12 : 10,
          isPlaceholder: false
        }
      };

      builtNodes.push(nodeObj);
      nodeMap[id] = nodeObj;
    });

    // Pass 1: Kelompokkan node non-container ke dalam baris horizontal & rapikan kesejajaran
    const nonContainers = builtNodes.filter(n => !n.isContainer);
    nonContainers.sort((a, b) => a.y - b.y || a.x - b.x);

    const rows = [];
    for (const n of nonContainers) {
      let placed = false;
      for (const row of rows) {
        const refY = row[0].y;
        const refH = row[0].height;
        // Node berada pada baris sama jika bagian atasnya sejajar (<= 28px) atau bertumpuk vertikal > 55%
        const overlapY = Math.min(refY + refH, n.y + n.height) - Math.max(refY, n.y);
        if (Math.abs(n.y - refY) <= 28 || overlapY > Math.min(refH, n.height) * 0.55) {
          row.push(n);
          placed = true;
          break;
        }
      }
      if (!placed) rows.push([n]);
    }

    // Rapikan y & spacing horizontal dalam setiap baris, lalu auto-fit tinggi agar 0% teks terpotong
    let cumulativeShiftY = 0;
    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);

      // Snap Y sejajar untuk semua kotak di baris yang sama
      const avgY = Math.round(row.reduce((s, n) => s + n.y, 0) / row.length) + cumulativeShiftY;
      row.forEach(n => { n.y = avgY; });

      // Pastikan celah horizontal minimal 16px antar kotak yang berdampingan di baris yang sama
      for (let i = 1; i < row.length; i++) {
        const prev = row[i - 1];
        const curr = row[i];
        const minX = prev.x + prev.width + 16;
        if (curr.x < minX) {
          curr.x = minX;
        }
      }

      // Cek apakah kotak-kotak di baris ini semula memiliki tinggi hampir sama
      const origHeights = row.map(n => n.height);
      const wasUniformHeight = row.length > 1 && (Math.max(...origHeights) - Math.min(...origHeights)) <= 36;
      const origRowMaxH = Math.max(...origHeights);

      // Auto-measure tinggi teks aktual dengan TextEditor agar ZERO clipping
      if (TE && TE.layoutNodeText && TE.computeRequiredNodeHeight) {
        row.forEach(n => {
          const layout = TE.layoutNodeText(n);
          const reqH = TE.computeRequiredNodeHeight(n, layout.totalTextHeight) + 8;
          if (reqH > n.height) {
            n.height = Math.round(reqH);
          }
        });
      }

      const newRowMaxH = Math.max(...row.map(n => n.height));
      if (wasUniformHeight) {
        row.forEach(n => { n.height = newRowMaxH; });
      }

      const rowExpansion = Math.max(0, newRowMaxH - origRowMaxH);
      if (rowExpansion > 0) {
        cumulativeShiftY += rowExpansion + 16;
      }
    }

    // Hitung ulang batas kanvas agar semua node muat lega
    let maxRight = 1400;
    let maxBottom = 860;
    const finalNodes = {};
    builtNodes.forEach(n => {
      n.baseWidth = n.width;
      n.baseHeight = n.height;
      finalNodes[n.id] = n;
      maxRight = Math.max(maxRight, n.x + n.width + 80);
      maxBottom = Math.max(maxBottom, n.y + n.height + 80);
    });

    // Bangun koneksi panah (edges) dengan pin yang akurat
    const VALID_PINS = new Set(["N", "E", "S", "W"]);
    const finalEdges = {};
    let edgeCounter = 1;

    rawEdges.forEach(re => {
      if (!re) return;
      const srcId = String(re.source || "").trim();
      const tgtId = String(re.target || "").trim();
      const src = finalNodes[srcId];
      const tgt = finalNodes[tgtId];
      if (!src || !tgt || srcId === tgtId) return;

      let srcPin = VALID_PINS.has(re.sourcePin) ? re.sourcePin : null;
      let tgtPin = VALID_PINS.has(re.targetPin) ? re.targetPin : null;

      if (!srcPin || !tgtPin) {
        const sCx = src.x + src.width / 2;
        const sCy = src.y + src.height / 2;
        const tCx = tgt.x + tgt.width / 2;
        const tCy = tgt.y + tgt.height / 2;
        const dx = tCx - sCx;
        const dy = tCy - sCy;
        if (Math.abs(dy) >= Math.abs(dx) * 0.6) {
          srcPin = srcPin || (dy >= 0 ? "S" : "N");
          tgtPin = tgtPin || (dy >= 0 ? "N" : "S");
        } else {
          srcPin = srcPin || (dx >= 0 ? "E" : "W");
          tgtPin = tgtPin || (dx >= 0 ? "W" : "E");
        }
      }

      const eId = `vedge_${edgeCounter++}`;
      finalEdges[eId] = {
        id: eId,
        type: "step",
        radius: 8,
        source: { nodeId: srcId, pin: srcPin },
        target: { nodeId: tgtId, pin: tgtPin },
        handleOffset: { dx: 0, dy: 0 },
        label: re.label ? String(re.label).trim() : "",
        zIndex: 5,
        style: {
          stroke: isDark ? "#f4f4f5" : "#18181b",
          strokeWidth: 1.5,
          dashed: (re.dashed === "dashed" || re.dashed === "dotted") ? re.dashed : "solid",
          markerStart: re.markerStart === "arrow" ? "arrow" : "none",
          markerEnd: re.markerEnd === "none" ? "none" : "arrow",
          radius: 8
        }
      };
    });

    const totalW = Math.max(1400, Math.round(maxRight));
    const totalH = Math.max(900, Math.round(maxBottom));
    const isPortrait = totalH > totalW;

    return {
      version: "1.5.0",
      theme: isDark ? "dark" : "light",
      canvas: {
        pan: { x: 40, y: 40 },
        zoom: 0.85,
        gridSize: 24,
        workspace: {
          preset: isPortrait ? "a4_portrait" : "16:9_landscape",
          orientation: isPortrait ? "portrait" : "landscape",
          x: 40,
          y: 40,
          width: totalW,
          height: totalH
        }
      },
      nodes: finalNodes,
      edges: finalEdges
    };
  }

  // ==========================================================================
  // 7. ENTRYPOINT UTAMA (UNIVERSAL TRANSLATOR)
  // ==========================================================================
  function parseUniversal(rawInput, isDark = false) {
    const detection = detectFormat(rawInput);

    switch (detection.type) {
      case "empty":
        return { success: false, error: "Teks atau berkas kosong", detectedType: "empty" };

      case "minimalflow_vision": {
        const doc = parseMinimalFlowVisionJson(detection.data, isDark);
        const nodeCount = Object.keys(doc.nodes).filter(k => !doc.nodes[k].isContainer).length;
        const edgeCount = Object.keys(doc.edges).length;
        return {
          success: true,
          detectedType: "minimalflow_vision",
          formatTitle: `Rekonstruksi Visual AI (${nodeCount} Bagan Presisi)`,
          document: doc,
          nodeCount,
          edgeCount
        };
      }

      case "minimalflow": {
        const doc = detection.data;
        const nodeCount = Object.keys(doc.nodes || {}).length;
        const edgeCount = Object.keys(doc.edges || {}).length;
        return {
          success: true,
          detectedType: "minimalflow",
          formatTitle: "MinimalFlow Native JSON",
          document: doc,
          nodeCount,
          edgeCount
        };
      }

      case "mashimurelay": {
        const doc = parseMashimurelayJson(detection.data, isDark);
        const nodeCount = Object.keys(doc.nodes).length;
        const edgeCount = Object.keys(doc.edges).length;
        const modId = detection.data.module_id || "Kelistrikan";
        return {
          success: true,
          detectedType: "mashimurelay",
          formatTitle: `Modul Trainer Mashimurelay [${modId}]`,
          document: doc,
          nodeCount,
          edgeCount
        };
      }

      case "mashimurelay_workflow": {
        const doc = parseMashimurelayWorkflowJson(detection.data, isDark);
        const nodeCount = Object.keys(doc.nodes).filter(k => !doc.nodes[k].isContainer).length;
        const edgeCount = Object.keys(doc.edges).length;
        const subCount = Object.keys(doc.nodes).filter(k => doc.nodes[k].isContainer).length;
        return {
          success: true,
          detectedType: "mashimurelay_workflow",
          formatTitle: `Mashimurelay Workflow [Book Antiqua 10px] (${subCount} Modul)`,
          document: doc,
          nodeCount,
          edgeCount
        };
      }

      case "mermaid": {
        const doc = parseMermaidToDocument(detection.raw, isDark);
        const nodeCount = Object.keys(doc.nodes).filter(k => !doc.nodes[k].isContainer).length;
        const edgeCount = Object.keys(doc.edges).length;
        const subCount = Object.keys(doc.nodes).filter(k => doc.nodes[k].isContainer).length;
        return {
          success: true,
          detectedType: "mermaid",
          formatTitle: `Diagram Alur Mermaid (${doc.canvas.workspace.orientation.toUpperCase()}${subCount > 0 ? ' - ' + subCount + ' Subgraph' : ''})`,
          document: doc,
          nodeCount,
          edgeCount
        };
      }

      case "step_list": {
        const doc = parseStepListToDocument(detection.raw, isDark);
        const nodeCount = Object.keys(doc.nodes).length;
        const edgeCount = Object.keys(doc.edges).length;
        return {
          success: true,
          detectedType: "step_list",
          formatTitle: `Teks Prompt Alur (${nodeCount} Langkah)`,
          document: doc,
          nodeCount,
          edgeCount
        };
      }

      case "generic_json": {
        const doc = parseGenericJson(detection.data, isDark);
        const nodeCount = Object.keys(doc.nodes).length;
        const edgeCount = Object.keys(doc.edges).length;
        return {
          success: true,
          detectedType: "generic_json",
          formatTitle: "Generic Diagram JSON (Array)",
          document: doc,
          nodeCount,
          edgeCount
        };
      }

      case "syntax_error":
        return { success: false, error: `Sintaks Error: ${detection.error}`, detectedType: "syntax_error" };

      default:
        return { success: false, error: detection.error || "Format tidak didukung", detectedType: "unknown" };
    }
  }

  // Export module ke namespace MinimalFlow
  exports.Adapter = {
    detectFormat,
    parseUniversal,
    parseMermaidScript,
    parseMinimalFlowVisionJson,
    parseMashimurelayJson,
    parseGenericJson,
    layoutGraph
  };

})(window.MinimalFlow);
