/**
 * MinimalFlow Studio — Live Inline Text Editor Engine
 * Mengelola rendering tata letak teks SVG (auto-wrap, character-break, padding kata)
 * dan editor teks yang MENYATU RAPI KE DALAM BOX CHART (Bukan tumpukan kotak transparan lepas).
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  let measureCanvas = null;
  let measureCtx = null;

  function getMeasureContext() {
    if (!measureCtx && typeof document !== "undefined") {
      measureCanvas = document.createElement("canvas");
      measureCtx = measureCanvas.getContext("2d");
    }
    return measureCtx;
  }

  function layoutNodeText(node) {
    if (!node.text) {
      return { lines: [], xPos: 0, startY: 0, lineHeight: 14, anchor: "middle", totalTextHeight: 0 };
    }

    const { width, height, text } = node;
    const paddingX = text.paddingX !== undefined ? text.paddingX : 14;
    const paddingY = text.paddingY !== undefined ? text.paddingY : 10;

    // Reduksi area aman berdasarkan geometri bentuk chart
    let shapeSafeReduction = 0;
    if (node.type === "parallelogram") {
      const skew = Math.min(width * 0.2, 28);
      shapeSafeReduction = skew * 2;
    } else if (node.type === "diamond") {
      shapeSafeReduction = Math.min(width * 0.22, 28);
    } else if (node.type === "triangle") {
      shapeSafeReduction = Math.min(width * 0.25, 30);
    } else if (node.type === "circle") {
      shapeSafeReduction = Math.min(width * 0.16, 20);
    }

    const maxWidth = Math.max(8, width - (paddingX * 2) - shapeSafeReduction);
    const lineHeight = (text.fontSize || 14) * 1.35;
    const ctx = getMeasureContext();

    if (ctx) {
      const fontStyle = text.italic ? "italic " : "";
      const fontWeight = text.bold ? "700 " : "500 ";
      ctx.font = `${fontStyle}${fontWeight}${text.fontSize || 14}px ${text.fontFamily || 'Poppins, sans-serif'}`;
    }

    function measureTextWidth(w) {
      if (!ctx) return w.length * (text.fontSize || 14) * 0.6;
      return ctx.measureText(w).width;
    }

    // Pecah kata panjang yang tidak punya spasi per-karakter agar tidak tembus keluar chart
    function breakWordIfNeeded(w) {
      if (!w) return [""];
      if (measureTextWidth(w) <= maxWidth) return [w];
      const chunks = [];
      let cur = "";
      for (let i = 0; i < w.length; i++) {
        const ch = w[i];
        if (measureTextWidth(cur + ch) <= maxWidth) {
          cur += ch;
        } else {
          if (cur) chunks.push(cur);
          cur = ch;
        }
      }
      if (cur) chunks.push(cur);
      return chunks.length > 0 ? chunks : [w];
    }

    const paragraphs = (text.content || "").split("\n");
    const lines = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push("");
        continue;
      }
      const rawWords = para.split(" ");
      const words = [];
      for (const rw of rawWords) {
        const broken = breakWordIfNeeded(rw);
        words.push(...broken);
      }

      let currentLine = words[0] || "";
      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + " " + words[i];
        if (measureTextWidth(testLine) <= maxWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }
      lines.push(currentLine);
    }

    let anchor = "middle";
    let xPos = width / 2;
    if (text.align === "left") {
      anchor = "start";
      xPos = paddingX + (shapeSafeReduction / 2);
    }
    if (text.align === "right") {
      anchor = "end";
      xPos = width - paddingX - (shapeSafeReduction / 2);
    }

    const totalTextHeight = lines.length * lineHeight;
    let availableHeight = height - paddingY * 2;
    let startY = paddingY + (availableHeight - totalTextHeight) / 2 + (text.fontSize || 14) * 0.85;

    // Centering vertikal khusus tabung database agar tidak menabrak elips atas
    if (node.type === "cylinder") {
      const ry = Math.min(height * 0.22, 18);
      availableHeight = height - ry * 1.5 - paddingY * 2;
      startY = ry + paddingY + (availableHeight - totalTextHeight) / 2 + (text.fontSize || 14) * 0.85;
    }

    if (startY < paddingY + (text.fontSize || 14) * 0.8) {
      startY = paddingY + (text.fontSize || 14) * 0.8;
    }

    if (node.isContainer) {
      startY = paddingY + (text.fontSize || 14) * 0.85;
    }

    return { lines, xPos, startY, lineHeight, anchor, totalTextHeight };
  }

  let activeEditingNodeId = null;
  let activeEditingFinishFn = null;

  function closeInlineEditor() {
    if (activeEditingFinishFn) {
      activeEditingFinishFn();
    }
  }

  function openInlineEditor(nodeId, doc, uiState, dom, onSave, onLiveRender) {
    const node = doc.nodes[nodeId];
    if (!node || node.type === "image") return;

    // Jika ada node lain yang sedang diedit, selesaikan dulu
    if (activeEditingNodeId && activeEditingFinishFn) {
      activeEditingFinishFn();
    }

    const nodeGroupEl = document.querySelector(`.node-group[data-id="${nodeId}"]`);
    if (!nodeGroupEl) return;

    activeEditingNodeId = nodeId;
    uiState.mode = "EDITING_TEXT";
    const openTime = Date.now();

    // Sembunyikan SVG text bawaan selama sedang mengedit langsung
    const curSvgText = document.getElementById(`node-text-${nodeId}`);
    if (curSvgText) {
      curSvgText.style.display = "none";
    }

    // Bersihkan foreignObject lama jika ada
    const oldForeign = nodeGroupEl.querySelector(".node-inline-foreign");
    if (oldForeign) oldForeign.remove();

    // Buat foreignObject langsung di dalam grup SVG node! (100% sejajar geometri node)
    const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    fo.setAttribute("class", "node-inline-foreign");
    fo.setAttribute("x", "0");
    fo.setAttribute("y", "0");
    fo.setAttribute("width", String(node.width));
    fo.setAttribute("height", String(node.height));

    const textarea = document.createElement("textarea");
    textarea.className = "node-seamless-editor";
    textarea.setAttribute("spellcheck", "false");

    const isDark = doc.theme === "dark";
    const FlowEngine = window.MinimalFlow && window.MinimalFlow.FlowEngine;
    const isBgDark = (FlowEngine && FlowEngine.isDarkColor) ? FlowEngine.isDarkColor(node.style.fill) : isDark;
    const textColor = node.text.color || (isBgDark ? "#ffffff" : "#18181b");

    textarea.style.fontFamily = node.text.fontFamily || "Poppins, sans-serif";
    textarea.style.fontSize = `${node.text.fontSize || 14}px`;
    textarea.style.fontWeight = node.text.bold ? "700" : "500";
    textarea.style.fontStyle = node.text.italic ? "italic" : "normal";
    textarea.style.textDecoration = node.text.underline ? "underline" : "none";
    textarea.style.textAlign = node.text.align || "center";
    textarea.style.color = textColor;
    textarea.style.caretColor = textColor;
    textarea.style.lineHeight = `${(node.text.fontSize || 14) * 1.35}px`;

    const isPh = !node.text.content || node.text.content.trim().toLowerCase() === "insert text";
    textarea.value = isPh ? "" : (node.text.content || "");
    textarea.placeholder = "Ketik teks di sini...";

    function adjustPadding() {
      const lineHeight = (node.text.fontSize || 14) * 1.35;
      const lines = (textarea.value || "").split("\n");
      const totalH = lines.length * lineHeight;
      let padTop = Math.max(0, (node.height - totalH) / 2);
      if (node.type === "cylinder") {
        const ry = Math.min(node.height * 0.22, 18);
        padTop = Math.max(ry, ry + (node.height - ry * 1.5 - totalH) / 2);
      }
      let safePadX = node.text.paddingX !== undefined ? node.text.paddingX : 14;
      if (node.type === "parallelogram") {
        safePadX += Math.min(node.width * 0.2, 28);
      } else if (node.type === "diamond") {
        safePadX += Math.min(node.width * 0.22, 28);
      } else if (node.type === "triangle") {
        safePadX += Math.min(node.width * 0.25, 30);
      }
      textarea.style.paddingTop = `${Math.round(padTop)}px`;
      textarea.style.paddingLeft = `${Math.round(safePadX)}px`;
      textarea.style.paddingRight = `${Math.round(safePadX)}px`;
      textarea.style.paddingBottom = "0px";
    }

    adjustPadding();
    fo.appendChild(textarea);
    nodeGroupEl.appendChild(fo);

    // Bersihkan artifak seleksi teks bawaan browser
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }

    // Isolasi event mouse agar pengetikan dan drag teks tidak bocor ke kanvas
    const stopPropagation = (e) => e.stopPropagation();
    textarea.addEventListener("mousedown", stopPropagation);
    textarea.addEventListener("mousemove", stopPropagation);
    textarea.addEventListener("mouseup", stopPropagation);
    textarea.addEventListener("click", stopPropagation);
    textarea.addEventListener("dblclick", stopPropagation);
    textarea.addEventListener("wheel", stopPropagation);

    function onLiveInput() {
      const val = textarea.value;
      node.text.content = val;
      node.text.isPlaceholder = !val.trim();
      adjustPadding();

      const layout = layoutNodeText(node);
      const minRequiredH = layout.totalTextHeight + (node.text.paddingY || 10) * 2;
      if (minRequiredH > node.height) {
        node.height = Math.round(minRequiredH + 8);
        fo.setAttribute("height", String(node.height));
        const shapePath = nodeGroupEl.querySelector(".node-shape");
        if (shapePath && FlowEngine) {
          shapePath.setAttribute("d", FlowEngine.getShapePath(node.type, node.width, node.height));
        }
        adjustPadding();
        if (typeof onLiveRender === "function") onLiveRender();
      }
    }

    textarea.addEventListener("input", onLiveInput);

    let isFinished = false;
    function finishEditing() {
      if (isFinished) return;
      if (Date.now() - openTime < 200) return; // Anti-blur guard
      isFinished = true;

      uiState.mode = "IDLE";
      activeEditingNodeId = null;
      activeEditingFinishFn = null;

      const val = textarea.value.trim();
      if (!val || val.toLowerCase() === "insert text") {
        node.text.content = "";
        node.text.isPlaceholder = false;
      } else {
        node.text.content = val;
        node.text.isPlaceholder = false;
      }

      fo.remove();
      if (curSvgText) {
        curSvgText.style.display = "";
      }

      if (typeof onSave === "function") onSave();
    }

    activeEditingFinishFn = finishEditing;
    textarea.addEventListener("blur", finishEditing);

    textarea.addEventListener("keydown", (e) => {
      e.stopPropagation(); // Shortcut keyboard seperti Delete / Ctrl+A bekerja lokal pada textarea, bukan kanvas
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        finishEditing();
      } else if (e.key === "Escape") {
        e.preventDefault();
        textarea.value = node.text.content;
        finishEditing();
      }
    });

    // Delayed focus & select text
    setTimeout(() => {
      if (uiState.mode === "EDITING_TEXT" && activeEditingNodeId === nodeId) {
        textarea.focus();
        if (textarea.value) {
          textarea.select();
        }
      }
    }, 25);
  }

  exports.TextEditor = {
    layoutNodeText,
    open: openInlineEditor,
    close: closeInlineEditor
  };

})(window.MinimalFlow);
