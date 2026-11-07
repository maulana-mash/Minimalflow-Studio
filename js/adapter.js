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

  // Bersihkan kutip dan tag HTML seperti <br/>
  function cleanLabelText(t) {
    if (!t) return '';
    let res = String(t).trim();
    if ((res.startsWith('"') && res.endsWith('"')) || (res.startsWith("'") && res.endsWith("'"))) {
      res = res.slice(1, -1);
    }
    // Ganti tag line break dengan baris baru \n
    res = res.replace(/<br\s*\/?>/gi, '\n');
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

      // Format 1: Mashimurelay Circuit Trainer JSON
      if (parsed.bill_of_materials || parsed.wiring_connections || (parsed.module_id && parsed.circuit_name)) {
        return { type: "mashimurelay", data: parsed };
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
      return { type: "syntax_error", error: e.message };
    }
  }

  // ==========================================================================
  // 2. PARSER MERMAID SCRIPT (.mmd)
  // ==========================================================================
  function parseMermaidScript(content) {
    const lines = content.split('\n');
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
      rawToken = rawToken.trim();
      if (!rawToken) return null;

      // Bentuk 1: Stadium / Rounded: ID(["Text"])
      let match = rawToken.match(/^([a-zA-Z0-9_]+)\s*\(\[\s*([\s\S]*?)\s*\]\)$/);
      if (match) return registerNode(match[1], match[2], 'rounded');

      // Bentuk 2: Cylinder: ID[("Text")]
      match = rawToken.match(/^([a-zA-Z0-9_]+)\s*\[\(\s*([\s\S]*?)\s*\)\]$/);
      if (match) return registerNode(match[1], match[2], 'cylinder');

      // Bentuk 3: Circle: ID(("Text"))
      match = rawToken.match(/^([a-zA-Z0-9_]+)\s*\(\(\s*([\s\S]*?)\s*\)\)$/);
      if (match) return registerNode(match[1], match[2], 'circle');

      // Bentuk 4: Diamond / Decision: ID{"Text"}
      match = rawToken.match(/^([a-zA-Z0-9_]+)\s*\{\s*([\s\S]*?)\s*\}$/);
      if (match) return registerNode(match[1], match[2], 'diamond');

      // Bentuk 5: Parallelogram: ID[/"Text"/] or ID[\"Text"\]
      match = rawToken.match(/^([a-zA-Z0-9_]+)\s*\[\/\s*([\s\S]*?)\s*\/\]$/);
      if (match) return registerNode(match[1], match[2], 'parallelogram');

      // Bentuk 6: Rectangle: ID["Text"]
      match = rawToken.match(/^([a-zA-Z0-9_]+)\s*\[\s*([\s\S]*?)\s*\]$/);
      if (match) return registerNode(match[1], match[2], 'rectangle');

      // Bentuk 7: Rounded biasa: ID("Text")
      match = rawToken.match(/^([a-zA-Z0-9_]+)\s*\(\s*([\s\S]*?)\s*\)$/);
      if (match) return registerNode(match[1], match[2], 'rounded');

      // Bentuk 8: Bare ID
      match = rawToken.match(/^([a-zA-Z0-9_]+)$/);
      if (match) return registerNode(match[1], null, null);

      return null;
    }

    // Prioritaskan pola yang memiliki label pipa |...| atau kutip -- "..." --> sebelum panah polos
    const connRegex = /(-->\s*\|[^|]+\||-\.->\s*\|[^|]+\||--\s*(?:"[^"]*"|'[^']*'|[^-\s>]+)\s*-->|-->|---|-\.->|-.-|==>)/g;

    for (let rawLine of lines) {
      let line = rawLine.trim();
      if (!line || line.startsWith('%%') || line.startsWith('classDef') || line.startsWith('class ')) {
        continue;
      }

      // Deteksi awal subgraph
      const subMatch = line.match(/^subgraph\s+([a-zA-Z0-9_]+)(?:\s*\[\s*(?:"([^"]*)"|'([^']*)'|([^\]]*))\s*\])?/i);
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

      const matches = [...line.matchAll(connRegex)];
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
          const srcToken = tokens[i];
          const tgtToken = tokens[i + 1];
          const connStr = conns[i];

          const srcId = ensureNode(srcToken);
          const tgtId = ensureNode(tgtToken);

          if (srcId && tgtId) {
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
      } else {
        ensureNode(line);
      }
    }

    return { nodes, edges, subgraphs, orientation };
  }

  // ==========================================================================
  // 3. SUBGRAPH & SWIMLANE-AWARE HIERARCHICAL LAYOUT ENGINE
  // ==========================================================================
  function layoutGraph(nodes, edges, orientation = 'TD', isDark = false, subgraphs = {}) {
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
              fontFamily: "Poppins, sans-serif",
              fontSize: 12.5,
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
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
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

      for (let lvl = 0; lvl <= maxLvl; lvl++) {
        const group = levelGroups[lvl] || [];
        const count = group.length;

        group.forEach((id, idx) => {
          const n = nodes[id];
          const text = n.rawText || id;
          const lines = text.split('\n');
          const maxLineLen = Math.max(...lines.map(l => l.length));

          let width = Math.max(160, Math.min(280, maxLineLen * 7.5 + 36));
          let height = Math.max(70, lines.length * 18 + 36);

          if (n.type === 'circle') {
            const dim = Math.max(110, Math.max(width, height) * 0.85);
            width = dim; height = dim;
          } else if (n.type === 'diamond') {
            width = Math.max(160, width + 30);
            height = Math.max(110, height + 30);
          }

          let x, y;
          if (isTD) {
            y = startY + lvl * 160;
            const totalW = count * (width + 36);
            const offsetLeft = Math.max(startX, 800 - totalW / 2);
            x = offsetLeft + idx * (width + 36);
          } else {
            x = startX + lvl * 270;
            const totalH = count * (height + 36);
            const offsetTop = Math.max(startY, 450 - totalH / 2);
            y = offsetTop + idx * (height + 36);
          }

          finalNodes[id] = {
            id,
            type: n.type || 'rectangle',
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            rotation: 0,
            locked: false,
            groupId: null,
            style: {
              fill: isDark ? "#18181b" : "#ffffff",
              stroke: isDark ? "#f4f4f5" : "#18181b",
              strokeWidth: 1.5
            },
            text: {
              content: text,
              fontFamily: "Poppins, sans-serif",
              fontSize: 13,
              bold: false,
              italic: false,
              underline: false,
              color: isDark ? "#f4f4f5" : "#18181b",
              align: "center",
              paddingX: 14,
              paddingY: 10
            }
          };
        });
      }

      totalWidth = Math.max(1600, (isTD ? 1600 : (maxLvl + 1) * 270 + 200));
      totalHeight = Math.max(900, (isTD ? (maxLvl + 1) * 160 + 200 : 900));
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
        source: { nodeId: e.sourceId, pin: srcPin },
        target: { nodeId: e.targetId, pin: tgtPin },
        handleOffset: { dx: 0, dy: 0 },
        label: e.label || '',
        style: {
          stroke: isDark ? "#f4f4f5" : "#18181b",
          strokeWidth: 1.5,
          dashed: e.dashed || "solid",
          markerStart: "none",
          markerEnd: "arrow"
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
  // 7. ENTRYPOINT UTAMA (UNIVERSAL TRANSLATOR)
  // ==========================================================================
  function parseUniversal(rawInput, isDark = false) {
    const detection = detectFormat(rawInput);

    switch (detection.type) {
      case "empty":
        return { success: false, error: "Teks atau berkas kosong", detectedType: "empty" };

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
    parseMashimurelayJson,
    parseGenericJson,
    layoutGraph
  };

})(window.MinimalFlow);
