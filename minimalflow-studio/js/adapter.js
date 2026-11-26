/**
 * MinimalFlow Studio — Universal Diagram & Circuit Schema Adapter (v2.0 Sugiyama DAG + Spatial Vision Engine)
 * Mesin penerjemah & tata letak otomatis multi-format bebas tabrakan (Zero-Collision Layout):
 * 0. MinimalFlow AI Vision Direct Spatial Reconstruction JSON (format: "minimalflow_vision", box_2d + Rich Text)
 * 1. Modul Trainer Kelistrikan Mashimurelay (.json — bill_of_materials & wiring_connections)
 * 2. Mashimurelay Architecture & Runtime Workflow (.json — engineering_workflow & runtime_flowchart)
 * 3. Script Diagram Alir Mermaid (.mmd — flowchart TD/TB/LR/RL, subgraphs, decision diamond, stadium, cylinder)
 * 4. Generic Diagram JSON (format array/objek nodes, edges, links, phases, steps dari React Flow / Cytoscape / AI)
 * 5. Teks Prompt Alur & Daftar Langkah Bertingkat (Natural Language Step List dengan deteksi Fase & Percabangan)
 * 6. MinimalFlow Native Document Schema (.flow.json)
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
      .replace(/\\n/g, '\n')
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
  // 0. WORD-WRAP-AWARE NODE AUTO-SIZER (BEBAS TEXT OVERFLOW)
  // ==========================================================================
  function computeNodeDimensions(rawText, shapeType, fontOptions = {}) {
    const text = String(rawText || '').trim() || 'Node';
    const fontSize = fontOptions.fontSize || 12;
    const fontFamily = fontOptions.fontFamily || "Poppins, sans-serif";
    const padX = fontOptions.paddingX !== undefined ? fontOptions.paddingX : 12;
    const padY = fontOptions.paddingY !== undefined ? fontOptions.paddingY : 10;
    const type = shapeType || 'rectangle';
    const TE = exports.TextEditor;

    const rawLines = text.split('\n').map(l => l.trim());
    const maxRawChars = Math.max(1, ...rawLines.map(l => l.length));
    const charW = fontSize * 0.58;

    let minW = 165, maxW = 285, minH = 56;
    if (type === 'diamond') {
      minW = 195; maxW = 280; minH = 104;
    } else if (type === 'parallelogram' || type === 'manual_operation' || type === 'preparation') {
      minW = 185; maxW = 290; minH = 62;
    } else if (type === 'cylinder') {
      minW = 175; maxW = 285; minH = 72;
    } else if (type === 'circle') {
      minW = 110; maxW = 175; minH = 110;
    } else if (type === 'rounded') {
      minW = 160; maxW = 280; minH = 54;
    }

    const shapeRedW = (w) => {
      if (type === 'diamond') return Math.min(w * 0.38, 64);
      if (type === 'parallelogram' || type === 'preparation' || type === 'manual_operation') return 42;
      if (type === 'circle') return Math.min(w * 0.22, 28);
      return 4;
    };

    const shapeRedH = (h) => {
      if (type === 'diamond') return Math.min(h * 0.35, 42);
      if (type === 'cylinder') return 24;
      if (type === 'circle') return 18;
      return 4;
    };

    const idealSingleLineW = maxRawChars * charW + padX * 2 + shapeRedW(240) + 16;
    let width = Math.max(minW, Math.min(maxW, Math.ceil(idealSingleLineW / 4) * 4));

    function countWrappedLines(w) {
      const availW = Math.max(36, w - padX * 2 - shapeRedW(w));
      const maxCharsPerLine = Math.max(4, Math.floor(availW / charW));
      let totalLines = 0;
      for (const rl of rawLines) {
        if (!rl) {
          totalLines += 1;
          continue;
        }
        const words = rl.split(/\s+/);
        let curLen = 0;
        let pLines = 1;
        for (const word of words) {
          if (word.length > maxCharsPerLine) {
            if (curLen > 0) {
              pLines++;
              curLen = 0;
            }
            const chunks = Math.ceil(word.length / maxCharsPerLine);
            pLines += (chunks - 1);
            curLen = word.length % maxCharsPerLine || maxCharsPerLine;
          } else if (curLen === 0) {
            curLen = word.length;
          } else if (curLen + 1 + word.length <= maxCharsPerLine) {
            curLen += 1 + word.length;
          } else {
            pLines++;
            curLen = word.length;
          }
        }
        totalLines += pLines;
      }
      return totalLines;
    }

    let wrappedLines = countWrappedLines(width);
    if (wrappedLines > 3 && width < maxW) {
      width = maxW;
      wrappedLines = countWrappedLines(width);
    }

    const lineHeight = fontSize * 1.38;
    const reqTextH = wrappedLines * lineHeight;
    let height = Math.max(minH, Math.ceil((reqTextH + padY * 2 + shapeRedH(minH) + 10) / 4) * 4);

    if (type === 'diamond') {
      const effAvailH = height - padY * 2 - Math.min(height * 0.35, 42);
      if (effAvailH < reqTextH + 6) {
        height = Math.ceil((reqTextH + padY * 2 + 48) / 4) * 4;
      }
    } else if (type === 'circle') {
      const dim = Math.max(minW, Math.min(180, Math.max(width, height)));
      width = dim;
      height = dim;
    }

    // Jika dijalankan di browser dengan TextEditor aktif, verifikasi dengan Canvas 2D font metrics
    if (TE && TE.layoutNodeText && TE.computeRequiredNodeHeight) {
      const tempNode = {
        type,
        width: Math.round(width),
        height: Math.round(height),
        text: {
          content: text,
          fontFamily,
          fontSize,
          bold: false,
          italic: false,
          underline: false,
          align: "center",
          paddingX: padX,
          paddingY: padY
        }
      };
      const measuredLayout = TE.layoutNodeText(tempNode);
      const exactReqH = TE.computeRequiredNodeHeight(tempNode, measuredLayout.totalTextHeight) + 8;
      if (exactReqH > height) {
        height = Math.ceil(exactReqH / 4) * 4;
      }
    }

    return { width: Math.round(width), height: Math.round(height), wrappedLines };
  }

  // ==========================================================================
  // 1. ENGINE DETEKSI FORMAT UNIVERSAL
  // ==========================================================================
  function detectFormat(rawInput) {
    if (!rawInput || typeof rawInput !== "string") {
      return { type: "empty" };
    }

    let trimmed = rawInput.trim();
    if (!trimmed) return { type: "empty" };

    if (trimmed.startsWith("```")) {
      trimmed = trimmed.replace(/^```[a-zA-Z0-9_-]*\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    }

    const isMermaidKeyword = /^(?:flowchart|graph)\s+(?:TD|TB|LR|RL|BT)/i.test(trimmed);
    const hasMermaidConnections = /-->|---|-\.->|-.-|==>/.test(trimmed);
    const hasMermaidSubgraph = /\bsubgraph\b/i.test(trimmed);

    if (isMermaidKeyword || ((hasMermaidConnections || hasMermaidSubgraph) && !trimmed.startsWith('{') && !trimmed.startsWith('['))) {
      return { type: "mermaid", raw: trimmed };
    }

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

      // Format 3: Generic JSON (Array of Nodes, or Object with nodes/steps/phases/elements/workflow)
      if (
        Array.isArray(parsed) ||
        Array.isArray(parsed.nodes) ||
        Array.isArray(parsed.steps) ||
        Array.isArray(parsed.phases) ||
        Array.isArray(parsed.stages) ||
        (parsed.workflow && (Array.isArray(parsed.workflow.nodes) || Array.isArray(parsed.workflow.steps) || Array.isArray(parsed.workflow.phases))) ||
        (parsed.flowchart && Array.isArray(parsed.flowchart.nodes)) ||
        (parsed.diagram && Array.isArray(parsed.diagram.nodes)) ||
        (parsed.elements && (Array.isArray(parsed.elements.nodes) || Array.isArray(parsed.elements)))
      ) {
        return { type: "generic_json", data: parsed };
      }

      return { type: "unknown", error: "Struktur JSON tidak dikenali sebagai alur diagram" };
    } catch (e) {
      if (hasMermaidConnections || hasMermaidSubgraph) {
        return { type: "mermaid", raw: trimmed };
      }
      const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const isNumbered = lines.some(l => /^(?:\d+[\.\)\:-]|[-*•]|\b(?:langkah|step|fase|tahap)\s+\d+)/i.test(l));
      const hasArrowChain = /->|-->|=>|\u2794|→/.test(trimmed);
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
    const subgraphStack = [];
    let edgeCounter = 1;
    let autoSubCounter = 1;

    let orientation = 'TD';
    const headerMatch = content.match(/(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/i);
    if (headerMatch) {
      orientation = headerMatch[1].toUpperCase();
    }

    function currentSubgraph() {
      return subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : null;
    }

    function registerNode(id, label, shapeType) {
      const cleanId = String(id).trim();
      if (!cleanId) return null;
      const curSub = currentSubgraph();
      if (!nodes[cleanId]) {
        nodes[cleanId] = {
          id: cleanId,
          type: shapeType || 'rectangle',
          rawText: cleanLabelText(label) || cleanId,
          subgraph: curSub ? curSub.id : null,
          inDegree: 0,
          outDegree: 0
        };
        if (curSub && !subgraphs[curSub.id].nodeIds.includes(cleanId)) {
          subgraphs[curSub.id].nodeIds.push(cleanId);
        }
      } else {
        if (label) nodes[cleanId].rawText = cleanLabelText(label);
        if (shapeType) nodes[cleanId].type = shapeType;
        if (curSub && !nodes[cleanId].subgraph) {
          nodes[cleanId].subgraph = curSub.id;
          if (!subgraphs[curSub.id].nodeIds.includes(cleanId)) {
            subgraphs[curSub.id].nodeIds.push(cleanId);
          }
        }
      }
      return cleanId;
    }

    function ensureNode(rawToken) {
      if (!rawToken) return null;
      let token = rawToken.trim().replace(/;+$/, '').replace(/:::[a-zA-Z0-9_-]+/g, '').trim();
      if (!token) return null;

      // Bentuk 1: Stadium / Rounded: ID(["Text"])
      let match = token.match(/^([a-zA-Z0-9_.-]+)\s*\(\[\s*([\s\S]*?)\s*\]\)$/);
      if (match) return registerNode(match[1], match[2], 'rounded');

      // Bentuk 2: Cylinder / Database: ID[("Text")]
      match = token.match(/^([a-zA-Z0-9_.-]+)\s*\[\(\s*([\s\S]*?)\s*\)\]$/);
      if (match) return registerNode(match[1], match[2], 'cylinder');

      // Bentuk 3: Double/Single Circle: ID((("Text"))) or ID(("Text"))
      match = token.match(/^([a-zA-Z0-9_.-]+)\s*\(\(\(?([\s\S]*?)\)?\)\)$/);
      if (match) return registerNode(match[1], match[2], 'circle');

      // Bentuk 4: Subroutine / Predefined Process: ID[["Text"]]
      match = token.match(/^([a-zA-Z0-9_.-]+)\s*\[\[\s*([\s\S]*?)\s*\]\]$/);
      if (match) return registerNode(match[1], match[2], 'predefined_process');

      // Bentuk 5: Hexagon / Preparation: ID{{"Text"}}
      match = token.match(/^([a-zA-Z0-9_.-]+)\s*\{\{\s*([\s\S]*?)\s*\}\}$/);
      if (match) return registerNode(match[1], match[2], 'preparation');

      // Bentuk 6: Diamond / Decision: ID{"Text"}
      match = token.match(/^([a-zA-Z0-9_.-]+)\s*\{\s*([\s\S]*?)\s*\}$/);
      if (match) return registerNode(match[1], match[2], 'diamond');

      // Bentuk 7: Parallelogram / Trapezoid: ID[/"Text"/] or ID[\"Text"\] or ID[/"Text"\]
      match = token.match(/^([a-zA-Z0-9_.-]+)\s*\[[\/\\]\s*([\s\S]*?)\s*[\/\\]\]$/);
      if (match) return registerNode(match[1], match[2], 'parallelogram');

      // Bentuk 8: Asymmetric / Display: ID>"Text"]
      match = token.match(/^([a-zA-Z0-9_.-]+)\s*>\s*([\s\S]*?)\s*\]$/);
      if (match) return registerNode(match[1], match[2], 'display');

      // Bentuk 9: Rectangle: ID["Text"]
      match = token.match(/^([a-zA-Z0-9_.-]+)\s*\[\s*([\s\S]*?)\s*\]$/);
      if (match) return registerNode(match[1], match[2], 'rectangle');

      // Bentuk 10: Rounded biasa: ID("Text")
      match = token.match(/^([a-zA-Z0-9_.-]+)\s*\(\s*([\s\S]*?)\s*\)$/);
      if (match) return registerNode(match[1], match[2], 'rounded');

      // Bentuk 11: Bare ID
      match = token.match(/^([a-zA-Z0-9_.-]+)$/);
      if (match) return registerNode(match[1], null, null);

      return null;
    }

    function splitAmpersandOutsideQuotes(token) {
      const parts = [];
      let cur = "";
      let inQ = false;
      let bracketDepth = 0;
      for (let i = 0; i < token.length; i++) {
        const ch = token[i];
        if (ch === '"' && token[i - 1] !== '\\') {
          inQ = !inQ;
          cur += ch;
        } else if (!inQ && (ch === '[' || ch === '(' || ch === '{')) {
          bracketDepth++;
          cur += ch;
        } else if (!inQ && (ch === ']' || ch === ')' || ch === '}')) {
          bracketDepth = Math.max(0, bracketDepth - 1);
          cur += ch;
        } else if (ch === '&' && !inQ && bracketDepth === 0) {
          parts.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      if (cur.trim()) parts.push(cur.trim());
      return parts;
    }

    const connRegex = /(<-->|-->\s*\|[^|]*\||-\.->\s*\|[^|]*\||==>\s*\|[^|]*\||---\s*\|[^|]*\||--\s*(?:"[^"]*"|'[^']*'|[^-\n>]+?)\s*-->|-\.\s*(?:"[^"]*"|'[^']*'|[^.\n>]+?)\s*\.->|==\s*(?:"[^"]*"|'[^']*'|[^=\n>]+?)\s*==>|<-\.->|-->|---|-\.->|-.-|==>)/g;

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
      if (
        !line ||
        line.startsWith('%%') ||
        /^(?:flowchart|graph)\s+(?:TD|TB|LR|RL|BT)\b/i.test(line) ||
        /^(?:classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/i.test(line)
      ) {
        continue;
      }

      // Deteksi awal subgraph
      if (/^subgraph\b/i.test(line)) {
        const rest = line.replace(/^subgraph\s+/i, '').trim();
        let sId = '', sTitle = '';
        const bracketMatch = rest.match(/^([a-zA-Z0-9_.-]+)\s*\[\s*(?:"([^"]*)"|'([^']*)'|([^\]]*))\s*\]$/);
        if (bracketMatch) {
          sId = bracketMatch[1];
          sTitle = cleanLabelText(bracketMatch[2] || bracketMatch[3] || bracketMatch[4] || sId);
        } else {
          const cleanedRest = cleanLabelText(rest);
          if (/^[a-zA-Z0-9_.-]+$/.test(cleanedRest)) {
            sId = cleanedRest;
            sTitle = cleanedRest;
          } else {
            sId = `SUB_${autoSubCounter++}`;
            sTitle = cleanedRest || sId;
          }
        }
        if (!subgraphs[sId]) {
          subgraphs[sId] = { id: sId, title: sTitle, nodeIds: [] };
        }
        subgraphStack.push(subgraphs[sId]);
        continue;
      }

      // Deteksi akhir subgraph
      if (/^end\b/i.test(line)) {
        if (subgraphStack.length > 0) subgraphStack.pop();
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
          if (connStr.includes('-.') || connStr.includes('-.-')) {
            dashed = 'dashed';
          }

          const pipeMatch = connStr.match(/\|([^|]*)\|/);
          if (pipeMatch) {
            label = cleanLabelText(pipeMatch[1]);
          } else {
            const inlineMatch = connStr.match(/^(?:--|-\.|==)\s*([\s\S]+?)\s*(?:-->|\.->|==>)$/);
            if (inlineMatch) {
              label = cleanLabelText(inlineMatch[1]);
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
  // 3. SUGIYAMA HIERARCHICAL DAG & SUBGRAPH-AWARE SWIMLANE LAYOUT ENGINE
  // ==========================================================================
  function layoutConnectedSubComponent(compNodeIds, allNodes, internalEdges, isTD, fontOptions, nodeSizes) {
    const adj = {};
    const revAdj = {};
    const inDeg = {};
    compNodeIds.forEach(id => {
      adj[id] = [];
      revAdj[id] = [];
      inDeg[id] = 0;
    });

    internalEdges.forEach(e => {
      if (adj[e.sourceId] && adj[e.targetId] !== undefined && e.sourceId !== e.targetId) {
        adj[e.sourceId].push(e.targetId);
        revAdj[e.targetId].push(e.sourceId);
        inDeg[e.targetId]++;
      }
    });

    const backEdgePairs = new Set();
    const visited = new Set();
    const onStack = new Set();
    const orderedIds = [...compNodeIds].sort((a, b) => inDeg[a] - inDeg[b]);

    function dfsCycle(u) {
      visited.add(u);
      onStack.add(u);
      for (const v of adj[u]) {
        if (onStack.has(v)) {
          backEdgePairs.add(`${u}->${v}`);
        } else if (!visited.has(v)) {
          dfsCycle(v);
        }
      }
      onStack.delete(u);
    }

    for (const id of orderedIds) {
      if (!visited.has(id)) dfsCycle(id);
    }

    const forwardAdj = {};
    const forwardRev = {};
    compNodeIds.forEach(id => {
      forwardAdj[id] = [];
      forwardRev[id] = [];
    });

    internalEdges.forEach(e => {
      if (e.sourceId === e.targetId) return;
      if (!backEdgePairs.has(`${e.sourceId}->${e.targetId}`)) {
        forwardAdj[e.sourceId].push(e.targetId);
        forwardRev[e.targetId].push(e.sourceId);
      }
    });

    const levels = {};
    compNodeIds.forEach(id => { levels[id] = 0; });

    const maxIter = compNodeIds.length + 2;
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      for (const u of compNodeIds) {
        for (const v of forwardAdj[u]) {
          if (levels[u] + 1 > levels[v]) {
            levels[v] = levels[u] + 1;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }

    const levelGroups = {};
    let maxLvl = 0;
    compNodeIds.forEach(id => {
      const l = levels[id] || 0;
      if (!levelGroups[l]) levelGroups[l] = [];
      levelGroups[l].push(id);
      if (l > maxLvl) maxLvl = l;
    });

    const colGap = 52;
    const baseRowGap = 58;
    const localCoords = {};
    let curPrimary = 0;

    for (let l = 0; l <= maxLvl; l++) {
      const group = levelGroups[l] || [];
      if (group.length === 0) continue;

      if (l > 0) {
        group.sort((a, b) => {
          const pA = forwardRev[a].filter(p => localCoords[p]);
          const pB = forwardRev[b].filter(p => localCoords[p]);
          const baryA = pA.length > 0 ? pA.reduce((s, p) => s + (isTD ? localCoords[p].cx : localCoords[p].cy), 0) / pA.length : 0;
          const baryB = pB.length > 0 ? pB.reduce((s, p) => s + (isTD ? localCoords[p].cx : localCoords[p].cy), 0) / pB.length : 0;
          if (Math.abs(baryA - baryB) > 1) return baryA - baryB;
          return compNodeIds.indexOf(a) - compNodeIds.indexOf(b);
        });
      }

      let maxPrimaryDim = 0;
      let totalSecDim = 0;
      group.forEach((id, idx) => {
        const sz = nodeSizes[id];
        const pDim = isTD ? sz.height : sz.width;
        const sDim = isTD ? sz.width : sz.height;
        if (pDim > maxPrimaryDim) maxPrimaryDim = pDim;
        totalSecDim += sDim + (idx > 0 ? colGap : 0);
      });

      if (group.length === 1 && l > 0) {
        const id = group[0];
        const sz = nodeSizes[id];
        const parents = forwardRev[id].filter(p => localCoords[p]);
        let targetCenter = 0;
        if (parents.length === 1) {
          targetCenter = isTD ? localCoords[parents[0]].cx : localCoords[parents[0]].cy;
        } else if (parents.length > 1) {
          targetCenter = parents.reduce((s, p) => s + (isTD ? localCoords[p].cx : localCoords[p].cy), 0) / parents.length;
        }
        const sDim = isTD ? sz.width : sz.height;
        const sPos = targetCenter - sDim / 2;
        localCoords[id] = isTD
          ? { x: sPos, y: curPrimary, width: sz.width, height: sz.height, cx: targetCenter, cy: curPrimary + sz.height / 2 }
          : { x: curPrimary, y: sPos, width: sz.width, height: sz.height, cx: curPrimary + sz.width / 2, cy: targetCenter };
      } else {
        let cursor = -totalSecDim / 2;
        const tempCenters = [];
        group.forEach(id => {
          const sz = nodeSizes[id];
          const sDim = isTD ? sz.width : sz.height;
          const parents = forwardRev[id].filter(p => localCoords[p]);
          const desiredC = parents.length === 1
            ? (isTD ? localCoords[parents[0]].cx : localCoords[parents[0]].cy)
            : cursor + sDim / 2;
          const c = Math.max(cursor + sDim / 2, desiredC);
          tempCenters.push({ id, c, sDim, sz });
          cursor = c + sDim / 2 + colGap;
        });

        const rowMin = tempCenters[0].c - tempCenters[0].sDim / 2;
        const rowMax = tempCenters[tempCenters.length - 1].c + tempCenters[tempCenters.length - 1].sDim / 2;
        const rowMid = (rowMin + rowMax) / 2;

        tempCenters.forEach(item => {
          const finalC = item.c - rowMid;
          const sPos = finalC - item.sDim / 2;
          localCoords[item.id] = isTD
            ? { x: sPos, y: curPrimary, width: item.sz.width, height: item.sz.height, cx: finalC, cy: curPrimary + item.sz.height / 2 }
            : { x: curPrimary, y: sPos, width: item.sz.width, height: item.sz.height, cx: curPrimary + item.sz.width / 2, cy: finalC };
        });
      }

      const outEdgesFromLevel = internalEdges.filter(e => group.includes(e.sourceId) && e.label && String(e.label).trim().length > 0);
      const hasLabeledOut = outEdgesFromLevel.length > 0;
      const hasBranchOut = group.some(id => forwardAdj[id].length >= 2);
      let extraGap = (hasLabeledOut ? 22 : 0) + (hasBranchOut ? 14 : 0);
      if (!isTD && hasLabeledOut) {
        const maxLblLen = Math.max(...outEdgesFromLevel.map(e => String(e.label).trim().length));
        const reqHorizGap = Math.max(85, maxLblLen * 7.2 + 48);
        extraGap = Math.max(extraGap, reqHorizGap - baseRowGap);
      }
      curPrimary += maxPrimaryDim + baseRowGap + extraGap;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.values(localCoords).forEach(c => {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + c.width);
      maxY = Math.max(maxY, c.y + c.height);
    });

    Object.values(localCoords).forEach(c => {
      c.x -= minX;
      c.y -= minY;
      c.cx -= minX;
      c.cy -= minY;
    });

    return {
      coords: localCoords,
      width: Math.max(180, maxX - minX),
      height: Math.max(60, maxY - minY),
      backEdgePairs
    };
  }

  function layoutSubgraphGroup(subNodeIds, allNodes, allEdges, isTD, fontOptions, nodeSizes) {
    const nodeSet = new Set(subNodeIds);
    const internalEdges = Object.values(allEdges).filter(e => nodeSet.has(e.sourceId) && nodeSet.has(e.targetId));

    const undirectedAdj = {};
    subNodeIds.forEach(id => { undirectedAdj[id] = []; });
    internalEdges.forEach(e => {
      undirectedAdj[e.sourceId].push(e.targetId);
      undirectedAdj[e.targetId].push(e.sourceId);
    });

    const visited = new Set();
    const components = [];
    for (const id of subNodeIds) {
      if (!visited.has(id)) {
        const comp = [];
        const q = [id];
        visited.add(id);
        while (q.length > 0) {
          const curr = q.shift();
          comp.push(curr);
          for (const nxt of undirectedAdj[curr]) {
            if (!visited.has(nxt)) {
              visited.add(nxt);
              q.push(nxt);
            }
          }
        }
        comp.sort((a, b) => subNodeIds.indexOf(a) - subNodeIds.indexOf(b));
        components.push(comp);
      }
    }

    const compLayouts = components.map(comp => {
      const cEdges = internalEdges.filter(e => comp.includes(e.sourceId) && comp.includes(e.targetId));
      return layoutConnectedSubComponent(comp, allNodes, cEdges, isTD, fontOptions, nodeSizes);
    });

    const combinedCoords = {};
    const allBackEdges = new Set();
    const compGap = 68;
    let cursorX = 0;
    let maxH = 0;

    compLayouts.forEach(cl => {
      cl.backEdgePairs.forEach(p => allBackEdges.add(p));
      Object.entries(cl.coords).forEach(([id, c]) => {
        combinedCoords[id] = {
          x: c.x + cursorX,
          y: c.y,
          width: c.width,
          height: c.height,
          cx: c.cx + cursorX,
          cy: c.cy
        };
      });
      cursorX += cl.width + compGap;
      if (cl.height > maxH) maxH = cl.height;
    });

    const totalW = Math.max(200, cursorX - compGap);
    return {
      coords: combinedCoords,
      width: totalW,
      height: maxH,
      backEdgePairs: allBackEdges
    };
  }

  function layoutGraph(nodes, edges, orientation = 'TD', isDark = false, subgraphs = {}, fontOptions = {}) {
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) return { nodes: {}, edges: {}, totalWidth: 1600, totalHeight: 900 };

    const isTD = orientation === 'TD' || orientation === 'TB';
    const effFontFamily = fontOptions.fontFamily || "Poppins, sans-serif";
    const effFontSize = fontOptions.fontSize || 12.5;
    const contFontFamily = fontOptions.fontFamily || "Inter, sans-serif";
    const contFontSize = fontOptions.fontSize || 11.5;

    const nodeSizes = {};
    nodeIds.forEach(id => {
      const n = nodes[id];
      nodeSizes[id] = computeNodeDimensions(n.rawText || id, n.type, {
        fontFamily: effFontFamily,
        fontSize: effFontSize,
        paddingX: 12,
        paddingY: 10
      });
    });

    const subList = Object.values(subgraphs || {}).filter(s => s.nodeIds && s.nodeIds.length > 0);
    const hasSubgraphs = subList.length > 0;
    const finalNodes = {};
    const finalEdges = {};
    const globalBackEdges = new Set();

    let totalWidth = 1600;
    let totalHeight = 900;

    if (hasSubgraphs) {
      const assignedNodes = new Set();
      subList.forEach(s => s.nodeIds.forEach(nid => assignedNodes.add(nid)));
      const orphanIds = nodeIds.filter(id => !assignedNodes.has(id));
      const allSubList = [...subList];
      if (orphanIds.length > 0) {
        allSubList.push({ id: "__ORPHANS__", title: "", nodeIds: orphanIds, isOrphan: true });
      }

      const boxPadX = 42;
      const boxPadTop = 54;
      const boxPadBottom = 38;
      const subLayouts = {};
      const nodeToSub = {};

      allSubList.forEach(sub => {
        sub.nodeIds.forEach(nid => { nodeToSub[nid] = sub.id; });
        const internal = layoutSubgraphGroup(sub.nodeIds, nodes, edges, isTD, { fontFamily: effFontFamily, fontSize: effFontSize }, nodeSizes);
        internal.backEdgePairs.forEach(p => globalBackEdges.add(p));
        const titleMinW = (sub.title ? sub.title.length * (contFontSize * 0.65) + 60 : 200);
        const contentW = Math.max(internal.width, titleMinW);
        subLayouts[sub.id] = {
          sub,
          internal,
          boxW: contentW + boxPadX * 2,
          boxH: internal.height + boxPadTop + boxPadBottom
        };
      });

      const subIds = allSubList.map(s => s.id);
      const subAdj = {};
      const subUndirected = {};
      subIds.forEach(sid => {
        subAdj[sid] = new Set();
        subUndirected[sid] = new Set();
      });

      Object.values(edges).forEach(e => {
        const sA = nodeToSub[e.sourceId];
        const sB = nodeToSub[e.targetId];
        if (sA && sB && sA !== sB) {
          subAdj[sA].add(sB);
          subUndirected[sA].add(sB);
          subUndirected[sB].add(sA);
        }
      });

      const subVisited = new Set();
      const macroComponents = [];
      for (const sid of subIds) {
        if (!subVisited.has(sid)) {
          const comp = [];
          const q = [sid];
          subVisited.add(sid);
          while (q.length > 0) {
            const curr = q.shift();
            comp.push(curr);
            for (const nxt of subUndirected[curr]) {
              if (!subVisited.has(nxt)) {
                subVisited.add(nxt);
                q.push(nxt);
              }
            }
          }
          comp.sort((a, b) => subIds.indexOf(a) - subIds.indexOf(b));
          macroComponents.push(comp);
        }
      }

      let macroCursorX = 80;
      let globalMaxY = 0;

      macroComponents.forEach(mComp => {
        const isTwoActorSwimlane = (
          mComp.length === 2 &&
          subAdj[mComp[0]].has(mComp[1]) &&
          subAdj[mComp[1]].has(mComp[0])
        );

        let macroLevels = {};
        if (isTwoActorSwimlane) {
          macroLevels[0] = [mComp[0], mComp[1]];
        } else {
          const mVis = new Set();
          const mStack = new Set();
          const mBack = new Set();

          function dfsSub(u) {
            mVis.add(u);
            mStack.add(u);
            for (const v of subAdj[u]) {
              if (!mComp.includes(v)) continue;
              if (mStack.has(v)) {
                mBack.add(`${u}->${v}`);
              } else if (!mVis.has(v)) {
                dfsSub(v);
              }
            }
            mStack.delete(u);
          }

          mComp.forEach(sid => { if (!mVis.has(sid)) dfsSub(sid); });

          const sLvl = {};
          mComp.forEach(sid => { sLvl[sid] = 0; });
          for (let it = 0; it < mComp.length + 2; it++) {
            for (const u of mComp) {
              for (const v of subAdj[u]) {
                if (!mComp.includes(v) || mBack.has(`${u}->${v}`)) continue;
                if (sLvl[u] + 1 > sLvl[v]) {
                  sLvl[v] = sLvl[u] + 1;
                }
              }
            }
          }

          mComp.forEach(sid => {
            const l = sLvl[sid] || 0;
            if (!macroLevels[l]) macroLevels[l] = [];
            macroLevels[l].push(sid);
          });
        }

        const subColGap = isTwoActorSwimlane ? 150 : 96;
        const subRowGap = 104;
        const mLvlKeys = Object.keys(macroLevels).map(Number).sort((a, b) => a - b);

        let compMaxW = 0;
        mLvlKeys.forEach(l => {
          const rowSubs = macroLevels[l];
          const rowW = rowSubs.reduce((acc, sid, idx) => acc + subLayouts[sid].boxW + (idx > 0 ? subColGap : 0), 0);
          if (rowW > compMaxW) compMaxW = rowW;
        });

        const compCenterX = macroCursorX + compMaxW / 2;
        let curMacroY = 80;

        mLvlKeys.forEach(l => {
          const rowSubs = macroLevels[l];
          const rowW = rowSubs.reduce((acc, sid, idx) => acc + subLayouts[sid].boxW + (idx > 0 ? subColGap : 0), 0);
          let curSubX = compCenterX - rowW / 2;
          let rowMaxH = 0;

          rowSubs.forEach(sid => {
            const sl = subLayouts[sid];
            const cX = Math.round(curSubX);
            const cY = Math.round(curMacroY);
            const cW = Math.round(sl.boxW);
            const cH = Math.round(sl.boxH);

            const innerOffsetX = cX + Math.round((cW - sl.internal.width) / 2);
            const innerOffsetY = cY + boxPadTop;

            Object.entries(sl.internal.coords).forEach(([nid, lc]) => {
              const n = nodes[nid];
              finalNodes[nid] = {
                id: nid,
                type: n.type || 'rectangle',
                x: Math.round(innerOffsetX + lc.x),
                y: Math.round(innerOffsetY + lc.y),
                width: Math.round(lc.width),
                height: Math.round(lc.height),
                rotation: 0,
                locked: false,
                groupId: sl.sub.isOrphan ? null : sid,
                style: {
                  fill: isDark ? "#18181b" : "#ffffff",
                  stroke: isDark ? "#f4f4f5" : "#18181b",
                  strokeWidth: 1.5
                },
                text: {
                  content: n.rawText || nid,
                  fontFamily: effFontFamily,
                  fontSize: effFontSize,
                  bold: false,
                  italic: false,
                  underline: false,
                  color: isDark ? "#f4f4f5" : "#18181b",
                  align: "center",
                  paddingX: 12,
                  paddingY: 10
                }
              };
            });

            if (!sl.sub.isOrphan) {
              const containerId = `subgraph_${sid}`;
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
                  content: `[ ${sl.sub.title.toUpperCase()} ]`,
                  fontFamily: contFontFamily,
                  fontSize: contFontSize,
                  bold: true,
                  italic: false,
                  underline: false,
                  color: isDark ? "#a1a1aa" : "#71717a",
                  align: "left",
                  paddingX: 18,
                  paddingY: 14
                }
              };
            }

            curSubX += cW + subColGap;
            if (cH > rowMaxH) rowMaxH = cH;
          });

          curMacroY += rowMaxH + subRowGap;
        });

        if (curMacroY > globalMaxY) globalMaxY = curMacroY;
        macroCursorX += compMaxW + 140;
      });

      totalWidth = Math.max(1200, macroCursorX - 60);
      totalHeight = Math.max(900, globalMaxY + 40);
    } else {
      const internal = layoutSubgraphGroup(nodeIds, nodes, edges, isTD, { fontFamily: effFontFamily, fontSize: effFontSize }, nodeSizes);
      internal.backEdgePairs.forEach(p => globalBackEdges.add(p));

      const startX = 100;
      const startY = 80;
      Object.entries(internal.coords).forEach(([nid, lc]) => {
        const n = nodes[nid];
        finalNodes[nid] = {
          id: nid,
          type: n.type || 'rectangle',
          x: Math.round(startX + lc.x),
          y: Math.round(startY + lc.y),
          width: Math.round(lc.width),
          height: Math.round(lc.height),
          rotation: 0,
          locked: false,
          groupId: null,
          style: {
            fill: isDark ? "#18181b" : "#ffffff",
            stroke: isDark ? "#f4f4f5" : "#18181b",
            strokeWidth: 1.5
          },
          text: {
            content: n.rawText || nid,
            fontFamily: effFontFamily,
            fontSize: effFontSize,
            bold: false,
            italic: false,
            underline: false,
            color: isDark ? "#f4f4f5" : "#18181b",
            align: "center",
            paddingX: 12,
            paddingY: 10
          }
        };
      });

      totalWidth = Math.max(1200, internal.width + 240);
      totalHeight = Math.max(850, internal.height + 200);
    }

    // 4. SMART PIN SELECTION & ROUTING
    const outEdgesByNode = {};
    Object.values(edges).forEach(e => {
      if (!outEdgesByNode[e.sourceId]) outEdgesByNode[e.sourceId] = [];
      outEdgesByNode[e.sourceId].push(e);
    });

    Object.values(edges).forEach(e => {
      const src = finalNodes[e.sourceId];
      const tgt = finalNodes[e.targetId];
      if (!src || !tgt) return;

      const srcCx = src.x + src.width / 2;
      const srcCy = src.y + src.height / 2;
      const tgtCx = tgt.x + tgt.width / 2;
      const tgtCy = tgt.y + tgt.height / 2;
      const dx = tgtCx - srcCx;
      const dy = tgtCy - srcCy;

      const sameGroup = (src.groupId && src.groupId === tgt.groupId) || (!src.groupId && !tgt.groupId);
      const isBackEdge = globalBackEdges.has(`${e.sourceId}->${e.targetId}`);
      const sibOut = outEdgesByNode[e.sourceId] || [];

      let srcPin = 'S', tgtPin = 'N';
      let handleOffset = { dx: 0, dy: 0 };

      if (isTD) {
        if (sameGroup) {
          if (isBackEdge || dy < -20) {
            if (srcCx >= tgtCx) {
              srcPin = 'E'; tgtPin = 'E';
            } else {
              srcPin = 'W'; tgtPin = 'W';
            }
          } else if (Math.abs(dy) <= 25) {
            srcPin = dx >= 0 ? 'E' : 'W';
            tgtPin = dx >= 0 ? 'W' : 'E';
          } else {
            if ((src.type === 'diamond' || sibOut.length >= 2) && Math.abs(dx) > 45) {
              srcPin = dx < 0 ? 'W' : 'E';
              tgtPin = 'N';
            } else {
              srcPin = 'S';
              tgtPin = 'N';
            }
          }
        } else {
          const srcCont = src.groupId ? finalNodes[`subgraph_${src.groupId}`] : null;
          const tgtCont = tgt.groupId ? finalNodes[`subgraph_${tgt.groupId}`] : null;
          const containersSideBySide = srcCont && tgtCont && (
            (srcCont.x + srcCont.width <= tgtCont.x + 20) ||
            (tgtCont.x + tgtCont.width <= srcCont.x + 20)
          ) && Math.abs((srcCont.y + srcCont.height / 2) - (tgtCont.y + tgtCont.height / 2)) < Math.max(srcCont.height, tgtCont.height) * 0.7;

          if (containersSideBySide) {
            srcPin = tgtCx > srcCx ? 'E' : 'W';
            tgtPin = tgtCx > srcCx ? 'W' : 'E';
          } else if (dy > 40) {
            srcPin = 'S';
            tgtPin = 'N';
          } else {
            srcPin = 'S';
            tgtPin = dx >= 0 ? 'W' : 'E';
          }
        }
      } else {
        if (dx > 20) {
          if ((src.type === 'diamond' || sibOut.length >= 2) && Math.abs(dy) > 45) {
            srcPin = dy < 0 ? 'N' : 'S';
            tgtPin = 'W';
          } else {
            srcPin = 'E';
            tgtPin = 'W';
          }
        } else if (dx < -20) {
          srcPin = dy >= 0 ? 'S' : 'N';
          tgtPin = dy >= 0 ? 'S' : 'N';
        } else {
          srcPin = dy >= 0 ? 'S' : 'N';
          tgtPin = dy >= 0 ? 'N' : 'S';
        }
      }

      finalEdges[e.id] = {
        id: e.id,
        type: "step",
        radius: 8,
        source: { nodeId: e.sourceId, pin: srcPin },
        target: { nodeId: e.targetId, pin: tgtPin },
        handleOffset,
        label: e.label || '',
        style: {
          stroke: isDark ? "#f4f4f5" : "#18181b",
          strokeWidth: 1.5,
          dashed: e.dashed || "solid",
          markerStart: "none",
          markerEnd: "arrow",
          radius: 8,
          fontFamily: effFontFamily,
          fontSize: Math.max(9.5, effFontSize - 0.5)
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
    const fontOptions = {
      fontFamily: data.fontFamily || "Poppins, sans-serif",
      fontSize: Number(data.fontSize) || 12
    };

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
      }

      const label = `${item.name}${item.spec ? '\n[' + item.spec + ']' : ''}`;
      nodes[id] = { id, type, rawText: label, inDegree: 0, outDegree: 0 };
    });

    connections.forEach(conn => {
      const fromComp = (conn.from || '').split(':')[0].trim();
      const toComp = (conn.to || '').split(':')[0].trim();
      if (!fromComp || !toComp) return;

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

    const layout = layoutGraph(nodes, edges, 'LR', isDark, {}, fontOptions);

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
      fontFamily: data.fontFamily || "'Book Antiqua', Palatino, serif",
      fontSize: Number(data.fontSize) || 10
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
        const gid = n.groupId || n.subgraph || groupMapping[id] || "GROUP_CORE";
        if (!subgraphs[gid]) {
          subgraphs[gid] = { id: gid, title: gid, nodeIds: [] };
        }
        subgraphs[gid].nodeIds.push(id);
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
            dashed: (tgtId === 'WAIT_USER' || e.dashed) ? 'dashed' : 'solid',
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
          zoom: 0.55,
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
      let prevPhaseLastTaskId = null;

      data.engineering_workflow.phases.forEach((p, pIdx) => {
        const pId = p.phase_id || `PHASE_${pIdx + 1}`;
        subgraphs[pId] = {
          id: pId,
          title: p.phase_name || pId,
          nodeIds: []
        };

        const tasks = Array.isArray(p.tasks) ? p.tasks : [];
        let prevTaskId = prevPhaseLastTaskId;
        tasks.forEach((t, tIdx) => {
          const tId = `${pId}_task_${tIdx + 1}`;
          intermediateNodes[tId] = {
            id: tId,
            type: "rectangle",
            rawText: cleanLabelText(typeof t === 'string' ? t : (t.label || t.title || t.name || tId)),
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
        if (prevTaskId) prevPhaseLastTaskId = prevTaskId;
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

    return parseGenericJson(data, isDark, fontOptions);
  }

  // ==========================================================================
  // 5. ADAPTER GENERIC DIAGRAM JSON (MULTI-SCHEMA SUPPORT)
  // ==========================================================================
  function parseGenericJson(data, isDark = false, customFontOptions = null) {
    let rawNodes = [];
    let rawEdges = [];
    let rawSubgraphs = {};

    const rootObj = (!Array.isArray(data) && (data.workflow || data.flowchart || data.diagram))
      ? (data.workflow || data.flowchart || data.diagram)
      : data;

    const fontOptions = customFontOptions || {
      fontFamily: data.fontFamily || rootObj.fontFamily || "Poppins, sans-serif",
      fontSize: Number(data.fontSize || rootObj.fontSize) || 12
    };
    const orientation = (data.orientation || data.direction || rootObj.orientation || rootObj.direction || 'TD').toUpperCase();

    const subSource = data.subgraphs || data.groups || data.lanes || rootObj.subgraphs || rootObj.groups;
    if (Array.isArray(subSource)) {
      subSource.forEach((s, idx) => {
        const sid = String(s.id || s.key || `GROUP_${idx + 1}`);
        rawSubgraphs[sid] = { id: sid, title: s.title || s.name || s.label || sid, nodeIds: Array.isArray(s.nodeIds) ? [...s.nodeIds] : [] };
      });
    } else if (subSource && typeof subSource === 'object') {
      Object.entries(subSource).forEach(([sid, s]) => {
        rawSubgraphs[sid] = { id: sid, title: s.title || s.name || s.label || sid, nodeIds: Array.isArray(s.nodeIds) ? [...s.nodeIds] : [] };
      });
    }

    if (Array.isArray(rootObj)) {
      rawNodes = rootObj;
    } else if (Array.isArray(rootObj.nodes)) {
      rawNodes = rootObj.nodes;
      rawEdges = rootObj.edges || rootObj.links || rootObj.connections || rootObj.transitions || [];
    } else if (Array.isArray(rootObj.steps) || Array.isArray(rootObj.stages)) {
      rawNodes = rootObj.steps || rootObj.stages;
      rawEdges = rootObj.edges || rootObj.links || rootObj.connections || [];
    } else if (Array.isArray(rootObj.phases)) {
      let prevId = null;
      rootObj.phases.forEach((p, pIdx) => {
        const pid = String(p.id || p.phase_id || `PHASE_${pIdx + 1}`);
        const pTitle = p.title || p.phase_name || p.name || pid;
        rawSubgraphs[pid] = { id: pid, title: pTitle, nodeIds: [] };
        const items = p.nodes || p.steps || p.tasks || [];
        items.forEach((item, iIdx) => {
          const nid = typeof item === 'object' && item.id ? String(item.id) : `${pid}_step_${iIdx + 1}`;
          const nLabel = typeof item === 'string' ? item : (item.label || item.title || item.text || item.name || nid);
          const nType = typeof item === 'object' && item.type ? item.type : undefined;
          rawNodes.push({ id: nid, label: nLabel, type: nType, groupId: pid });
          if (prevId && (!rootObj.edges || rootObj.edges.length === 0)) {
            rawEdges.push({ from: prevId, to: nid });
          }
          prevId = nid;
        });
      });
      if (Array.isArray(rootObj.edges)) rawEdges.push(...rootObj.edges);
    } else if (rootObj.elements) {
      if (Array.isArray(rootObj.elements.nodes)) rawNodes = rootObj.elements.nodes;
      if (Array.isArray(rootObj.elements.edges)) rawEdges = rootObj.elements.edges;
      if (Array.isArray(rootObj.elements)) {
        rootObj.elements.forEach(el => {
          if (el.group === "nodes" || (el.data && el.data.id && !el.data.source)) rawNodes.push(el);
          else if (el.group === "edges" || (el.data && el.data.source && el.data.target)) rawEdges.push(el);
        });
      }
    }

    const intermediateNodes = {};
    const intermediateEdges = {};
    let edgeIdx = 1;

    function normalizeShapeType(rawType, text) {
      if (rawType) {
        const t = String(rawType).toLowerCase();
        if (t === 'decision' || t === 'diamond' || t === 'condition') return 'diamond';
        if (t === 'start_end' || t === 'start' || t === 'end' || t === 'terminator' || t === 'stadium' || t === 'rounded') return 'rounded';
        if (t === 'database' || t === 'db' || t === 'cylinder' || t === 'storage') return 'cylinder';
        if (t === 'io' || t === 'input' || t === 'output' || t === 'parallelogram') return 'parallelogram';
        if (t === 'circle' || t === 'event') return 'circle';
        if (t === 'rectangle' || t === 'process' || t === 'task' || t === 'step') return 'rectangle';
      }
      const lower = String(text || '').toLowerCase();
      if (/\?|\bapakah\b|\bevaluasi\b|\bdecision\b|\bkondisi\b/.test(lower)) return 'diamond';
      if (/^(?:mulai|start|selesai|finish|end)\b/i.test(lower)) return 'rounded';
      return 'rectangle';
    }

    rawNodes.forEach((n, idx) => {
      if (typeof n === 'string') {
        const id = `node_${idx + 1}`;
        intermediateNodes[id] = { id, type: normalizeShapeType(null, n), rawText: cleanLabelText(n), inDegree: 0, outDegree: 0 };
        return;
      }
      const id = String(n.id || n.key || n.data?.id || `node_${idx + 1}`);
      const text = n.label || n.data?.label || n.text?.content || n.text || n.title || n.name || id;
      const type = normalizeShapeType(n.type || n.shape || n.data?.type, text);
      const gid = n.groupId || n.subgraph || n.group || n.phase || n.lane || n.data?.parent || null;

      intermediateNodes[id] = {
        id,
        type,
        rawText: cleanLabelText(text),
        subgraph: gid,
        inDegree: 0,
        outDegree: 0
      };

      if (gid) {
        if (!rawSubgraphs[gid]) {
          rawSubgraphs[gid] = { id: String(gid), title: String(gid), nodeIds: [] };
        }
        if (!rawSubgraphs[gid].nodeIds.includes(id)) {
          rawSubgraphs[gid].nodeIds.push(id);
        }
      }
    });

    if (rawEdges.length === 0 && rawNodes.length > 1) {
      let hasExplicitNext = false;
      rawNodes.forEach((n, idx) => {
        if (typeof n !== 'object' || !n) return;
        const srcId = String(n.id || n.key || `node_${idx + 1}`);
        const nexts = n.next || n.targets || n.to || n.children;
        if (nexts) {
          hasExplicitNext = true;
          const nextArr = Array.isArray(nexts) ? nexts : [nexts];
          nextArr.forEach(item => {
            if (typeof item === 'string') {
              rawEdges.push({ from: srcId, to: item });
            } else if (typeof item === 'object' && item) {
              rawEdges.push({ from: srcId, to: item.id || item.to || item.target, label: item.label || item.condition || '' });
            }
          });
        }
      });

      if (!hasExplicitNext) {
        const ids = Object.keys(intermediateNodes);
        for (let i = 0; i < ids.length - 1; i++) {
          rawEdges.push({ from: ids[i], to: ids[i + 1] });
        }
      }
    }

    rawEdges.forEach((e) => {
      const srcId = String(e.source?.nodeId || e.source || e.data?.source || e.from || '');
      const tgtId = String(e.target?.nodeId || e.target || e.data?.target || e.to || '');
      if (srcId && tgtId && intermediateNodes[srcId] && intermediateNodes[tgtId]) {
        const edgeId = `edge_${edgeIdx++}`;
        intermediateEdges[edgeId] = {
          id: edgeId,
          sourceId: srcId,
          targetId: tgtId,
          dashed: (e.dashed === true || e.dashed === 'dashed' || e.style?.dashed === 'dashed') ? 'dashed' : 'solid',
          label: cleanLabelText(e.label || e.data?.label || e.condition || '')
        };
        intermediateNodes[srcId].outDegree++;
        intermediateNodes[tgtId].inDegree++;
      }
    });

    const layout = layoutGraph(intermediateNodes, intermediateEdges, orientation, isDark, rawSubgraphs, fontOptions);
    const isTall = layout.totalHeight > layout.totalWidth * 1.15;

    return {
      version: "1.5.0",
      theme: isDark ? "dark" : "light",
      canvas: {
        pan: { x: 50, y: 50 },
        zoom: isTall ? 0.65 : 0.8,
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
  // 6. ADAPTER MERMAID KE MINIMALFLOW DOCUMENT
  // ==========================================================================
  function parseMermaidToDocument(rawContent, isDark = false, customFontOptions = null) {
    const parsed = parseMermaidScript(rawContent);
    const isBookAntiquaRequested = /book\s*antiqua/i.test(rawContent);
    const fontOptions = customFontOptions || (isBookAntiquaRequested ? {
      fontFamily: "'Book Antiqua', Palatino, serif",
      fontSize: 10
    } : {
      fontFamily: "Poppins, sans-serif",
      fontSize: 11.5
    });

    const layout = layoutGraph(parsed.nodes, parsed.edges, parsed.orientation, isDark, parsed.subgraphs, fontOptions);
    const isTall = layout.totalHeight > layout.totalWidth * 1.15;

    return {
      version: "1.5.0",
      theme: isDark ? "dark" : "light",
      canvas: {
        pan: { x: 50, y: 50 },
        zoom: isTall ? 0.60 : 0.75,
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
  // 6b. ADAPTER NATURAL LANGUAGE PROMPT & STRUCTURED STEP LIST
  // ==========================================================================
  function parseStepListToDocument(rawText, isDark = false) {
    if (!rawText) {
      return {
        nodes: {}, edges: {},
        canvas: { pan: { x: 50, y: 50 }, zoom: 1, gridSize: 24, workspace: { preset: "16:9_landscape", orientation: "landscape", x: 40, y: 40, width: 1600, height: 900 } }
      };
    }

    let clean = rawText.trim().replace(/^```[a-zA-Z0-9_-]*\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    const intermediateNodes = {};
    const intermediateEdges = {};
    const subgraphs = {};
    let currentSubId = null;
    let nodeCounter = 1;
    let edgeCounter = 1;
    let lastMainNodeId = null;
    let lastDecisionNodeId = null;
    let pendingBranchLeafIds = [];

    function inferShape(label) {
      const lower = label.toLowerCase();
      if (/\b(mulai|start|begin|selesai|finish|end|berhenti|stop)\b/i.test(lower)) return "rounded";
      if (/\?|\b(apakah|jika|if|kondisi|valid\?|cek|evaluasi|decision)\b/i.test(lower)) return "diamond";
      if (/\b(input|output|masukkan|keluaran|baca|read|print|cetak|tampilkan|display)\b/i.test(lower)) return "parallelogram";
      if (/\b(database|db|basis data|tabel|table|simpan ke db|storage|penyimpanan)\b/i.test(lower)) return "cylinder";
      return "rectangle";
    }

    function addStepNode(label, explicitType = null) {
      const id = `step_${nodeCounter++}`;
      const type = explicitType || inferShape(label);
      intermediateNodes[id] = {
        id,
        type,
        rawText: cleanLabelText(label),
        subgraph: currentSubId,
        inDegree: 0,
        outDegree: 0
      };
      if (currentSubId && subgraphs[currentSubId]) {
        subgraphs[currentSubId].nodeIds.push(id);
      }
      return id;
    }

    function addStepEdge(srcId, tgtId, label = '') {
      if (!srcId || !tgtId) return;
      const eid = `edge_${edgeCounter++}`;
      intermediateEdges[eid] = {
        id: eid,
        sourceId: srcId,
        targetId: tgtId,
        dashed: 'solid',
        label: cleanLabelText(label)
      };
      if (intermediateNodes[srcId]) intermediateNodes[srcId].outDegree++;
      if (intermediateNodes[tgtId]) intermediateNodes[tgtId].inDegree++;
    }

    if (!clean.includes('\n') && /->|-->|=>|\u2794|→/.test(clean)) {
      const parts = clean.split(/->|-->|=>|\u2794|→/).map(p => p.trim()).filter(Boolean);
      parts.forEach(p => {
        const lbl = p.replace(/^\[?\d+[\]\.\:\-\)]\s*/, "").trim() || p;
        const nid = addStepNode(lbl);
        if (lastMainNodeId) addStepEdge(lastMainNodeId, nid);
        lastMainNodeId = nid;
      });
    } else {
      const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
      let subIdx = 1;

      for (const line of lines) {
        if (line.startsWith('//') || line.startsWith('%%')) continue;

        const phaseMatch = line.match(/^(?:#+\s*)?(?:(?:fase|phase|tahap|bagian|modul|group|subgraph)\s+\d*[:\-\.]?\s*(.+)|\[(.+)\])$/i);
        if (phaseMatch && !line.includes('->') && !line.endsWith('?')) {
          const title = (phaseMatch[1] || phaseMatch[2] || line).trim();
          currentSubId = `PHASE_${subIdx++}`;
          subgraphs[currentSubId] = { id: currentSubId, title, nodeIds: [] };
          continue;
        }

        const branchMatch = line.match(/^(?:[-*•]\s*)?(?:jika\s+|if\s+|cabang\s+)?(ya|tidak|yes|no|lulus|gagal|valid|invalid|benar|salah|normal|korsleting|offline|online)\s*(?:[:\-]|->|-->|=>)\s*(.+)$/i);
        if (branchMatch && (lastDecisionNodeId || lastMainNodeId)) {
          const branchLabel = branchMatch[1].trim();
          const targetText = branchMatch[2].trim();
          const anchorId = lastDecisionNodeId || lastMainNodeId;
          if (intermediateNodes[anchorId]) {
            intermediateNodes[anchorId].type = 'diamond';
          }
          const branchNodeId = addStepNode(targetText);
          addStepEdge(anchorId, branchNodeId, branchLabel);
          pendingBranchLeafIds.push(branchNodeId);
          continue;
        }

        const cleaned = line.replace(/^(?:(?:\d+[\.\)\:-])|[-*•]|\b(?:langkah|step)\s+\d+[:\.\-]?)\s*/i, "").trim();
        if (!cleaned) continue;

        const nid = addStepNode(cleaned);
        if (pendingBranchLeafIds.length > 0) {
          pendingBranchLeafIds.forEach(leafId => addStepEdge(leafId, nid));
          pendingBranchLeafIds = [];
          lastDecisionNodeId = null;
        } else if (lastMainNodeId) {
          addStepEdge(lastMainNodeId, nid);
        }

        lastMainNodeId = nid;
        if (intermediateNodes[nid].type === 'diamond') {
          lastDecisionNodeId = nid;
        } else {
          lastDecisionNodeId = null;
        }
      }
    }

    const layout = layoutGraph(intermediateNodes, intermediateEdges, 'TD', isDark, subgraphs);
    const isTall = layout.totalHeight > layout.totalWidth * 1.15;

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
  // 6c. AI VISION DIRECT SPATIAL RECONSTRUCTION ENGINE (box_2d + Verbatim Rich Text)
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

      let fontSize = data.fontSize ? Number(data.fontSize) : 13;
      if (!data.fontSize) {
        if (!isContainer) {
          if (totalPlainLen > 240 && width < 260) fontSize = 11.5;
          else if (totalPlainLen > 120 && width < 260) fontSize = 12;
          else if (totalPlainLen > 320) fontSize = 12.5;
        } else {
          fontSize = 12;
        }
      }

      // Gunakan computeNodeDimensions sebagai jaminan ukuran minimal bebas overflow
      if (!isContainer) {
        const plainForMeasure = contentStr.replace(/<[^>]+>/g, '');
        const minDims = computeNodeDimensions(plainForMeasure, shapeType, {
          fontFamily: data.fontFamily || "Poppins, sans-serif",
          fontSize,
          paddingX: 14,
          paddingY: 10
        });
        if (width < minDims.width && totalPlainLen > 35) width = Math.max(width, Math.min(minDims.width, 280));
        const recomputed = computeNodeDimensions(plainForMeasure, shapeType, {
          fontFamily: data.fontFamily || "Poppins, sans-serif",
          fontSize,
          paddingX: 14,
          paddingY: 10
        });
        if (height < recomputed.height) height = recomputed.height;
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
        origX: Math.round(x),
        origY: Math.round(y),
        origW: Math.round(width),
        origH: Math.round(height),
        rotation: 0,
        locked: isContainer,
        isContainer,
        groupId: rn.groupId || null,
        zIndex: isContainer ? 1 : (10 + idx * 10),
        style: {
          fill: fillCol,
          stroke: isContainer ? (isDark ? "#3f3f46" : "#d4d4d8") : (isDark ? "#f4f4f5" : "#18181b"),
          strokeWidth: 1.5,
          dashed: isContainer ? "dashed" : "solid"
        },
        text: {
          content: contentStr,
          fontFamily: data.fontFamily || "Poppins, sans-serif",
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

    // Tentukan keanggotaan container sebelum pergeseran baris
    const containers = builtNodes.filter(n => n.isContainer);
    const nonContainers = builtNodes.filter(n => !n.isContainer);
    const containerMembers = {};
    containers.forEach(c => { containerMembers[c.id] = []; });

    nonContainers.forEach(n => {
      const cx = n.origX + n.origW / 2;
      const cy = n.origY + n.origH / 2;
      for (const c of containers) {
        if (cx >= c.origX && cx <= c.origX + c.origW && cy >= c.origY && cy <= c.origY + c.origH) {
          containerMembers[c.id].push(n);
          if (!n.groupId) n.groupId = c.id;
          break;
        }
      }
    });

    // Pass 1: Kelompokkan node non-container ke dalam baris horizontal & rapikan kesejajaran
    nonContainers.sort((a, b) => a.y - b.y || a.x - b.x);
    const rows = [];
    for (const n of nonContainers) {
      let placed = false;
      for (const row of rows) {
        const refY = row[0].y;
        const refH = row[0].height;
        const overlapY = Math.min(refY + refH, n.y + n.height) - Math.max(refY, n.y);
        if (Math.abs(n.y - refY) <= 28 || overlapY > Math.min(refH, n.height) * 0.55) {
          row.push(n);
          placed = true;
          break;
        }
      }
      if (!placed) rows.push([n]);
    }

    let prevRowBottom = 0;
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      row.sort((a, b) => a.x - b.x);

      let avgY = Math.round(row.reduce((s, n) => s + n.y, 0) / row.length);
      if (rIdx > 0 && avgY < prevRowBottom + 36) {
        avgY = prevRowBottom + 36;
      }
      row.forEach(n => { n.y = avgY; });

      for (let i = 1; i < row.length; i++) {
        const prev = row[i - 1];
        const curr = row[i];
        const minX = prev.x + prev.width + 20;
        if (curr.x < minX) {
          curr.x = minX;
        }
      }

      const origHeights = row.map(n => n.height);
      const wasUniformHeight = row.length > 1 && (Math.max(...origHeights) - Math.min(...origHeights)) <= 36;

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
      prevRowBottom = avgY + newRowMaxH;
    }

    // Pass 2: Sesuaikan kotak container agar selalu membungkus penuh seluruh anggotanya
    containers.forEach(c => {
      const members = containerMembers[c.id] || [];
      if (members.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        members.forEach(m => {
          minX = Math.min(minX, m.x);
          minY = Math.min(minY, m.y);
          maxX = Math.max(maxX, m.x + m.width);
          maxY = Math.max(maxY, m.y + m.height);
        });
        c.x = Math.min(c.x, minX - 28);
        c.y = Math.min(c.y, minY - 44);
        c.width = Math.max(c.width, (maxX + 28) - c.x);
        c.height = Math.max(c.height, (maxY + 28) - c.y);
      }
    });

    let maxRight = 1400;
    let maxBottom = 860;
    const finalNodes = {};
    builtNodes.forEach(n => {
      delete n.origX; delete n.origY; delete n.origW; delete n.origH;
      n.baseWidth = n.width;
      n.baseHeight = n.height;
      finalNodes[n.id] = n;
      maxRight = Math.max(maxRight, n.x + n.width + 80);
      maxBottom = Math.max(maxBottom, n.y + n.height + 80);
    });

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
        const nodeCount = Object.keys(doc.nodes).filter(k => !doc.nodes[k].isContainer).length;
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
        const nodeCount = Object.keys(doc.nodes).filter(k => !doc.nodes[k].isContainer).length;
        const edgeCount = Object.keys(doc.edges).length;
        return {
          success: true,
          detectedType: "generic_json",
          formatTitle: "Universal Diagram JSON",
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
    computeNodeDimensions,
    detectFormat,
    parseUniversal,
    parseMermaidScript,
    parseMermaidToDocument,
    parseMinimalFlowVisionJson,
    parseMashimurelayJson,
    parseMashimurelayWorkflowJson,
    parseGenericJson,
    parseStepListToDocument,
    layoutGraph
  };

})(window.MinimalFlow);
