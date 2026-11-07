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

  // Parse inline Markdown / HTML tags into styled spans
  function parseInlineSpans(str, defaultBold = false, defaultItalic = false) {
    if (!str) return [];
    const regex = /(\*\*\*(.*?)\*\*\*|<b><i>(.*?)<\/i><\/b>|<i><b>(.*?)<\/b><\/i>|\*\*(.*?)\*\*|<b>(.*?)<\/b>|\*(.*?)\*|<i>(.*?)<\/i>)/gi;
    const tokens = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          text: str.slice(lastIndex, match.index),
          bold: defaultBold,
          italic: defaultItalic
        });
      }

      const full = match[0];
      if (full.startsWith("***") || match[2] !== undefined || match[3] !== undefined) {
        const content = (match[1] && match[1].startsWith("***")) ? match[1].slice(3, -3) : (match[2] || match[3] || "");
        tokens.push({ text: content, bold: true, italic: true });
      } else if (full.startsWith("**") || match[5] !== undefined) {
        const content = (match[1] && match[1].startsWith("**")) ? match[1].slice(2, -2) : (match[4] || match[5] || "");
        tokens.push({ text: content, bold: true, italic: defaultItalic });
      } else if (full.startsWith("*") || match[7] !== undefined) {
        const content = (match[1] && match[1].startsWith("*")) ? match[1].slice(1, -1) : (match[6] || match[7] || "");
        tokens.push({ text: content, bold: defaultBold, italic: true });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      tokens.push({
        text: str.slice(lastIndex),
        bold: defaultBold,
        italic: defaultItalic
      });
    }

    return tokens;
  }

  function measureSpanWidth(str, bold, italic, fontSize, fontFamily) {
    const ctx = getMeasureContext();
    if (!ctx) return str.length * fontSize * 0.6;
    const fontStyle = italic ? "italic " : "";
    const fontWeight = bold ? "700 " : "500 ";
    ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;
    return ctx.measureText(str).width;
  }

  function layoutNodeText(node) {
    if (!node.text) {
      return { lines: [], xPos: 0, startY: 0, lineHeight: 14, anchor: "middle", totalTextHeight: 0 };
    }

    const { width, height, text } = node;
    const paddingX = text.paddingX !== undefined ? text.paddingX : 14;
    const paddingY = text.paddingY !== undefined ? text.paddingY : 10;
    const fontSize = text.fontSize || 14;
    const fontFamily = text.fontFamily || "Poppins, sans-serif";
    const defaultBold = !!text.bold;
    const defaultItalic = !!text.italic;

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
    const lineHeight = fontSize * 1.35;

    // Pecah kata panjang per karakter jika melebihi maxWidth
    function breakWordIfNeeded(word, bold, italic) {
      if (!word) return [];
      if (measureSpanWidth(word, bold, italic, fontSize, fontFamily) <= maxWidth) {
        return [{ word, bold, italic }];
      }
      const chunks = [];
      let cur = "";
      for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        if (measureSpanWidth(cur + ch, bold, italic, fontSize, fontFamily) <= maxWidth) {
          cur += ch;
        } else {
          if (cur) chunks.push({ word: cur, bold, italic });
          cur = ch;
        }
      }
      if (cur) chunks.push({ word: cur, bold, italic });
      return chunks.length > 0 ? chunks : [{ word, bold, italic }];
    }

    const paragraphs = (text.content || "").split("\n");
    const lines = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push([{ text: "", bold: defaultBold, italic: defaultItalic }]);
        continue;
      }

      const spans = parseInlineSpans(para, defaultBold, defaultItalic);
      const words = [];

      for (const span of spans) {
        const parts = span.text.split(" ");
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].length > 0) {
            const broken = breakWordIfNeeded(parts[i], span.bold, span.italic);
            words.push(...broken);
          }
        }
      }

      if (words.length === 0) {
        lines.push([{ text: "", bold: defaultBold, italic: defaultItalic }]);
        continue;
      }

      let currentSpans = [];
      let currentLineWidth = 0;

      for (let i = 0; i < words.length; i++) {
        const item = words[i];
        const itemW = measureSpanWidth(item.word, item.bold, item.italic, fontSize, fontFamily);
        const needSpace = currentSpans.length > 0;
        const prevSpan = currentSpans[currentSpans.length - 1];
        const spaceW = needSpace 
          ? measureSpanWidth(" ", prevSpan ? prevSpan.bold : item.bold, prevSpan ? prevSpan.italic : item.italic, fontSize, fontFamily)
          : 0;
        const additionalW = spaceW + itemW;

        if (currentLineWidth + additionalW <= maxWidth || currentSpans.length === 0) {
          if (needSpace) {
            currentSpans[currentSpans.length - 1].text += " ";
          }
          const lastSpan = currentSpans[currentSpans.length - 1];
          if (lastSpan && lastSpan.bold === item.bold && lastSpan.italic === item.italic) {
            lastSpan.text += item.word;
          } else {
            currentSpans.push({ text: item.word, bold: item.bold, italic: item.italic });
          }
          currentLineWidth += additionalW;
        } else {
          lines.push(currentSpans);
          currentSpans = [{ text: item.word, bold: item.bold, italic: item.italic }];
          currentLineWidth = itemW;
        }
      }

      if (currentSpans.length > 0) {
        lines.push(currentSpans);
      }
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
    let startY = paddingY + (availableHeight - totalTextHeight) / 2 + fontSize * 0.85;

    // Centering vertikal khusus tabung database agar tidak menabrak elips atas
    if (node.type === "cylinder") {
      const ry = Math.min(height * 0.22, 18);
      availableHeight = height - ry * 1.5 - paddingY * 2;
      startY = ry + paddingY + (availableHeight - totalTextHeight) / 2 + fontSize * 0.85;
    }

    if (startY < paddingY + fontSize * 0.8) {
      startY = paddingY + fontSize * 0.8;
    }

    if (node.isContainer) {
      startY = paddingY + fontSize * 0.85;
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

      // Ctrl + B: Tebal (Bold) untuk teks yang disorot
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B" || e.code === "KeyB")) {
        e.preventDefault();
        toggleSelectionFormatting(textarea, "**");
        onLiveInput();
        return;
      }

      // Ctrl + I: Miring (Italic) untuk teks yang disorot
      if ((e.ctrlKey || e.metaKey) && (e.key === "i" || e.key === "I" || e.code === "KeyI")) {
        e.preventDefault();
        toggleSelectionFormatting(textarea, "*");
        onLiveInput();
        return;
      }

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

  function toggleSelectionFormatting(textarea, marker) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const mLen = marker.length;

    if (start === end) {
      textarea.value = val.slice(0, start) + marker + marker + val.slice(end);
      textarea.selectionStart = start + mLen;
      textarea.selectionEnd = start + mLen;
      textarea.dispatchEvent(new Event("input"));
      return;
    }

    const selectedText = val.slice(start, end);

    // Cek apakah teks yang disorot sudah ber-marker di dalamnya
    if (selectedText.startsWith(marker) && selectedText.endsWith(marker) && selectedText.length >= mLen * 2) {
      const unwrapped = selectedText.slice(mLen, -mLen);
      textarea.value = val.slice(0, start) + unwrapped + val.slice(end);
      textarea.selectionStart = start;
      textarea.selectionEnd = start + unwrapped.length;
      textarea.dispatchEvent(new Event("input"));
      return;
    }

    // Cek apakah marker berada tepat di luar batas teks yang disorot
    if (start >= mLen && end + mLen <= val.length &&
        val.slice(start - mLen, start) === marker &&
        val.slice(end, end + mLen) === marker) {
      textarea.value = val.slice(0, start - mLen) + selectedText + val.slice(end + mLen);
      textarea.selectionStart = start - mLen;
      textarea.selectionEnd = end - mLen;
      textarea.dispatchEvent(new Event("input"));
      return;
    }

    // Bungkus teks yang disorot
    const wrapped = marker + selectedText + marker;
    textarea.value = val.slice(0, start) + wrapped + val.slice(end);
    textarea.selectionStart = start;
    textarea.selectionEnd = start + wrapped.length;
    textarea.dispatchEvent(new Event("input"));
  }

  exports.TextEditor = {
    layoutNodeText,
    open: openInlineEditor,
    close: closeInlineEditor,
    toggleSelectionFormatting,
    parseInlineSpans
  };

})(window.MinimalFlow);
